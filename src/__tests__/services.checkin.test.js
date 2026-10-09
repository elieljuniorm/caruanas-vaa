/**
 * Testes unitários — contexts/checkin/index.js
 */

import { Alert } from "react-native";
import {
  regularCheckin,
  manualCheckin,
  markAttendance,
  cancelCheckin,
  getCheckinsByUser,
  getCheckinsByLesson,
  getDashboard,
  getCheckinById,
} from "../contexts/checkin";

const API = "https://api.test.local";

function mockFetch(status, body) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => "application/json" },
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
});

// ─── regularCheckin ───────────────────────────────────────────────────────────

describe("regularCheckin", () => {
  it("chama POST /checkin/lessons/{lessonId}/checkins/regular com body correto", async () => {
    mockFetch(200, { checkinId: 10, status: "CONFIRMED" });
    const result = await regularCheckin(42, { userId: 5 }, "token");

    expect(fetch).toHaveBeenCalledWith(
      `${API}/v1/checkin/lessons/42/checkins/regular`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ userId: 5 }),
      })
    );
    expect(result.success).toBe(true);
    expect(result.data.checkinId).toBe(10);
  });

  it("retorna erro sem Alert quando a janela de check-in está fechada (422) — quem alerta é a tela", async () => {
    // CheckInInstructor cai no fallback de check-in manual e o painel do aluno
    // mostra a mensagem; alertar no serviço atrapalharia os dois fluxos.
    mockFetch(422, { detail: "Fora da janela de check-in." });
    const result = await regularCheckin(42, { userId: 5 }, "token");

    expect(result.success).toBe(false);
    expect(result.errors.global).toBe("Fora da janela de check-in.");
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it("retorna erro de conexão quando fetch falha", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network"));
    const result = await regularCheckin(42, { userId: 5 }, "token");
    expect(result.success).toBe(false);
    expect(result.errors.global).toMatch(/conexão/i);
  });
});

// ─── manualCheckin ────────────────────────────────────────────────────────────

describe("manualCheckin", () => {
  it("chama POST /checkin/lessons/{lessonId}/attendance/manual", async () => {
    mockFetch(201, { checkinId: 11, status: "CONFIRMED" });
    const result = await manualCheckin(42, { userId: 5 }, "token");

    expect(fetch).toHaveBeenCalledWith(
      `${API}/v1/checkin/lessons/42/attendance/manual`,
      expect.objectContaining({ method: "POST" })
    );
    expect(result.success).toBe(true);
  });

  it("não exibe Alert em caso de erro (fallback silencioso)", async () => {
    mockFetch(422, { detail: "Usuário não matriculado." });
    const result = await manualCheckin(42, { userId: 5 }, "token");

    expect(result.success).toBe(false);
    // manualCheckin não chama Alert — o caller decide o que mostrar
    expect(Alert.alert).not.toHaveBeenCalled();
  });
});

// ─── cancelCheckin ────────────────────────────────────────────────────────────

describe("cancelCheckin", () => {
  it("chama POST /checkin/checkins/{checkinId}/cancel sem body", async () => {
    mockFetch(200, { message: "Check-in cancelado com sucesso." });
    await cancelCheckin(99, "token");

    const call = fetch.mock.calls[0];
    expect(call[0]).toContain("/checkin/checkins/99/cancel");
    expect(call[1].method).toBe("POST");
    expect(call[1].body).toBeUndefined();
  });

  it("retorna sucesso quando API retorna 200", async () => {
    mockFetch(200, { message: "Cancelado." });
    const result = await cancelCheckin(99, "token");
    expect(result.success).toBe(true);
  });

  it("retorna erro sem Alert quando check-in não existe (404) — quem alerta é a tela", async () => {
    // studentPanelModal já mostra "Não foi possível cancelar" no else.
    mockFetch(404, { detail: "Check-in não encontrado." });
    const result = await cancelCheckin(99, "token");
    expect(result.success).toBe(false);
    expect(result.errors.global).toBe("Check-in não encontrado.");
    expect(Alert.alert).not.toHaveBeenCalled();
  });
});

// ─── markAttendance ───────────────────────────────────────────────────────────

describe("markAttendance", () => {
  it("chama POST /checkin/lessons/{lessonId}/attendance com presencesByUserEmail", async () => {
    mockFetch(202, {});
    const presences = { presencesByUserEmail: { "aluno@teste.com": true } };
    await markAttendance(42, presences, "token");

    expect(fetch).toHaveBeenCalledWith(
      `${API}/v1/checkin/lessons/42/attendance`,
      expect.objectContaining({ body: JSON.stringify(presences) })
    );
  });
});

// ─── getCheckinsByUser ────────────────────────────────────────────────────────

describe("getCheckinsByUser", () => {
  it("popula setCheckins com a lista retornada", async () => {
    const lista = [{ id: 1 }, { id: 2 }];
    mockFetch(200, lista);
    const setCheckins = jest.fn();

    const result = await getCheckinsByUser(5, {}, "token", setCheckins);

    expect(setCheckins).toHaveBeenCalledWith(lista);
    expect(result.success).toBe(true);
  });

  it("extrai .content quando API retorna PageResult", async () => {
    const content = [{ id: 10 }];
    mockFetch(200, { content, totalElements: 1 });
    const setCheckins = jest.fn();

    await getCheckinsByUser(5, {}, "token", setCheckins);
    expect(setCheckins).toHaveBeenCalledWith(content);
  });
});

// ─── getCheckinsByLesson ──────────────────────────────────────────────────────

describe("getCheckinsByLesson", () => {
  it("chama GET /checkin/lessons/{lessonId}/checkins", async () => {
    mockFetch(200, []);
    await getCheckinsByLesson(42, {}, "token");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/checkin/lessons/42/checkins"),
      expect.anything()
    );
  });

  it("não exibe Alert em caso de erro (chamador decide)", async () => {
    mockFetch(404, { detail: "Aula não encontrada." });
    const result = await getCheckinsByLesson(42, {}, "token");
    expect(result.success).toBe(false);
    expect(Alert.alert).not.toHaveBeenCalled();
  });
});

// ─── getDashboard ─────────────────────────────────────────────────────────────

describe("getDashboard", () => {
  it("popula setDashboardData com os dados retornados", async () => {
    const dados = { completedClassesMonth: 8, remainingClassesMonth: 7, nextClass: null };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: (key) => key === "content-type" ? "application/json" : null },
      json: () => Promise.resolve(dados),
    });
    const setDashboard = jest.fn();

    const result = await getDashboard("token", setDashboard);

    expect(setDashboard).toHaveBeenCalledWith(dados);
    expect(result.success).toBe(true);
    expect(result.data.completedClassesMonth).toBe(8);
  });

  it("retorna erro sem Alert quando há 403", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: { get: () => "application/json" },
      json: () => Promise.resolve({ detail: "Sem permissão." }),
    });

    const result = await getDashboard("token", null);
    expect(result.success).toBe(false);
    expect(result.errors.global).toMatch(/sessão|permissão/i);
  });
});

// ─── getCheckinById ───────────────────────────────────────────────────────────

describe("getCheckinById", () => {
  it("chama GET /checkin/checkins/{checkinId}", async () => {
    mockFetch(200, { id: 10, status: "CONFIRMED" });
    const result = await getCheckinById(10, "token");

    expect(fetch).toHaveBeenCalledWith(`${API}/v1/checkin/checkins/10`, expect.anything());
    expect(result.data.status).toBe("CONFIRMED");
  });
});
