// services/classes.js
import { Alert } from "react-native";
import { API_URL } from "@env";
import { apiFetch } from "../../utils/apiFetch";

// Função para buscar todas as turmas
export const getAllClasses = async (token, setClasses) => {
  try {
    const response = await apiFetch(`${API_URL}/v1/class/all`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      const sortedData = data.sort((a, b) => a.id - b.id); // Ordenado pelo id
      if (setClasses) setClasses(sortedData);
      return { success: true, data: sortedData };
    } else {
      const errorMessage = data.detail || data.message || "Erro ao carregar as turmas.";
      console.log("Erro", errorMessage);
      return { success: false, errors: { global: errorMessage } };
    }
  } catch (error) {
    const errorMsg = "Erro de conexão. Tente novamente mais tarde.";
    Alert.alert("Erro de conexão", errorMsg);
    return { success: false, errors: { global: errorMsg } };
  }
};

// Função para criar uma turma
export const createClass = async (classData, token, callback) => {
  try {
    const response = await apiFetch(`${API_URL}/v1/class/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(classData),
    });

    const data = await response.json();

    if (response.ok) {
      // Chama o callback para atualizar a lista de turmas
      if (callback) await callback();
      return { success: true, data };
    } else {
      const errorMessage = data.detail || data.message || "Erro ao criar a turma.";
      console.log("Erro", errorMessage);
      return { success: false, errors: { global: errorMessage } };
    }
  } catch (error) {
    const errorMsg = "Erro de conexão. Tente novamente mais tarde.";
    Alert.alert("Erro de conexão", errorMsg);
    return { success: false, errors: { global: errorMsg } };
  }
};

// Função para buscar uma turma específica por ID
export const getClassById = async (classId, token) => {
  try {
    const response = await apiFetch(`${API_URL}/v1/class/${classId}`, {
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
      const errorMessage = data.detail || data.message || "Erro ao buscar turma.";
      return { success: false, errors: { global: errorMessage } };
    }
  } catch (error) {
    const errorMsg = "Erro de conexão. Tente novamente mais tarde.";
    return { success: false, errors: { global: errorMsg } };
  }
};

// Função para atualizar uma turma
export const updateClass = async (classData, token, callback) => {
  try {
    const response = await apiFetch(`${API_URL}/v1/class/update`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(classData),
    });

    const data = await response.json();

    if (response.ok) {
      // Chama o callback para atualizar a lista de turmas
      if (callback) await callback();
      return { success: true, data };
    } else {
      const errorMessage = data.detail || data.message || `Erro ${response.status}: ${response.statusText}`;
      console.log("Erro", errorMessage);
      return {
        success: false,
        errors: { global: errorMessage },
        data
      };
    }
  } catch (error) {
    const errorMsg = "Erro de conexão. Tente novamente mais tarde.";
    Alert.alert("Erro de conexão", errorMsg);
    return {
      success: false,
      errors: { global: errorMsg }
    };
  }
};

// Função para excluir uma turma
export const deleteClass = async (classId, token, callback) => {
  try {
    const response = await apiFetch(`${API_URL}/v1/class/delete/${classId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 204) {
      if (callback) {
        await callback();
      }
      return { success: true, message: "Turma excluída com sucesso." };

    } else if (response.status === 404) {
      const data = await response.json();
      return {
        success: false,
        errors: { global: data.detail || data.message || "Turma não encontrada." }
      };

    } else {
      const data = await response.json();
      const errorMessage = data.detail || data.message || `Erro ${response.status}: ${response.statusText}`;
      return {
        success: false,
        errors: { global: errorMessage }
      };
    }

  } catch (error) {
    return {
      success: false,
      errors: { global: "Erro de conexão. Tente novamente mais tarde." }
    };
  }
};
