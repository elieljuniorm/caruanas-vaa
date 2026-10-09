import React, { useState, useContext, useEffect } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import { AuthContext } from '../../contexts/auth';
import { useFonts } from 'expo-font';
import { colors } from '../../styles/colors';
import TabNavigator from '../../components/tabNavigator';
import StudentPanelModal from '../../components/studentPanelModal';
import NewsCarousel from '../../components/newsCarousel';
import { AntDesign, Ionicons } from '@expo/vector-icons';

const formatDateTime = (dateTime) => {
    if (!dateTime) return '';
    try {
        return new Date(dateTime).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    } catch {
        return String(dateTime);
    }
};

export default function Home() {

    const { hasRole, getDashboard, dashboardData, user, getInvoicesByUser, getUserPlanByUser, userPlan } = useContext(AuthContext);
    const [lastPendingInvoice, setLastPendingInvoice] = useState(null);

    const navigation = useNavigation();

    const [isModalVisible, setIsModalVisible] = useState(false);

    const [fontsLoaded] = useFonts({
        'Nunito': require('../../../assets/fonts/Nunito-Regular.ttf'),
    });

    useEffect(() => {
        getDashboard();
        if (user?.id) {
            getInvoicesByUser(user.id).then((result) => {
                if (result.success && result.data?.length > 0) {
                    // A API devolve OVERDUE para a pendente já vencida — sem isso a
                    // fatura atrasada sumia do card inicial do aluno.
                    const pending = result.data.find(
                        (inv) => inv.status === 'PENDING' || inv.status === 'OVERDUE'
                    );
                    setLastPendingInvoice(pending || null);
                }
            });
            getUserPlanByUser(user.id);
        }
    }, [user?.id]);

    if (!fontsLoaded) {
        return null;
    }

    const toggleModal = () => {
        setIsModalVisible(!isModalVisible);
    };

    // Verifica se tem próxima aula
    const hasNextClass = () => {
        return dashboardData?.nextClass !== null && dashboardData?.nextClass !== undefined;
    };

    return (
        <View style={styles.container}>
            <Animatable.View animation='fadeInLeft' delay={500} style={styles.containerHeader}>
                <Text style={styles.message}>Bem-vindo(a)</Text>
            </Animatable.View>

            <Animatable.View animation='fadeInUp' style={styles.containerForm}>
                <ScrollView style={styles.containerHome} showsVerticalScrollIndicator={false}>
                    {hasRole("Administrador") && (
                        <>
                            <View style={styles.textContainer}>
                                <Text style={styles.messageContainer}>Painel Administrador</Text>
                            </View>

                            <View style={[styles.buttonContainer, styles.buttonContainerSpace]}>
                                <TouchableOpacity
                                    style={styles.button}
                                    onPress={() => navigation.navigate('Register')}
                                    accessibilityRole="button"
                                    accessibilityLabel="Novo usuário"
                                >
                                    <Image
                                        source={require('../../../assets/icons/person-new.png')}
                                        style={styles.buttonImage}
                                    />
                                    <Text style={styles.buttonText}>Novo Usuário</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.button}
                                    onPress={() => navigation.navigate('RegisterClasses')}
                                    accessibilityRole="button"
                                    accessibilityLabel="Nova turma"
                                >
                                    <Image
                                        source={require('../../../assets/icons/classes-new.png')}
                                        style={styles.buttonImage}
                                    />
                                    <Text style={styles.buttonText}>Nova Turma</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.button}
                                    onPress={() => navigation.navigate('EditClasses')}
                                    accessibilityRole="button"
                                    accessibilityLabel="Editar turma"
                                >
                                    <Image
                                        source={require('../../../assets/icons/edit-classes.png')}
                                        style={styles.buttonImage}
                                    />
                                    <Text style={styles.buttonText}>Editar Turma</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.button}
                                    onPress={() => navigation.navigate('AdminUser')}
                                    accessibilityRole="button"
                                    accessibilityLabel="Todos os usuários"
                                >
                                    <Image
                                        source={require('../../../assets/icons/userAll.png')}
                                        style={styles.buttonImage}
                                    />
                                    <Text style={styles.buttonText}>Todos os Usuários</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.button}
                                    onPress={() => navigation.navigate('RegisterNews')}
                                    accessibilityRole="button"
                                    accessibilityLabel="Cadastro de notícias"
                                >
                                    <Image
                                        source={require('../../../assets/icons/campaign.png')}
                                        style={styles.buttonImage}
                                    />
                                    <Text style={styles.buttonText}>Cadastro de Notícias</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.button}
                                    onPress={() => navigation.navigate('HealthDeclarations')}
                                    accessibilityRole="button"
                                    accessibilityLabel="Declaração de saúde"
                                >
                                    <Image
                                        source={require('../../../assets/icons/health_metrics.png')}
                                        style={styles.buttonImage}
                                    />
                                    <Text style={styles.buttonText}>Declaração de Saúde</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}

                    {hasRole("Instrutor", "Administrador") && (
                        <>
                            <View style={styles.textContainer}>
                                <Text style={styles.messageContainer}>Painel Instrutor</Text>
                            </View>

                            <View style={[styles.buttonContainer, styles.buttonContainerSpace]}>
                                <TouchableOpacity
                                    style={styles.button}
                                    onPress={() => navigation.navigate('CheckInInstructor')}
                                    accessibilityRole="button"
                                    accessibilityLabel="Check-in de aluno"
                                >
                                    <Image
                                        source={require('../../../assets/icons/check-in.png')}
                                        style={styles.buttonImage}
                                    />
                                    <Text style={styles.buttonText}>Check-In Aluno</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.button}
                                    onPress={() => navigation.navigate('AttendanceList')}
                                    accessibilityRole="button"
                                    accessibilityLabel="Lista de chamada"
                                >
                                    <Image
                                        source={require('../../../assets/icons/presence.png')}
                                        style={styles.buttonImage}
                                    />
                                    <Text style={styles.buttonText}>Lista de Chamada</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.button}
                                    onPress={() => navigation.navigate('InstructorClasses')}
                                    accessibilityRole="button"
                                    accessibilityLabel="Minhas turmas"
                                >
                                    <Image
                                        source={require('../../../assets/icons/my-class.png')}
                                        style={styles.buttonImage}
                                    />
                                    <Text style={styles.buttonText}>Minhas Turmas</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}

                    {/* Card da Próxima Aula */}
                    <View style={styles.textContainer}>
                        <Text style={styles.textAluno}>Próxima Aula</Text>

                        <TouchableOpacity
                            onPress={() => {
                                if (hasNextClass()) {
                                    toggleModal();
                                }
                            }}
                            activeOpacity={hasNextClass() ? 0.7 : 1}
                            disabled={!hasNextClass()}
                            accessibilityRole="button"
                            accessibilityLabel={hasNextClass()
                                ? `Próxima aula: ${dashboardData.nextClass.className}. Toque para fazer check-in`
                                : 'Nenhuma aula agendada'}
                            accessibilityState={{ disabled: !hasNextClass() }}
                        >
                            <View style={styles.cardContainer}>
                                <View style={styles.leftContainer}>
                                    {hasNextClass() ? (
                                        <>
                                            <Text style={styles.cardTextTitle}>{dashboardData.nextClass.className}</Text>

                                            <View style={styles.infoRow}>
                                                <Ionicons name="person-outline" size={16} color={colors.textOrange} />
                                                <Text style={styles.cardTextBody}>Instrutor: {dashboardData.nextClass.instructorName}</Text>
                                            </View>

                                            <View style={styles.infoRow}>
                                                <AntDesign name="calendar" size={16} color={colors.textOrange} />
                                                <Text style={styles.cardTextBody}>{formatDateTime(dashboardData.nextClass.dateTime)}</Text>
                                            </View>

                                            <View style={styles.infoRow}>
                                                <Ionicons name="location-outline" size={16} color={colors.textOrange} />
                                                <Text style={styles.cardTextBody}>{dashboardData.nextClass.location}</Text>
                                            </View>

                                            <View style={styles.infoRow}>
                                                <Ionicons name="people-outline" size={16} color={colors.textOrange} />
                                                <Text style={styles.cardTextBody}>
                                                    Vagas: {dashboardData.nextClass.enrolledCount || 0} / {dashboardData.nextClass.maxStudents || 0}
                                                </Text>
                                            </View>

                                            {dashboardData.nextClass.checkinId && (
                                                <View style={styles.checkinBadge}>
                                                    <AntDesign name="check-circle" size={14} color={colors.textWhite} />
                                                    <Text style={styles.checkinBadgeText}> Check-in realizado</Text>
                                                </View>
                                            )}

                                            {hasNextClass() && (
                                                <View style={styles.touchHint}>
                                                    <Text style={styles.touchHintText}>Toque para mais opções</Text>
                                                    <AntDesign name="right" size={12} color={colors.textOrange} />
                                                </View>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <Text style={styles.cardTextTitle}>Nenhuma aula agendada</Text>
                                            <Text style={styles.cardTextBody}>Você não possui aulas próximas, verifique sua grade de horários</Text>
                                            <Text style={styles.cardTextBodyHighlight}>Entre em contato com seu instrutor</Text>
                                        </>
                                    )}
                                </View>
                                <View style={styles.rightContainer}>
                                    <Image
                                        source={require('../../../assets/icon.png')}
                                        style={styles.cardImage}
                                        resizeMode="cover"
                                    />
                                </View>
                            </View>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.cardRow}>
                        <TouchableOpacity
                            style={styles.cardInvoices}
                            onPress={() => navigation.navigate('Faturas')}
                            accessibilityRole="button"
                            accessibilityLabel={lastPendingInvoice ? 'Faturas, há fatura em aberto' : 'Faturas, em dia'}
                        >
                            <Image
                                source={require('../../../assets/icons/fatura.png')}
                                style={styles.icon}
                            />
                            <View style={styles.cardIconText}>
                                <View style={styles.cardTextWrapper}>
                                    {lastPendingInvoice ? (
                                        <>
                                            <Text style={styles.cardTitle}>
                                                {new Date(lastPendingInvoice.dueDate).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })}
                                            </Text>
                                            <Text style={styles.cardStatus}>
                                                Status: <Text style={styles.statusPendente}>
                                                    {(lastPendingInvoice.status === 'OVERDUE' || (lastPendingInvoice.status === 'PENDING' && lastPendingInvoice.dueDate && new Date(lastPendingInvoice.dueDate) < new Date())) ? 'Atrasada' : 'Pendente'}
                                                </Text>
                                            </Text>
                                            <Text style={styles.cardValue} numberOfLines={1} adjustsFontSizeToFit>
                                                {lastPendingInvoice.amount?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </Text>
                                        </>
                                    ) : (
                                        <>
                                            <Text style={styles.cardTitle}>Faturas</Text>
                                            <Text style={styles.cardStatus}>Em dia</Text>
                                        </>
                                    )}
                                </View>
                            </View>
                            <Image source={require('../../../assets/icons/arrow-right.png')} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.cardFlat}
                            onPress={() => navigation.navigate('Plano')}
                            accessibilityRole="button"
                            accessibilityLabel="Meu plano"
                        >
                            <View style={styles.cardIconText}>
                                <View style={styles.cardTextWrapper}>
                                    {hasRole("Administrador") ? (
                                        <>
                                            <Text style={styles.cardTitle}>Gestão de Planos</Text>
                                            <Text style={styles.cardSubText}>Gerencie planos</Text>
                                            <Text style={styles.cardSubText}>de todos os alunos</Text>
                                        </>
                                    ) : userPlan ? (
                                        <>
                                            <Text style={styles.cardTitle}>{userPlan.planName}</Text>
                                            {userPlan.weeklyClassLimit && (
                                                <Text style={styles.cardSubText}>{userPlan.weeklyClassLimit}x na Semana</Text>
                                            )}
                                            {userPlan.monthlyClassLimit && (
                                                <Text style={styles.cardSubText}>{userPlan.monthlyClassLimit} aulas no mês</Text>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <Text style={styles.cardTitle}>Sem plano ativo</Text>
                                            <Text style={styles.cardSubText}>Toque para contratar</Text>
                                        </>
                                    )}
                                </View>
                            </View>
                            <Image source={require('../../../assets/icons/edit-white.png')} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.newsSection}>
                        <NewsCarousel />
                    </View>

                    <View style={styles.extraSpace} />

                </ScrollView>
            </Animatable.View>

            <StudentPanelModal
                visible={isModalVisible}
                onClose={toggleModal}
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
        flex: 2,
        backgroundColor: colors.backgroundTransparent,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
    },
    containerHome: {
        marginTop: 4,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        paddingBottom: 20,
    },
    message: {
        fontSize: colors.fontP28,
        fontWeight: 'bold',
        color: colors.textWhite,
        fontFamily: 'Nunito',
        paddingLeft: 10,
    },
    textContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: '1rem',
        paddingStart: '5%',
        paddingEnd: '5%'
    },
    messageContainer: {
        fontSize: colors.fontP22,
        fontWeight: 'bold',
        color: colors.textWhite,
        fontFamily: 'Nunito',
        paddingTop: 25,
        marginBottom: 10,
    },
    textAluno: {
        fontSize: colors.fontP22,
        fontWeight: 'bold',
        color: colors.textWhite,
        fontFamily: 'Nunito',
        paddingTop: 25,
        marginBottom: 15,
    },
    buttonContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        width: '100%',
        gap: 8,
        marginTop: 5,
        marginBottom: 10,
    },
    buttonContainerSpace: {
        paddingStart: '5%',
        paddingEnd: '5%'
    },
    button: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '30%',
        marginTop: 8,
        paddingVertical: 12,
    },
    buttonImage: {
        width: 30,
        height: 30,
        marginBottom: 8,
    },
    buttonText: {
        fontSize: colors.fontP14,
        color: colors.textWhite,
        fontFamily: 'Nunito',
        textAlign: 'center',
        lineHeight: 16,
    },
    cardContainer: {
        flexDirection: 'row',
        backgroundColor: colors.backgroundCard,
        borderRadius: 20,
        overflow: 'hidden',
        margin: 10,
        marginTop: 5,
        width: '100%',
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
        padding: 10,
    },
    cardTextTitle: {
        fontSize: colors.fontP20,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center'
    },
    cardTextBody: {
        fontSize: colors.fontP14,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        marginBottom: 6,
        textAlign: 'center'
    },
    cardImage: {
        width: '100%',
        height: 180,
    },
    cardRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
        paddingHorizontal: 20,
        marginTop: 15,
    },
    cardInvoices: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.backgroundCardBlack,
        borderRadius: 20,
        padding: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardFlat: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.backgroundCardBlack,
        borderRadius: 20,
        padding: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardIconText: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flex: 1,
    },
    cardTitle: {
        color: colors.textWhite,
        fontWeight: 'bold',
        fontFamily: 'Nunito',
        fontSize: colors.fontP16,
        marginBottom: 4,
    },
    cardStatus: {
        color: colors.textWhite,
        fontSize: colors.fontP12,
        fontFamily: 'Nunito',
    },
    statusPendente: {
        color: colors.textRed,
        fontFamily: 'Nunito',
    },
    cardTextWrapper: {
        marginLeft: 10,
        marginRight: 10,
        flex: 1,
    },
    cardTextBodyHighlight: {
        fontSize: colors.fontP14,
        fontFamily: 'Nunito',
        color: colors.textOrange,
        marginBottom: 4,
        textAlign: 'center',
        fontWeight: 'bold',
    },
    cardValue: {
        color: colors.textWhite,
        fontWeight: 'bold',
        marginTop: 8,
        fontFamily: 'Nunito',
        fontSize: colors.fontP16,
        maxWidth: '100%',
    },
    cardSubText: {
        color: colors.textWhite,
        fontSize: colors.fontP12,
        fontFamily: 'Nunito',
        marginBottom: 2,
    },
    icon: {
        width: 24,
        height: 24,
        tintColor: colors.textWhite,
    },
    newsSection: {
        marginTop: 25,
        paddingHorizontal: 20,
    },
    extraSpace: {
        height: 100,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    checkinBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundIconGreen,
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
        marginTop: 8,
        alignSelf: 'flex-start',
    },
    checkinBadgeText: {
        color: colors.textWhite,
        fontSize: colors.fontP12,
        fontFamily: 'Nunito',
        fontWeight: 'bold',
    },
    touchHint: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        justifyContent: 'flex-end',
    },
    touchHintText: {
        color: colors.textOrange,
        fontSize: colors.fontP12,
        fontFamily: 'Nunito',
        marginRight: 5,
    },
});