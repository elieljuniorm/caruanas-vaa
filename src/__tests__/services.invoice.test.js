/**
 * Testes unitários — contexts/invoice/index.js
 */

import { Alert } from "react-native";
import {
  createInvoice,
  verifyPayment,
  cancelInvoice,
  getInvoiceById,
  getInvoicesByUser,
  getAllInvoices,
} from "../contexts/invoice";

const API = "https://api.test.local";

function mockFetch(status, body) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
});

// ─── createInvoice ────────────────────────────────────────────────────────────

describe("createInvoice", () => {
  it("chama POST /invoice com o body correto", async () => {
    const payload = { userId: 5, amount: 299.9, description: "Mensalidade" };
    mockFetch(201, { id: 3, ...payload });

    const result = await createInvoice(payload, "token");

    expect(fetch).toHaveBeenCalledWith(`${API}/v1/invoice`, expect.objectContaining({
      method: "POST",
      body: JSON.stringify(payload),
    }));
    expect(result.success).toBe(true);
    expect(result.data.id).toBe(3);
  });

  it("exibe Alert e retorna erro quando API retorna 400", async () => {
    mockFetch(400, { detail: "Dados inválidos." });
    const result = await createInvoice({}, "token");

    expect(Alert.alert).toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.errors.global).toBe("Dados inválidos.");
  });
});

// ─── verifyPayment ────────────────────────────────────────────────────────────

describe("verifyPayment", () => {
  it("chama POST /invoice/{id}/verify", async () => {
    mockFetch(200, { id: 3, status: "PAID" });
    const result = await verifyPayment(3, "token");

    expect(fetch).toHaveBeenCalledWith(
      `${API}/v1/invoice/3/verify`,
      expect.objectContaining({ method: "POST" })
    );
    expect(result.success).toBe(true);
    expect(result.data.status).toBe("PAID");
  });

  it("retorna erro sem Alert quando fatura não existe (404) — quem alerta é a tela", async () => {
    // AdminInvoices.handleVerify já mostra o erro no else; alertar aqui duplicaria.
    mockFetch(404, { detail: "Fatura não encontrada." });
    const result = await verifyPayment(999, "token");
    expect(result.success).toBe(false);
    expect(result.errors.global).toBe("Fatura não encontrada.");
    expect(Alert.alert).not.toHaveBeenCalled();
  });
});

// ─── cancelInvoice ────────────────────────────────────────────────────────────

describe("cancelInvoice", () => {
  it("chama POST /invoice/{id}/cancel", async () => {
    mockFetch(200, { id: 3, status: "CANCELED" });
    const result = await cancelInvoice(3, "token");

    expect(fetch).toHaveBeenCalledWith(
      `${API}/v1/invoice/3/cancel`,
      expect.objectContaining({ method: "POST" })
    );
    expect(result.success).toBe(true);
  });
});

// ─── getInvoiceById ───────────────────────────────────────────────────────────

describe("getInvoiceById", () => {
  it("chama GET /invoice/{id} e retorna os dados", async () => {
    mockFetch(200, { id: 3, amount: 299.9, status: "PENDING" });
    const result = await getInvoiceById(3, "token");

    expect(fetch).toHaveBeenCalledWith(`${API}/v1/invoice/3`, expect.anything());
    expect(result.data.status).toBe("PENDING");
  });

  it("não exibe Alert em erro (silencioso — caller decide)", async () => {
    mockFetch(404, { detail: "Fatura não encontrada." });
    const result = await getInvoiceById(999, "token");
    expect(result.success).toBe(false);
    expect(Alert.alert).not.toHaveBeenCalled();
  });
});

// ─── getInvoicesByUser ────────────────────────────────────────────────────────

describe("getInvoicesByUser", () => {
  it("chama GET /invoice/user/{userId}", async () => {
    const faturas = [{ id: 1, status: "PENDING" }, { id: 2, status: "PAID" }];
    mockFetch(200, faturas);
    const result = await getInvoicesByUser(5, "token");

    expect(fetch).toHaveBeenCalledWith(`${API}/v1/invoice/user/5`, expect.anything());
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
  });

  it("exibe Alert quando API retorna erro", async () => {
    mockFetch(403, { detail: "Sem permissão." });
    const result = await getInvoicesByUser(5, "token");
    expect(result.success).toBe(false);
    expect(Alert.alert).toHaveBeenCalled();
  });
});

// ─── getAllInvoices ───────────────────────────────────────────────────────────

describe("getAllInvoices", () => {
  it("popula setInvoices quando retorna lista simples (não paginada)", async () => {
    const lista = [{ id: 1 }, { id: 2 }];
    mockFetch(200, lista);
    const setInvoices = jest.fn();

    const result = await getAllInvoices({}, "token", setInvoices);

    expect(setInvoices).toHaveBeenCalledWith(lista);
    expect(result.success).toBe(true);
  });

  it("extrai .content quando API retorna PageResult", async () => {
    const content = [{ id: 10 }];
    mockFetch(200, { content, totalElements: 1, totalPages: 1 });
    const setInvoices = jest.fn();

    const result = await getAllInvoices({}, "token", setInvoices);
    expect(setInvoices).toHaveBeenCalledWith(content);
    expect(result.pagination.totalElements).toBe(1);
  });

  it("filtra por status quando params.status é fornecido", async () => {
    mockFetch(200, []);
    await getAllInvoices({ status: "PENDING" }, "token", jest.fn());

    const url = fetch.mock.calls[0][0];
    expect(url).toContain("status=PENDING");
  });

  it("retorna erro sem Alert quando a API falha — a tela mostra o estado de erro", async () => {
    // AdminInvoices distingue "não há faturas" de "não deu para carregar" e
    // oferece "Tentar de novo"; um Alert aqui dispararia a cada troca de aba.
    mockFetch(403, { detail: "Sem permissão." });
    const result = await getAllInvoices({}, "token");

    expect(result.success).toBe(false);
    expect(result.errors.global).toBe("Sem permissão.");
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it("filtra por userId quando params.userId é fornecido", async () => {
    mockFetch(200, []);
    await getAllInvoices({ userId: 5 }, "token", jest.fn());

    const url = fetch.mock.calls[0][0];
    expect(url).toContain("userId=5");
  });
});
