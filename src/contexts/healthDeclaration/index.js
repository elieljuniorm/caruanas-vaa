// services/healthDeclaration.js
import { Alert } from "react-native";
import { API_URL } from "@env";
import { apiFetch } from "../../utils/apiFetch";

// Função para criar uma declaração de saúde
export const createHealthDeclaration = async (healthData, token) => {
  try {
    const response = await apiFetch(`${API_URL}/v1/health-declaration`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(healthData),
    });

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        data,
        message: "Declaração criada com sucesso!"
      };
    } else {
      const errorMessage = data.detail ||
        data.message ||
        `Erro ${response.status}: ${response.statusText}`;

      console.error('API Error:', errorMessage);

      return {
        success: false,
        errors: {
          global: errorMessage,
          details: []
        },
        status: response.status
      };
    }
  } catch (error) {
    console.error('Network Error:', error);
    const errorMsg = error.message || "Erro de conexão. Tente novamente mais tarde.";
    return {
      success: false,
      errors: { global: errorMsg }
    };
  }
};

// Função para atualizar uma declaração de saúde
export const updateHealthDeclaration = async (healthId, healthData, token) => {
  try {
    const response = await apiFetch(`${API_URL}/v1/health-declaration/${healthId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(healthData),
    });

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        data,
        message: "Declaração atualizada com sucesso!"
      };
    } else {
      const errorMessage = data.detail ||
        data.message ||
        `Erro ${response.status}: ${response.statusText}`;

      console.error('API Error:', errorMessage);

      return {
        success: false,
        errors: {
          global: errorMessage,
          details: []
        },
        status: response.status
      };
    }
  } catch (error) {
    console.error('Network Error:', error);
    const errorMsg = error.message || "Erro de conexão. Tente novamente mais tarde.";
    return {
      success: false,
      errors: { global: errorMsg }
    };
  }
};

// Função para buscar uma declaração de saúde por ID
export const getHealthDeclarationById = async (healthId, token) => {
  try {
    const response = await apiFetch(`${API_URL}/v1/health-declaration/${healthId}`, {
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
      const errorMessage =
        data.detail || data.message || "Erro ao buscar a declaração de saúde.";
      return { success: false, errors: { global: errorMessage } };
    }
  } catch (error) {
    const errorMsg = "Erro de conexão. Tente novamente mais tarde.";
    return { success: false, errors: { global: errorMsg } };
  }
};

// Função para baixar PDF da declaração de saúde
export const downloadHealthDeclarationPdf = async (healthId, token) => {
  // SDK 54+: cacheDirectory/downloadAsync vivem em expo-file-system/legacy
  const FileSystem = require("expo-file-system/legacy");
  const destPath = `${FileSystem.cacheDirectory}declaracao-${healthId}.pdf`;

  try {
    const result = await FileSystem.downloadAsync(
      `${API_URL}/v1/health-declaration/${healthId}/pdf`,
      destPath,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (result.status === 200) {
      return { success: true, data: result.uri };
    }

    if (result.status === 204) {
      return { success: false, errors: { global: "Esta declaração não possui PDF." } };
    }

    console.error("API: Erro HTTP ao baixar PDF", result.status);
    return { success: false, errors: { global: "Erro ao baixar o PDF." } };
  } catch (error) {
    console.error("API: Erro de conexão ao baixar PDF:", error);
    return { success: false, errors: { global: "Erro de conexão." } };
  }
};

// Função para buscar declarações de saúde por usuário
export const getHealthDeclarationByUser = async (userId, token) => {
  try {
    const response = await apiFetch(
      `${API_URL}/v1/health-declaration/by-user/${userId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const data = await response.json();

    if (response.ok) {
      return { success: true, data };
    } else {
      const errorMessage =
        data.detail || data.message || "Erro ao buscar declarações do usuário.";
      return { success: false, errors: { global: errorMessage } };
    }
  } catch (error) {
    const errorMsg = "Erro de conexão. Tente novamente mais tarde.";
    return { success: false, errors: { global: errorMsg } };
  }
};

// Função para buscar todas as declarações de saúde
export const getAllHealthDeclarations = async (
  token,
  setHealthDeclarations,
) => {
  try {
    const response = await apiFetch(`${API_URL}/v1/health-declaration/all`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      if (setHealthDeclarations) setHealthDeclarations(data);
      return { success: true, data };
    } else {
      const errorMessage =
        data.detail || data.message || "Erro ao carregar as declarações de saúde.";
      Alert.alert("Não foi possível carregar as declarações", errorMessage);
      return { success: false, errors: { global: errorMessage } };
    }
  } catch (error) {
    const errorMsg = "Erro de conexão. Tente novamente mais tarde.";
    Alert.alert("Erro de conexão", errorMsg);
    return { success: false, errors: { global: errorMsg } };
  }
};

// Função para excluir uma declaração de saúde
export const deleteHealthDeclaration = async (healthId, token, callback) => {
  Alert.alert(
    "Confirmação",
    "Tem certeza que deseja excluir esta declaração de saúde? Esta ação não pode ser desfeita.",
    [
      {
        text: "Cancelar",
        style: "cancel",
      },
      {
        text: "Excluir",
        onPress: async () => {
          try {
            const response = await apiFetch(
              `${API_URL}/v1/health-declaration/${healthId}`,
              {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
              },
            );

            if (response.ok) {
              Alert.alert(
                "Sucesso",
                "Declaração de saúde excluída com sucesso.",
              );
              // Chama o callback para recarregar a lista
              if (callback) await callback();
            } else {
              const data = await response.json();
              const errorMessage =
                data.detail || data.message || "Erro ao excluir a declaração de saúde.";
              console.log("Erro", errorMessage);
            }
          } catch (error) {
            const errorMsg = "Erro de conexão. Tente novamente mais tarde.";
            Alert.alert("Erro de conexão", errorMsg);
          }
        },
      },
    ],
  );
};
