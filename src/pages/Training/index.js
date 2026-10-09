import React, { useState, useContext } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { useFocusEffect } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { colors } from '../../styles/colors';
import TabNavigator from '../../components/tabNavigator';
import StudentPanelModal from '../../components/studentPanelModal';
import { AuthContext } from '../../contexts/auth';

const formatDate = (dateTime) => {
    if (!dateTime) return '';
    try {
        return new Date(dateTime).toLocaleDateString('pt-BR');
    } catch { return ''; }
};

const formatTime = (dateTime) => {
    if (!dateTime) return '';
    try {
        return new Date(dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
};

const getWeekdayName = (dateTime) => {
    if (!dateTime) return '';
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    try {
        return days[new Date(dateTime).getDay()];
    } catch { return ''; }
};

export default function Training() {
    const {
        getDashboard,
        dashboardData,
        getCheckinsByUser,
        user
    } = useContext(AuthContext);

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [pastCheckins, setPastCheckins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [fontsLoaded] = useFonts({
        'Nunito': require('../../../assets/fonts/Nunito-Regular.ttf'),
    });

    useFocusEffect(
        React.useCallback(() => {
            loadData();
        }, [user?.id])
    );

    const loadData = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            console.log('=== INICIANDO LOAD DATA ===');

            // 1. Busca o dashboard - esta é a ÚNICA fonte de dados para o aluno
            console.log('Buscando dashboard...');
            await getDashboard();
            console.log('Dashboard recebido:', JSON.stringify(dashboardData, null, 2));

            // 2. Busca check-ins do usuário para o histórico
            if (user?.id) {
                console.log('Buscando check-ins do usuário:', user.id);
                const result = await getCheckinsByUser(user.id, { size: 10 });
                if (result.success) {
                    setPastCheckins(result.data || []);
                    console.log('Check-ins encontrados:', result.data?.length || 0);
                }
            }

            // 3. Se o dashboard não tem nextClass, tenta buscar os check-ins mais recentes
            // para tentar identificar se o usuário tem aulas
            if (!dashboardData?.nextClass) {
                console.log('Dashboard sem nextClass - verificando se há check-ins recentes');
                // Pode tentar buscar aulas de hoje de outra forma? Não temos permissão.
                // Apenas mostramos a mensagem de "nenhuma aula"
            }

        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
            console.log('=== FINALIZANDO LOAD DATA ===');
        }
    };

    const nextClass = dashboardData?.nextClass;
    const completedMonth = dashboardData?.completedClassesMonth ?? 0;
    const remainingMonth = dashboardData?.remainingClassesMonth;
    const totalMonth = remainingMonth != null ? completedMonth + remainingMonth : null;

    // Filtra os check-ins que não são da próxima aula
    const historyCheckins = pastCheckins.filter(
        (c) => c.id !== nextClass?.checkinId
    );

    if (!fontsLoaded) return null;

    return (
        <View style={styles.container}>
            <Animatable.View animation='fadeInLeft' delay={500} style={styles.containerHeader}>
                <Text style={styles.message}>Treino</Text>
            </Animatable.View>

            <Animatable.View animation='fadeInUp' style={styles.containerForm}>
                <ScrollView
                    style={styles.cardViewContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => loadData(true)}
                            colors={[colors.textOrange]}
                            tintColor={colors.textOrange}
                        />
                    }
                >
                    <View style={styles.headerMessage}>
                        <Text style={styles.messageContainer}>Lista de treinos</Text>
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={colors.textOrange} />
                            <Text style={styles.loadingText}>Carregando treinos...</Text>
                        </View>
                    ) : (
                        <>
                            {/* Próximo treino */}
                            {nextClass ? (
                                <View style={[styles.cardContainerCheck, styles.nextLessonCard]}>
                                    <View style={styles.containerCheck}>
                                        <Image
                                            source={require('../../../assets/caruanas_principal.png')}
                                            style={styles.cardImageCheck}
                                        />
                                    </View>

                                    <View style={styles.leftContainerCheck}>
                                        <Text style={styles.cardTextTitleCheck}>Próxima Aula</Text>
                                        <Text style={styles.cardTextBodyCheck}>{nextClass.className || 'Turma'}</Text>
                                        <Text style={styles.cardTextBodyCheck}>Instrutor: {nextClass.instructorName || '—'}</Text>
                                        <Text style={styles.cardTextBodyCheck}>
                                            {getWeekdayName(nextClass.dateTime)}, {formatDate(nextClass.dateTime)}
                                        </Text>
                                        <Text style={styles.cardTextBodyCheck}>
                                            {formatTime(nextClass.dateTime)}
                                        </Text>
                                        <Text style={styles.cardTextBodyCheck}>
                                            Local: {nextClass.location || '—'}
                                        </Text>
                                        <Text style={styles.cardTextBodyCheck}>
                                            Alunos: {nextClass.enrolledCount || 0}/{nextClass.maxStudents || 0}
                                        </Text>

                                        <View style={styles.attendanceContainer}>
                                            <Text style={styles.attendanceText}>
                                                {totalMonth != null
                                                    ? `Frequência: ${completedMonth}/${totalMonth} aulas este mês`
                                                    : `Frequência: ${completedMonth} aulas este mês`}
                                            </Text>
                                            {totalMonth != null && totalMonth > 0 && (
                                                <View style={styles.attendanceBar}>
                                                    <View style={[
                                                        styles.attendanceProgress,
                                                        { width: `${Math.min(completedMonth / totalMonth * 100, 100)}%` }
                                                    ]} />
                                                </View>
                                            )}
                                        </View>

                                        <TouchableOpacity
                                            style={[styles.checkButton, nextClass.checkinId && styles.checkButtonCancel]}
                                            onPress={() => setIsModalVisible(true)}
                                            accessibilityRole="button"
                                            accessibilityLabel={nextClass.checkinId ? 'Ver check-in' : 'Fazer check-in'}
                                        >
                                            <Text style={styles.checkButtonText}>
                                                {nextClass.checkinId ? 'Ver Check-In' : 'Fazer Check-In'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.cardContainerCheck}>
                                    <View style={styles.containerCheck}>
                                        <Image
                                            source={require('../../../assets/caruanas_principal.png')}
                                            style={styles.cardImageCheck}
                                        />
                                    </View>
                                    <View style={styles.leftContainerCheck}>
                                        <Text style={styles.cardTextTitleCheck}>Próxima Aula</Text>
                                        <Text style={styles.cardTextBodyCheck}>Nenhuma aula agendada para hoje</Text>
                                        <Text style={[styles.cardTextBodyCheck, { fontSize: 14, color: colors.textGrey }]}>
                                            Verifique sua grade de horários
                                        </Text>
                                        {remainingMonth != null && remainingMonth > 0 && (
                                            <Text style={[styles.cardTextBodyCheck, { fontSize: 14, color: colors.textOrange }]}>
                                                Você ainda tem {remainingMonth} aulas disponíveis este mês
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            )}

                            {/* Histórico de treinos */}
                            {historyCheckins.length > 0 && (
                                <>
                                    <Text style={styles.sectionTitle}>Histórico</Text>
                                    {historyCheckins.map((checkin) => (
                                        <View key={checkin.id} style={styles.cardContainer}>
                                            <View style={styles.leftContainer}>
                                                <Text style={styles.cardTextBody}>
                                                    {getWeekdayName(checkin.confirmedAt || checkin.createdAt)},{' '}
                                                    {formatDate(checkin.confirmedAt || checkin.createdAt)}
                                                </Text>
                                                <Text style={styles.cardTextBody}>
                                                    {formatTime(checkin.confirmedAt || checkin.createdAt)}
                                                </Text>
                                                <Text style={[styles.cardTextBody, { fontSize: 12, color: colors.textGrey }]}>
                                                    {checkin.className || 'Turma'}
                                                </Text>

                                                <View style={[
                                                    styles.confiButton,
                                                    checkin.status === 'CONFIRMED' ? styles.confirmedBadge :
                                                        checkin.status === 'NO_SHOW' ? styles.noShowBadge :
                                                            checkin.status === 'CANCELLED' ? styles.cancelledBadge : null
                                                ]}>
                                                    <Text style={styles.confiButtonText}>
                                                        {checkin.status === 'CONFIRMED' ? '✅ Realizada' :
                                                            checkin.status === 'NO_SHOW' ? '❌ Falta' :
                                                                checkin.status === 'CANCELLED' ? '⛔ Cancelada' : checkin.status}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={styles.rightContainer}>
                                                <Image
                                                    source={require('../../../assets/icon.png')}
                                                    style={styles.cardImage}
                                                    resizeMode="repeat"
                                                />
                                            </View>
                                        </View>
                                    ))}
                                </>
                            )}

                            {/* Mensagem quando não tem histórico */}
                            {historyCheckins.length === 0 && !loading && (
                                <View style={styles.emptyHistoryContainer}>
                                    <Text style={styles.emptyHistoryText}>
                                        Você ainda não tem histórico de treinos
                                    </Text>
                                    <Text style={styles.emptyHistorySubText}>
                                        Participe das aulas para começar seu histórico
                                    </Text>
                                </View>
                            )}
                        </>
                    )}

                    <View style={styles.extraSpace} />
                </ScrollView>
            </Animatable.View>

            <StudentPanelModal
                visible={isModalVisible}
                onClose={() => {
                    setIsModalVisible(false);
                    loadData(true);
                }}
            />
            <TabNavigator />
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
    containerForm: {
        flex: 1,
        backgroundColor: colors.backgroundTransparent,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        paddingStart: '5%',
        paddingEnd: '5%',
        paddingBottom: '5%',
    },
    message: {
        fontSize: colors.fontP28,
        fontWeight: 'bold',
        color: colors.textWhite,
        fontFamily: 'Nunito',
        paddingLeft: 10,
    },
    cardContainerCheck: {
        borderRadius: 20,
        overflow: 'hidden',
        margin: 16,
        width: '100%',
        alignSelf: 'center',
        flexDirection: 'column',
        marginTop: 10,
        marginBottom: 20,
    },
    nextLessonCard: {
        borderWidth: 2,
        borderColor: colors.textOrange,
    },
    containerCheck: {
        backgroundColor: colors.backgroundWhite,
        alignItems: 'center',
        paddingVertical: 10,
    },
    cardImageCheck: {
        width: '50%',
        height: 110,
    },
    leftContainerCheck: {
        backgroundColor: colors.backgroundCard,
        paddingVertical: 15,
        paddingHorizontal: 20,
    },
    cardTextTitleCheck: {
        color: colors.textWhite,
        fontSize: colors.fontP20,
        fontWeight: 'bold',
        marginBottom: 8,
        fontFamily: 'Nunito',
        textAlign: 'center',
    },
    cardTextBodyCheck: {
        color: colors.textWhite,
        fontSize: colors.fontP16,
        marginBottom: 6,
        fontFamily: 'Nunito',
        textAlign: 'center',
    },
    checkButton: {
        marginTop: 15,
        backgroundColor: colors.backgroundGreenButton,
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 30,
        alignSelf: 'center',
    },
    checkButtonCancel: {
        backgroundColor: colors.textOrange,
    },
    checkButtonText: {
        color: colors.textWhite,
        fontWeight: 'bold',
        fontSize: colors.fontP16,
        fontFamily: 'Nunito',
        textAlign: 'center',
    },
    cardViewContainer: {
        flex: 1,
        marginTop: 4,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    headerMessage: {
        alignItems: 'center',
        paddingTop: 20,
        paddingBottom: 10,
    },
    messageContainer: {
        fontSize: colors.fontP22,
        fontWeight: 'bold',
        color: colors.textWhite,
        fontFamily: 'Nunito',
        textAlign: 'center',
    },
    sectionTitle: {
        fontSize: colors.fontP18,
        fontWeight: 'bold',
        color: colors.textWhite,
        fontFamily: 'Nunito',
        marginBottom: 10,
        marginTop: 5,
        paddingLeft: 10,
    },
    cardContainer: {
        flexDirection: 'row',
        backgroundColor: colors.backgroundCard,
        borderRadius: 20,
        overflow: 'hidden',
        width: '100%',
        marginBottom: 16,
    },
    leftContainer: {
        flex: 2,
        padding: 16,
        justifyContent: 'center',
    },
    rightContainer: {
        flex: 1,
        backgroundColor: colors.textWhite,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardTextBody: {
        fontSize: colors.fontP16,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        marginBottom: 6,
        textAlign: 'center',
    },
    cardImage: {
        width: '100%',
        height: 180,
    },
    confiButton: {
        backgroundColor: colors.backgroundBlueButton,
        paddingVertical: 6,
        paddingHorizontal: 30,
        borderRadius: 8,
        alignSelf: 'center',
        marginTop: 12,
    },
    confirmedBadge: {
        backgroundColor: 'rgba(76, 175, 80, 0.3)',
        borderWidth: 1,
        borderColor: colors.textGreen,
    },
    noShowBadge: {
        backgroundColor: 'rgba(244, 67, 54, 0.3)',
        borderWidth: 1,
        borderColor: '#f44336',
    },
    cancelledBadge: {
        backgroundColor: 'rgba(255, 152, 0, 0.3)',
        borderWidth: 1,
        borderColor: colors.textOrange,
    },
    confiButtonText: {
        color: colors.textWhite,
        fontWeight: 'bold',
        fontSize: colors.fontP14,
        fontFamily: 'Nunito',
        textAlign: 'center',
    },
    attendanceContainer: {
        marginVertical: 12,
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 8,
        padding: 12,
        marginBottom: 15,
    },
    attendanceText: {
        color: colors.textWhite,
        fontSize: colors.fontP14,
        fontFamily: 'Nunito',
        marginBottom: 8,
        textAlign: 'center',
    },
    attendanceBar: {
        width: '100%',
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 5,
    },
    attendanceProgress: {
        height: '100%',
        backgroundColor: colors.textGreen,
        borderRadius: 3,
    },
    extraSpace: {
        height: 80,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 200,
        paddingTop: 50,
    },
    loadingText: {
        color: colors.textWhite,
        fontSize: colors.fontP16,
        fontFamily: 'Nunito',
        marginTop: 15,
    },
    emptyHistoryContainer: {
        alignItems: 'center',
        paddingVertical: 30,
    },
    emptyHistoryText: {
        color: colors.textWhite,
        fontSize: colors.fontP16,
        fontFamily: 'Nunito',
        textAlign: 'center',
    },
    emptyHistorySubText: {
        color: colors.textGrey,
        fontSize: colors.fontP14,
        fontFamily: 'Nunito',
        textAlign: 'center',
        marginTop: 8,
    },
});