import React, { useState, useContext, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, StatusBar, Alert } from 'react-native';
import { colors } from '../styles/colors';
import { useFonts } from 'expo-font';
import { AntDesign } from '@expo/vector-icons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AuthContext } from '../contexts/auth';

const formatTime = (dateTime) => {
    if (!dateTime) return '';
    if (typeof dateTime === 'string') {
        const match = dateTime.match(/T(\d{2}:\d{2})/);
        return match ? match[1] : '';
    }
    return '';
};

const formatDate = (dateTime) => {
    if (!dateTime) return '';
    if (typeof dateTime === 'string') {
        const match = dateTime.match(/^(\d{4}-\d{2}-\d{2})/);
        if (match) {
            const [year, month, day] = match[1].split('-');
            return `${day}/${month}/${year}`;
        }
    }
    return '';
};

export default function StudentPanelModal({ visible, onClose }) {
    const { dashboardData, regularCheckin, cancelCheckin, user, getDashboard, isLoading: contextLoading } = useContext(AuthContext);
    const [fontsLoaded] = useFonts({
        'Nunito': require('../../assets/fonts/Nunito-Regular.ttf'),
    });
    const [isCheckedIn, setIsCheckedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [confirmationMessage, setConfirmationMessage] = useState('');
    const [checkinStatus, setCheckinStatus] = useState(null);

    useEffect(() => {
        const nextClass = dashboardData?.nextClass;
        // A API só devolve checkinId quando existe um check-in CONFIRMED nesta aula;
        // o próprio checkinId é o sinal de "já confirmado" (o DTO não envia status).
        if (nextClass?.checkinId) {
            setIsCheckedIn(true);
            setCheckinStatus('CONFIRMED');
        } else {
            setIsCheckedIn(false);
            setCheckinStatus(null);
        }
    }, [dashboardData]);

    // Valida se existe uma próxima aula
    const hasNextClass = () => {
        return dashboardData?.nextClass !== null && dashboardData?.nextClass !== undefined;
    };

    const getCheckinStatus = async () => {
        try {
            const result = await getDashboard();
            if (result.success && result.data?.nextClass?.checkinId) {
                setIsCheckedIn(true);
                setCheckinStatus('CONFIRMED');
                return 'CONFIRMED';
            }
            setIsCheckedIn(false);
            setCheckinStatus(null);
            return 'INACTIVE';
        } catch (error) {
            console.error('Erro ao verificar status do check-in:', error);
            return 'ERROR';
        }
    };

    const canCancelCheckin = async () => {
        try {
            const checkinId = dashboardData?.nextClass?.checkinId;
            if (!checkinId) return false;

            const result = await getDashboard();
            return !!(result.success && result.data?.nextClass?.checkinId);
        } catch (error) {
            console.error('Erro ao verificar possibilidade de cancelamento:', error);
            return false;
        }
    };

    const handleCheckIn = async () => {
        // Verifica se existe aula para fazer check-in
        if (!hasNextClass()) {
            Alert.alert(
                "Nenhuma aula disponível",
                "Você não possui nenhuma aula agendada para fazer check-in no momento.",
                [{ text: "OK", onPress: () => { } }]
            );
            return;
        }

        setIsLoading(true);

        if (isCheckedIn) {
            const canCancel = await canCancelCheckin();
            if (!canCancel) {
                Alert.alert(
                    "Não é possível cancelar",
                    "Este check-in não pode mais ser cancelado. O período de cancelamento pode ter expirado."
                );
                setIsLoading(false);
                return;
            }

            const result = await cancelCheckin(dashboardData.nextClass.checkinId);

            if (result.success) {
                setIsCheckedIn(false);
                setCheckinStatus(null);
                setConfirmationMessage('Check-in cancelado com sucesso!');
                setShowConfirmation(true);
                setTimeout(() => setShowConfirmation(false), 2000);
                // Recarrega o dashboard para atualizar os dados
                await getDashboard();
            } else {
                const errorMsg = result.errors?.global || "Erro ao cancelar check-in. Tente novamente.";
                Alert.alert("Não foi possível cancelar", errorMsg);
            }
        } else {
            const currentStatus = await getCheckinStatus();
            if (currentStatus === 'CONFIRMED') {
                Alert.alert("Check-in já realizado", "Você já fez check-in para esta aula.");
                setIsLoading(false);
                return;
            }

            const result = await regularCheckin(dashboardData.nextClass.lessonId, { userId: user?.id });

            if (result.success) {
                if (result.data?.status === 'CONFIRMED') {
                    setIsCheckedIn(true);
                    setCheckinStatus('CONFIRMED');
                    setConfirmationMessage('Check-in realizado com sucesso!');
                    setShowConfirmation(true);
                    setTimeout(() => setShowConfirmation(false), 2000);
                    await getDashboard();
                } else {
                    Alert.alert(
                        "Check-in em processamento",
                        "Seu check-in foi registrado e aguarda confirmação do instrutor."
                    );
                    await getDashboard();
                }
            } else {
                const errorMsg = result.errors?.global || "Erro ao realizar check-in. Tente novamente.";
                // Comparação em minúsculas: as mensagens da API começam com maiúscula
                // ("Fora da janela de check-in", "Turma lotada"), então o match precisa
                // ignorar caixa — senão nenhum caso específico é reconhecido.
                const msg = errorMsg.toLowerCase();

                if (msg.includes("fora da janela")) {
                    Alert.alert("Fora do horário", "O check-in só pode ser realizado dentro da janela de tempo permitida.");
                } else if (msg.includes("matriculado")) {
                    Alert.alert("Não matriculado", "Você não está matriculado nesta turma.");
                } else if (msg.includes("lotada")) {
                    Alert.alert("Turma lotada", "Infelizmente a turma atingiu o limite máximo de alunos.");
                } else if (msg.includes("inadimplência") || msg.includes("fatura em atraso")) {
                    Alert.alert("Inadimplência", "Você está com pagamentos pendentes. Regularize sua situação para fazer check-in.");
                } else if (msg.includes("duplicado") || msg.includes("já confirmado") || msg.includes("já fez check-in")) {
                    Alert.alert("Check-in já realizado", "Você já fez check-in para esta aula.");
                    await getDashboard();
                } else {
                    // Nunca engolir o erro: sem isto o botão só pisca e o aluno não
                    // descobre o que impediu o check-in.
                    Alert.alert("Não foi possível fazer check-in", errorMsg);
                }
            }
        }

        setIsLoading(false);
    };

    const getStatusText = () => {
        if (!hasNextClass()) return 'Sem aula';
        if (isCheckedIn && checkinStatus === 'CONFIRMED') return 'Check-in Realizado';
        if (checkinStatus === 'PENDING') return 'Aguardando confirmação';
        if (checkinStatus === 'CANCELLED') return 'Cancelado';
        if (checkinStatus === 'NO_SHOW') return 'Não compareceu';
        return 'Aberta';
    };

    const getStatusColor = () => {
        if (!hasNextClass()) return colors.textWhiteDark;
        if (isCheckedIn && checkinStatus === 'CONFIRMED') return colors.backgroundIconGreen;
        if (checkinStatus === 'PENDING') return colors.textOrange;
        if (checkinStatus === 'CANCELLED') return colors.textOrange;
        if (checkinStatus === 'NO_SHOW') return colors.textRed;
        return colors.backgroundIconGreen;
    };

    if (!fontsLoaded) {
        return null;
    }

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            statusBarTranslucent={true}
            onRequestClose={onClose}
        >
            <StatusBar
                backgroundColor="rgba(0,0,0,0.7)"
                barStyle="light-content"
                translucent={true}
            />

            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.cardHeaderModal}>
                        <TouchableOpacity
                        style={styles.closeButton}
                        onPress={onClose}
                        accessibilityRole="button"
                        accessibilityLabel="Fechar"
                    >
                            <AntDesign name="close" size={28} color={colors.textOrange} />
                        </TouchableOpacity>
                    </View>

                    {!hasNextClass() ? (
                        // Mensagem quando não há aula disponível
                        <View style={styles.noClassContainer}>
                            <Ionicons name="calendar-outline" size={60} color={colors.textOrange} />
                            <Text style={styles.noClassTitle}>Nenhuma aula disponível</Text>
                            <Text style={styles.noClassText}>
                                Você não possui nenhuma aula agendada para fazer check-in no momento.
                            </Text>
                            <Text style={styles.noClassSubText}>
                                Verifique sua grade de horários ou entre em contato com o instrutor.
                            </Text>
                        </View>
                    ) : (
                        // Exibe informações da aula quando disponível
                        <>
                            <View style={styles.firstLine}>
                                <View style={styles.capacityContainer}>
                                    <AntDesign name="user" size={24} color={colors.textOrange} />
                                    <Text style={styles.capacityText}>
                                        {dashboardData?.nextClass?.enrolledCount ?? '—'} / {dashboardData?.nextClass?.maxStudents ?? '—'}
                                    </Text>
                                </View>
                                <View style={styles.statusContainer}>
                                    <Ionicons name="boat-outline" size={24} color={getStatusColor()} />
                                    <Text style={[styles.statusText, { color: getStatusColor() }]}>
                                        {getStatusText()}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.secondLine}>
                                <View style={styles.infoRow}>
                                    <Text style={[styles.infoText, { fontWeight: 'bold' }]}>Turma: </Text>
                                    <Text style={styles.infoText}>{dashboardData?.nextClass?.className || '—'}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={[styles.infoText, { fontWeight: 'bold' }]}>Local: </Text>
                                    <Text style={styles.infoText}>{dashboardData?.nextClass?.location || '—'}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={[styles.infoText, { fontWeight: 'bold' }]}>Instrutor: </Text>
                                    <Text style={styles.infoText}>{dashboardData?.nextClass?.instructorName || '—'}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={[styles.infoText, { fontWeight: 'bold' }]}>Data: </Text>
                                    <Text style={styles.infoText}>{formatDate(dashboardData?.nextClass?.dateTime)}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={[styles.infoText, { fontWeight: 'bold' }]}>Horário: </Text>
                                    <Text style={styles.infoText}>{formatTime(dashboardData?.nextClass?.dateTime)}</Text>
                                </View>
                            </View>

                            <View style={styles.buttonContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.checkinButton,
                                        isCheckedIn && checkinStatus === 'CONFIRMED' ? styles.cancelButton : null,
                                        (isLoading || contextLoading) && styles.buttonDisabled
                                    ]}
                                    onPress={handleCheckIn}
                                    accessibilityRole="button"
                                    accessibilityLabel={isCheckedIn && checkinStatus === 'CONFIRMED'
                                        ? 'Cancelar check-in'
                                        : 'Fazer check-in'}
                                    disabled={isLoading || contextLoading}
                                >
                                    {isLoading || contextLoading ? (
                                        <ActivityIndicator color={colors.textWhite} />
                                    ) : (
                                        <Text style={styles.buttonText}>
                                            {isCheckedIn && checkinStatus === 'CONFIRMED'
                                                ? 'Cancelar Check-In'
                                                : checkinStatus === 'PENDING'
                                                    ? 'Aguardando confirmação'
                                                    : 'Fazer Check-In'
                                            }
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </>
                    )}

                    {showConfirmation && (
                        <Text style={styles.confirmationText}>
                            {confirmationMessage}
                        </Text>
                    )}

                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.backgroundmodalOverlay,
    },
    modalContainer: {
        width: '85%',
        backgroundColor: colors.backgroundCardBlack,
        borderRadius: 20,
        padding: 20,
    },
    cardHeaderModal: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 10,
    },
    closeButton: {
        backgroundColor: colors.backgroundBlack,
        padding: 8,
        borderRadius: 50,
    },
    firstLine: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
    },
    secondLine: {
        marginTop: 10,
        marginBottom: 20,
        alignItems: 'center',
    },
    capacityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    capacityText: {
        fontSize: colors.fontP16,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        marginLeft: 8,
    },
    statusContainer: {
        marginLeft: 20,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusText: {
        fontSize: colors.fontP16,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        marginLeft: 8,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        flexWrap: 'wrap',
    },
    infoText: {
        fontSize: colors.fontP16,
        fontFamily: 'Nunito',
        color: colors.textWhite,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 10,
    },
    checkinButton: {
        backgroundColor: colors.backgroundCheckInButton,
        borderRadius: 25,
        paddingVertical: 12,
        paddingHorizontal: 40,
        alignSelf: 'center',
        minWidth: 200,
    },
    cancelButton: {
        backgroundColor: colors.backgroundCheckInButtonCancel,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        fontSize: colors.fontP16,
        color: colors.textWhite,
        fontWeight: 'bold',
        fontFamily: 'Nunito',
        textAlign: 'center'
    },
    confirmationText: {
        color: colors.backgroundIconGreen,
        textAlign: 'center',
        fontFamily: 'Nunito',
        fontSize: colors.fontP14,
        marginTop: 10,
    },
    noClassContainer: {
        alignItems: 'center',
        paddingVertical: 30,
        paddingHorizontal: 20,
    },
    noClassTitle: {
        fontSize: colors.fontP20,
        fontFamily: 'Nunito',
        fontWeight: 'bold',
        color: colors.textWhite,
        marginTop: 20,
        marginBottom: 10,
        textAlign: 'center',
    },
    noClassText: {
        fontSize: colors.fontP16,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        textAlign: 'center',
        marginBottom: 10,
    },
    noClassSubText: {
        fontSize: colors.fontP14,
        fontFamily: 'Nunito',
        color: colors.textWhiteDark,
        textAlign: 'center',
    },
});