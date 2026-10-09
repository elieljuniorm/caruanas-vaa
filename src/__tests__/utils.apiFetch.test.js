/**
 * Testes unitários do interceptor `apiFetch`:
 * - Em request autenticada com 401, dispara `emitAuthFailure`.
 * - 403 (role insuficiente) NÃO dispara — token é válido.
 * - Sem header Authorization, NÃO dispara (login etc).
 * - Múltiplas falhas dentro da janela de dedup → 1 emissão só.
 */

describe("apiFetch", () => {
  let apiFetch;
  let onAuthFailure;
  let listener;
  let originalFetch;

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers().setSystemTime(new Date("2026-05-01T00:00:00Z"));

    // require após reset para garantir state limpo do dedup interno
    const mod = require("../utils/apiFetch");
    apiFetch = mod.apiFetch;
    onAuthFailure = require("../utils/authEvents").onAuthFailure;

    listener = jest.fn();
    onAuthFailure(listener);

    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  function mockFetch(status) {
    global.fetch = jest.fn().mockResolvedValue({
      status,
      ok: status >= 200 && status < 300,
      json: async () => ({}),
    });
  }

  test("401 com Authorization dispara authFailure", async () => {
    mockFetch(401);
    await apiFetch("https://x.test/users", {
      headers: { Authorization: "Bearer abc" },
    });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ status: 401 })
    );
  });

  test("403 com Authorization NÃO dispara (role insuficiente, não token expirado)", async () => {
    mockFetch(403);
    await apiFetch("https://x.test/users", {
      headers: { Authorization: "Bearer abc" },
    });
    expect(listener).not.toHaveBeenCalled();
  });

  test("401 SEM Authorization NÃO dispara", async () => {
    mockFetch(401);
    await apiFetch("https://x.test/auth/login", {
      headers: { "Content-Type": "application/json" },
    });
    expect(listener).not.toHaveBeenCalled();
  });

  test("200 nunca dispara", async () => {
    mockFetch(200);
    await apiFetch("https://x.test/dash", {
      headers: { Authorization: "Bearer abc" },
    });
    expect(listener).not.toHaveBeenCalled();
  });

  test("dedup: múltiplos 401 em sequência rápida = 1 emissão", async () => {
    mockFetch(401);
    const headers = { Authorization: "Bearer abc" };
    await apiFetch("https://x.test/a", { headers });
    await apiFetch("https://x.test/b", { headers });
    await apiFetch("https://x.test/c", { headers });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
