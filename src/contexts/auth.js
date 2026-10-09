import React, { createContext, useState, useEffect, useRef } from "react";
import { useNavigation } from "@react-navigation/native";
import { Alert } from "react-native";
import { API_URL } from "@env";
import * as Device from "expo-device";

// Definidas só no perfil de build `simulator`; em produção vêm indefinidas.
const MODO_CAPTURA = process.env.EXPO_PUBLIC_SCREENSHOT_MODE;
const CAPTURA_EMAIL = process.env.EXPO_PUBLIC_SCREENSHOT_EMAIL;
const CAPTURA_SENHA = process.env.EXPO_PUBLIC_SCREENSHOT_PASSWORD;
import { getConsentStatus } from "./consent";
import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";

import { onAuthFailure } from "../utils/authEvents";
import {
  configureNotificationHandler,
  registerForPushNotificationsAsync,
  registerOnBackend as registerPushOnBackend,
  unregisterOnBackend as unregisterPushOnBackend,
} from "../utils/pushNotifications";

import {
  registerUser as registerUserService,
  updateUser as updateUserService,
  getUserById as getUserByIdService,
  getAllUsers as getAllUsersService,
  deleteUser as deleteUserService,
  getAllStudents as getAllStudentsService,
  getAllInstructors as getAllInstructorsService,
} from "./users";

import {
  getAllNews as getAllNewsService,
  createNews as createNewsService,
  updateNews as updateNewsService,
  deleteNews as deleteNewsService,
  getNewsById as getNewsByIdService,
} from "./news";

import {
  getAllClasses as getAllClassesService,
  createClass as createClassService,
  updateClass as updateClassService,
  deleteClass as deleteClassService,
  getClassById as getClassByIdService,
} from "./classes";

import {
  createHealthDeclaration as createHealthDeclarationService,
  updateHealthDeclaration as updateHealthDeclarationService,
  getHealthDeclarationById as getHealthDeclarationByIdService,
  downloadHealthDeclarationPdf as downloadHealthDeclarationPdfService,
  getHealthDeclarationByUser as getHealthDeclarationByUserService,
  getAllHealthDeclarations as getAllHealthDeclarationsService,
  deleteHealthDeclaration as deleteHealthDeclarationService,
} from "./healthDeclaration";

import {
  regularCheckin as regularCheckinService,
  manualCheckin as manualCheckinService,
  markAttendance as markAttendanceService,
  acceptInvite as acceptInviteService,
  cancelCheckin as cancelCheckinService,
  getCheckinsByUser as getCheckinsByUserService,
  getCheckinsByLesson as getCheckinsByLessonService,
  getDashboard as getDashboardService,
  getCheckinById as getCheckinByIdService,
} from "./checkin";

import {
  getLessonsByClass as getLessonsByClassService,
  joinWaitlist as joinWaitlistService,
  closeAndInvite as closeAndInviteService,
  generateLessons as generateLessonsService,
  generateAllLessons as generateAllLessonsService,
  generateCurrentMonthLessons as generateCurrentMonthLessonsService,
  hasLessonsGenerated as hasLessonsGeneratedService,
} from "./lessons";

import {
  enrollUser as enrollUserService,
  unenrollUser as unenrollUserService,
} from "./enrollment";

import {
  createInvoice as createInvoiceService,
  verifyPayment as verifyPaymentService,
  cancelInvoice as cancelInvoiceService,
  getInvoiceById as getInvoiceByIdService,
  getInvoicesByUser as getInvoicesByUserService,
  getAllInvoices as getAllInvoicesService,
} from "./invoice";

import {
  getAllPlans as getAllPlansService,
  createPlan as createPlanService,
  updatePlan as updatePlanService,
  deletePlan as deletePlanService,
  getUserPlan as getUserPlanService,
  assignPlan as assignPlanService,
  removePlan as removePlanService,
} from "./plan";

export const AuthContext = createContext({});

export default function AuthProvider({ children }) {
  // ================ ESTADOS ================
  const [token, setToken] = useState(null);
  const [user, setUser] = useState({});
  const [classes, setClasses] = useState([]);
  const [userAll, setUserAll] = useState([]);
  const [registerResponse, setRegisterResponse] = useState(null);
  const [consentStatus, setConsentStatus] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [news, setNews] = useState([]);
  const [healthDeclarations, setHealthDeclarations] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [students, setStudents] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [userPlan, setUserPlan] = useState(null);

  const navigation = useNavigation();
  const sessionExpiredAlertedRef = useRef(false);
  const pushTokenRef = useRef(null);

  // ================ FUNÇÕES DE AUTENTICAÇÃO E CREDENCIAIS ================

  // Persistimos APENAS o refresh token (raw) e o email para UX (mostrar
  // último email na tela de login e chave de biometria). Senha NUNCA é
  // armazenada — quem invalida o login é o backend via /auth/refresh.
  async function saveCredentials(email, refreshToken) {
    try {
      await SecureStore.setItemAsync("userEmail", email);
      if (refreshToken) {
        await SecureStore.setItemAsync("refreshToken", refreshToken);
      }
      // Migração: limpa chave antiga "userPassword" se existir de versão anterior
      await SecureStore.deleteItemAsync("userPassword").catch(() => { });
      await SecureStore.deleteItemAsync("userToken").catch(() => { });
    } catch (error) {
      console.error("Erro ao salvar credenciais:", error);
      throw error;
    }
  }

  async function loadCredentials() {
    try {
      const email = await SecureStore.getItemAsync("userEmail");
      const refreshToken = await SecureStore.getItemAsync("refreshToken");
      return { email, refreshToken };
    } catch (error) {
      console.error("Erro ao carregar credenciais:", error);
      return null;
    }
  }

  async function clearCredentials() {
    try {
      await SecureStore.deleteItemAsync("userEmail");
      await SecureStore.deleteItemAsync("refreshToken");
      // Limpa chaves antigas (compat com versões pre-refresh-token)
      await SecureStore.deleteItemAsync("userPassword").catch(() => { });
      await SecureStore.deleteItemAsync("userToken").catch(() => { });
    } catch (error) {
      console.error("Erro ao limpar credenciais:", error);
      throw error;
    }
  }

  async function hasSavedCredentials() {
    try {
      const refreshToken = await SecureStore.getItemAsync("refreshToken");
      return refreshToken !== null;
    } catch (error) {
      console.error("Erro ao verificar credenciais:", error);
      return false;
    }
  }

  async function isBiometricAvailable() {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch (error) {
      console.error("Erro ao verificar biometria:", error);
      return false;
    }
  }

  async function authenticateBiometrically() {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Autentique-se para acessar",
        disableDeviceFallback: false,
        cancelLabel: "Cancelar",
      });

      return {
        success: result.success,
        error: result.success ? null : "Autenticação falhou",
      };
    } catch (error) {
      console.error("Erro na autenticação biométrica:", error);
      return { success: false, error: "Erro na autenticação" };
    }
  }

  // ================ FUNÇÕES DE LOGIN/LOGOUT ================

  /**
   * Decide para onde ir depois de autenticar.
   *
   * Quem ainda não aceitou os termos e a política na versão vigente é levado à
   * tela de consentimento, que não tem como ser dispensada — sem o aceite não há
   * base legal para operar os dados da pessoa. Vale tanto para o primeiro login
   * quanto para quando republicamos um documento com mudança material.
   *
   * Se a consulta falhar (rede fora, API instável), seguimos para a Home: travar
   * a entrada de quem já é usuário por causa de uma falha de rede seria pior do
   * que checar de novo no próximo login.
   */
  async function navigateAfterAuth(authToken) {
    try {
      const status = await getConsentStatus(authToken);
      const pendentes = status?.data?.pendingRequired;

      if (status.success && Array.isArray(pendentes) && pendentes.length > 0) {
        setConsentStatus(status.data);
        navigation.reset({ index: 0, routes: [{ name: "Consent" }] });
        return;
      }

      if (status.success) {
        setConsentStatus(status.data);
      }
    } catch (e) {
      console.error("Falha ao verificar consentimentos:", e);
    }

    navigation.reset({ index: 0, routes: [{ name: "Home" }] });
  }

  async function signIn(email, password, rememberMe = false) {
    setIsAuthenticating(true);
    let errors = {};

    if (!email) {
      errors.email = "O campo email deve ser preenchido.";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.email = "Por favor, insira um email válido.";
      }
    }

    if (!password) {
      errors.password = "O campo senha deve ser preenchido.";
    } else if (password.length < 8) {
      errors.password = "A senha deve ter pelo menos 8 caracteres.";
    }

    if (Object.keys(errors).length > 0) {
      setIsAuthenticating(false);
      return { errors };
    }

    try {
      const response = await fetch(`${API_URL}/v1/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.token && data.user) {
        setUser(data.user);
        setToken(data.token);

        // Sempre que o usuário faz login com sucesso, persistimos o refresh token
        // para permitir auto-login na próxima abertura do app. "Lembrar-me"
        // controla apenas se o email é pré-preenchido na tela de login,
        // pois a senha nunca é armazenada.
        if (data.refreshToken) {
          await saveCredentials(email, data.refreshToken);
        }

        await navigateAfterAuth(data.token);
        return { success: true };
      } else {
        Alert.alert("Erro de autenticação", "Email ou senha incorretos.");
        return {
          success: false,
          errors: { global: "Email ou senha incorretos." },
        };
      }
    } catch (error) {
      Alert.alert("Erro de conexão", "Não foi possível conectar ao servidor.");
      return {
        success: false,
        errors: { global: "Erro de conexão. Tente novamente mais tarde." },
      };
    } finally {
      setIsAuthenticating(false);
    }
  }

  // Renova o access token usando o refresh token guardado no SecureStore.
  // Retorna { success, error } e atualiza o state do AuthProvider em sucesso.
  async function refreshSession() {
    const credentials = await loadCredentials();
    if (!credentials || !credentials.refreshToken) {
      return { success: false, error: "no-refresh-token" };
    }
    try {
      const response = await fetch(`${API_URL}/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: credentials.refreshToken }),
      });
      const data = await response.json();
      if (!response.ok || !data.token || !data.user) {
        // Refresh expirado/inválido: limpa estado pra forçar login novo
        await clearCredentials();
        return { success: false, error: data.detail || "refresh-failed" };
      }
      setUser(data.user);
      setToken(data.token);
      // Rotation: backend já invalidou o token antigo; guarda o novo
      if (data.refreshToken) {
        await saveCredentials(credentials.email || data.user.email, data.refreshToken);
      }
      // Devolve o token: quem chamou precisa dele agora, e o estado do React só
      // reflete o setToken acima no próximo render.
      return { success: true, token: data.token };
    } catch (e) {
      console.error("Erro ao renovar sessão:", e);
      return { success: false, error: "network-error" };
    }
  }

  async function signInWithBiometry() {
    setIsAuthenticating(true);
    try {
      const authResult = await authenticateBiometrically();
      if (!authResult.success) {
        return { success: false, error: authResult.error };
      }

      const credentials = await loadCredentials();
      if (!credentials || !credentials.refreshToken) {
        return { success: false, error: "Nenhuma credencial salva encontrada" };
      }

      // Refresh ao invés de re-login com senha (que não temos mais)
      const result = await refreshSession();
      if (result.success) {
        await navigateAfterAuth(result.token);
      }
      return result;
    } catch (error) {
      console.error("Erro no login biométrico:", error);
      return { success: false, error: "Erro durante o login biométrico" };
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function signOut() {
    try {
      // Revoga o push token no backend antes de derrubar a sessão.
      if (pushTokenRef.current && token) {
        await unregisterPushOnBackend(pushTokenRef.current, token);
        pushTokenRef.current = null;
      }
      // Tenta revogar o refresh token no backend (best-effort).
      const stored = await loadCredentials();
      if (stored?.refreshToken) {
        try {
          await fetch(`${API_URL}/v1/auth/logout`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken: stored.refreshToken }),
          });
        } catch (_) {
          // ignora — limpa local de qualquer forma
        }
      }
      await clearCredentials();
      setUser({});
      setToken(null);
      navigation.reset({ index: 0, routes: [{ name: "Welcome" }] });
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      Alert.alert("Erro", "Não foi possível fazer logout");
    }
  }

  // ── Modo de captura de telas da loja ────────────────────────────────────
  //
  // Autentica sozinho ao abrir, para que a automação que gera os screenshots da
  // App Store não precise digitar no simulador. Isso não é conveniência: o
  // simulador iOS não aceita evento de teclado sintético — cliques entram, texto
  // não —, então sem isto não há como automatizar a captura.
  //
  // Duas travas, ambas necessárias para que isto jamais valha no app publicado:
  //   1. a flag só é injetada pelo perfil de build `simulator` do eas.json;
  //   2. `Device.isDevice` é falso apenas em simulador/emulador, então nem
  //      mesmo um build com a flag ligada se autentica num aparelho real.
  useEffect(() => {
    if (MODO_CAPTURA !== "1" || Device.isDevice) return;
    if (token || !CAPTURA_EMAIL || !CAPTURA_SENHA) return;

    let cancelado = false;
    (async () => {
      const resultado = await signIn(CAPTURA_EMAIL, CAPTURA_SENHA);
      if (!cancelado && !resultado?.success) {
        console.warn("Modo de captura: não foi possível autenticar.");
      }
    })();
    return () => {
      cancelado = true;
    };
    // Roda uma vez, na montagem: é o arranque da sessão.
  }, []);

  // Registro de push token: roda sempre que o user logar (token+user.id presentes).
  // Em web/simulador o helper retorna null e o efeito é no-op.
  useEffect(() => {
    let cancelled = false;
    if (!token || !user?.id) return;
    (async () => {
      await configureNotificationHandler();
      const pushToken = await registerForPushNotificationsAsync();
      if (cancelled || !pushToken) return;
      pushTokenRef.current = pushToken;
      await registerPushOnBackend(pushToken, token);
    })();
    return () => {
      cancelled = true;
    };
  }, [token, user?.id]);

  // Bootstrap: ao montar o AuthProvider, tenta restaurar a sessão via refresh.
  // Se o refresh falhar (não tem token, expirou, foi revogado), o usuário cai
  // na tela de login normalmente — sem alerta agressivo.
  const bootstrapDone = useRef(false);
  useEffect(() => {
    if (bootstrapDone.current) return;
    bootstrapDone.current = true;
    
    (async () => {
      const stored = await loadCredentials();
      if (!stored?.refreshToken) return;
      // NÃO faz autologin automático - apenas verifica se tem credenciais
      // O usuário vai clicar no botão "Acessar" para iniciar o processo
    })();
  }, []);

  // Listener global: quando qualquer chamada autenticada recebe 401,
  // tenta renovar via refresh token primeiro. Só mostra "Sessão expirada"
  // (e desloga) se o refresh também falhar.
  // 403 (role insuficiente) não dispara este listener.
  useEffect(() => {
    const unsubscribe = onAuthFailure(async ({ status }) => {
      if (!token) return; // já deslogado
      if (sessionExpiredAlertedRef.current) return;

      const result = await refreshSession();
      if (result.success) return; // sessão renovada silenciosamente

      sessionExpiredAlertedRef.current = true;
      Alert.alert(
        "Sessão expirada",
        "Sua sessão expirou. Por favor, faça login novamente.",
        [
          {
            text: "OK",
            onPress: () => {
              sessionExpiredAlertedRef.current = false;
              signOut();
            },
          },
        ],
        { cancelable: false }
      );
    });
    return unsubscribe;
  }, [token]);

  // ================ FUNÇÕES DE PERMISSÕES ================

  function hasRole(...roleNames) {
    return user?.roles?.some((role) => roleNames.includes(role.description));
  }

  // ================ FUNÇÕES DE USUÁRIO ================

  async function register(userData) {
    const result = await registerUserService(userData, token);

    if (result.success) {
      setRegisterResponse({
        success: true,
        data: result.data,
        message: "Usuário cadastrado com sucesso!"
      });
      setTimeout(() => setRegisterResponse({}), 4000);
      navigation.navigate("AdminUser");
    } else {
      setRegisterResponse({
        success: false,
        errors: result.errors || { global: "Erro ao registrar usuário" },
      });
      setTimeout(() => setRegisterResponse({}), 4000);
    }

    return result;
  }

  async function updateUser(userData) {
    const result = await updateUserService(userData, token);

    if (result.success) {
      // Atualiza o usuário no estado
      setUser((prevUser) => ({
        ...prevUser,
        ...userData,
        profilePicture: userData.removeProfilePicture
          ? null
          : (userData.profilePicture || prevUser.profilePicture),
      }));

      // Navega de volta para o perfil
      navigation.navigate("Perfil");
    }

    return result;
  }

  async function getUser(userId = null) {
    // Se um userId foi fornecido, busca esse usuário específico
    if (userId) {
      const result = await getUserByIdService(userId, token);
      return result;
    }

    // Se não foi fornecido um userId, busca o usuário logado
    if (!user.id) {
      return {
        success: false,
        errors: { global: "ID do usuário não disponível" },
      };
    }

    const result = await getUserByIdService(user.id, token);

    if (result.success) {
      setUser(result.data); // Atualiza os dados do usuário no estado
    }

    return result;
  }

  async function getAllUsers() {
    return getAllUsersService(token, setUserAll);
  }

  async function deleteUser(userId) {
    return deleteUserService(userId, token, () =>
      getAllUsersService(token, setUserAll),
    );
  }

  async function getAllStudents() {
    return getAllStudentsService(token, setStudents);
  }

  async function getAllInstructors() {
    return getAllInstructorsService(token, setInstructors);
  }

  // ================ FUNÇÕES DE TURMAS ================

  async function classesAll() {
    return getAllClassesService(token, setClasses);
  }

  async function createClass(classData) {
    return createClassService(
      classData,
      token,
      () => getAllClassesService(token, setClasses), // Callback para recarregar
    );
  }

  async function getClassById(classId) {
    return getClassByIdService(classId, token);
  }

  async function updateClass(classData) {
    return updateClassService(
      classData,
      token,
      () => getAllClassesService(token, setClasses), // Callback para recarregar
    );
  }

  async function deleteClass(classId) {
    return deleteClassService(
      classId,
      token,
      () => getAllClassesService(token, setClasses),
    );
  }

  // ================ FUNÇÕES DE NOTÍCIAS ================

  async function getAllNews() {
    return getAllNewsService(token, setNews);
  }

  async function createNews(newsData) {
    return createNewsService(
      newsData,
      token,
      () => getAllNewsService(token, setNews), // Callback para recarregar
    );
  }

  async function updateNews(newsId, newsData) {
    return updateNewsService(
      newsId,
      newsData,
      token,
      () => getAllNewsService(token, setNews), // Callback para recarregar
    );
  }

  async function deleteNews(newsId) {
    return deleteNewsService(
      newsId,
      token,
      () => getAllNewsService(token, setNews), // Callback para recarregar
    );
  }

  async function getNewsById(newsId) {
    return getNewsByIdService(newsId, token);
  }

  // ================ FUNÇÕES PARA HEALTH DECLARATION ================

  async function createHealthDeclaration(healthData) {
    return createHealthDeclarationService(healthData, token);
  }

  async function updateHealthDeclaration(healthId, healthData) {
    return updateHealthDeclarationService(healthId, healthData, token);
  }

  async function getHealthDeclarationById(healthId) {
    return getHealthDeclarationByIdService(healthId, token);
  }

  async function downloadHealthDeclarationPdf(healthId) {
    return downloadHealthDeclarationPdfService(healthId, token);
  }

  async function getHealthDeclarationByUser(userId) {
    return getHealthDeclarationByUserService(userId, token);
  }

  async function getAllHealthDeclarations() {
    return getAllHealthDeclarationsService(token, setHealthDeclarations);
  }

  async function deleteHealthDeclaration(healthId) {
    return deleteHealthDeclarationService(healthId, token, () =>
      getAllHealthDeclarationsService(token, setHealthDeclarations),
    );
  }

  // ================ FUNÇÕES PARA CHECKIN ================

  async function regularCheckin(lessonId, checkinData) {
    return regularCheckinService(lessonId, checkinData, token);
  }

  async function manualCheckin(lessonId, checkinData) {
    return manualCheckinService(lessonId, checkinData, token);
  }

  async function markAttendance(lessonId, attendanceData) {
    return markAttendanceService(lessonId, attendanceData, token);
  }

  async function acceptInvite(inviteId, inviteData) {
    return acceptInviteService(inviteId, inviteData, token);
  }

  async function cancelCheckin(checkinId) {
    return cancelCheckinService(checkinId, token);
  }

  async function getCheckinsByUser(userId, params = {}) {
    return getCheckinsByUserService(userId, params, token, setCheckins);
  }

  async function getCheckinsByLesson(lessonId, params = {}) {
    return getCheckinsByLessonService(lessonId, params, token);
  }

  async function getDashboard() {
    return getDashboardService(token, setDashboardData);
  }

  async function getCheckinById(checkinId) {
    return getCheckinByIdService(checkinId, token);
  }

  // ================ FUNÇÕES PARA LESSONS ================

  async function joinWaitlist(lessonId, waitlistData) {
    return joinWaitlistService(lessonId, waitlistData, token);
  }

  async function closeAndInvite(lessonId) {
    return closeAndInviteService(lessonId, token);
  }

  async function getLessonsByClass(classId, date) {
    return getLessonsByClassService(classId, date, token);
  }

  async function generateLessons(classId, fromDate, toDate) {
  return generateLessonsService(classId, fromDate, toDate, token);
}

async function generateAllLessons(weeksAhead = 4) {
  return generateAllLessonsService(weeksAhead, token);
}

async function generateCurrentMonthLessons(classId) {
  return generateCurrentMonthLessonsService(classId, token);
}

async function hasLessonsGenerated(classId) {
  return hasLessonsGeneratedService(classId, token);
}

  // ================ FUNÇÕES PARA ENROLLMENT ================

  async function enrollUser(userId, classId) {
    return enrollUserService(
      userId,
      classId,
      token,
      () => getAllClassesService(token, setClasses),
    );
  }

  async function unenrollUser(userId, classId) {
    return unenrollUserService(
      userId,
      classId,
      token,
      () => getAllClassesService(token, setClasses),
    );
  }

  // ================ FUNÇÃO PARA INVOICE ================

  async function createInvoice(invoiceData) {
    const result = await createInvoiceService(invoiceData, token);
    if (result.success) {
      await getAllInvoices();
    }
    return result;
  }

  async function verifyPayment(invoiceId) {
    const result = await verifyPaymentService(invoiceId, token);
    if (result.success) {
      await getAllInvoices();
    }
    return result;
  }

  async function cancelInvoice(invoiceId) {
    const result = await cancelInvoiceService(invoiceId, token);
    if (result.success) {
      await getAllInvoices();
    }
    return result;
  }

  async function getInvoiceById(invoiceId) {
    return getInvoiceByIdService(invoiceId, token);
  }

  async function getInvoicesByUser(userId) {
    return getInvoicesByUserService(userId, token);
  }

  async function getAllInvoices(params = {}) {
    return getAllInvoicesService(params, token, setInvoices);
  }

  // ================ FUNÇÕES PARA PLANO ================

  async function getAllPlans(options) {
    return getAllPlansService(token, options);
  }

  async function createPlan(planData) {
    return createPlanService(planData, token);
  }

  async function updatePlan(planId, planData) {
    return updatePlanService(planId, planData, token);
  }

  async function deletePlan(planId) {
    return deletePlanService(planId, token);
  }

  async function getUserPlanByUser(userId) {
    const result = await getUserPlanService(userId, token);
    if (result.success) {
      setUserPlan(result.data);
    } else {
      setUserPlan(null);
    }
    return result;
  }

  async function assignPlan(userId, planId) {
    return assignPlanService(userId, planId, token);
  }

  async function removePlan(userPlanId) {
    return removePlanService(userPlanId, token);
  }

  return (
    <AuthContext.Provider
      value={{
        // Estados
        user,
        token,
        classes,
        userAll,
        registerResponse,
        isAuthenticating,
        consentStatus,
        setConsentStatus,
        news,
        healthDeclarations,
        checkins,
        dashboardData,
        students,
        instructors,
        invoices,
        userPlan,

        // Autenticação e Credenciais
        signIn,
        signInWithBiometry,
        refreshSession,
        signOut,
        isBiometricAvailable,
        hasSavedCredentials,

        // Usuário
        register,
        updateUser,
        getUser,
        getAllUsers,
        deleteUser,
        getAllStudents,
        getAllInstructors,

        // Turmas (Classes)
        classesAll,
        createClass,
        updateClass,
        deleteClass,
        getClassById,

        // Permissões
        hasRole,

        // Notícias
        getAllNews,
        createNews,
        updateNews,
        deleteNews,
        getNewsById,

        // Health Declaration
        createHealthDeclaration,
        updateHealthDeclaration,
        getHealthDeclarationById,
        downloadHealthDeclarationPdf,
        getHealthDeclarationByUser,
        getAllHealthDeclarations,
        deleteHealthDeclaration,

        // Checkin
        regularCheckin,
        manualCheckin,
        markAttendance,
        acceptInvite,
        cancelCheckin,
        getCheckinsByUser,
        getCheckinsByLesson,
        getDashboard,
        getCheckinById,

        // Enrollment
        enrollUser,
        unenrollUser,

        // Lessons
        joinWaitlist,
        closeAndInvite,
        getLessonsByClass,
        generateLessons,
        generateAllLessons,
        generateCurrentMonthLessons,
        hasLessonsGenerated,

        // Invoice
        createInvoice,
        verifyPayment,
        cancelInvoice,
        getInvoiceById,
        getInvoicesByUser,
        getAllInvoices,

        // Plano
        getAllPlans,
        createPlan,
        updatePlan,
        deletePlan,
        getUserPlanByUser,
        assignPlan,
        removePlan,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
