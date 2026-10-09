import { Alert } from "react-native";
import { API_URL } from "@env";
import { apiFetch } from "../../utils/apiFetch";

// Função para buscar todas as notícias
export const getAllNews = async (token, setNews) => {
  try {
    const response = await apiFetch(`${API_URL}/v1/news/all`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      // A API já retorna um array de notícias
      setNews(data || []);
      return { success: true, data: data || [] };
    } else {
      const errorMessage = data.detail || data.message || "Erro ao carregar as notícias.";
      console.error("Erro ao buscar notícias:", errorMessage);
      return { success: false, errors: { global: errorMessage } };
    }
  } catch (error) {
    console.error("Erro de conexão ao buscar notícias:", error);
    const errorMsg = "Erro de conexão. Tente novamente mais tarde.";
    return { success: false, errors: { global: errorMsg } };
  }
};

// Função para criar uma notícia
export const createNews = async (newsData, token, callback) => {
  try {
    // Validar campos obrigatórios de acordo com a API
    if (!newsData.title || !newsData.summary || !newsData.content) {
      const errorMessage = "Título, resumo e conteúdo são obrigatórios.";
      console.log("Erro", errorMessage);
      return { success: false, errors: { global: errorMessage } };
    }

    const response = await apiFetch(`${API_URL}/v1/news/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(newsData),
    });

    const data = await response.json();

    if (response.status === 201) {
      // 201 Created
      // Chama o callback para atualizar a lista de notícias
      if (callback) {
        await callback();
      }
      return { success: true, data };
    } else {
      const errorMessage = data.detail || data.message || "Erro ao criar a notícia.";
      console.log("Erro", errorMessage);
      return { success: false, errors: { global: errorMessage } };
    }
  } catch (error) {
    console.error("Erro ao criar notícia:", error);
    const errorMsg = "Erro de conexão. Tente novamente mais tarde.";
    Alert.alert("Erro de conexão", errorMsg);
    return { success: false, errors: { global: errorMsg } };
  }
};

// Função para atualizar uma notícia
export const updateNews = async (newsId, newsData, token, callback) => {
  try {
    // Adicionar o ID ao payload (requerido pela API)
    const payload = {
      id: newsId,
      ...newsData,
    };

    const response = await apiFetch(`${API_URL}/v1/news/update`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok) {
      // Chama o callback para atualizar a lista de notícias
      if (callback) {
        await callback();
      }
      return { success: true, data };
    } else {
      const errorMessage = data.detail || data.message || "Erro ao atualizar a notícia.";
      console.log("Erro", errorMessage);
      return { success: false, errors: { global: errorMessage } };
    }
  } catch (error) {
    console.error("Erro ao atualizar notícia:", error);
    const errorMsg = "Erro de conexão. Tente novamente mais tarde.";
    Alert.alert("Erro de conexão", errorMsg);
    return { success: false, errors: { global: errorMsg } };
  }
};

// Função para excluir uma notícia
export const deleteNews = async (newsId, token, callback) => {
  try {
    const response = await apiFetch(`${API_URL}/v1/news/delete/${newsId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 204) {
      // 204 No Content
      Alert.alert("Sucesso", "Notícia excluída com sucesso!");
      // Chama o callback para recarregar a lista
      if (callback) {
        await callback();
      }
      return { success: true };
    } else {
      const data = await response.json().catch(() => ({}));
      const errorMessage = data.detail || data.message || "Erro ao excluir a notícia.";
      console.log("Erro", errorMessage);
      return { success: false, errors: { global: errorMessage } };
    }
  } catch (error) {
    const errorMsg = "Erro de conexão. Tente novamente mais tarde.";
    Alert.alert("Erro de conexão", errorMsg);
    return { success: false, errors: { global: errorMsg } };
  }
};

// Função para buscar uma notícia específica por ID
export const getNewsById = async (newsId, token) => {
  try {
    const response = await apiFetch(`${API_URL}/v1/news/${newsId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (response.ok) {
      return { success: true, data };
    } else {
      const errorMessage = data.detail || data.message || "Erro ao buscar a notícia.";
      return { success: false, errors: { global: errorMessage } };
    }
  } catch (error) {
    const errorMsg = "Erro de conexão. Tente novamente mais tarde.";
    return { success: false, errors: { global: errorMsg } };
  }
};
