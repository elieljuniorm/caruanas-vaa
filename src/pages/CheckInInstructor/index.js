import React, { useState, useContext, useCallback } from 'react';
import {
    StyleSheet, Text, View, ScrollView, TouchableOpacity,
    Modal, RefreshControl, Alert, StatusBar, ActivityIndicator
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import { useFonts } from 'expo-font';
import { colors } from '../../styles/colors';
import TabNavigator from '../../components/tabNavigator';
import { AuthContext } from '../../contexts/auth';
import { MaterialIcons, AntDesign, Ionicons } from '@expo/vector-icons';

const getWeekdayName = (weekday) => {
    const days = {
        MONDAY: 'Segunda', TUESDAY: 'Terça', WEDNESDAY: 'Quarta',
        THURSDAY: 'Quinta', FRIDAY: 'Sexta', SATURDAY: 'Sábado', SUNDAY: 'Domingo',
    };
    return days[weekday] || weekday;
};

const minutesToTime = (value) => {
    if (value == null) return '';
    if (typeof value === 'string') {
        const withT = value.match(/T(\d{2}:\d{2})/);
        if (withT) return withT[1];
        const timeOnly = value.match(/^(\d{2}:\d{2})/);
        if (timeOnly) return timeOnly[1];
        return '';
    }
    const h = Math.floor(value / 60);
    const m = value % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR');
};

const formatDateTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleString('pt-BR');
};

const todayWeekday = () => {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return days[new Date().getDay()];
};

export default function CheckInInstructor() {
    const { 
        classes, 
        classesAll, 
        user, 
        regularCheckin, 
        manualCheckin, 
        cancelCheckin,
        getCheckinsByLesson, 
        getLessonsByClass 
    } = useContext(AuthContext);

    const [selectedClass, setSelectedClass] = useState(null);
    const [selectedLesson, setSelectedLesson] = useState(null);
    const [lessonCheckins, setLessonCheckins] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingLesson, setLoadingLesson] = useState(false);
    const [loadingCheckins, setLoadingCheckins] = useState(false);
    const [processingStudent, setProcessingStudent] = useState(null);
    const [filter, setFilter] = useState('today');
    const [lessonsByClass, setLessonsByClass] = useState({});

    const [fontsLoaded] = useFonts({
        'Nunito': require('../../../assets/fonts/Nunito-Regular.ttf'),
    });

    useFocusEffect(
        useCallback(() => {
            loadClasses();
        }, [])
    );

    const loadClasses = async () => {
        setRefreshing(true);
        await classesAll();
        setRefreshing(false);
    };

    // Admin enxerga todas as turmas; instrutor apenas as que leciona (matriculado como instrutor)
    const isAdmin = (user?.roles || []).some((r) => r.description === 'Administrador');
    const visibleClasses = isAdmin
        ? (classes || [])
        : (classes || []).filter((cls) =>
            cls.instructors?.some((i) => i.id === user?.id)
        );

    const filteredClasses = filter === 'today'
        ? visibleClasses.filter((cls) =>
            cls.schedules?.some((s) => s.weekday === todayWeekday())
        )
        : visibleClasses;

    const fetchLessonOfDay = async (classId) => {
        setLoadingLesson(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const result = await getLessonsByClass(classId, today);
            const lessons = result.success ? result.data : [];
            
            if (lessons.length > 0) {
                const sortedLessons = lessons.sort((a, b) => 
                    new Date(a.startAt) - new Date(b.startAt)
                );
                const lesson = sortedLessons[0];
                setSelectedLesson(lesson);
                await fetchCheckins(lesson.id);
            } else {
                setSelectedLesson(null);
                setLessonCheckins([]);
            }
        } catch (e) {
            console.error('Erro ao buscar aula do dia:', e);
            setSelectedLesson(null);
            setLessonCheckins([]);
        } finally {
            setLoadingLesson(false);
        }
    };

    const fetchCheckins = async (lessonId) => {
        setLoadingCheckins(true);
        try {
            const result = await getCheckinsByLesson(lessonId, { size: 200 });
            if (result.success) {
                const checkins = Array.isArray(result.data) ? result.data : [];
                setLessonCheckins(checkins);
            } else {
                setLessonCheckins([]);
            }
        } catch (error) {
            console.error('Erro ao buscar check-ins:', error);
            setLessonCheckins([]);
        } finally {
            setLoadingCheckins(false);
        }
    };

    const fetchLessonsForAllDates = async (classId) => {
        setLoadingLesson(true);
        try {
            const result = await getLessonsByClass(classId, null);
            if (result.success) {
                const lessons = Array.isArray(result.data) ? result.data : [];
                const sortedLessons = lessons.sort((a, b) => 
                    new Date(a.startAt) - new Date(b.startAt)
                );
                setLessonsByClass(prev => ({ ...prev, [classId]: sortedLessons }));

                if (sortedLessons.length > 0) {
                    setSelectedLesson(sortedLessons[0]);
                    await fetchCheckins(sortedLessons[0].id);
                } else {
                    setSelectedLesson(null);
                    setLessonCheckins([]);
                }
            }
        } catch (e) {
            console.error('Erro ao buscar aulas:', e);
            setSelectedLesson(null);
            setLessonCheckins([]);
        } finally {
            setLoadingLesson(false);
        }
    };

    const handleSelectClass = async (cls) => {
        setSelectedClass(cls);
        setSelectedLesson(null);
        setLessonCheckins([]);

        if (filter === 'today') {
            await fetchLessonOfDay(cls.id);
        } else {
            await fetchLessonsForAllDates(cls.id);
        }
    };

    const getCheckinStatus = (studentId) => {
        // Bases antigas podem ter mais de um registro para o mesmo par (aula, aluno);
        // o mais recente é o que vale.
        const checkin = lessonCheckins
            .filter((c) => c.userId === studentId)
            .reduce((maisRecente, c) => (!maisRecente || c.id > maisRecente.id ? c : maisRecente), null);

        if (!checkin) return { id: null, checked: false, type: null, status: null, time: null };
        return {
            id: checkin.id,
            // `checked` significa "ocupa vaga": um check-in cancelado ou falta não bloqueia
            // um novo check-in, senão o botão fica travado para sempre.
            checked: checkin.status === 'CONFIRMED' || checkin.status === 'PENDING',
            type: checkin.type,
            status: checkin.status,
            time: checkin.confirmedAt || checkin.createdAt
        };
    };

    const rotuloStatusCheckin = (status, type) => {
        switch (status) {
            case 'CONFIRMED':
                return `Confirmado ${type === 'MANUAL' ? '(Manual)' : '(Regular)'}`;
            case 'PENDING':
                return 'Pendente';
            case 'CANCELLED':
                return 'Check-in cancelado';
            case 'NO_SHOW':
                return 'Falta';
            default:
                return 'Status indefinido';
        }
    };

    const handleCancelarCheckin = async (student, checkinId) => {
        Alert.alert(
            'Cancelar check-in',
            `Cancelar o check-in de ${student.name} na aula de ${formatDate(selectedLesson.startAt)} às ${minutesToTime(selectedLesson.startAt)}?`,
            [
                { text: 'Voltar', style: 'cancel' },
                {
                    text: 'Cancelar check-in',
                    style: 'destructive',
                    onPress: async () => {
                        setProcessingStudent(student.id);
                        try {
                            // O serviço já avisa o sucesso; aqui só resta o caminho de erro.
                            const result = await cancelCheckin(checkinId);
                            if (result.success) {
                                await fetchCheckins(selectedLesson.id);
                            } else {
                                Alert.alert(
                                    'Não foi possível cancelar',
                                    result.errors?.global || 'Erro ao cancelar o check-in. Tente novamente.'
                                );
                            }
                        } finally {
                            setProcessingStudent(null);
                        }
                    }
                }
            ]
        );
    };

    const handleCheckin = async (student) => {
        if (!selectedLesson) {
            Alert.alert('Sem aula', 'Nenhuma aula selecionada para esta turma.');
            return;
        }

        if (processingStudent === student.id) {
            return;
        }

        // Aluno já confirmado: o toque desfaz o check-in. Era o caminho que faltava —
        // o botão ficava desabilitado e admin e instrutor não tinham como cancelar.
        const { id: checkinId, checked } = getCheckinStatus(student.id);
        if (checked) {
            await handleCancelarCheckin(student, checkinId);
            return;
        }

        Alert.alert(
            'Confirmar check-in',
            `Registrar presença de ${student.name} na aula de ${formatDate(selectedLesson.startAt)} às ${minutesToTime(selectedLesson.startAt)}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Check-in Regular',
                    onPress: async () => {
                        setProcessingStudent(student.id);
                        try {
                            const result = await regularCheckin(selectedLesson.id, { userId: student.id });
                            if (result.success) {
                                await fetchCheckins(selectedLesson.id);
                                Alert.alert('Sucesso', `Check-in de ${student.name} realizado!`);
                            } else {
                                Alert.alert(
                                    'Check-in regular falhou',
                                    result.errors?.global || 'Erro ao realizar check-in. Tente manual.'
                                );
                            }
                        } finally {
                            setProcessingStudent(null);
                        }
                    }
                },
                {
                    text: 'Check-in Manual',
                    onPress: async () => {
                        setProcessingStudent(student.id);
                        try {
                            const result = await manualCheckin(selectedLesson.id, { userId: student.id });
                            if (result.success) {
                                await fetchCheckins(selectedLesson.id);
                                Alert.alert('Sucesso', `Check-in manual de ${student.name} realizado!`);
                            } else {
                                Alert.alert('Erro', result.errors?.global || 'Erro ao registrar check-in manual.');
                            }
                        } finally {
                            setProcessingStudent(null);
                        }
                    }
                }
            ]
        );
    };

    const renderLessonsList = () => {
        const lessons = lessonsByClass[selectedClass?.id] || [];
        if (lessons.length === 0) {
            return (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>Nenhuma aula encontrada para esta turma</Text>
                </View>
            );
        }

        return (
            <View style={styles.lessonsList}>
                <Text style={styles.sectionTitle}>Aulas disponíveis:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.lessonsScroll}>
                    {lessons.map((lesson) => (
                        <TouchableOpacity
                            key={lesson.id}
                            style={[
                                styles.lessonCard,
                                selectedLesson?.id === lesson.id && styles.lessonCardActive
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={`Aula ${lesson.className || ''}`.trim()}
                            accessibilityState={{ selected: selectedLesson?.id === lesson.id }}
                            onPress={async () => {
                                setSelectedLesson(lesson);
                                await fetchCheckins(lesson.id);
                            }}
                        >
                            <Text style={styles.lessonDate}>
                                {formatDate(lesson.startAt)}
                            </Text>
                            <Text style={styles.lessonTime}>
                                {minutesToTime(lesson.startAt)} - {minutesToTime(lesson.endAt)}
                            </Text>
                            <Text style={styles.lessonCapacity}>
                                🧑‍🎓 {lesson.enrolledCount || 0}/{lesson.maxStudents}
                            </Text>
                            <Text style={styles.lessonStatus}>
                                {lesson.status || 'Agendada'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        );
    };

    if (!fontsLoaded) return null;

    return (
        <View style={styles.container}>
            <Animatable.View animation='fadeInLeft' delay={500} style={styles.containerHeader}>
                <Text style={styles.message}>Check-in de Aulas</Text>
            </Animatable.View>

            <Animatable.View animation='fadeInUp' style={styles.containerForm}>
                <ScrollView
                    style={styles.containerScroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={loadClasses}
                            colors={[colors.textOrange]}
                            tintColor={colors.textOrange}
                        />
                    }
                >
                    <View style={styles.filterSection}>
                        <Text style={styles.sectionTitle}>Filtrar por:</Text>
                        <View style={styles.filterRow}>
                            <TouchableOpacity
                                style={[styles.filterButton, filter === 'today' && styles.activeFilter]}
                                onPress={() => setFilter('today')}
                                accessibilityRole="button"
                                accessibilityLabel="Filtrar aulas de hoje"
                                accessibilityState={{ selected: filter === 'today' }}
                            >
                                <Text style={styles.filterText}>Hoje</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.filterButton, filter === 'all' && styles.activeFilter]}
                                onPress={() => setFilter('all')}
                                accessibilityRole="button"
                                accessibilityLabel="Mostrar todas as aulas"
                                accessibilityState={{ selected: filter === 'all' }}
                            >
                                <Text style={styles.filterText}>Todas as aulas</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.listSection}>
                        <Text style={styles.sectionTitle}>
                            {isAdmin ? 'Turmas' : 'Minhas Turmas'} ({filteredClasses.length})
                        </Text>

                        {filteredClasses.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>Nenhuma turma encontrada</Text>
                            </View>
                        ) : (
                            filteredClasses.map((cls) => (
                                <TouchableOpacity
                                    key={cls.id}
                                    style={styles.classCard}
                                    onPress={() => handleSelectClass(cls)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Turma ${cls.name}`}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.classCardContent}>
                                        <Text style={styles.className}>{cls.name}</Text>
                                        <Text style={styles.classDescription}>{cls.description}</Text>

                                        {cls.schedules?.length > 0 && (
                                            <View style={styles.classInfoRow}>
                                                <MaterialIcons name="schedule" size={16} color={colors.textGrey} />
                                                <Text style={styles.classInfoText}>
                                                    {cls.schedules.map((s) =>
                                                        `${getWeekdayName(s.weekday)} ${minutesToTime(s.startTime)}-${minutesToTime(s.endTime)}`
                                                    ).join(', ')}
                                                </Text>
                                            </View>
                                        )}

                                        <View style={styles.classInfoRow}>
                                            <MaterialIcons name="people" size={16} color={colors.textGrey} />
                                            <Text style={styles.classInfoText}>
                                                {cls.students?.length || 0} de {cls.maxStudents} alunos
                                            </Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}
                    </View>
                    <View style={styles.extraSpace} />
                </ScrollView>
            </Animatable.View>

            <Modal
                animationType="slide"
                transparent={true}
                visible={!!selectedClass}
                onRequestClose={() => setSelectedClass(null)}
                statusBarTranslucent={true}
            >
                <StatusBar backgroundColor="rgba(0,0,0,0.7)" barStyle="light-content" translucent={true} />
                {selectedClass && (
                    <View style={styles.detailModalOverlay}>
                        <View style={styles.detailModalContainer}>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => setSelectedClass(null)}
                                accessibilityRole="button"
                                accessibilityLabel="Fechar turma"
                            >
                                <AntDesign name="close" size={28} color={colors.textOrange} />
                            </TouchableOpacity>

                            <Text style={styles.detailClassName}>{selectedClass.name}</Text>
                            <Text style={styles.detailClassDescription}>{selectedClass.description}</Text>

                            {filter === 'all' && renderLessonsList()}

                            {loadingLesson ? (
                                <ActivityIndicator size="small" color={colors.textOrange} style={{ marginVertical: 10 }} />
                            ) : selectedLesson ? (
                                <>
                                    <View style={styles.detailInfoRow}>
                                        <MaterialIcons name="today" size={20} color={colors.textGrey} />
                                        <Text style={styles.detailInfoText}>
                                            Aula: {formatDate(selectedLesson.startAt)} às {minutesToTime(selectedLesson.startAt)}
                                        </Text>
                                    </View>
                                    <View style={styles.detailInfoRow}>
                                        <MaterialIcons name="people" size={20} color={colors.textGrey} />
                                        <Text style={styles.detailInfoText}>
                                            Check-ins: {lessonCheckins.filter(c => c.status === 'CONFIRMED').length} alunos confirmados
                                        </Text>
                                    </View>
                                </>
                            ) : (
                                <View style={styles.detailInfoRow}>
                                    <MaterialIcons name="today" size={20} color={colors.textGrey} />
                                    <Text style={styles.detailInfoText}>
                                        {filter === 'today' ? 'Nenhuma aula encontrada para hoje' : 'Selecione uma aula'}
                                    </Text>
                                </View>
                            )}

                            <View style={styles.studentsSection}>
                                <Text style={styles.sectionTitle}>
                                    Alunos ({selectedClass.students?.length || 0})
                                    {selectedLesson && (
                                        <Text style={styles.checkinCount}>
                                            {' '}• {lessonCheckins.filter(c => c.status === 'CONFIRMED').length} confirmados
                                        </Text>
                                    )}
                                </Text>

                                {loadingCheckins ? (
                                    <ActivityIndicator size="large" color={colors.textOrange} style={{ marginVertical: 20 }} />
                                ) : (
                                    <ScrollView style={styles.studentsScroll}>
                                        {selectedClass.students?.length > 0 ? (
                                            selectedClass.students.map((student) => {
                                                const { checked, type, status, time } = getCheckinStatus(student.id);
                                                const isProcessing = processingStudent === student.id;
                                                const isConfirmed = checked && status === 'CONFIRMED';
                                                // Cancelado/falta não conta como check-in, mas o histórico é exibido.
                                                const temHistorico = status !== null;

                                                return (
                                                    <View key={student.id} style={styles.studentCard}>
                                                        <View style={styles.studentInfo}>
                                                            <Text style={styles.studentName}>{student.name}</Text>
                                                            <Text style={styles.studentEmail}>{student.email}</Text>
                                                            {temHistorico && (
                                                                <View style={styles.checkinInfo}>
                                                                    <Ionicons
                                                                        name={isConfirmed ? "checkmark-circle" : "time-outline"}
                                                                        size={12}
                                                                        color={isConfirmed ? colors.textGreen : colors.textOrange}
                                                                    />
                                                                    <Text style={[
                                                                        styles.checkinTime,
                                                                        isConfirmed && styles.checkinTimeSuccess
                                                                    ]}>
                                                                        {rotuloStatusCheckin(status, type)}
                                                                    </Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                        <TouchableOpacity
                                                            style={[
                                                                styles.checkInButton,
                                                                !selectedLesson && styles.checkInButtonDisabled,
                                                                isProcessing && styles.checkInButtonProcessing
                                                            ]}
                                                            onPress={() => handleCheckin(student)}
                                                            disabled={!selectedLesson || isProcessing}
                                                            accessibilityRole="button"
                                                            accessibilityLabel={`Confirmar presença de ${student.name || student.email}`}
                                                            accessibilityState={{
                                                                disabled: !selectedLesson || isProcessing,
                                                                busy: isProcessing,
                                                            }}
                                                        >
                                                            {isProcessing ? (
                                                                <ActivityIndicator size="small" color={colors.textOrange} />
                                                            ) : checked ? (
                                                                <>
                                                                    <MaterialIcons
                                                                        name={isConfirmed ? "check-circle" : "pending"}
                                                                        size={24}
                                                                        color={isConfirmed ? colors.textGreen : colors.textOrange}
                                                                    />
                                                                    <Text style={[
                                                                        styles.checkInText,
                                                                        isConfirmed ? styles.checkInTextSuccess : styles.checkInTextPending
                                                                    ]}>
                                                                        {isConfirmed ? 'Presente' : 'Pendente'}
                                                                    </Text>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <MaterialIcons
                                                                        name="check-box-outline-blank"
                                                                        size={24}
                                                                        color={selectedLesson ? colors.textOrange : colors.textGrey}
                                                                    />
                                                                    <Text style={[styles.checkInText, !selectedLesson && styles.checkInTextDisabled]}>
                                                                        Check-in
                                                                    </Text>
                                                                </>
                                                            )}
                                                        </TouchableOpacity>
                                                    </View>
                                                );
                                            })
                                        ) : (
                                            <Text style={styles.emptyText}>Nenhum aluno matriculado</Text>
                                        )}
                                    </ScrollView>
                                )}
                            </View>
                        </View>
                    </View>
                )}
            </Modal>

            <TabNavigator />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundOrange },
    containerHeader: { marginBottom: '2%', paddingStart: '5%' },
    containerForm: {
        flex: 1,
        backgroundColor: colors.backgroundTransparent,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
    },
    containerScroll: {
        flex: 1,
        marginTop: 4,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
    },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
    message: { fontSize: 28, fontWeight: 'bold', color: colors.textWhite, fontFamily: 'Nunito' },
    filterSection: { marginTop: 20, marginBottom: 15 },
    sectionTitle: {
        fontSize: 16, fontFamily: 'Nunito', color: colors.textWhite,
        fontWeight: '600', marginBottom: 10,
    },
    filterRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
    filterButton: {
        flex: 1, padding: 12, backgroundColor: colors.backgroundCardBlack,
        borderRadius: 20, alignItems: 'center',
    },
    activeFilter: { backgroundColor: colors.textOrange },
    filterText: { color: colors.textWhite, fontFamily: 'Nunito', fontSize: 14 },
    listSection: { marginTop: 10 },
    emptyState: { alignItems: 'center', padding: 20 },
    emptyText: { color: colors.textGrey, fontFamily: 'Nunito', fontSize: 16, textAlign: 'center' },
    classCard: { backgroundColor: colors.backgroundCardBlack, borderRadius: 30, marginBottom: 12 },
    classCardContent: { padding: 16 },
    className: {
        fontSize: 16, fontFamily: 'Nunito', color: colors.textOrange,
        fontWeight: 'bold', marginBottom: 4,
    },
    classDescription: { fontSize: 14, fontFamily: 'Nunito', color: colors.textGrey, marginBottom: 12 },
    classInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    classInfoText: {
        fontSize: 14, fontFamily: 'Nunito', color: colors.textWhite,
        marginLeft: 8, flex: 1,
    },
    extraSpace: { height: 100 },
    detailModalOverlay: {
        flex: 1, justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    detailModalContainer: {
        width: '90%', backgroundColor: colors.backgroundCardBlack,
        borderRadius: 30, padding: 20, maxHeight: '85%',
    },
    detailClassName: {
        fontSize: 22, fontFamily: 'Nunito', color: colors.textOrange,
        fontWeight: 'bold', marginBottom: 5,
    },
    detailClassDescription: {
        fontSize: 16, fontFamily: 'Nunito', color: colors.textGrey, marginBottom: 15,
    },
    detailInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    detailInfoText: {
        fontSize: 16, fontFamily: 'Nunito', color: colors.textGrey,
        marginLeft: 10, flex: 1,
    },
    studentsSection: { marginTop: 20 },
    studentsScroll: { maxHeight: 400 },
    studentCard: {
        backgroundColor: colors.backgroundBlack, borderRadius: 20, padding: 15,
        marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    studentInfo: { flex: 1 },
    studentName: { fontSize: 16, fontFamily: 'Nunito', color: colors.textWhite, marginBottom: 2 },
    studentEmail: { fontSize: 14, fontFamily: 'Nunito', color: colors.textGrey },
    checkInButton: { 
        alignItems: 'center', 
        marginLeft: 10, 
        minWidth: 80,
        paddingVertical: 8,
        borderRadius: 10,
    },
    checkInButtonDisabled: { opacity: 0.6 },
    checkInButtonProcessing: { opacity: 0.6 },
    checkInText: { fontSize: 12, fontFamily: 'Nunito', color: colors.textGrey, marginTop: 4 },
    checkInTextSuccess: { color: colors.textGreen },
    checkInTextPending: { color: colors.textOrange },
    checkInTextDisabled: { color: colors.textGrey },
    closeButton: {
        position: 'absolute', top: 15, right: 15,
        backgroundColor: colors.backgroundBlack, padding: 8, borderRadius: 50, zIndex: 1,
    },
    lessonsList: { marginBottom: 15 },
    lessonsScroll: { flexDirection: 'row' },
    lessonCard: {
        backgroundColor: colors.backgroundBlack,
        borderRadius: 15,
        padding: 10,
        marginRight: 10,
        minWidth: 120,
        alignItems: 'center',
    },
    lessonCardActive: {
        backgroundColor: colors.textOrange,
        borderWidth: 1,
        borderColor: colors.textWhite,
    },
    lessonDate: {
        fontSize: 14,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        fontWeight: 'bold',
    },
    lessonTime: {
        fontSize: 12,
        fontFamily: 'Nunito',
        color: colors.textGrey,
        marginTop: 4,
    },
    lessonCapacity: {
        fontSize: 11,
        fontFamily: 'Nunito',
        color: colors.textOrange,
        marginTop: 4,
    },
    lessonStatus: {
        fontSize: 10,
        fontFamily: 'Nunito',
        color: colors.textGrey,
        marginTop: 2,
    },
    checkinInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    checkinTime: {
        fontSize: 11,
        fontFamily: 'Nunito',
        color: colors.textGrey,
        marginLeft: 4,
    },
    checkinTimeSuccess: {
        color: colors.textGreen,
    },
    checkinCount: {
        fontSize: 14,
        color: colors.textOrange,
    },
});