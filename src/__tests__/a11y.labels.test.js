/**
 * Impede regressão de acessibilidade.
 *
 * Todo elemento interativo precisa dizer o que é para quem usa leitor de tela.
 * Sem esta trava, um botão só de ícone acrescentado daqui a três meses passa
 * despercebido até a revisão da loja — ou até um usuário cego não conseguir
 * fazer check-in.
 */

const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");

const TAGS_INTERATIVAS = [
  "TouchableOpacity",
  "Pressable",
  "TouchableWithoutFeedback",
  "TouchableHighlight",
  "TextInput",
  "Switch",
];

/** Lista os .js de tela/componente, ignorando testes e mocks. */
function arquivosDeCodigo(dir = RAIZ, encontrados = []) {
  for (const nome of fs.readdirSync(dir)) {
    const completo = path.join(dir, nome);
    if (fs.statSync(completo).isDirectory()) {
      if (nome === "__tests__" || nome === "__mocks__") continue;
      arquivosDeCodigo(completo, encontrados);
    } else if (nome.endsWith(".js")) {
      encontrados.push(completo);
    }
  }
  return encontrados;
}

/**
 * Extrai cada tag de abertura da tag informada.
 *
 * Um regex ingênuo até o primeiro ">" quebra em `onPress={() => ...}` — a seta
 * parece o fim da tag. Por isso percorremos caractere a caractere contando
 * chaves e ignorando o ">" que vem logo depois de um "=".
 */
function tagsDeAbertura(src, tag) {
  const achados = [];
  const abertura = new RegExp(`<${tag}(?=[\\s/>])`, "g");
  let m;
  while ((m = abertura.exec(src)) !== null) {
    let i = abertura.lastIndex;
    let profundidade = 0;
    while (i < src.length) {
      const c = src[i];
      if (c === "{") profundidade++;
      else if (c === "}") profundidade--;
      else if (c === ">" && profundidade === 0 && src[i - 1] !== "=") break;
      i++;
    }
    achados.push({ texto: src.slice(m.index, i + 1), indice: m.index });
  }
  return achados;
}

function linhaDe(src, indice) {
  return src.slice(0, indice).split("\n").length;
}

describe("acessibilidade", () => {
  it("todo elemento interativo tem accessibilityLabel", () => {
    const semRotulo = [];

    for (const arquivo of arquivosDeCodigo()) {
      const src = fs.readFileSync(arquivo, "utf8");
      const relativo = path.relative(RAIZ, arquivo);

      for (const tag of TAGS_INTERATIVAS) {
        for (const { texto, indice } of tagsDeAbertura(src, tag)) {
          if (!texto.includes("accessibilityLabel")) {
            semRotulo.push(`${relativo}:${linhaDe(src, indice)}  <${tag}>`);
          }
        }
      }
    }

    expect(semRotulo).toEqual([]);
  });
});
