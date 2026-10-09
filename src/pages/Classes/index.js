import React, { useContext, useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import { useFonts } from 'expo-font';
import { colors } from '../../styles/colors';
import TabNavigator from '../../components/tabNavigator';
import { AuthContext } from '../../contexts/auth';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { AntDesign } from '@expo/vector-icons';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';

export default function Classes() {
    const [fontsLoaded] = useFonts({
        'Nunito': require('../../../assets/fonts/Nunito-Regular.ttf'),
        'Nunito-Bold': require('../../../assets/fonts/Nunito-Bold.ttf'),
    });

    const { classes, classesAll } = useContext(AuthContext);
    const navigation = useNavigation();
    const [isLoading, setIsLoading] = useState(true);

    const weekDaysMap = {
        MONDAY: 'Segunda',
        TUESDAY: 'Terça',
        WEDNESDAY: 'Quarta',
        THURSDAY: 'Quinta',
        FRIDAY: 'Sexta',
        SATURDAY: 'Sábado',
        SUNDAY: 'Domingo',
    };

    // Converte LocalTime serializado ("HH:mm:ss") para "HH:mm"
    const toTimeString = (value) => {
        if (!value) return '--:--';
        if (typeof value === 'string') return value.substring(0, 5);
        return '--:--';
    };

    const getLocationName = (classItem) => {
        return classItem.locationName || 'Local não definido';
    };

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                await classesAll();
            } catch (error) {
                console.error('Erro ao carregar turmas:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    if (!fontsLoaded) {
        return null;
    }

    const displayData = classes;

    return (
        <View style={styles.container}>
            <Animatable.View animation='fadeInLeft' delay={500} style={styles.containerHeader}>
                <Text style={styles.message}>Turmas</Text>
            </Animatable.View>

            <Animatable.View animation='fadeInUp' style={styles.containerForm}>
                <View style={styles.headerSection}>
                    <Text style={styles.title}>Acompanhe sua remada</Text>
                    <Text style={styles.subtitle}>Veja as opções de turmas e marque sua presença</Text>
                </View>

                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <View style={styles.loadingContent}>
                            <MaterialIcons name="rowing" size={50} color={colors.textOrange} />
                            <Text style={styles.loadingText}>Carregando turmas...</Text>
                        </View>
                    </View>
                ) : displayData && displayData.length > 0 ? (
                    <FlatList
                        data={displayData}
                        style={styles.flatList}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => (
                            <View style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <View style={styles.classNameContainer}>
                                        <Feather name="users" size={18} color={colors.textOrange} />
                                        <Text style={styles.className}>
                                            {item.name || 'Turma'}
                                        </Text>
                                    </View>
                                    <View style={styles.statusBadge}>
                                        <View style={styles.statusDot} />
                                        <Text style={styles.statusText}>Aberta</Text>
                                    </View>
                                </View>

                                <Text style={styles.classDescription}>{item.description}</Text>

                                <View style={styles.cardDetails}>
                                    <View style={styles.detailRow}>
                                        <View style={styles.detailItem}>
                                            <AntDesign name="user" size={16} color={colors.textWhite} />
                                            <Text style={styles.detailLabel}>Vagas:</Text>
                                            <Text style={styles.detailValue}>{item.maxStudents}</Text>
                                        </View>
                                        <View style={styles.detailItem}>
                                            <Feather name="repeat" size={16} color={colors.textWhite} />
                                            <Text style={styles.detailLabel}>Frequência:</Text>
                                            <Text style={styles.detailValue}>{item.schedules?.length || 1}x Semana</Text>
                                        </View>
                                    </View>

                                    <View style={styles.detailRow}>
                                        <View style={styles.detailItem}>
                                            <MaterialIcons name="location-on" size={16} color={colors.textWhite} />
                                            <Text style={styles.detailLabel}>Local:</Text>
                                            <Text style={styles.detailValue}>{getLocationName(item)}</Text>
                                        </View>
                                        <View style={styles.detailItem}>
                                            <Ionicons name="person-outline" size={16} color={colors.textWhite} />
                                            <Text style={styles.detailLabel}>Instrutor:</Text>
                                            <Text style={styles.detailValue}>
                                                {item.instructors?.length > 0
                                                    ? item.instructors[0].name
                                                    : "Caruanas Va'a"}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.scheduleContainer}>
                                        <Feather name="clock" size={16} color={colors.textWhite} />
                                        <Text style={styles.scheduleText}>
                                            {weekDaysMap[item.schedules?.[0]?.weekday] || 'Quinta'}-Feira,
                                            {item.schedules && item.schedules.length > 0 ?
                                                ` ${toTimeString(item.schedules[0]?.startTime)} às ${toTimeString(item.schedules[0]?.endTime)}` :
                                                ' Horário não definido'}
                                        </Text>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={styles.checkinButton}
                                    onPress={() => navigation.navigate('Treino')}
                                    accessibilityRole="button"
                                    accessibilityLabel="Marcar presença"
                                >
                                    <Feather name="check-circle" size={18} color={colors.textWhite} />
                                    <Text style={styles.checkinButtonText}>Marcar Presença</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    />
                ) : (
                    <ScrollView
                        contentContainerStyle={styles.emptyScrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIcon}>
                                <FontAwesome name="exclamation-circle" size={60} color={colors.textWhite} />
                            </View>
                            <Text style={styles.emptyTitle}>Nenhuma turma encontrada</Text>
                            <Text style={styles.emptySubText}>
                                Não há turmas disponíveis no momento.
                                Entre em contato com a administração para mais informações.
                            </Text>

                            <View style={styles.suggestionCard}>
                                <Feather name="help-circle" size={24} color={colors.textOrange} />
                                <Text style={styles.suggestionTitle}>O que você pode fazer:</Text>
                                <View style={styles.suggestionItem}>
                                    <Feather name="check" size={16} color={colors.textGreen} />
                                    <Text style={styles.suggestionText}>Verificar sua matrícula</Text>
                                </View>
                                <View style={styles.suggestionItem}>
                                    <Feather name="check" size={16} color={colors.textGreen} />
                                    <Text style={styles.suggestionText}>Entrar em contato com seu instrutor</Text>
                                </View>
                                <View style={styles.suggestionItem}>
                                    <Feather name="check" size={16} color={colors.textGreen} />
                                    <Text style={styles.suggestionText}>Aguarde novas turmas serem abertas</Text>
                                </View>
                            </View>
                        </View>
                    </ScrollView>
                )}
            </Animatable.View>

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
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        overflow: 'hidden',
    },
    message: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.textWhite,
        fontFamily: 'Nunito-Bold',
    },
    headerSection: {
        paddingHorizontal: 20,
        paddingTop: 25,
        paddingBottom: 15,
        alignItems: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.textWhite,
        fontFamily: 'Nunito',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: colors.textWhiteTransparent,
        fontFamily: 'Nunito',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 10,
    },
    demoBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 152, 0, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 152, 0, 0.3)',
        marginTop: 5,
    },
    demoText: {
        fontSize: 12,
        color: colors.textOrange,
        fontFamily: 'Nunito',
        marginLeft: 6,
        fontWeight: '500',
    },
    flatList: {
        flex: 1,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 100,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 50,
    },
    loadingContent: {
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: colors.textWhite,
        fontFamily: 'Nunito',
        marginTop: 15,
    },
    card: {
        backgroundColor: colors.backgroundCardBlack,
        borderRadius: 16,
        padding: 20,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    classNameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    className: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textWhite,
        fontFamily: 'Nunito',
        marginLeft: 8,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(76, 217, 100, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.textGreen,
        marginRight: 6,
    },
    statusText: {
        fontSize: 12,
        color: colors.textGreen,
        fontFamily: 'Nunito',
        fontWeight: '600',
    },
    classDescription: {
        fontSize: 14,
        color: colors.textGrey,
        fontFamily: 'Nunito',
        marginBottom: 16,
        lineHeight: 20,
    },
    cardDetails: {
        marginBottom: 20,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    detailLabel: {
        fontSize: 13,
        color: colors.textWhiteTransparent,
        fontFamily: 'Nunito',
        marginLeft: 8,
        marginRight: 4,
    },
    detailValue: {
        fontSize: 13,
        color: colors.textWhite,
        fontFamily: 'Nunito',
        fontWeight: '600',
    },
    scheduleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        padding: 12,
        borderRadius: 8,
        marginTop: 8,
    },
    scheduleText: {
        fontSize: 13,
        color: colors.textWhite,
        fontFamily: 'Nunito',
        marginLeft: 10,
        flex: 1,
        fontWeight: '500',
    },
    checkinButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.textOrange,
        paddingVertical: 12,
        borderRadius: 10,
        gap: 10,
    },
    checkinButtonText: {
        color: colors.textWhite,
        fontFamily: 'Nunito',
        fontSize: 15,
        fontWeight: '600',
    },
    emptyScrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingBottom: 100,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingHorizontal: 30,
        paddingVertical: 40,
    },
    emptyIcon: {
        marginBottom: 25,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.textWhite,
        fontFamily: 'Nunito',
        textAlign: 'center',
        marginBottom: 12,
    },
    emptySubText: {
        fontSize: 14,
        color: colors.textWhiteTransparent,
        fontFamily: 'Nunito',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 30,
    },
    suggestionCard: {
        backgroundColor: colors.backgroundCardBlack,
        borderRadius: 16,
        padding: 20,
        width: '100%',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    suggestionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.textWhite,
        fontFamily: 'Nunito',
        marginTop: 15,
        marginBottom: 12,
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    suggestionText: {
        fontSize: 14,
        color: colors.textWhite,
        fontFamily: 'Nunito',
        marginLeft: 10,
        flex: 1,
    },
});