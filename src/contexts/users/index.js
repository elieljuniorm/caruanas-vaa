// services/users.js
import { Alert } from "react-native";
import { API_URL } from "@env";
import { apiFetch } from "../../utils/apiFetch";

// Função para registrar um novo usuário
export const registerUser = async (userData, token) => {
  const { email, password, name, codeRole, phoneNumber } = userData;
  const errors = {};

  // Validação do campo de email
  if (!email) {
    errors.email = "O campo email deve ser preenchido.";
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.email = "Por favor, insira um email válido.";
    }
  }

  // Validação do campo de senha
  if (!password) {
    errors.password = "O campo senha deve ser preenchido.";
  } else if (password.length < 8) {
    // API requer mínimo 8 caracteres
    errors.password = "A senha deve ter pelo menos 8 caracteres.";
  }

  // Validação do nome
  if (!name) {
    errors.name = "O campo nome deve ser preenchido.";
  } else if (name.length < 3 || name.length > 100) {
    errors.name = "O nome deve ter entre 3 e 100 caracteres.";
  }

  // Validação do telefone
  if (!phoneNumber) {
    errors.phoneNumber = "O campo telefone deve ser preenchido.";
  } else if (phoneNumber.length < 10 || phoneNumber.length > 15) {
    errors.phoneNumber = "O telefone deve ter entre 10 e 15 caracteres.";
  }

  // Validação do código de role
  if (!codeRole) {
    errors.codeRole = "O tipo de usuário deve ser selecionado.";
  } else if (![1, 2, 3].includes(Number(codeRole))) {
    errors.codeRole = "Tipo de usuário inválido.";
  }

  // Retorna os erros se houver
  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  try {
    const response = await apiFetch(`${API_URL}/v1/user/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email,
        password,
        name,
        codeRole: Number(codeRole), // Garante que seja número
        phoneNumber,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      return { success: true, data };
    } else {
      const errorMessage =
        data.detail || data.message || "Erro ao criar usuário";
      return {
        success: false,
        errors: { global: errorMessage },
        status: response.status,
      };
    }
  } catch (error) {
    const errorMsg = "Erro de conexão. Tente novamente mais tarde.";
    return {
      success: false,
      errors: { global: errorMsg },
    };
  }
};

// Função para atualizar um usuário
export const updateUser = async (userData, token) => {
  try {
    const response = await apiFetch(`${API_URL}/v1/user/update`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (response.ok) {
      return { success: true, data };
    } else {
      const errorMessage =
        data.detail ||
        data.message ||
        "Erro ao atualizar o cadastro do usuário.";
      Alert.alert("Não foi possível salvar", errorMessage);
      return { success: false, errors: { global: errorMessage } };
    }
  } catch (error) {
    const errorMsg = "Erro de conexão. Tente novamente mais tarde.";
    Alert.alert("Erro de conexão", errorMsg);
    return { success: false, errors: { global: errorMsg } };
  }
};

// Função para buscar um usuário por ID
export const getUserById = async (userId, token) => {
  try {
    const response = await apiFetch(`${API_URL}/v1/user/${userId}`, {
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
        data.detail || data.message || "Erro ao buscar os dados do usuário.";
      return { success: false, errors: { global: errorMessage } };
    }
  } catch (error) {
    const errorMsg = "Erro de conexão. Tente novamente mais tarde.";
    return { success: false, errors: { global: errorMsg } };
  }
};

// Função para buscar todos os usuários
export const getAllUsers = async (token, setUserAll) => {
  try {
    const response = await apiFetch(`${API_URL}/v1/user/all`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      if (setUserAll) setUserAll(data);
      return { success: true, data };
    } else {
      const errorMessage =
        data.detail || data.message || "Erro ao buscar os dados dos usuários.";
      console.log("Erro", errorMessage);
      return { success: false, errors: { global: errorMessage } };
    }
  } catch (error) {
    const errorMsg = "Erro de conexão. Tente novamente mais tarde.";
    Alert.alert("Erro de conexão", errorMsg);
    return { success: false, errors: { global: errorMsg } };
  }
};

// Função para excluir um usuário
export const deleteUser = async (userId, token, callback) => {
  Alert.alert(
    "Confirmação",
    "Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.",
    [
      {
        text: "Cancelar",
        style: "cancel",
      },
      {
        text: "Excluir",
        onPress: async () => {
          try {
            const response = await apiFetch(`${API_URL}/v1/user/delete/${userId}`, {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            });

            if (response.ok) {
              Alert.alert("Sucesso", "Usuário excluído com sucesso.");
              // Chama o callback para recarregar a lista
              if (callback) await callback();
            } else {
              const text = await response.text();
              let errorMessage = "Erro ao excluir o usuário.";
              try {
                const data = JSON.parse(text);
                errorMessage = data.detail || data.message || errorMessage;
              } catch (_) {}
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

// Função para buscar todos os estudantes
export const getAllStudents = async (token, setStudents) => {
  try {
    const response = await apiFetch(`${API_URL}/v1/user/students`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      if (setStudents) setStudents(data);
      return { success: true, data };
    } else {
      const errorMessage = data.detail || data.message || "Erro ao carregar estudantes.";
      console.log("Erro", errorMessage);
      return { success: false, errors: { global: errorMessage } };
    }
  } catch (error) {
    const errorMsg = "Erro de conexão. Tente novamente mais tarde.";
    Alert.alert("Erro de conexão", errorMsg);
    return { success: false, errors: { global: errorMsg } };
  }
};

// Função para buscar todos os instrutores
export const getAllInstructors = async (token, setInstructors) => {
  try {
    const response = await apiFetch(`${API_URL}/v1/user/instructors`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      if (setInstructors) setInstructors(data);
      return { success: true, data };
    } else {
      const errorMessage = data.detail || data.message || "Erro ao carregar instrutores.";
      console.log("Erro", errorMessage);
      return { success: false, errors: { global: errorMessage } };
    }
  } catch (error) {
    const errorMsg = "Erro de conexão. Tente novamente mais tarde.";
    Alert.alert("Erro de conexão", errorMsg);
    return { success: false, errors: { global: errorMsg } };
  }
};
