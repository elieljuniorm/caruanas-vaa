/**
 * Testes unitários — contexts/plan/index.js
 */

import { Alert } from "react-native";
import { getAllPlans, getUserPlan, assignPlan, removePlan } from "../contexts/plan";

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

// ─── getAllPlans ──────────────────────────────────────────────────────────────

describe("getAllPlans", () => {
  it("chama GET /plan/all e retorna lista de planos", async () => {
    const planos = [{ id: 1, name: "Básico", price: 299.9 }];
    mockFetch(200, planos);
    const result = await getAllPlans("token");

    expect(fetch).toHaveBeenCalledWith(`${API}/v1/plan/all`, expect.anything());
    expect(result.success).toBe(true);
    expect(result.data[0].name).toBe("Básico");
  });

  it("retorna erro sem Alert quando falha (silencioso)", async () => {
    mockFetch(403, { detail: "Sem permissão." });
    const result = await getAllPlans("token");
    expect(result.success).toBe(false);
    expect(Alert.alert).not.toHaveBeenCalled();
  });
});

// ─── getUserPlan ─────────────────────────────────────────────────────────────

describe("getUserPlan", () => {
  it("chama GET /user-plan/user/{userId} e retorna o plano", async () => {
    const plano = { id: 2, planName: "Básico", nextDueDate: "2026-05-05T00:00:00" };
    mockFetch(200, plano);
    const result = await getUserPlan(5, "token");

    expect(fetch).toHaveBeenCalledWith(`${API}/v1/user-plan/user/5`, expect.anything());
    expect(result.success).toBe(true);
    expect(result.data.planName).toBe("Básico");
  });

  it("retorna notFound:true quando usuário não tem plano (404)", async () => {
    // getUserPlan trata 404 antes de chamar .json()
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({}),
    });

    const result = await getUserPlan(5, "token");
    expect(result.notFound).toBe(true);
    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
  });
});

// ─── assignPlan ───────────────────────────────────────────────────────────────

describe("assignPlan", () => {
  it("chama POST /user-plan/assign com userId e planId", async () => {
    mockFetch(200, { id: 3, userId: 5, planId: 1 });
    const result = await assignPlan(5, 1, "token");

    expect(fetch).toHaveBeenCalledWith(`${API}/v1/user-plan/assign`, expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ userId: 5, planId: 1 }),
    }));
    expect(result.success).toBe(true);
  });

  it("exibe Alert e retorna erro quando usuário já tem plano (422)", async () => {
    mockFetch(422, { detail: "Usuário já possui plano ativo." });
    const result = await assignPlan(5, 1, "token");

    expect(Alert.alert).toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.errors.global).toBe("Usuário já possui plano ativo.");
  });

  it("exibe Alert quando MercadoPago falha (402)", async () => {
    mockFetch(402, { detail: "Falha ao gerar cobrança." });
    const result = await assignPlan(5, 1, "token");

    expect(Alert.alert).toHaveBeenCalled();
    expect(result.success).toBe(false);
  });
});

// ─── removePlan ───────────────────────────────────────────────────────────────

describe("removePlan", () => {
  it("chama DELETE /user-plan/{id}/remove", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 204 });
    const result = await removePlan(3, "token");

    expect(fetch).toHaveBeenCalledWith(`${API}/v1/user-plan/3/remove`, expect.objectContaining({
      method: "DELETE",
    }));
    expect(result.success).toBe(true);
  });

  it("retorna sucesso quando status é 204 (sem body)", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 204 });
    const result = await removePlan(3, "token");
    // NÃO deve tentar parsear JSON em 204
    expect(result.success).toBe(true);
  });

  it("exibe Alert e retorna erro quando plano não existe", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ detail: "Plano não encontrado." }),
    });
    const result = await removePlan(999, "token");
    expect(result.success).toBe(false);
    expect(Alert.alert).toHaveBeenCalled();
  });
});
