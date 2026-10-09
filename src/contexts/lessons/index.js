// services/lessons.js
import { Alert } from "react-native";
import { API_URL } from "@env";
import { apiFetch } from "../../utils/apiFetch";

// Função para buscar aulas de uma turma (com filtro opcional de data)
export const getLessonsByClass = async (classId, date, token) => {
  try {
    const url = date
      ? `${API_URL}/v1/lessons/class/${classId}?date=${date}`
      : `${API_URL}/v1/lessons/class/${classId}`;

    const response = await apiFetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      return { success: true, data: Array.isArray(data) ? data : [data] };
    } else {
      const errorMessage = data.detail || data.message || "Erro ao buscar aulas da turma.";
      console.log("Erro", errorMessage);
      return { success: false, errors: { global: errorMessage } };
    }
  } catch (error) {
    const errorMsg = "Erro de conexão. Tente novamente mais tarde.";
    Alert.alert("Erro de conexão", errorMsg);
    return { success: false, errors: { global: errorMsg } };
  }
};

// Função para entrar na lista de espera de uma aula
export const joinWaitlist = async (lessonId, waitlistData, token) => {
  try {
    const response = await apiFetch(
      `${API_URL}/v1/lessons/${lessonId}/waitlist/join`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(waitlistData),
      },
    );

    const data = await response.json();

    if (response.ok) {
      return { success: true, data };
    } else {
      const errorMessage = data.detail || data.message || "Erro ao entrar na lista de espera.";
      console.log("Erro", errorMessage);
      return { success: false, errors: { global: errorMessage } };
    }
  } catch (error) {
    const errorMsg = "Erro de conexão. Tente novamente mais tarde.";
    Alert.alert("Erro de conexão", errorMsg);
    return { success: false, errors: { global: errorMsg } };
  }
};

// Função para fechar aula e enviar convites
export const closeAndInvite = async (lessonId, token) => {
  try {
    const response = await apiFetch(
      `${API_URL}/v1/lessons/${lessonId}/close-and-invite`,
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
      return { success: true, data };
    } else {
      const errorMessage = data.detail || data.message || "Erro ao fechar aula e convidar.";
      console.log("Erro", errorMessage);
      return { success: false, errors: { global: errorMessage } };
    }
  } catch (error) {
    const errorMsg = "Erro de conexão. Tente novamente mais tarde.";
    Alert.alert("Erro de conexão", errorMsg);
    return { success: false, errors: { global: errorMsg } };
  }
};

// Função para gerar aulas de uma turma específica
export const generateLessons = async (classId, fromDate, toDate, token) => {
  try {
    const response = await apiFetch(`${API_URL}/v1/lessons/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        classId,
        from: fromDate,
        to: toDate
      }),
    });

    const data = await response.json();

    if (response.ok) {
      Alert.alert(
        "Sucesso",
        `${data.created} aulas geradas! ${data.skippedExisting} aulas já existiam.`
      );
      return { success: true, data };
    } else {
      let errorMessage = data.detail || data.message || "Erro ao gerar aulas.";

      if (response.status === 422) {
        if (errorMessage.includes("sem horários")) {
          errorMessage = "Esta turma não possui horários cadastrados. Cadastre horários primeiro.";
        } else if (errorMessage.includes("Turma não encontrada")) {
          errorMessage = "Turma não encontrada. Verifique o ID da turma.";
        }
      } else if (response.status === 400) {
        errorMessage = "Intervalo de datas inválido. Verifique as datas informadas.";
      }

      Alert.alert("Erro", errorMessage);
      return { success: false, errors: { global: errorMessage } };
    }
  } catch (error) {
    const errorMsg = "Erro de conexão. Tente novamente mais tarde.";
    Alert.alert("Erro de conexão", errorMsg);
    return { success: false, errors: { global: errorMsg } };
  }
};

// Função para gerar aulas para todas as turmas ativas
export const generateAllLessons = async (weeksAhead = 4, token) => {
  try {
    const response = await apiFetch(
      `${API_URL}/v1/lessons/generate-all?weeksAhead=${weeksAhead}`,
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
      Alert.alert("Sucesso", `${data} aulas geradas para todas as turmas!`);
      return { success: true, data };
    } else {
      const errorMessage = data.detail || data.message || "Erro ao gerar aulas para todas as turmas.";
      Alert.alert("Erro", errorMessage);
      return { success: false, errors: { global: errorMessage } };
    }
  } catch (error) {
    const errorMsg = "Erro de conexão. Tente novamente mais tarde.";
    Alert.alert("Erro de conexão", errorMsg);
    return { success: false, errors: { global: errorMsg } };
  }
};

// Função para verificar se uma turma tem aulas geradas
export const hasLessonsGenerated = async (classId, token) => {
  try {
    const result = await getLessonsByClass(classId, null, token);
    if (result.success) {
      return {
        success: true,
        hasLessons: result.data.length > 0,
        count: result.data.length
      };
    }
    return { success: false, hasLessons: false, errors: result.errors };
  } catch (error) {
    return {
      success: false,
      hasLessons: false,
      errors: { global: "Erro ao verificar aulas" }
    };
  }
};

// Função para gerar aulas do mês atual
export const generateCurrentMonthLessons = async (classId, token) => {
  const now = new Date();
  const fromDate = now.toISOString().split('T')[0];
  const toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  return generateLessons(classId, fromDate, toDate, token);
};

// Função para gerar aulas do próximo mês
export const generateNextMonthLessons = async (classId, token) => {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const fromDate = nextMonth.toISOString().split('T')[0];
  const toDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).toISOString().split('T')[0];

  return generateLessons(classId, fromDate, toDate, token);
};