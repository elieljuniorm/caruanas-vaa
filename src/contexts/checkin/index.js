// services/checkin.js
import { Alert } from "react-native";
import { API_URL } from "@env";
import { apiFetch } from "../../utils/apiFetch";

// Lista convites SENT ativos do usuário logado
export const getMyInvites = async (token) => {
  try {
    const response = await apiFetch(`${API_URL}/v1/checkin/invites/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (response.ok) return { success: true, data };
    return { success: false, errors: { global: data.detail || "Erro ao buscar convites." } };
  } catch (_) {
    return { success: false, errors: { global: "Erro de conexão." } };
  }
};

// Função para realizar check-in regular
export const regularCheckin = async (lessonId, checkinData, token) => {
  try {
    const response = await apiFetch(
      `${API_URL}/v1/checkin/lessons/${lessonId}/checkins/regular`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(checkinData),
      },
    );

    const data = await response.json();

    if (response.ok) {
      return { success: true, data };
    } else {
      const errorMessage = data.detail || data.message || "Erro ao realizar check-in regular.";
      //console.log("Erro", errorMessage);
      return { success: false, errors: { global: errorMessage } };
    }
  } catch (error) {
    const errorMsg = "Erro de conexão. Tente novamente mais tarde.";
    Alert.alert("Erro de conexão", errorMsg);
    return { success: false, errors: { global: errorMsg } };
  }
};

// Função para check-in manual pelo instrutor
export const manualCheckin = async (lessonId, checkinData, token) => {
  try {
    const response = await apiFetch(
      `${API_URL}/v1/checkin/lessons/${lessonId}/attendance/manual`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(checkinData),
      },
    );

    const data = await response.json();

    if (response.ok) {
      return { success: true, data };
    } else {
      const errorMessage = data.detail || data.message || "Erro ao realizar check-in manual.";
      return { success: false, errors: { global: errorMessage } };
    }
  } catch (error) {
    const errorMsg = "Erro de conexão. Tente novamente mais tarde.";
    return { success: false, errors: { global: errorMsg } };
  }
};

// Função para marcar presença
export const markAttendance = async (lessonId, attendanceData, token) => {
  try {
    const response = await apiFetch(
      `${API_URL}/v1/checkin/lessons/${lessonId}/attendance`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(attendanceData),
      },
    );

    const data = await response.json();

    if (response.ok) {
      Alert.alert("Sucesso", "Presença marcada com sucesso!");
      return { success: true, data };
    } else {
      const errorMessage = data.detail || data.message || "Erro ao marcar presença.";
      //console.log("Erro", errorMessage);
      return { success: false, errors: { global: errorMessage } };
    }
  } catch (error) {
    const errorMsg = "Erro de conexão. Tente novamente mais tarde.";
    Alert.alert("Erro de conexão", errorMsg);
    return { success: false, errors: { global: errorMsg } };
  }
};

// Função para aceitar convite
export const acceptInvite = async (inviteId, inviteData, token) => {
  try {
    const response = await apiFetch(
      `${API_URL}/v1/checkin/invites/${inviteId}/accept`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(inviteData),
      },
    );

    const data = await response.json();

    if (response.ok) {
      Alert.alert("Sucesso", "Convite aceito com sucesso!");
      return { success: true, data };
    } else {
      const errorMessage = data.detail || data.message || "Erro ao aceitar convite.";
      //console.log("Erro", errorMessage);
      return { success: false, errors: { global: errorMessage } };
    }
  } catch (error) {
    const errorMsg = "Erro de conexão. Tente novamente mais tarde.";
    Alert.alert("Erro de conexão", errorMsg);
    return { success: false, errors: { global: errorMsg } };
  }
};

// Função para cancelar check-in
export const cancelCheckin = async (checkinId, token) => {
  try {
    const response = await apiFetch(
      `${API_URL}/v1/checkin/checkins/${checkinId}/cancel`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const data = await response.json();

    if (response.ok) {
      Alert.alert("Sucesso", "Check-in cancelado com sucesso!");
      return { success: true, data };
    } else {
      const errorMessage = data.detail || data.message || "Erro ao cancelar check-in.";

      // Mensagem específica para tentativa de cancelar check-in de outro usuário
      if (response.status === 422 && errorMessage.includes("outro usuário")) {
        Alert.alert("Erro", "Você só pode cancelar seu próprio check-in.");
      } else {
        //console.log("Erro", errorMessage);
      }

      return { success: false, errors: { global: errorMessage } };
    }
  } catch (error) {
    const errorMsg = "Erro de conexão. Tente novamente mais tarde.";
    Alert.alert("Erro de conexão", errorMsg);
    return { success: false, errors: { global: errorMsg } };
  }
};

// Função para buscar check-ins por usuário
export const getCheckinsByUser = async (userId, params, token, setCheckins) => {
  try {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_URL}/v1/checkin/users/${userId}/checkins${queryParams ? `?${queryParams}` : ""}`;

    const response = await apiFetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      const checkinData = data.content || data;
      if (setCheckins) setCheckins(checkinData);
      return { success: true, data: checkinData };
    } else {
      const errorMessage =
        data.detail || data.message || "Erro ao carregar check-ins do usuário.";
      //console.log("Erro", errorMessage);
      return { success: false, errors: { global: errorMessage } };
    }
  } catch (error) {
    const errorMsg = "Erro de conexão. Tente novamente mais tarde.";
    Alert.alert("Erro de conexão", errorMsg);
    return { success: false, errors: { global: errorMsg } };
  }
};

// Função para buscar check-ins por aula
export const getCheckinsByLesson = async (lessonId, params, token) => {
  try {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_URL}/v1/checkin/lessons/${lessonId}/checkins${queryParams ? `?${queryParams}` : ""}`;

    const response = await apiFetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      const checkinData = data.content || data;
      return { success: true, data: checkinData };
    } else {
      const errorMessage =
        data.detail || data.message || "Erro ao carregar check-ins da aula.";
      return { success: false, errors: { global: errorMessage } };
    }
  } catch (error) {
    const errorMsg = "Erro de conexão. Tente novamente mais tarde.";
    return { success: false, errors: { global: errorMsg } };
  }
};

// Função para buscar dashboard
export const getDashboard = async (token, setDashboardData) => {
  try {
    const response = await apiFetch(`${API_URL}/v1/checkin/dashboard`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const contentType = response.headers.get("content-type") || "";
    const contentLength = response.headers.get("content-length");
    let data = null;

    if (!contentLength || contentLength !== "0") {
      if (contentType.includes("application/json")) {
        try {
          data = await response.json();
        } catch (parseError) {
          console.warn("Falha ao parsear dashboard JSON", parseError);
        }
      }
    }

    if (response.ok) {
      if (setDashboardData) setDashboardData(data);
      return { success: true, data };
    }

    const errorMessage =
      data?.detail || data?.message || `Erro ao carregar dashboard (status ${response.status})`;
    console.warn("getDashboard falhou", {
      status: response.status,
      body: data,
    });
    //console.log("Erro", errorMessage);
    return { success: false, errors: { global: errorMessage } };
  } catch (error) {
    console.warn("Erro de conexão ao carregar dashboard", error);
    Alert.alert("Erro", "Erro de conexão. Tente novamente mais tarde.");
    return {
      success: false,
      errors: { global: "Erro de conexão. Tente novamente mais tarde." },
    };
  }
};

// Função para buscar check-in por ID
export const getCheckinById = async (checkinId, token) => {
  try {
    const response = await apiFetch(`${API_URL}/v1/checkin/checkins/${checkinId}`, {
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
        data.detail || data.message || "Erro ao buscar detalhes do check-in.";
      //console.log("Erro", errorMessage);
      return { success: false, errors: { global: errorMessage } };
    }
  } catch (error) {
    const errorMsg = "Erro de conexão. Tente novamente mais tarde.";
    Alert.alert("Erro de conexão", errorMsg);
    return { success: false, errors: { global: errorMsg } };
  }
};