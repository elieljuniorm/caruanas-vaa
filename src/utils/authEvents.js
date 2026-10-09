// Event emitter mínimo para desacoplar `apiFetch` do AuthProvider.
// Quando uma request autenticada retorna 401, `apiFetch` chama
// `emitAuthFailure()`. O AuthProvider registra um listener via
// `onAuthFailure(handler)` e tenta refresh antes de deslogar.

const listeners = new Set();
let emitting = false;

export function onAuthFailure(handler) {
    listeners.add(handler);
    return () => listeners.delete(handler);
}

export function emitAuthFailure(reason) {
    // Reentrância não é desejada (handler pode chamar fetch de novo)
    if (emitting) return;
    emitting = true;
    try {
        for (const handler of listeners) {
            try {
                handler(reason);
            } catch (e) {
                console.error("[authEvents] listener error:", e);
            }
        }
    } finally {
        emitting = false;
    }
}
