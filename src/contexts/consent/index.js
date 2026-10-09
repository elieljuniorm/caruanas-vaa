// services/consent.js — consentimento LGPD do titular
import { API_URL } from "@env";
import { apiFetch } from "../../utils/apiFetch";

/**
 * Situação de consentimento do usuário logado.
 *
 * O campo `pendingRequired` é o que decide se a tela de aceite aparece: vem
 * preenchido tanto para quem nunca aceitou quanto para quem aceitou uma versão
 * anterior à vigente — republicar a política com mudança material volta a pedir
 * o aceite de todo mundo.
 */
export const getConsentStatus = async (token) => {
  try {
    const response = await apiFetch(`${API_URL}/v1/consent/me`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      return { success: true, data };
    }

    return {
      success: false,
      errors: { global: data.detail || "Não foi possível verificar seus consentimentos." },
      status: response.status,
    };
  } catch (error) {
    console.error("getConsentStatus:", error);
    return {
      success: false,
      errors: { global: "Falha de conexão ao verificar seus consentimentos." },
    };
  }
};

/** Registra o aceite dos documentos informados (ex.: ["TERMS_OF_USE", "PRIVACY_POLICY"]). */
export const acceptConsent = async (documents, token) => {
  try {
    const response = await apiFetch(`${API_URL}/v1/consent/accept`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ documents }),
    });

    const data = await response.json();

    if (response.ok) {
      return { success: true, data };
    }

    return {
      success: false,
      errors: { global: data.detail || "Não foi possível registrar seu aceite." },
      status: response.status,
    };
  } catch (error) {
    console.error("acceptConsent:", error);
    return {
      success: false,
      errors: { global: "Falha de conexão ao registrar seu aceite." },
    };
  }
};

/** Revoga o consentimento de dados de saúde. Termos e política não são revogáveis aqui. */
export const revokeHealthConsent = async (token) => {
  try {
    const response = await apiFetch(`${API_URL}/v1/consent/revoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ document: "HEALTH_DATA" }),
    });

    const data = await response.json();

    if (response.ok) {
      return { success: true, data };
    }

    return {
      success: false,
      errors: { global: data.detail || "Não foi possível revogar o consentimento." },
      status: response.status,
    };
  } catch (error) {
    console.error("revokeHealthConsent:", error);
    return {
      success: false,
      errors: { global: "Falha de conexão ao revogar o consentimento." },
    };
  }
};

/** Baixa a cópia completa dos dados do titular (Art. 18 da LGPD). */
export const exportMyData = async (token) => {
  try {
    const response = await apiFetch(`${API_URL}/v1/user/me/export`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      return { success: true, data };
    }

    return {
      success: false,
      errors: { global: data.detail || "Não foi possível exportar seus dados." },
      status: response.status,
    };
  } catch (error) {
    console.error("exportMyData:", error);
    return {
      success: false,
      errors: { global: "Falha de conexão ao exportar seus dados." },
    };
  }
};

/**
 * Endereços dos documentos públicos, abertos no navegador sem exigir login.
 *
 * Estes valores são apenas o último recurso. Quem manda é o backend: cada
 * documento devolvido por `getConsentStatus` traz o seu `url`, e é ele que as
 * telas usam (ver `urlDoDocumento`). A diferença importa porque os documentos
 * são da plataforma, não de um clube — mudá-los de endereço não pode exigir um
 * build novo do aplicativo e a espera pela revisão da loja.
 */
export const CONSENT_URLS = {
  TERMS_OF_USE: "https://lepoti.tech/poti-clubes/termos/",
  PRIVACY_POLICY: "https://lepoti.tech/poti-clubes/privacidade/",
  HEALTH_DATA: "https://lepoti.tech/poti-clubes/privacidade/#dados-de-saude",
};

/**
 * URL de um documento, preferindo a que o backend informou.
 *
 * @param {object|null} consentStatus resposta de `getConsentStatus`
 * @param {string} documento TERMS_OF_USE | PRIVACY_POLICY | HEALTH_DATA
 */
export function urlDoDocumento(consentStatus, documento) {
  const doBackend = consentStatus?.documents?.find((d) => d.document === documento)?.url;
  return doBackend || CONSENT_URLS[documento];
}
