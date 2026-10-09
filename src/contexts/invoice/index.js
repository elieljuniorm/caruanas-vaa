// services/invoice.js
import { Alert } from "react-native";
import { API_URL } from "@env";
import { apiFetch } from "../../utils/apiFetch";

// Função para criar uma fatura
export const createInvoice = async (invoiceData, token) => {
  try {
    const response = await apiFetch(`${API_URL}/v1/invoice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(invoiceData),
    });

    const data = await response.json();

    if (response.ok) {
      return { success: true, data };
    } else {
      const errorMessage = data.detail || data.message || "Erro ao criar fatura.";
      Alert.alert("Não foi possível criar a fatura", errorMessage);
      return { success: false, errors: { global: errorMessage } };
    }
  } catch (error) {
    const errorMsg = "Erro de conexão. Tente novamente mais tarde.";
    Alert.alert("Erro de conexão", errorMsg);
    return { success: false, errors: { global: errorMsg } };
  }
};

// Função para verificar pagamento de uma fatura
export const verifyPayment = async (invoiceId, token) => {
  try {
    const response = await apiFetch(`${API_URL}/v1/invoice/${invoiceId}/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      return { success: true, data };
    } else {
      const errorMessage = data.detail || data.message || "Erro ao verificar pagamento.";
      console.log("Erro", errorMessage);
      return { success: false, errors: { global: errorMessage } };
    }
  } catch (error) {
    const errorMsg = "Erro de conexão. Tente novamente mais tarde.";
    Alert.alert("Erro de conexão", errorMsg);
    return { success: false, errors: { global: errorMsg } };
  }
};

// Função para cancelar uma fatura
export const cancelInvoice = async (invoiceId, token) => {
  try {
    const response = await apiFetch(`${API_URL}/v1/invoice/${invoiceId}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      return { success: true, data };
    } else {
      const errorMessage = data.detail || data.message || "Erro ao cancelar fatura.";
      console.log("Erro", errorMessage);
      return { success: false, errors: { global: errorMessage } };
    }
  } catch (error) {
    const errorMsg = "Erro de conexão. Tente novamente mais tarde.";
    Alert.alert("Erro de conexão", errorMsg);
    return { success: false, errors: { global: errorMsg } };
  }
};

// Função para buscar fatura por ID
export const getInvoiceById = async (invoiceId, token) => {
  try {
    const response = await apiFetch(`${API_URL}/v1/invoice/${invoiceId}`, {
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
      const errorMessage = data.detail || data.message || "Erro ao buscar fatura.";
      return { success: false, errors: { global: errorMessage } };
    }
  } catch (error) {
    const errorMsg = "Erro de conexão. Tente novamente mais tarde.";
    return { success: false, errors: { global: errorMsg } };
  }
};

// Função para buscar faturas por usuário
export const getInvoicesByUser = async (userId, token) => {
  try {
    const response = await apiFetch(`${API_URL}/v1/invoice/user/${userId}`, {
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
      const errorMessage = data.detail || data.message || "Erro ao buscar faturas do usuário.";
      Alert.alert("Não foi possível carregar as faturas", errorMessage);
      return { success: false, errors: { global: errorMessage } };
    }
  } catch (error) {
    const errorMsg = "Erro de conexão. Tente novamente mais tarde.";
    Alert.alert("Erro de conexão", errorMsg);
    return { success: false, errors: { global: errorMsg } };
  }
};

// Função para buscar todas as faturas com filtros
export const getAllInvoices = async (params = {}, token, setInvoices) => {
  try {
    // Construir query string a partir dos parâmetros
    const queryParams = new URLSearchParams();

    // Adicionar parâmetros de filtro
    if (params.status) queryParams.append("status", params.status);
    if (params.userId) queryParams.append("userId", params.userId);

    // Parâmetros de paginação (seguindo o schema Pageable da API)
    if (params.pageable) {
      // O endpoint espera parâmetros de paginação específicos
      if (params.pageable.page !== undefined) {
        queryParams.append("page", params.pageable.page);
      }
      if (params.pageable.size !== undefined) {
        queryParams.append("size", params.pageable.size);
      }
    } else {
      // Valores padrão para paginação
      queryParams.append("page", "0");
      queryParams.append("size", "20");
    }

    const queryString = queryParams.toString();
    const url = `${API_URL}/v1/invoice/all${queryString ? `?${queryString}` : ""}`;

    const response = await apiFetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      // Backend retorna PageResult: { content, page, size, totalElements, totalPages }
      const invoiceList = data.content || data;
      if (setInvoices) setInvoices(invoiceList);
      return { success: true, data: invoiceList, pagination: { page: data.page, size: data.size, totalElements: data.totalElements, totalPages: data.totalPages } };
    } else {
      const errorMessage = data.detail || data.message || "Erro ao carregar faturas.";
      console.log("Erro", errorMessage);
      return { success: false, errors: { global: errorMessage } };
    }
  } catch (error) {
    const errorMsg = "Erro de conexão. Tente novamente mais tarde.";
    Alert.alert("Erro de conexão", errorMsg);
    return { success: false, errors: { global: errorMsg } };
  }
};