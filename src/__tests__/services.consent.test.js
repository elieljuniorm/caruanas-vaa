/**
 * Testes unitários — contexts/consent/index.js
 */

import {
  acceptConsent,
  CONSENT_URLS,
  exportMyData,
  getConsentStatus,
  revokeHealthConsent,
  urlDoDocumento,
} from "../contexts/consent";

const API = "https://api.test.local";
const TOKEN = "token-de-teste";

function mockFetch(status, body) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

function mockFetchFalhando() {
  global.fetch = jest.fn().mockRejectedValue(new Error("Network request failed"));
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

// ─── getConsentStatus ─────────────────────────────────────────────────────────

describe("getConsentStatus", () => {
  const resposta = {
    documents: [],
    pendingRequired: ["TERMS_OF_USE", "PRIVACY_POLICY"],
    healthDataAccepted: false,
  };

  it("busca a situação do titular com o token no header", async () => {
    mockFetch(200, resposta);

    const resultado = await getConsentStatus(TOKEN);

    expect(global.fetch).toHaveBeenCalledWith(
      `${API}/v1/consent/me`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }),
      })
    );
    expect(resultado.success).toBe(true);
    expect(resultado.data.pendingRequired).toEqual(["TERMS_OF_USE", "PRIVACY_POLICY"]);
  });

  it("devolve erro legível quando a API recusa", async () => {
    mockFetch(401, { detail: "Token expirado" });

    const resultado = await getConsentStatus(TOKEN);

    expect(resultado.success).toBe(false);
    expect(resultado.errors.global).toBe("Token expirado");
    expect(resultado.status).toBe(401);
  });

  it("não estoura quando a rede falha", async () => {
    mockFetchFalhando();

    const resultado = await getConsentStatus(TOKEN);

    expect(resultado.success).toBe(false);
    expect(resultado.errors.global).toMatch(/conexão/i);
  });
});

// ─── acceptConsent ────────────────────────────────────────────────────────────

describe("acceptConsent", () => {
  it("envia os documentos no corpo da requisição", async () => {
    mockFetch(200, { pendingRequired: [], healthDataAccepted: false });

    const resultado = await acceptConsent(["TERMS_OF_USE", "PRIVACY_POLICY"], TOKEN);

    const [url, opcoes] = global.fetch.mock.calls[0];
    expect(url).toBe(`${API}/v1/consent/accept`);
    expect(opcoes.method).toBe("POST");
    expect(JSON.parse(opcoes.body)).toEqual({
      documents: ["TERMS_OF_USE", "PRIVACY_POLICY"],
    });
    expect(resultado.success).toBe(true);
  });

  it("propaga a mensagem da API quando o documento é inválido", async () => {
    mockFetch(422, { detail: "Documento inválido: XPTO" });

    const resultado = await acceptConsent(["XPTO"], TOKEN);

    expect(resultado.success).toBe(false);
    expect(resultado.errors.global).toContain("XPTO");
  });
});

// ─── revokeHealthConsent ──────────────────────────────────────────────────────

describe("revokeHealthConsent", () => {
  it("revoga sempre o documento de saúde, e só ele", async () => {
    mockFetch(200, { healthDataAccepted: false });

    await revokeHealthConsent(TOKEN);

    const [, opcoes] = global.fetch.mock.calls[0];
    expect(JSON.parse(opcoes.body)).toEqual({ document: "HEALTH_DATA" });
  });

  it("devolve erro quando a API recusa a revogação", async () => {
    mockFetch(422, { detail: "Apenas o consentimento de dados de saúde pode ser revogado" });

    const resultado = await revokeHealthConsent(TOKEN);

    expect(resultado.success).toBe(false);
    expect(resultado.errors.global).toMatch(/saúde/i);
  });
});

// ─── exportMyData ─────────────────────────────────────────────────────────────

describe("exportMyData", () => {
  it("devolve os dados do titular", async () => {
    const dados = {
      cadastro: { id: 7, email: "aluno@teste.com" },
      declaracaoDeSaude: null,
      faturas: [],
    };
    mockFetch(200, dados);

    const resultado = await exportMyData(TOKEN);

    expect(global.fetch).toHaveBeenCalledWith(
      `${API}/v1/user/me/export`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }),
      })
    );
    expect(resultado.success).toBe(true);
    expect(resultado.data.cadastro.id).toBe(7);
  });

  it("não estoura quando a rede falha", async () => {
    mockFetchFalhando();

    const resultado = await exportMyData(TOKEN);

    expect(resultado.success).toBe(false);
    expect(resultado.errors.global).toMatch(/conexão/i);
  });
});

// ─── URLs públicas ────────────────────────────────────────────────────────────

describe("endereços dos documentos", () => {
  it("o fallback aponta para o caminho da plataforma, não de um clube", () => {
    // Os documentos são whitelabel: valem para todos os clubes. As lojas
    // verificam essas URLs, então mudá-las de lugar tem que quebrar o teste.
    expect(CONSENT_URLS.PRIVACY_POLICY).toBe("https://lepoti.tech/poti-clubes/privacidade/");
    expect(CONSENT_URLS.TERMS_OF_USE).toBe("https://lepoti.tech/poti-clubes/termos/");
  });

  it("prefere a URL que o backend informou", () => {
    // É isto que permite mudar o endereço dos documentos sem publicar um app novo.
    const status = {
      documents: [
        { document: "PRIVACY_POLICY", url: "https://exemplo.test/politica-nova/" },
      ],
    };
    expect(urlDoDocumento(status, "PRIVACY_POLICY")).toBe("https://exemplo.test/politica-nova/");
  });

  it("cai no fallback quando o backend não informou aquele documento", () => {
    expect(urlDoDocumento({ documents: [] }, "TERMS_OF_USE")).toBe(CONSENT_URLS.TERMS_OF_USE);
    expect(urlDoDocumento(null, "TERMS_OF_USE")).toBe(CONSENT_URLS.TERMS_OF_USE);
    expect(urlDoDocumento(undefined, "HEALTH_DATA")).toBe(CONSENT_URLS.HEALTH_DATA);
  });
});
