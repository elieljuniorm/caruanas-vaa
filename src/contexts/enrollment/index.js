import { API_URL } from "@env";
import { apiFetch } from "../../utils/apiFetch";

export const enrollUser = async (userId, classId, token, callback) => {
  try {
    const response = await apiFetch(`${API_URL}/v1/enrollment/enroll`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId, classId }),
    });

    const data = await response.json();

    if (response.ok) {
      if (callback) await callback();
      return { success: true, data };
    } else {
      const errorMessage = data.detail || data.message || "Erro ao matricular usuário.";
      return { success: false, errors: { global: errorMessage } };
    }
  } catch (error) {
    return { success: false, errors: { global: "Erro de conexão. Tente novamente mais tarde." } };
  }
};

export const unenrollUser = async (userId, classId, token, callback) => {
  try {
    const response = await apiFetch(`${API_URL}/v1/enrollment/unenroll`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId, classId }),
    });

    const data = await response.json();

    if (response.ok) {
      if (callback) await callback();
      return { success: true, data };
    } else {
      const errorMessage = data.detail || data.message || "Erro ao remover matrícula.";
      return { success: false, errors: { global: errorMessage } };
    }
  } catch (error) {
    return { success: false, errors: { global: "Erro de conexão. Tente novamente mais tarde." } };
  }
};
