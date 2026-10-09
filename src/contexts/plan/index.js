// services/plan.js
import { Alert } from "react-native";
import { API_URL } from "@env";
import { apiFetch } from "../../utils/apiFetch";

// `includeInactive` só tem efeito para admin — o backend ignora o parâmetro para
// os demais perfis. Serve para o admin enxergar (e reativar) um plano desativado.
export const getAllPlans = async (token, { includeInactive = false } = {}) => {
  try {
    const query = includeInactive ? "?includeInactive=true" : "";
    const response = await apiFetch(`${API_URL}/v1/plan/all${query}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      return { success: true, data };
    } else {
      const errorMessage = data.detail || data.message || "Erro ao carregar planos.";
      return { success: false, errors: { global: errorMessage } };
    }
  } catch (error) {
    return { success: false, errors: { global: "Erro de conexão. Tente novamente mais tarde." } };
  }
};

export const getUserPlan = async (userId, token) => {
  try {
    const response = await apiFetch(`${API_URL}/v1/user-plan/user/${userId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 404) {
      return { success: false, notFound: true, data: null };
    }

    const data = await response.json();

    if (response.ok) {
      return { success: true, data };
    } else {
      const errorMessage = data.detail || data.message || "Erro ao buscar plano do usuário.";
      return { success: false, errors: { global: errorMessage } };
    }
  } catch (error) {
    return { success: false, errors: { global: "Erro de conexão. Tente novamente mais tarde." } };
  }
};

export const assignPlan = async (userId, planId, token) => {
  try {
    const response = await apiFetch(`${API_URL}/v1/user-plan/assign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId, planId }),
    });

    const data = await response.json();

    if (response.ok) {
      return { success: true, data };
    } else {
      const errorMessage = data.detail || data.message || "Erro ao atribuir plano.";
      Alert.alert("Não foi possível atribuir o plano", errorMessage);
      return { success: false, errors: { global: errorMessage } };
    }
  } catch (error) {
    const errorMsg = "Erro de conexão. Tente novamente mais tarde.";
    Alert.alert("Erro de conexão", errorMsg);
    return { success: false, errors: { global: errorMsg } };
  }
};

export const removePlan = async (userPlanId, token) => {
  try {
    const response = await apiFetch(`${API_URL}/v1/user-plan/${userPlanId}/remove`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 204) {
      return { success: true };
    }

    const data = await response.json();
    const errorMessage = data.detail || data.message || "Erro ao remover plano.";
    Alert.alert("Não foi possível remover o plano", errorMessage);
    return { success: false, errors: { global: errorMessage } };
  } catch (error) {
    const errorMsg = "Erro de conexão. Tente novamente mais tarde.";
    Alert.alert("Erro de conexão", errorMsg);
    return { success: false, errors: { global: errorMsg } };
  }
};

export const createPlan = async (planData, token) => {
  try {
    const response = await apiFetch(`${API_URL}/v1/plan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(planData),
    });

    const data = await response.json();

    if (response.ok) {
      return { success: true, data };
    }
    const errorMessage = data.detail || data.message || "Erro ao criar plano.";
    return { success: false, errors: { global: errorMessage } };
  } catch (error) {
    return { success: false, errors: { global: "Erro de conexão. Tente novamente mais tarde." } };
  }
};

export const updatePlan = async (planId, planData, token) => {
  try {
    const response = await apiFetch(`${API_URL}/v1/plan/${planId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(planData),
    });

    const data = await response.json();

    if (response.ok) {
      return { success: true, data };
    }
    const errorMessage = data.detail || data.message || "Erro ao atualizar plano.";
    return { success: false, errors: { global: errorMessage } };
  } catch (error) {
    return { success: false, errors: { global: "Erro de conexão. Tente novamente mais tarde." } };
  }
};

export const deletePlan = async (planId, token) => {
  try {
    const response = await apiFetch(`${API_URL}/v1/plan/${planId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 204) {
      return { success: true };
    }

    const data = await response.json();
    const errorMessage = data.detail || data.message || "Erro ao excluir plano.";
    return { success: false, errors: { global: errorMessage } };
  } catch (error) {
    return { success: false, errors: { global: "Erro de conexão. Tente novamente mais tarde." } };
  }
};
