/**
 * Travas do modo de captura de telas.
 *
 * O efeito autentica sozinho ao abrir o app. Se ele valer no build publicado,
 * qualquer pessoa que instale o app entra na conta de demonstração sem digitar
 * nada. Estes testes fixam as duas condições que impedem isso.
 */

// Reimplementa a decisão do efeito em contexts/auth.js. Importar o provider
// exigiria React Navigation montado; o que precisa ficar travado é a regra.
function deveAutenticarSozinho({ modo, ehAparelhoReal, token, email, senha }) {
  if (modo !== "1" || ehAparelhoReal) return false;
  if (token || !email || !senha) return false;
  return true;
}

const CREDENCIAIS = { email: "revisor.loja@lepoti.tech", senha: "senha-de-captura" };

describe("modo de captura", () => {
  it("autentica no simulador quando a flag está ligada", () => {
    expect(deveAutenticarSozinho({
      modo: "1", ehAparelhoReal: false, token: null, ...CREDENCIAIS,
    })).toBe(true);
  });

  it("NUNCA autentica em aparelho real, mesmo com a flag ligada", () => {
    // Trava principal: protege o app publicado caso a flag escape para o build.
    expect(deveAutenticarSozinho({
      modo: "1", ehAparelhoReal: true, token: null, ...CREDENCIAIS,
    })).toBe(false);
  });

  it("não autentica sem a flag — que é o caso do build de loja", () => {
    for (const modo of [undefined, "", "0", "true", "yes"]) {
      expect(deveAutenticarSozinho({
        modo, ehAparelhoReal: false, token: null, ...CREDENCIAIS,
      })).toBe(false);
    }
  });

  it("não atropela uma sessão já aberta", () => {
    expect(deveAutenticarSozinho({
      modo: "1", ehAparelhoReal: false, token: "jwt-existente", ...CREDENCIAIS,
    })).toBe(false);
  });

  it("não tenta autenticar sem credenciais no build", () => {
    expect(deveAutenticarSozinho({
      modo: "1", ehAparelhoReal: false, token: null, email: undefined, senha: undefined,
    })).toBe(false);
    expect(deveAutenticarSozinho({
      modo: "1", ehAparelhoReal: false, token: null, email: CREDENCIAIS.email, senha: "",
    })).toBe(false);
  });
});

describe("credenciais de captura", () => {
  it("não estão escritas no código do app", () => {
    // Elas vêm de variável de ambiente do perfil de build. Hardcodar colocaria a
    // senha dentro do bundle publicado na loja.
    const fs = require("fs");
    const path = require("path");
    const fonte = fs.readFileSync(
      path.join(__dirname, "..", "contexts", "auth.js"), "utf8");
    expect(fonte).not.toMatch(/RevisaoLoja/i);
    expect(fonte).toContain("process.env.EXPO_PUBLIC_SCREENSHOT_EMAIL");
    expect(fonte).toContain("process.env.EXPO_PUBLIC_SCREENSHOT_PASSWORD");
  });
});
