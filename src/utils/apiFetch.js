import { emitAuthFailure } from "./authEvents";

// Janela de dedup após emitir 401: evita disparar refresh múltiplas vezes
// quando várias telas chamam a API em paralelo no momento que o token expira.
let lastEmitAt = 0;
const DEDUP_MS = 2000;

/**
 * Wrapper de `fetch` que detecta 401 em requests autenticadas e dispara
 * um evento global para o AuthProvider renovar o token.
 *
 * 403 (role insuficiente) não dispara refresh — o token é válido,
 * apenas o usuário não tem permissão para aquele recurso.
 */
export async function apiFetch(url, options = {}) {
    const response = await fetch(url, options);

    const headers = options.headers || {};
    const hadAuth = !!(headers.Authorization || headers.authorization);

    if (hadAuth && response.status === 401) {
        const now = Date.now();
        if (now - lastEmitAt > DEDUP_MS) {
            lastEmitAt = now;
            emitAuthFailure({ status: response.status, url });
        }
    }

    return response;
}
