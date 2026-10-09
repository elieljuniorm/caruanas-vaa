import React, { useState, useContext, useEffect } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    View,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity,
    Modal,
    Alert,
    StatusBar,
    Dimensions,
    Switch,
    TextInput,
} from "react-native";
import * as Animatable from "react-native-animatable";
import { useFonts } from "expo-font";
import { AntDesign, Feather, MaterialIcons } from "@expo/vector-icons";
import { colors } from "../../styles/colors";
import TabNavigator from "../../components/tabNavigator";
import { AuthContext } from "../../contexts/auth";
import { getUserPlan } from "../../contexts/plan";

const { width } = Dimensions.get("window");

const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
};

const formatPrice = (amount) => {
    if (amount == null) return "";
    return Number(amount).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    });
};

export default function Flat() {
    const {
        user,
        hasRole,
        getUserPlanByUser,
        getAllPlans,
        createPlan,
        updatePlan,
        deletePlan,
        assignPlan,
        removePlan,
        getAllStudents,
        students,
        userPlan,
        token,
        getDashboard,
        dashboardData,
    } = useContext(AuthContext);

    const [allPlans, setAllPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [studentPlan, setStudentPlan] = useState(null);
    const [loadingStudentPlan, setLoadingStudentPlan] = useState(false);
    const [assignModalVisible, setAssignModalVisible] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // Cadastro/edição de plano (admin). `planForm` null = modal fechado;
    // `planForm.id` null = criação.
    const [planForm, setPlanForm] = useState(null);
    const [savingPlan, setSavingPlan] = useState(false);

    const [fontsLoaded] = useFonts({
        Nunito: require("../../../assets/fonts/Nunito-Regular.ttf"),
        "Nunito-Bold": require("../../../assets/fonts/Nunito-Bold.ttf"),
        "Nunito-SemiBold": require("../../../assets/fonts/Nunito-SemiBold.ttf"),
    });

    const isAdmin = hasRole("Administrador");

    const loadData = async () => {
        setLoading(true);
        try {
            // O admin precisa enxergar plano desativado para poder reativá-lo.
            const promises = [getAllPlans({ includeInactive: isAdmin })];
            if (!isAdmin && user?.id) {
                promises.push(getUserPlanByUser(user.id));
                promises.push(getDashboard());
            }
            if (isAdmin) promises.push(getAllStudents());
            const [plansResult] = await Promise.all(promises);
            if (plansResult?.success && plansResult.data) {
                setAllPlans(plansResult.data);
            }
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    useEffect(() => {
        if (user?.id) loadData();
    }, [user?.id]);

    const openStudentModal = async (student) => {
        setSelectedStudent(student);
        setStudentPlan(null);
        setLoadingStudentPlan(true);
        const result = await getUserPlan(student.id, token);
        setStudentPlan(result.success ? result.data : null);
        setLoadingStudentPlan(false);
    };

    const handleAssignPlan = async (planId) => {
        if (!selectedStudent) return;
        setActionLoading(true);
        const result = await assignPlan(selectedStudent.id, planId);
        setActionLoading(false);
        if (result.success) {
            Alert.alert("Sucesso", `Plano atribuído a ${selectedStudent.name}.`);
            setAssignModalVisible(false);
            const updated = await getUserPlan(selectedStudent.id, token);
            setStudentPlan(updated.success ? updated.data : null);
        }
    };

    const handleRemovePlan = () => {
        if (!studentPlan) return;
        Alert.alert(
            "Remover plano",
            `Deseja remover o plano de ${selectedStudent?.name}?`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Remover",
                    style: "destructive",
                    onPress: async () => {
                        setActionLoading(true);
                        const result = await removePlan(studentPlan.id);
                        setActionLoading(false);
                        if (result.success) {
                            setStudentPlan(null);
                        }
                    },
                },
            ],
        );
    };

    // ---- Cadastro / edição de plano (admin) ----

    const emptyPlanForm = {
        id: null,
        name: "",
        description: "",
        price: "",
        durationMonths: "",
        weeklyClassLimit: "",
        monthlyClassLimit: "",
        active: true,
    };

    const openNewPlan = () => setPlanForm({ ...emptyPlanForm });

    const openEditPlan = (plan) =>
        setPlanForm({
            id: plan.id,
            name: plan.name ?? "",
            description: plan.description ?? "",
            price: plan.price != null ? String(plan.price) : "",
            durationMonths: plan.durationMonths != null ? String(plan.durationMonths) : "",
            weeklyClassLimit: plan.weeklyClassLimit != null ? String(plan.weeklyClassLimit) : "",
            monthlyClassLimit: plan.monthlyClassLimit != null ? String(plan.monthlyClassLimit) : "",
            active: plan.active !== false,
        });

    const setPlanField = (field, value) =>
        setPlanForm((prev) => (prev ? { ...prev, [field]: value } : prev));

    // Aceita "120,50" e "120.50"; devolve null quando o campo está vazio.
    const parseDecimal = (text) => {
        if (text == null || String(text).trim() === "") return null;
        const n = Number(String(text).replace(/\./g, "").replace(",", "."));
        return Number.isFinite(n) ? n : NaN;
    };

    const parseInteger = (text) => {
        if (text == null || String(text).trim() === "") return null;
        const n = Number(String(text).replace(/\D/g, ""));
        return Number.isFinite(n) ? n : NaN;
    };

    const handleSavePlan = async () => {
        if (!planForm) return;

        const price = parseDecimal(planForm.price);
        const durationMonths = parseInteger(planForm.durationMonths);
        const weeklyClassLimit = parseInteger(planForm.weeklyClassLimit);
        const monthlyClassLimit = parseInteger(planForm.monthlyClassLimit);

        const erros = [];
        if (!planForm.name.trim() || planForm.name.trim().length < 3) {
            erros.push("Nome deve ter pelo menos 3 caracteres.");
        }
        if (!planForm.description.trim() || planForm.description.trim().length < 3) {
            erros.push("Descrição deve ter pelo menos 3 caracteres.");
        }
        if (price == null || Number.isNaN(price) || price < 0) {
            erros.push("Informe um preço válido.");
        }
        if (durationMonths == null || Number.isNaN(durationMonths) || durationMonths < 1) {
            erros.push("Duração deve ser de pelo menos 1 mês.");
        }
        if (Number.isNaN(weeklyClassLimit) || Number.isNaN(monthlyClassLimit)) {
            erros.push("Os limites de aulas devem ser números.");
        }
        if (erros.length) {
            Alert.alert("Confira os campos", erros.join("\n"));
            return;
        }

        const payload = {
            name: planForm.name.trim(),
            description: planForm.description.trim(),
            price,
            durationMonths,
            weeklyClassLimit,
            monthlyClassLimit,
            active: planForm.active,
        };

        setSavingPlan(true);
        const result = planForm.id
            ? await updatePlan(planForm.id, payload)
            : await createPlan(payload);
        setSavingPlan(false);

        if (result?.success) {
            setPlanForm(null);
            await loadData();
            Alert.alert("Pronto", planForm.id ? "Plano atualizado." : "Plano criado.");
        } else {
            Alert.alert("Erro", result?.errors?.global || "Não foi possível salvar o plano.");
        }
    };

    const handleDeletePlan = () => {
        if (!planForm?.id) return;
        Alert.alert(
            "Excluir plano",
            `Excluir o plano "${planForm.name}"? Alunos já vinculados impedem a exclusão — nesse caso, desative o plano.`,
            [
                { text: "Manter", style: "cancel" },
                {
                    text: "Excluir",
                    style: "destructive",
                    onPress: async () => {
                        setSavingPlan(true);
                        const result = await deletePlan(planForm.id);
                        setSavingPlan(false);
                        if (result?.success) {
                            setPlanForm(null);
                            await loadData();
                            Alert.alert("Pronto", "Plano excluído.");
                        } else {
                            Alert.alert(
                                "Não foi possível excluir",
                                result?.errors?.global || "Tente novamente.",
                            );
                        }
                    },
                },
            ],
        );
    };

    if (!fontsLoaded) return null;

    const availablePlans = isAdmin
        ? allPlans
        : (userPlan ? allPlans.filter((p) => p.id !== userPlan.planId) : allPlans);

    const getProgressPercentage = () => {
        if (!userPlan?.monthlyClassLimit) return 0;
        const used = dashboardData?.completedClassesMonth ?? 0;
        return Math.min((used / userPlan.monthlyClassLimit) * 100, 100);
    };

    return (
        <View style={styles.container}>
            <StatusBar
                barStyle="light-content"
                backgroundColor={colors.backgroundOrange}
            />

            <Animatable.View
                animation="fadeInLeft"
                delay={500}
                style={styles.containerHeader}
            >
                <Text style={styles.message}>Plano</Text>
            </Animatable.View>

            <Animatable.View animation="fadeInUp" style={styles.containerForm}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[colors.textOrange]}
                            tintColor={colors.textOrange}
                        />
                    }
                >
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={colors.textOrange} />
                            <Text style={styles.loadingText}>Carregando planos...</Text>
                        </View>
                    ) : (
                        <>
                            {/* Só mostra plano ativo para alunos */}
                            {!isAdmin && (
                                <>
                                    {userPlan ? (
                                        <View style={styles.section}>
                                            <View style={styles.sectionHeader}>
                                                <Feather
                                                    name="award"
                                                    size={20}
                                                    color={colors.textOrange}
                                                />
                                                <Text style={styles.sectionTitle}>Plano Ativo</Text>
                                            </View>
                                            <View style={styles.activePlanCard}>
                                                <View style={styles.activePlanHeader}>
                                                    <Text style={styles.activePlanName}>
                                                        {userPlan.planName}
                                                    </Text>
                                                    <View style={styles.activeBadge}>
                                                        <View style={styles.activeDot} />
                                                        <Text style={styles.activeBadgeText}>Ativo</Text>
                                                    </View>
                                                </View>

                                                {userPlan.planDescription && (
                                                    <Text style={styles.planDescription}>
                                                        {userPlan.planDescription}
                                                    </Text>
                                                )}

                                                {userPlan.monthlyClassLimit && (
                                                    <View style={styles.progressContainer}>
                                                        <View style={styles.progressHeader}>
                                                            <Text style={styles.progressLabel}>
                                                                Progresso mensal
                                                            </Text>
                                                            <Text style={styles.progressValue}>
                                                                {dashboardData?.completedClassesMonth ?? 0}/
                                                                {userPlan.monthlyClassLimit} aulas
                                                            </Text>
                                                        </View>
                                                        <View style={styles.progressBar}>
                                                            <View
                                                                style={[
                                                                    styles.progressFill,
                                                                    { width: `${getProgressPercentage()}%` },
                                                                ]}
                                                            />
                                                        </View>
                                                    </View>
                                                )}

                                                <View style={styles.planDetailsGrid}>
                                                    {userPlan.weeklyClassLimit != null && (
                                                        <View style={styles.planDetailCard}>
                                                            <Feather
                                                                name="calendar"
                                                                size={18}
                                                                color={colors.textOrange}
                                                            />
                                                            <View>
                                                                <Text style={styles.planDetailLabel}>
                                                                    Aulas/semana
                                                                </Text>
                                                                <Text style={styles.planDetailValue}>
                                                                    {userPlan.weeklyClassLimit}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    )}
                                                    {userPlan.monthlyClassLimit != null && (
                                                        <View style={styles.planDetailCard}>
                                                            <Feather
                                                                name="trending-up"
                                                                size={18}
                                                                color={colors.textOrange}
                                                            />
                                                            <View>
                                                                <Text style={styles.planDetailLabel}>
                                                                    Aulas/mês
                                                                </Text>
                                                                <Text style={styles.planDetailValue}>
                                                                    {userPlan.monthlyClassLimit}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    )}
                                                    {userPlan.price != null && (
                                                        <View style={styles.planDetailCard}>
                                                            <Feather
                                                                name="dollar-sign"
                                                                size={18}
                                                                color={colors.textOrange}
                                                            />
                                                            <View>
                                                                <Text style={styles.planDetailLabel}>
                                                                    Mensalidade
                                                                </Text>
                                                                <Text style={styles.planDetailValue}>
                                                                    {formatPrice(userPlan.price)}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    )}
                                                </View>

                                                {userPlan.nextDueDate && (
                                                    <View style={styles.dueDateContainer}>
                                                        <Feather
                                                            name="clock"
                                                            size={14}
                                                            color={colors.textWhiteDark}
                                                        />
                                                        <Text style={styles.nextDueDate}>
                                                            Próximo vencimento:{" "}
                                                            {formatDate(userPlan.nextDueDate)}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    ) : (
                                        <View style={styles.section}>
                                            <View style={styles.noPlanCard}>
                                                <Feather
                                                    name="credit-card"
                                                    size={48}
                                                    color={colors.textWhiteDark}
                                                />
                                                <Text style={styles.noPlanText}>
                                                    Nenhum plano ativo
                                                </Text>
                                                <Text style={styles.noPlanSub}>
                                                    Fale com seu professor para contratar um plano.
                                                </Text>
                                            </View>
                                        </View>
                                    )}
                                </>
                            )}

                            {/* Gestão de Alunos */}
                            {isAdmin && (
                                <>
                                    <View style={styles.section}>
                                        <View style={styles.sectionHeader}>
                                            <Feather
                                                name="users"
                                                size={20}
                                                color={colors.textOrange}
                                            />
                                            <Text style={styles.sectionTitle}>Gestão de Alunos</Text>
                                        </View>
                                        <Text style={styles.adminSubtitle}>
                                            Toque em um aluno para gerenciar seu plano
                                        </Text>
                                    </View>

                                    {students?.length > 0 ? (
                                        <View style={styles.studentsGrid}>
                                            {students.map((student, index) => (
                                                <Animatable.View
                                                    key={student.id}
                                                    animation="fadeInLeft"
                                                    delay={index * 50}
                                                    duration={300}
                                                >
                                                    <TouchableOpacity
                                                        style={styles.studentRow}
                                                        accessibilityRole="button"
                                                        accessibilityLabel={`Ver plano de ${student.name || student.email}`}
                                                        onPress={() => openStudentModal(student)}
                                                        activeOpacity={0.7}
                                                    >
                                                        <View style={styles.studentCard}>
                                                            <View style={styles.studentAvatar}>
                                                                <Text style={styles.avatarText}>
                                                                    {student.name?.charAt(0).toUpperCase()}
                                                                </Text>
                                                            </View>
                                                            <View style={styles.studentRowInfo}>
                                                                <Text style={styles.studentRowName}>
                                                                    {student.name}
                                                                </Text>
                                                                <Text style={styles.studentRowEmail}>
                                                                    {student.email}
                                                                </Text>
                                                            </View>
                                                            <Feather
                                                                name="chevron-right"
                                                                size={20}
                                                                color={colors.textOrange}
                                                            />
                                                        </View>
                                                    </TouchableOpacity>
                                                </Animatable.View>
                                            ))}
                                        </View>
                                    ) : (
                                        <View style={styles.emptyState}>
                                            <Feather
                                                name="user-x"
                                                size={48}
                                                color={colors.textWhiteDark}
                                            />
                                            <Text style={styles.emptyText}>
                                                Nenhum aluno encontrado
                                            </Text>
                                        </View>
                                    )}
                                </>
                            )}

                            {/* Planos */}
                            <View style={styles.dividerContainer}>
                                <View style={styles.dividerLine} />
                                <View style={styles.dividerBadge}>
                                    <Feather
                                        name="layers"
                                        size={16}
                                        color={colors.textOrange}
                                    />
                                    <Text style={styles.dividerText}>
                                        Planos Disponíveis
                                    </Text>
                                </View>
                                <View style={styles.dividerLine} />
                            </View>

                            {isAdmin && (
                                <TouchableOpacity
                                    style={styles.newPlanButton}
                                    accessibilityRole="button"
                                    accessibilityLabel="Criar novo plano"
                                    onPress={openNewPlan}
                                    activeOpacity={0.8}
                                >
                                    <Feather name="plus" size={16} color={colors.textWhite} />
                                    <Text style={styles.newPlanButtonText}>Novo plano</Text>
                                </TouchableOpacity>
                            )}

                            <View style={styles.section}>
                                {availablePlans.length > 0 ? (
                                    availablePlans.map((plan, index) => (
                                        <Animatable.View
                                            key={plan.id}
                                            animation="fadeInUp"
                                            delay={index * 100}
                                            duration={400}
                                        >
                                            <TouchableOpacity
                                                style={[
                                                    styles.planCard,
                                                    plan.active === false && styles.planCardInactive,
                                                ]}
                                                activeOpacity={isAdmin ? 0.7 : 1}
                                                disabled={!isAdmin}
                                                onPress={() => openEditPlan(plan)}
                                                accessibilityRole={isAdmin ? 'button' : 'text'}
                                                // Para o aluno o card é só informação; só o admin edita.
                                                accessibilityLabel={isAdmin
                                                    ? `Editar plano ${plan.name}${plan.active === false ? ', inativo' : ''}`
                                                    : `Plano ${plan.name}`}
                                                accessibilityState={{ disabled: !isAdmin }}
                                            >
                                                <View style={styles.planCardLeft}>
                                                    <View style={styles.planCardHeader}>
                                                        <Text style={styles.planCardName}>
                                                            {plan.name}
                                                        </Text>
                                                        {plan.active === false && (
                                                            <View style={styles.inactiveBadge}>
                                                                <Text style={styles.inactiveBadgeText}>Inativo</Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                    {plan.description && (
                                                        <Text style={styles.planCardDescription}>
                                                            {plan.description}
                                                        </Text>
                                                    )}
                                                    <View style={styles.planFeatures}>
                                                        {plan.weeklyClassLimit != null && (
                                                            <View style={styles.featureItem}>
                                                                <Feather
                                                                    name="check"
                                                                    size={12}
                                                                    color={colors.textOrange}
                                                                />
                                                                <Text style={styles.featureText}>
                                                                    {plan.weeklyClassLimit}x/semana
                                                                </Text>
                                                            </View>
                                                        )}
                                                        {plan.monthlyClassLimit != null && (
                                                            <View style={styles.featureItem}>
                                                                <Feather
                                                                    name="check"
                                                                    size={12}
                                                                    color={colors.textOrange}
                                                                />
                                                                <Text style={styles.featureText}>
                                                                    {plan.monthlyClassLimit} aulas/mês
                                                                </Text>
                                                            </View>
                                                        )}
                                                        {plan.durationMonths != null && (
                                                            <View style={styles.featureItem}>
                                                                <Feather
                                                                    name="check"
                                                                    size={12}
                                                                    color={colors.textOrange}
                                                                />
                                                                <Text style={styles.featureText}>
                                                                    {plan.durationMonths}{" "}
                                                                    {plan.durationMonths === 1
                                                                        ? "mês"
                                                                        : "meses"}
                                                                </Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                </View>
                                                <View style={styles.planCardRight}>
                                                    <Text style={styles.planCardPrice}>
                                                        {formatPrice(plan.price)}
                                                    </Text>
                                                    {/* Texto adaptado para cada tipo de usuário */}
                                                    {isAdmin ? (
                                                        <View style={styles.contactBadge}>
                                                            <Feather
                                                                name="edit-2"
                                                                size={12}
                                                                color={colors.textOrange}
                                                            />
                                                            <Text style={[styles.planCardNote, styles.planCardNoteAction]}>
                                                                Editar plano
                                                            </Text>
                                                        </View>
                                                    ) : (
                                                        <View style={styles.contactBadge}>
                                                            <Feather
                                                                name="message-circle"
                                                                size={12}
                                                                color={colors.textWhiteDark}
                                                            />
                                                            <Text style={styles.planCardNote}>
                                                                Contate seu professor
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </TouchableOpacity>
                                        </Animatable.View>
                                    ))
                                ) : (
                                    <View style={styles.noPlansCard}>
                                        <Feather
                                            name="package"
                                            size={48}
                                            color={colors.textWhiteDark}
                                        />
                                        <Text style={styles.noPlansText}>
                                            {isAdmin
                                                ? "Nenhum plano cadastrado no sistema"
                                                : "Não temos mais planos a oferecer no momento"}
                                        </Text>
                                        <Text style={styles.noPlansSub}>
                                            {isAdmin
                                                ? "Cadastre novos planos para disponibilizar aos alunos"
                                                : "Em breve novos planos estarão disponíveis"}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </>
                    )}

                    <View style={styles.bottomSpacing} />
                </ScrollView>
            </Animatable.View>

            <TabNavigator />

            {/* Modal de cadastro / edição de plano (admin) */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={!!planForm}
                onRequestClose={() => setPlanForm(null)}
            >
                <StatusBar backgroundColor="rgba(0,0,0,0.8)" barStyle="light-content" />
                <View style={styles.modalOverlay}>
                    <Animatable.View
                        animation="zoomIn"
                        duration={300}
                        style={styles.modalContainer}
                    >
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setPlanForm(null)}
                            accessibilityRole="button"
                            accessibilityLabel="Fechar formulário de plano"
                        >
                            <Feather name="x" size={22} color={colors.textOrange} />
                        </TouchableOpacity>

                        {planForm && (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <Text style={styles.planFormTitle}>
                                    {planForm.id ? "Editar plano" : "Novo plano"}
                                </Text>

                                <Text style={styles.planFormLabel}>Nome</Text>
                                <TextInput
                                    style={styles.planFormInput}
                                    value={planForm.name}
                                    accessibilityLabel="Nome do plano"
                                    onChangeText={(t) => setPlanField("name", t)}
                                    placeholder="Ex: Plano Mensal 3x"
                                    placeholderTextColor={colors.textWhiteDark}
                                    maxLength={255}
                                />

                                <Text style={styles.planFormLabel}>Descrição</Text>
                                <TextInput
                                    style={[styles.planFormInput, styles.planFormInputMultiline]}
                                    value={planForm.description}
                                    accessibilityLabel="Descrição do plano"
                                    onChangeText={(t) => setPlanField("description", t)}
                                    placeholder="O que está incluso no plano"
                                    placeholderTextColor={colors.textWhiteDark}
                                    multiline
                                    maxLength={255}
                                />

                                <View style={styles.planFormRow}>
                                    <View style={styles.planFormCol}>
                                        <Text style={styles.planFormLabel}>Preço (R$)</Text>
                                        <TextInput
                                            style={styles.planFormInput}
                                            value={planForm.price}
                                    accessibilityLabel="Preço em reais"
                                            onChangeText={(t) => setPlanField("price", t)}
                                            placeholder="100,00"
                                            placeholderTextColor={colors.textWhiteDark}
                                            keyboardType="decimal-pad"
                                        />
                                    </View>
                                    <View style={styles.planFormCol}>
                                        <Text style={styles.planFormLabel}>Duração (meses)</Text>
                                        <TextInput
                                            style={styles.planFormInput}
                                            value={planForm.durationMonths}
                                    accessibilityLabel="Duração em meses"
                                            onChangeText={(t) => setPlanField("durationMonths", t)}
                                            placeholder="12"
                                            placeholderTextColor={colors.textWhiteDark}
                                            keyboardType="number-pad"
                                        />
                                    </View>
                                </View>

                                <View style={styles.planFormRow}>
                                    <View style={styles.planFormCol}>
                                        <Text style={styles.planFormLabel}>Aulas por semana</Text>
                                        <TextInput
                                            style={styles.planFormInput}
                                            value={planForm.weeklyClassLimit}
                                    accessibilityLabel="Aulas por semana"
                                            onChangeText={(t) => setPlanField("weeklyClassLimit", t)}
                                            placeholder="3"
                                            placeholderTextColor={colors.textWhiteDark}
                                            keyboardType="number-pad"
                                        />
                                    </View>
                                    <View style={styles.planFormCol}>
                                        <Text style={styles.planFormLabel}>Aulas por mês</Text>
                                        <TextInput
                                            style={styles.planFormInput}
                                            value={planForm.monthlyClassLimit}
                                    accessibilityLabel="Aulas por mês"
                                            onChangeText={(t) => setPlanField("monthlyClassLimit", t)}
                                            placeholder="12"
                                            placeholderTextColor={colors.textWhiteDark}
                                            keyboardType="number-pad"
                                        />
                                    </View>
                                </View>

                                <View style={styles.planFormSwitchRow}>
                                    <View style={styles.planFormSwitchTexts}>
                                        <Text style={styles.planFormLabel}>Plano ativo</Text>
                                        <Text style={styles.planFormHint}>
                                            Desativado, ele some da lista dos alunos, mas quem já está nele continua.
                                        </Text>
                                    </View>
                                    <Switch
                                        accessibilityLabel="Plano ativo"
                                        value={planForm.active}
                                        onValueChange={(v) => setPlanField("active", v)}
                                        trackColor={{ false: colors.switchOff, true: colors.backgroundOrange }}
                                        thumbColor={colors.switchTrackOn}
                                    />
                                </View>

                                <TouchableOpacity
                                    style={[styles.planFormSave, savingPlan && styles.planFormDisabled]}
                                    accessibilityRole="button"
                                    accessibilityLabel={savingPlan ? 'Salvando plano...' : 'Salvar plano'}
                                    accessibilityState={{ disabled: savingPlan, busy: savingPlan }}
                                    onPress={handleSavePlan}
                                    disabled={savingPlan}
                                >
                                    {savingPlan ? (
                                        <ActivityIndicator color={colors.textWhite} />
                                    ) : (
                                        <>
                                            <Feather name="check" size={16} color={colors.textWhite} />
                                            <Text style={styles.planFormSaveText}>
                                                {planForm.id ? "Salvar alterações" : "Criar plano"}
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>

                                {planForm.id && (
                                    <TouchableOpacity
                                        style={[styles.planFormDelete, savingPlan && styles.planFormDisabled]}
                                        accessibilityRole="button"
                                        accessibilityLabel="Excluir plano"
                                        accessibilityState={{ disabled: savingPlan }}
                                        onPress={handleDeletePlan}
                                        disabled={savingPlan}
                                    >
                                        <Feather name="trash-2" size={16} color={colors.textRed} />
                                        <Text style={styles.planFormDeleteText}>Excluir plano</Text>
                                    </TouchableOpacity>
                                )}
                            </ScrollView>
                        )}
                    </Animatable.View>
                </View>
            </Modal>

            {/* Modal de gerenciamento do aluno */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={!!selectedStudent}
                onRequestClose={() => setSelectedStudent(null)}
            >
                <StatusBar backgroundColor="rgba(0,0,0,0.8)" barStyle="light-content" />
                <View style={styles.modalOverlay}>
                    <Animatable.View
                        animation="zoomIn"
                        duration={300}
                        style={styles.modalContainer}
                    >
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setSelectedStudent(null)}
                            accessibilityRole="button"
                            accessibilityLabel="Fechar detalhes do aluno"
                        >
                            <Feather name="x" size={22} color={colors.textOrange} />
                        </TouchableOpacity>

                        <View style={styles.modalHeader}>
                            <View style={styles.modalAvatar}>
                                <Text style={styles.modalAvatarText}>
                                    {selectedStudent?.name?.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                            <Text style={styles.modalTitle}>{selectedStudent?.name}</Text>
                            <Text style={styles.modalSubtitle}>{selectedStudent?.email}</Text>
                        </View>

                        {loadingStudentPlan ? (
                            <View style={styles.modalLoading}>
                                <ActivityIndicator size="large" color={colors.textOrange} />
                                <Text style={styles.modalLoadingText}>Carregando plano...</Text>
                            </View>
                        ) : studentPlan ? (
                            <View style={styles.modalPlanCard}>
                                <View style={styles.modalPlanHeader}>
                                    <Text style={styles.modalPlanName}>
                                        {studentPlan.planName}
                                    </Text>
                                    <View style={styles.activeBadge}>
                                        <View style={styles.activeDot} />
                                        <Text style={styles.activeBadgeText}>Ativo</Text>
                                    </View>
                                </View>
                                <Text style={styles.modalPlanPrice}>
                                    {formatPrice(studentPlan.price)}
                                </Text>
                                {studentPlan.nextDueDate && (
                                    <View style={styles.modalPlanDateContainer}>
                                        <Feather
                                            name="calendar"
                                            size={14}
                                            color={colors.textWhiteDark}
                                        />
                                        <Text style={styles.modalPlanDate}>
                                            Vence em: {formatDate(studentPlan.nextDueDate)}
                                        </Text>
                                    </View>
                                )}
                                <TouchableOpacity
                                    style={styles.removeButton}
                                    accessibilityRole="button"
                                    accessibilityLabel="Remover plano do aluno"
                                    accessibilityState={{ disabled: actionLoading }}
                                    onPress={handleRemovePlan}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? (
                                        <ActivityIndicator size="small" color={colors.textWhite} />
                                    ) : (
                                        <>
                                            <Feather
                                                name="trash-2"
                                                size={18}
                                                color={colors.textWhite}
                                            />
                                            <Text style={styles.actionButtonText}>Remover Plano</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.modalNoPlan}>
                                <Feather
                                    name="credit-card"
                                    size={48}
                                    color={colors.textWhiteDark}
                                />
                                <Text style={styles.modalNoPlanText}>Sem plano ativo</Text>
                                <TouchableOpacity
                                    style={styles.assignButton}
                                    accessibilityRole="button"
                                    accessibilityLabel="Atribuir plano ao aluno"
                                    onPress={() => setAssignModalVisible(true)}
                                >
                                    <Feather name="plus" size={18} color={colors.textWhite} />
                                    <Text style={styles.actionButtonText}>Atribuir Plano</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </Animatable.View>
                </View>
            </Modal>

            {/* Modal de seleção de plano */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={assignModalVisible}
                onRequestClose={() => setAssignModalVisible(false)}
                statusBarTranslucent={true}
            >
                <View style={styles.modalOverlay}>
                    <Animatable.View
                        animation="slideInUp"
                        duration={300}
                        style={styles.modalContainer}
                    >
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setAssignModalVisible(false)}
                            accessibilityRole="button"
                            accessibilityLabel="Fechar seleção de plano"
                        >
                            <Feather name="x" size={22} color={colors.textOrange} />
                        </TouchableOpacity>

                        <View style={styles.assignModalHeader}>
                            <Text style={styles.assignModalTitle}>Selecionar Plano</Text>
                            <Text style={styles.assignModalSubtitle}>
                                Escolha o plano para <Text style={styles.assignModalStudentName}>{selectedStudent?.name}</Text>
                            </Text>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            style={styles.planList}
                            contentContainerStyle={styles.planListContent}
                        >
                            {allPlans.map((plan) => (
                                <Animatable.View
                                    key={plan.id}
                                    animation="fadeInUp"
                                    delay={100}
                                    duration={300}
                                >
                                    <TouchableOpacity
                                        style={styles.planSelectCard}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Atribuir o plano ${plan.name}`}
                                        accessibilityState={{ disabled: actionLoading }}
                                        onPress={() => {
                                            Alert.alert(
                                                "Confirmar Atribuição",
                                                `Deseja atribuir o plano "${plan.name}" para ${selectedStudent?.name}?\n\n${plan.description ? plan.description + "\n\n" : ""}Valor: ${formatPrice(plan.price)}`,
                                                [
                                                    { text: "Cancelar", style: "cancel" },
                                                    {
                                                        text: "Confirmar",
                                                        onPress: () => handleAssignPlan(plan.id),
                                                        style: "default"
                                                    }
                                                ]
                                            );
                                        }}
                                        disabled={actionLoading}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.planSelectCardHeader}>
                                            <View style={styles.planSelectCardTitleContainer}>
                                                <Text style={styles.planSelectCardName}>{plan.name}</Text>
                                            </View>
                                            {actionLoading ? (
                                                <ActivityIndicator size="small" color={colors.textOrange} />
                                            ) : (
                                                <View style={styles.planSelectCardArrow}>
                                                    <Feather name="chevron-right" size={20} color={colors.textOrange} />
                                                </View>
                                            )}
                                        </View>

                                        <View style={styles.planSelectCardFeatures}>
                                            {plan.monthlyClassLimit != null && (
                                                <View style={styles.planSelectCardFeature}>
                                                    <Feather name="trending-up" size={12} color={colors.textOrange} />
                                                    <Text style={styles.planSelectCardFeatureText}>
                                                        {plan.monthlyClassLimit} aulas/mês
                                                    </Text>
                                                </View>
                                            )}
                                        </View>

                                        <View style={styles.planSelectCardFooter}>
                                            <View style={styles.planSelectCardPriceContainer}>
                                                <Text style={styles.planSelectCardPrice}>{formatPrice(plan.price)}</Text>
                                                <Text style={styles.planSelectCardPeriod}>/mês</Text>
                                            </View>
                                            <View style={styles.planSelectCardButton}>
                                                <Text style={styles.planSelectCardButtonText}>Selecionar</Text>
                                                <Feather name="arrow-right" size={14} color={colors.textWhite} />
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                </Animatable.View>
                            ))}
                        </ScrollView>
                    </Animatable.View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundOrange,
    },
    containerHeader: {
        marginBottom: '2%',
        paddingStart: '5%',
    },
    message: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.textWhite,
        fontFamily: 'Nunito',
    },
    containerForm: {
        flex: 1,
        backgroundColor: colors.backgroundTransparent,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 30,
    },
    loadingText: {
        color: colors.textGrey,
        fontFamily: 'Nunito',
        fontSize: 14,
        marginTop: 10,
    },
    section: {
        marginTop: 20,
        marginBottom: 10,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 20,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        fontWeight: '600',
    },
    adminSubtitle: {
        fontSize: 16,
        fontFamily: 'Nunito',
        color: colors.textGrey,
        marginBottom: 16,
    },
    activePlanCard: {
        backgroundColor: colors.backgroundCardBlack,
        borderRadius: 30,
        padding: 16,
        marginBottom: 10,
    },
    activePlanHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    activePlanName: {
        fontSize: 16,
        fontFamily: 'Nunito',
        color: colors.textOrange,
        fontWeight: 'bold',
        flex: 1,
    },
    activeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundGreenButton,
        borderRadius: 30,
        paddingVertical: 4,
        paddingHorizontal: 10,
        marginLeft: 10,
    },
    activeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.textWhite,
        marginRight: 4,
    },
    activeBadgeText: {
        fontSize: 12,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        fontWeight: 'bold',
    },
    planDescription: {
        fontSize: 14,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        lineHeight: 20,
        marginBottom: 10,
    },
    progressContainer: {
        marginBottom: 10,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    progressLabel: {
        fontSize: 14,
        fontFamily: 'Nunito',
        color: colors.textGrey,
    },
    progressValue: {
        fontSize: 14,
        fontFamily: 'Nunito',
        color: colors.textOrange,
        fontWeight: 'bold',
    },
    progressBar: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.textOrange,
        borderRadius: 3,
    },
    planDetailsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 10,
    },
    planDetailCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        minWidth: 100,
    },
    planDetailLabel: {
        fontSize: 12,
        fontFamily: 'Nunito',
        color: colors.textGrey,
    },
    planDetailValue: {
        fontSize: 14,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        fontWeight: 'bold',
    },
    dueDateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    nextDueDate: {
        fontSize: 12,
        fontFamily: 'Nunito',
        color: colors.textGrey,
    },
    noPlanCard: {
        backgroundColor: colors.backgroundCardBlack,
        borderRadius: 30,
        padding: 40,
        alignItems: 'center',
        gap: 16,
    },
    noPlanText: {
        fontSize: 18,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    noPlanSub: {
        fontSize: 14,
        fontFamily: 'Nunito',
        color: colors.textGrey,
        textAlign: 'center',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    dividerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginHorizontal: 12,
    },
    dividerText: {
        fontSize: 14,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        fontWeight: '600',
    },
    planCard: {
        backgroundColor: colors.backgroundCardBlack,
        borderRadius: 30,
        padding: 16,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    planCardLeft: {
        flex: 1,
    },
    planCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    planCardName: {
        fontSize: 16,
        fontFamily: 'Nunito',
        color: colors.textOrange,
        fontWeight: 'bold',
        flex: 1,
    },
    planCardDescription: {
        fontSize: 14,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        lineHeight: 20,
        marginBottom: 10,
    },
    planFeatures: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 10,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    featureText: {
        fontSize: 12,
        fontFamily: 'Nunito',
        color: colors.textGrey,
    },
    planCardRight: {
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginLeft: 12,
    },
    planCardPrice: {
        fontSize: 18,
        fontFamily: 'Nunito',
        color: colors.textOrange,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    contactBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    planCardNote: {
        fontSize: 10,
        fontFamily: 'Nunito',
        color: colors.textGrey,
    },
    noPlansCard: {
        backgroundColor: colors.backgroundCardBlack,
        borderRadius: 30,
        padding: 40,
        alignItems: 'center',
        gap: 16,
        marginTop: 10,
    },
    noPlansText: {
        fontSize: 18,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    noPlansSub: {
        fontSize: 14,
        fontFamily: 'Nunito',
        color: colors.textGrey,
        textAlign: 'center',
    },
    studentsGrid: {
        marginTop: 10,
    },
    studentRow: {
        marginBottom: 10,
    },
    studentCard: {
        backgroundColor: colors.backgroundCardBlack,
        borderRadius: 30,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    studentAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.textOrange,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 20,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        fontWeight: 'bold',
    },
    studentRowInfo: {
        flex: 1,
    },
    studentRowName: {
        fontSize: 16,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    studentRowEmail: {
        fontSize: 12,
        fontFamily: 'Nunito',
        color: colors.textGrey,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 30,
        gap: 12,
    },
    emptyText: {
        fontSize: 16,
        fontFamily: 'Nunito',
        color: colors.textGrey,
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    newPlanButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        alignSelf: 'center',
        backgroundColor: colors.backgroundOrange,
        paddingVertical: 10,
        paddingHorizontal: 22,
        borderRadius: 30,
        marginBottom: 14,
    },
    newPlanButtonText: {
        color: colors.textWhite,
        fontFamily: 'Nunito-Bold',
        fontSize: colors.fontP14,
    },
    planCardInactive: {
        opacity: 0.55,
    },
    inactiveBadge: {
        backgroundColor: colors.backgroundTransparent,
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
        marginLeft: 8,
    },
    inactiveBadgeText: {
        color: colors.textWhiteDark,
        fontFamily: 'Nunito',
        fontSize: colors.fontP12,
    },
    planCardNoteAction: {
        color: colors.textOrange,
    },
    planFormTitle: {
        color: colors.textOrange,
        fontFamily: 'Nunito-Bold',
        fontSize: colors.fontP20,
        marginBottom: 18,
        marginRight: 40,
    },
    planFormLabel: {
        color: colors.textWhite,
        fontFamily: 'Nunito-SemiBold',
        fontSize: colors.fontP14,
        marginBottom: 6,
    },
    planFormHint: {
        color: colors.textWhiteDark,
        fontFamily: 'Nunito',
        fontSize: colors.fontP12,
        marginTop: 2,
    },
    planFormInput: {
        backgroundColor: colors.backgroundCard,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        color: colors.textWhite,
        fontFamily: 'Nunito',
        fontSize: colors.fontP14,
        marginBottom: 14,
    },
    planFormInputMultiline: {
        minHeight: 70,
        textAlignVertical: 'top',
    },
    planFormRow: {
        flexDirection: 'row',
        gap: 12,
    },
    planFormCol: {
        flex: 1,
    },
    planFormSwitchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 20,
    },
    planFormSwitchTexts: {
        flex: 1,
    },
    planFormSave: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: colors.backgroundSave,
        borderRadius: 30,
        paddingVertical: 13,
    },
    planFormSaveText: {
        color: colors.textWhite,
        fontFamily: 'Nunito-Bold',
        fontSize: colors.fontP16,
    },
    planFormDelete: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 30,
        paddingVertical: 13,
        marginTop: 10,
        borderWidth: 1,
        borderColor: colors.textRed,
    },
    planFormDeleteText: {
        color: colors.textRed,
        fontFamily: 'Nunito-Bold',
        fontSize: colors.fontP14,
    },
    planFormDisabled: {
        opacity: 0.6,
    },
    modalContainer: {
        width: '90%',
        backgroundColor: colors.backgroundCardBlack,
        borderRadius: 30,
        padding: 20,
        maxHeight: '85%',
    },
    closeButton: {
        position: 'absolute',
        top: 15,
        right: 15,
        backgroundColor: colors.backgroundBlack,
        padding: 8,
        borderRadius: 50,
        zIndex: 1,
    },
    modalHeader: {
        alignItems: 'center',
        marginBottom: 20,
        marginTop: 10,
    },
    modalAvatar: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: colors.textOrange,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    modalAvatarText: {
        fontSize: 28,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        fontWeight: 'bold',
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: 'Nunito',
        color: colors.textOrange,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    modalSubtitle: {
        fontSize: 14,
        fontFamily: 'Nunito',
        color: colors.textGrey,
    },
    modalLoading: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 30,
        gap: 12,
    },
    modalLoadingText: {
        fontSize: 14,
        fontFamily: 'Nunito',
        color: colors.textGrey,
    },
    modalPlanCard: {
        backgroundColor: colors.backgroundBlack,
        borderRadius: 10,
        padding: 15,
    },
    modalPlanHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    modalPlanName: {
        fontSize: 16,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        fontWeight: 'bold',
        flex: 1,
    },
    modalPlanPrice: {
        fontSize: 22,
        fontFamily: 'Nunito',
        color: colors.textOrange,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    modalPlanDateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    modalPlanDate: {
        fontSize: 12,
        fontFamily: 'Nunito',
        color: colors.textGrey,
    },
    modalNoPlan: {
        alignItems: 'center',
        paddingVertical: 30,
        gap: 16,
    },
    modalNoPlanText: {
        fontSize: 16,
        fontFamily: 'Nunito',
        color: colors.textGrey,
    },
    removeButton: {
        backgroundColor: '#F44336',
        borderRadius: 35,
        padding: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    assignButton: {
        backgroundColor: colors.textOrange,
        borderRadius: 35,
        padding: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    actionButtonText: {
        fontSize: 14,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        fontWeight: 'bold',
    },
    assignModalHeader: {
        alignItems: 'center',
        marginBottom: 24,
        marginTop: 10,
    },
    assignModalIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255, 107, 53, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    assignModalTitle: {
        fontSize: 22,
        fontFamily: 'Nunito-Bold',
        color: colors.textWhite,
        marginBottom: 8,
    },
    assignModalSubtitle: {
        fontSize: 14,
        fontFamily: 'Nunito',
        color: colors.textGrey,
        textAlign: 'center',
    },
    assignModalStudentName: {
        color: colors.textOrange,
        fontFamily: 'Nunito-Bold',
        fontSize: 16,
    },
    planList: {
        maxHeight: 500,
    },
    planListContent: {
        paddingBottom: 20,
    },
    planSelectCard: {
        backgroundColor: colors.backgroundBlack,
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    planSelectCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    planSelectCardTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    planSelectCardName: {
        fontSize: 18,
        fontFamily: 'Nunito-Bold',
        color: colors.textOrange,
        flex: 1,
    },
    planSelectCardArrow: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 107, 53, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    planSelectCardDescription: {
        fontSize: 13,
        fontFamily: 'Nunito',
        color: colors.textWhiteDark,
        lineHeight: 18,
        marginBottom: 12,
    },
    planSelectCardFeatures: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.4)',
    },
    planSelectCardFeature: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    planSelectCardFeatureText: {
        fontSize: 14,
        fontFamily: 'Nunito',
        color: colors.textWhite,
    },
    planSelectCardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    planSelectCardPriceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 2,
    },
    planSelectCardPrice: {
        fontSize: 24,
        fontFamily: 'Nunito-Bold',
        color: colors.textOrange,
    },
    planSelectCardPeriod: {
        fontSize: 12,
        fontFamily: 'Nunito',
        color: colors.textGrey,
    },
    planSelectCardButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.textOrange,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    planSelectCardButtonText: {
        fontSize: 13,
        fontFamily: 'Nunito-Bold',
        color: colors.textWhite,
    },
    bottomSpacing: {
        height: 100,
    },
});