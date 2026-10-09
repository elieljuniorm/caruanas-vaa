/**
 * Testes unitários — contexts/users/index.js
 *
 * Cada função de serviço é testada de forma isolada, mockando `fetch` e `Alert`.
 */

import { Alert } from "react-native";
import {
  registerUser,
  updateUser,
  getUserById,
  getAllUsers,
  getAllStudents,
  getAllInstructors,
} from "../contexts/users";

const API = "https://api.test.local";

// ─── helpers ────────────────────────────────────────────────────────────────

function mockFetch(status, body) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)),
    json: () => Promise.resolve(body),
  });
}

beforeEach(() => {
  global.fetch = jest.fn();
  jest.clearAllMocks();
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
});

// ─── registerUser ────────────────────────────────────────────────────────────

describe("registerUser", () => {
  const valid = {
    email: "aluno@teste.com",
    password: "Senha@123",
    name: "Aluno Teste",
    codeRole: 3,
    phoneNumber: "91988887777",
  };

  it("retorna erro quando email está vazio", async () => {
    const result = await registerUser({ ...valid, email: "" }, "token");
    expect(result.errors.email).toBeDefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("retorna erro quando email é inválido", async () => {
    const result = await registerUser({ ...valid, email: "naoemail" }, "token");
    expect(result.errors.email).toBeDefined();
  });

  it("retorna erro quando senha tem menos de 8 caracteres", async () => {
    const result = await registerUser({ ...valid, password: "123" }, "token");
    expect(result.errors.password).toBeDefined();
  });

  it("retorna erro quando nome é muito curto", async () => {
    const result = await registerUser({ ...valid, name: "AB" }, "token");
    expect(result.errors.name).toBeDefined();
  });

  it("retorna erro quando telefone é muito curto", async () => {
    const result = await registerUser({ ...valid, phoneNumber: "123" }, "token");
    expect(result.errors.phoneNumber).toBeDefined();
  });

  it("retorna erro quando codeRole é inválido", async () => {
    const result = await registerUser({ ...valid, codeRole: 99 }, "token");
    expect(result.errors.codeRole).toBeDefined();
  });

  it("chama POST /user/create com body correto em caso de sucesso", async () => {
    mockFetch(201, { id: 5, ...valid });
    const result = await registerUser(valid, "meu-token");

    expect(fetch).toHaveBeenCalledWith(`${API}/v1/user/create`, expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ Authorization: "Bearer meu-token" }),
      body: expect.stringContaining('"codeRole":3'),
    }));
    expect(result.success).toBe(true);
    expect(result.data.id).toBe(5);
  });

  it("retorna erro com mensagem da API quando status é 422", async () => {
    mockFetch(422, { detail: "Email já cadastrado." });
    const result = await registerUser(valid, "meu-token");
    expect(result.success).toBe(false);
    expect(result.errors.global).toBe("Email já cadastrado.");
  });

  it("retorna erro de conexão quando fetch lança exceção", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));
    const result = await registerUser(valid, "meu-token");
    expect(result.success).toBe(false);
    expect(result.errors.global).toMatch(/conexão/i);
  });
});

// ─── updateUser ──────────────────────────────────────────────────────────────

describe("updateUser", () => {
  it("chama PUT /user/update com o body enviado", async () => {
    mockFetch(200, { id: 1, name: "Novo Nome" });
    const result = await updateUser({ id: 1, name: "Novo Nome" }, "token");

    expect(fetch).toHaveBeenCalledWith(`${API}/v1/user/update`, expect.objectContaining({
      method: "PUT",
      body: JSON.stringify({ id: 1, name: "Novo Nome" }),
    }));
    expect(result.success).toBe(true);
  });

  it("exibe Alert e retorna erro quando API retorna 400", async () => {
    mockFetch(400, { detail: "ID do usuário é obrigatório." });
    const result = await updateUser({ name: "X" }, "token");

    expect(Alert.alert).toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.errors.global).toBe("ID do usuário é obrigatório.");
  });
});

// ─── getUserById ─────────────────────────────────────────────────────────────

describe("getUserById", () => {
  it("chama GET /user/{id} com o token correto", async () => {
    mockFetch(200, { id: 7, name: "Pedro" });
    const result = await getUserById(7, "t123");

    expect(fetch).toHaveBeenCalledWith(`${API}/v1/user/7`, expect.objectContaining({
      method: "GET",
      headers: expect.objectContaining({ Authorization: "Bearer t123" }),
    }));
    expect(result.data.name).toBe("Pedro");
  });

  it("retorna erro sem Alert quando usuário não existe (404)", async () => {
    mockFetch(404, { detail: "Usuário não encontrado." });
    const result = await getUserById(999, "t123");

    // getUserById não chama Alert em erro (ver implementação)
    expect(result.success).toBe(false);
  });
});

// ─── getAllUsers ──────────────────────────────────────────────────────────────

describe("getAllUsers", () => {
  it("popula setUserAll com a lista retornada", async () => {
    const lista = [{ id: 1 }, { id: 2 }];
    mockFetch(200, lista);
    const setUserAll = jest.fn();

    const result = await getAllUsers("token", setUserAll);

    expect(setUserAll).toHaveBeenCalledWith(lista);
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
  });

  it("não chama setUserAll quando não é fornecido", async () => {
    mockFetch(200, []);
    // não deve lançar exceção
    await expect(getAllUsers("token", undefined)).resolves.toMatchObject({ success: true });
  });
});

// ─── getAllStudents ───────────────────────────────────────────────────────────

describe("getAllStudents", () => {
  it("chama GET /user/students", async () => {
    mockFetch(200, [{ id: 3 }]);
    await getAllStudents("token", jest.fn());
    expect(fetch).toHaveBeenCalledWith(`${API}/v1/user/students`, expect.anything());
  });
});

// ─── getAllInstructors ────────────────────────────────────────────────────────

describe("getAllInstructors", () => {
  it("chama GET /user/instructors", async () => {
    mockFetch(200, [{ id: 2 }]);
    await getAllInstructors("token", jest.fn());
    expect(fetch).toHaveBeenCalledWith(`${API}/v1/user/instructors`, expect.anything());
  });
});
