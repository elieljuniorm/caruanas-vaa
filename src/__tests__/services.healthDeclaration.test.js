/**
 * Testes unitários — contexts/healthDeclaration/index.js
 */

import { Alert } from "react-native";
import {
  createHealthDeclaration,
  updateHealthDeclaration,
  getHealthDeclarationById,
  getHealthDeclarationByUser,
  getAllHealthDeclarations,
} from "../contexts/healthDeclaration";

const API = "https://api.test.local";

// Mock expo-file-system (usado por downloadHealthDeclarationPdf)
jest.mock("expo-file-system", () => ({
  cacheDirectory: "file://cache/",
  downloadAsync: jest.fn(),
}));

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

// ─── createHealthDeclaration ──────────────────────────────────────────────────

describe("createHealthDeclaration", () => {
  const payload = {
    userId: 5,
    declarationDate: "2026-04-05",
    canPracticeRowing: true,
    bloodType: "A+",
    chronicDiseases: false,
  };

  it("chama POST /health-declaration com body correto", async () => {
    mockFetch(201, { id: 7, ...payload });
    const result = await createHealthDeclaration(payload, "token");

    expect(fetch).toHaveBeenCalledWith(`${API}/v1/health-declaration`, expect.objectContaining({
      method: "POST",
      body: JSON.stringify(payload),
      headers: expect.objectContaining({ Authorization: "Bearer token" }),
    }));
    expect(result.success).toBe(true);
    expect(result.message).toMatch(/sucesso/i);
  });

  it("retorna erro com detail quando API retorna 422 (declaração duplicada)", async () => {
    mockFetch(422, { detail: "Usuário já possui declaração ativa." });
    const result = await createHealthDeclaration(payload, "token");

    expect(result.success).toBe(false);
    expect(result.errors.global).toBe("Usuário já possui declaração ativa.");
    expect(result.status).toBe(422);
  });

  it("retorna erro de conexão quando fetch lança exceção", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network"));
    const result = await createHealthDeclaration(payload, "token");
    expect(result.success).toBe(false);
    // createHealthDeclaration usa error.message diretamente (não hardcoded)
    expect(result.errors.global).toBeDefined();
  });
});

// ─── updateHealthDeclaration ──────────────────────────────────────────────────

describe("updateHealthDeclaration", () => {
  it("chama PUT /health-declaration/{id} com body correto", async () => {
    const update = { bloodType: "B-", chronicDiseases: true };
    mockFetch(200, { id: 7, ...update });

    const result = await updateHealthDeclaration(7, update, "token");

    expect(fetch).toHaveBeenCalledWith(`${API}/v1/health-declaration/7`, expect.objectContaining({
      method: "PUT",
      body: JSON.stringify(update),
    }));
    expect(result.success).toBe(true);
    expect(result.message).toMatch(/sucesso/i);
  });

  it("retorna erro quando declaração não existe (404)", async () => {
    mockFetch(404, { detail: "Declaração não encontrada." });
    const result = await updateHealthDeclaration(999, {}, "token");
    expect(result.success).toBe(false);
    expect(result.status).toBe(404);
  });
});

// ─── getHealthDeclarationById ─────────────────────────────────────────────────

describe("getHealthDeclarationById", () => {
  it("chama GET /health-declaration/{id}", async () => {
    mockFetch(200, { id: 7, bloodType: "A+", canPracticeRowing: true });
    const result = await getHealthDeclarationById(7, "token");

    expect(fetch).toHaveBeenCalledWith(`${API}/v1/health-declaration/7`, expect.anything());
    expect(result.success).toBe(true);
    expect(result.data.bloodType).toBe("A+");
  });

  it("retorna erro quando ID não existe (404)", async () => {
    mockFetch(404, { detail: "Declaração não encontrada." });
    const result = await getHealthDeclarationById(999, "token");
    expect(result.success).toBe(false);
    expect(Alert.alert).not.toHaveBeenCalled();
  });
});

// ─── getHealthDeclarationByUser ───────────────────────────────────────────────

describe("getHealthDeclarationByUser", () => {
  it("chama GET /health-declaration/by-user/{userId}", async () => {
    mockFetch(200, { id: 7, userId: 5 });
    const result = await getHealthDeclarationByUser(5, "token");

    expect(fetch).toHaveBeenCalledWith(`${API}/v1/health-declaration/by-user/5`, expect.anything());
    expect(result.success).toBe(true);
  });

  it("retorna erro quando usuário não tem declaração (404)", async () => {
    mockFetch(404, { detail: "Declaração não encontrada para o usuário." });
    const result = await getHealthDeclarationByUser(5, "token");
    expect(result.success).toBe(false);
  });
});

// ─── getAllHealthDeclarations ──────────────────────────────────────────────────

describe("getAllHealthDeclarations", () => {
  it("chama GET /health-declaration/all e popula setHealthDeclarations", async () => {
    const lista = [{ id: 1 }, { id: 2 }];
    mockFetch(200, lista);
    const setHealthDeclarations = jest.fn();

    const result = await getAllHealthDeclarations("token", setHealthDeclarations);

    expect(fetch).toHaveBeenCalledWith(`${API}/v1/health-declaration/all`, expect.anything());
    expect(setHealthDeclarations).toHaveBeenCalledWith(lista);
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
  });

  it("exibe Alert quando API retorna erro (403)", async () => {
    mockFetch(403, { detail: "Sem permissão." });
    const result = await getAllHealthDeclarations("token", jest.fn());
    expect(result.success).toBe(false);
    expect(Alert.alert).toHaveBeenCalled();
  });
});
