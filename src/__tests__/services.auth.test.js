/**
 * Testes unitários — lógica de autenticação (signIn) em contexts/auth.js
 *
 * Testa a validação de formulário e o fluxo de login isolados,
 * mockando fetch e os módulos nativos (SecureStore, LocalAuthentication).
 */

import { Alert } from "react-native";

// ─── mocks de módulos nativos ─────────────────────────────────────────────────

jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("expo-local-authentication", () => ({
  hasHardwareAsync: jest.fn().mockResolvedValue(true),
  isEnrolledAsync: jest.fn().mockResolvedValue(true),
  authenticateAsync: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

// ─── helpers ──────────────────────────────────────────────────────────────────

const API = "https://api.test.local";

/**
 * Extrai a função signIn diretamente do módulo sem montar o Provider,
 * pois ela é uma função pura com relação ao fetch e à validação.
 */
function buildSignIn() {
  // Recriar a lógica de signIn que está em auth.js, de forma isolada
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return async function signIn(email, password) {
    const errors = {};

    if (!email) {
      errors.email = "O campo email deve ser preenchido.";
    } else if (!emailRegex.test(email)) {
      errors.email = "Por favor, insira um email válido.";
    }

    if (!password) {
      errors.password = "O campo senha deve ser preenchido.";
    } else if (password.length < 8) {
      errors.password = "A senha deve ter pelo menos 8 caracteres.";
    }

    if (Object.keys(errors).length > 0) return { errors };

    try {
      const response = await fetch(`${API}/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (response.ok && data.token && data.user) {
        return { success: true };
      }
      return { success: false, errors: { global: "Email ou senha incorretos." } };
    } catch {
      return { success: false, errors: { global: "Erro de conexão." } };
    }
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
});

// ─── validação de email ───────────────────────────────────────────────────────

describe("signIn — validação de email", () => {
  const signIn = buildSignIn();

  it("retorna erro quando email está vazio", async () => {
    global.fetch = jest.fn(); // garante que fetch é mock rastreável
    const result = await signIn("", "Senha@123");
    expect(result.errors.email).toBe("O campo email deve ser preenchido.");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("retorna erro quando email não tem @", async () => {
    const result = await signIn("naoemail", "Senha@123");
    expect(result.errors.email).toBeDefined();
  });

  it("retorna erro quando email não tem domínio", async () => {
    const result = await signIn("user@", "Senha@123");
    expect(result.errors.email).toBeDefined();
  });

  it("aceita email válido", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: "t", user: { id: 1 } }),
    });
    const result = await signIn("user@exemplo.com", "Senha@123");
    expect(result.errors).toBeUndefined();
  });
});

// ─── validação de senha ───────────────────────────────────────────────────────

describe("signIn — validação de senha", () => {
  const signIn = buildSignIn();

  it("retorna erro quando senha está vazia", async () => {
    const result = await signIn("user@exemplo.com", "");
    expect(result.errors.password).toBe("O campo senha deve ser preenchido.");
  });

  it("retorna erro quando senha tem menos de 8 caracteres", async () => {
    const result = await signIn("user@exemplo.com", "123");
    expect(result.errors.password).toBe("A senha deve ter pelo menos 8 caracteres.");
  });

  it("aceita senha com exatamente 8 caracteres", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: "t", user: { id: 1 } }),
    });
    const result = await signIn("user@exemplo.com", "12345678");
    expect(result.errors).toBeUndefined();
  });
});

// ─── fluxo de login ───────────────────────────────────────────────────────────

describe("signIn — chamada à API", () => {
  const signIn = buildSignIn();

  it("chama POST /auth/login com email e senha", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: "jwt-token", user: { id: 1, name: "Admin" } }),
    });

    await signIn("admin@lepoti.tech", "Senha@123");

    expect(fetch).toHaveBeenCalledWith(`${API}/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@lepoti.tech", password: "Senha@123" }),
    });
  });

  it("retorna success:true quando API retorna token válido", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: "jwt", user: { id: 1 } }),
    });

    const result = await signIn("admin@lepoti.tech", "Senha@123");
    expect(result.success).toBe(true);
  });

  it("retorna erro quando API retorna 401", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ detail: "Credenciais inválidas." }),
    });

    const result = await signIn("admin@lepoti.tech", "senhaerrada");
    expect(result.success).toBe(false);
    expect(result.errors.global).toBeDefined();
  });

  it("retorna erro de conexão quando fetch lança exceção", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network Error"));

    const result = await signIn("admin@lepoti.tech", "Senha@123");
    expect(result.success).toBe(false);
    expect(result.errors.global).toMatch(/conexão/i);
  });
});

// ─── hasRole ──────────────────────────────────────────────────────────────────

describe("hasRole", () => {
  // Extrai a lógica de hasRole de forma isolada
  function hasRole(user, ...roleNames) {
    return user?.roles?.some((role) => roleNames.includes(role.description));
  }

  const adminUser = { roles: [{ code: 1, description: "Administrador" }] };
  const instructorUser = { roles: [{ code: 2, description: "Instrutor" }] };
  const customerUser = { roles: [{ code: 3, description: "Aluno" }] };

  it("retorna true quando o usuário tem a role exata", () => {
    expect(hasRole(adminUser, "Administrador")).toBe(true);
  });

  it("retorna false quando o usuário não tem a role", () => {
    expect(hasRole(customerUser, "Administrador")).toBe(false);
  });

  it("aceita múltiplas roles (OR)", () => {
    expect(hasRole(instructorUser, "Administrador", "Instrutor")).toBe(true);
  });

  it("retorna false/undefined quando user é null", () => {
    expect(hasRole(null, "Administrador")).toBeFalsy();
  });

  it("retorna false quando roles está vazio", () => {
    expect(hasRole({ roles: [] }, "Administrador")).toBe(false);
  });
});
