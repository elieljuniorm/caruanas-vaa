import React, { useState, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, TextInput, Alert, StatusBar, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../styles/colors';
import { useFonts } from 'expo-font';
import * as Animatable from 'react-native-animatable';
import { AntDesign } from '@expo/vector-icons';
import Feather from '@expo/vector-icons/Feather';
import * as Linking from 'expo-linking';
import TabNavigator from '../../components/tabNavigator';
import { AuthContext } from '../../contexts/auth';

export default function AttendanceList() {
    const { classes, classesAll } = useContext(AuthContext);
    const [fontsLoaded] = useFonts({
        'Nunito': require('../../../assets/fonts/Nunito-Regular.ttf'),
    });
    const [selectedUser, setSelectedUser] = useState(null);
    const [classFilter, setClassFilter] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [customMessage, setCustomMessage] = useState('');
    const [showMessageInput, setShowMessageInput] = useState(false);
    const [studentsWithClasses, setStudentsWithClasses] = useState([]);
    const [classesList, setClassesList] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        React.useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        setLoading(true);
        setRefreshing(true);

        try {
            // Carrega turmas e usa o retorno direto para evitar estado desatualizado
            const result = await classesAll();
            const loadedClasses = result?.data || [];

            // Carrega lista de turmas para o filtro
            if (loadedClasses.length > 0) {
                setClassesList(loadedClasses);

                // Constrói a lista de alunos com suas respectivas turmas
                const studentsMap = new Map(); // Usa Map para evitar duplicatas

                loadedClasses.forEach(classItem => {
                    // Verifica se a turma tem alunos
                    if (classItem.students && classItem.students.length > 0) {
                        classItem.students.forEach(student => {
                            // Verifica se o usuário é aluno
                            const isCustomer = student.roles?.some(r => r.description === 'Aluno' || r.code === 3);

                            if (isCustomer && student.active !== false) {
                                if (!studentsMap.has(student.id)) {
                                    // Primeira vez que vemos este aluno
                                    studentsMap.set(student.id, {
                                        ...student,
                                        classes: [{
                                            id: classItem.id,
                                            name: classItem.name,
                                            description: classItem.description,
                                            schedules: classItem.schedules
                                        }]
                                    });
                                } else {
                                    // Aluno já existe, adiciona mais uma turma
                                    const existingStudent = studentsMap.get(student.id);
                                    existingStudent.classes.push({
                                        id: classItem.id,
                                        name: classItem.name,
                                        description: classItem.description,
                                        schedules: classItem.schedules
                                    });
                                    studentsMap.set(student.id, existingStudent);
                                }
                            }
                        });
                    }
                });

                // Converte o Map para array
                const studentsArray = Array.from(studentsMap.values());
                setStudentsWithClasses(studentsArray);
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            Alert.alert('Erro', 'Não foi possível carregar os dados.');
        } finally {
            setRefreshing(false);
            setLoading(false);
        }
    };

    // Filtra alunos por turma e busca
    const filteredStudents = studentsWithClasses.filter(student => {
        // Filtro por turma
        const classMatch = !classFilter ||
            (student.classes && student.classes.some(c => c.id === classFilter.id));

        // Filtro por nome/email
        const searchMatch = searchQuery === '' ||
            student.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.email?.toLowerCase().includes(searchQuery.toLowerCase());

        return classMatch && searchMatch;
    });

    // Função para enviar lembrete de check-in via WhatsApp
    const sendCheckInReminder = (student) => {
        const phoneNumber = student.phoneNumber?.replace(/\D/g, '');

        if (!phoneNumber) {
            Alert.alert('Erro', 'Aluno não possui número de telefone cadastrado.');
            return;
        }

        const today = new Date().toLocaleDateString('pt-BR');
        const message = `Olá ${student.name},\n\n` +
            `📋 *LEMBRETE DE CHECK-IN* 📋\n\n` +
            `Não se esqueça de fazer seu check-in quando chegar no clube para as aulas de hoje (${today}).\n\n` +
            `📌 *Suas turmas:*\n` +
            (student.classes?.map(c => `   • ${c.name}${c.description ? ` - ${c.description}` : ''}`).join('\n') || '   • Nenhuma turma cadastrada') +
            `\n\n✅ O check-in é obrigatório para confirmar sua presença.\n\n` +
            `⏰ Lembre-se de fazer o check-in dentro do horário permitido.\n\n` +
            `Obrigado!\n🚣 Equipe Caruanas`;

        const encodedMessage = encodeURIComponent(message);

        Linking.openURL(`https://wa.me/55${phoneNumber}?text=${encodedMessage}`)
            .catch(() => {
                Alert.alert('Erro', 'Não foi possível abrir o WhatsApp. Verifique se o aplicativo está instalado.');
            });
    };

    // Função para enviar mensagem personalizada via WhatsApp
    const sendCustomMessage = (student) => {
        if (!customMessage.trim()) {
            Alert.alert('Atenção', 'Por favor, digite uma mensagem personalizada.');
            return;
        }

        const phoneNumber = student.phoneNumber?.replace(/\D/g, '');

        if (!phoneNumber) {
            Alert.alert('Erro', 'Aluno não possui número de telefone cadastrado.');
            return;
        }

        const encodedMessage = encodeURIComponent(
            `${customMessage}\n\n---\nAtenciosamente,\nEquipe Caruanas - Remo`
        );

        Linking.openURL(`https://wa.me/55${phoneNumber}?text=${encodedMessage}`)
            .catch(() => {
                Alert.alert('Erro', 'Não foi possível abrir o WhatsApp. Verifique se o aplicativo está instalado.');
            });
    };

    if (!fontsLoaded) {
        return null;
    }

    // Funções auxiliares
    const getWeekdayName = (weekday) => {
        const days = {
            'MONDAY': 'Segunda',
            'TUESDAY': 'Terça',
            'WEDNESDAY': 'Quarta',
            'THURSDAY': 'Quinta',
            'FRIDAY': 'Sexta',
            'SATURDAY': 'Sábado',
            'SUNDAY': 'Domingo'
        };
        return days[weekday] || weekday;
    };

    const minutesToTime = (value) => {
        if (value == null) return '';
        if (typeof value === 'string') {
            const match = value.match(/T(\d{2}:\d{2})/);
            if (match) return match[1];
            return value.substring(0, 5);
        }
        const hours = Math.floor(value / 60);
        const minutes = value % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    };

    return (
        <View style={styles.container}>
            <Animatable.View animation='fadeInLeft' delay={500} style={styles.containerHeader}>
                <Text style={styles.message}>Lista de Chamada</Text>
            </Animatable.View>

            <Animatable.View animation='fadeInUp' style={styles.containerForm}>
                <ScrollView
                    style={styles.containerScroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={loadData}
                            colors={[colors.textOrange]}
                            tintColor={colors.textOrange}
                        />
                    }
                >
                    <View style={styles.searchContainer}>
                        <Feather name="search" size={20} color={colors.textGrey} style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Buscar aluno por nome ou email..."
                        accessibilityLabel="Buscar aluno"
                            placeholderTextColor={colors.textGrey}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    <View style={styles.filterSection}>
                        <Text style={styles.sectionTitle}>Filtrar por Turma:</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.classFilterContainer}
                        >
                            <TouchableOpacity
                                style={[styles.classFilterButton, !classFilter && styles.activeClassFilter]}
                                onPress={() => setClassFilter(null)}
                                accessibilityRole="button"
                                accessibilityLabel="Todas as turmas"
                                accessibilityState={{ selected: !classFilter }}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.classFilterText}>Todas as Turmas</Text>
                            </TouchableOpacity>

                            {classesList.map(classItem => (
                                <TouchableOpacity
                                    key={classItem.id}
                                    style={[styles.classFilterButton, classFilter?.id === classItem.id && styles.activeClassFilter]}
                                    onPress={() => setClassFilter(classItem)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Filtrar pela turma ${classItem.name}`}
                                    accessibilityState={{ selected: classFilter?.id === classItem.id }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.classFilterText}>{classItem.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <View style={styles.listSection}>
                        <View style={styles.listHeader}>
                            <Text style={styles.sectionTitle}>Alunos</Text>
                            <View style={styles.countBadge}>
                                <Text style={styles.countText}>{filteredStudents.length}</Text>
                            </View>
                        </View>

                        {loading ? (
                            <View style={styles.emptyState}>
                                <ActivityIndicator size="large" color={colors.textOrange} />
                                <Text style={styles.emptyStateText}>Carregando alunos...</Text>
                            </View>
                        ) : filteredStudents.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Feather name="frown" size={40} color={colors.textGrey} />
                                <Text style={styles.emptyStateText}>
                                    {searchQuery || classFilter ? 'Nenhum aluno encontrado com os filtros aplicados' : 'Nenhum aluno cadastrado'}
                                </Text>
                            </View>
                        ) : (
                            filteredStudents.map(student => (
                                <TouchableOpacity
                                    key={student.id}
                                    style={styles.userCard}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Aluno ${student.name || student.email}`}
                                    onPress={() => {
                                        setSelectedUser(student);
                                        setShowMessageInput(false);
                                        setCustomMessage('');
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.userCardContent}>
                                        <View style={styles.userHeader}>
                                            <View style={styles.userInfo}>
                                                <Text style={styles.userName}>{student.name}</Text>
                                                <Text style={styles.userContact}>{student.email}</Text>
                                            </View>
                                            <AntDesign name="right" size={20} color={colors.textGrey} />
                                        </View>

                                        {student.classes && student.classes.length > 0 ? (
                                            <View style={styles.classesContainer}>
                                                <Text style={styles.classesTitle}>Turmas:</Text>
                                                <View style={styles.classesBadges}>
                                                    {student.classes.map(classItem => (
                                                        <View key={classItem.id} style={styles.classBadge}>
                                                            <Text style={styles.classBadgeText}>{classItem.name}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            </View>
                                        ) : (
                                            <View style={styles.classesContainer}>
                                                <Text style={styles.noClassesText}>Nenhuma turma matriculada</Text>
                                            </View>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}
                    </View>

                    <View style={styles.extraSpace} />
                </ScrollView>
            </Animatable.View>

            {/* Modal de detalhes do aluno */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={!!selectedUser}
                onRequestClose={() => {
                    setSelectedUser(null);
                    setShowMessageInput(false);
                    setCustomMessage('');
                }}
                statusBarTranslucent={true}
            >
                <StatusBar
                    backgroundColor="rgba(0,0,0,0.7)"
                    barStyle="light-content"
                    translucent={true}
                />
                {selectedUser && (
                    <View style={styles.detailModalOverlay}>
                        <View style={styles.detailModalContainer}>
                            <TouchableOpacity
                                style={styles.closeButton}
                                accessibilityRole="button"
                                accessibilityLabel="Fechar aluno"
                                onPress={() => {
                                    setSelectedUser(null);
                                    setShowMessageInput(false);
                                    setCustomMessage('');
                                }}
                            >
                                <AntDesign name="close" size={28} color={colors.textOrange} />
                            </TouchableOpacity>

                            <Text style={styles.detailUserName}>{selectedUser.name}</Text>
                            <Text style={styles.detailUserRole}>
                                {selectedUser.roles?.[0]?.description || 'Aluno'}
                            </Text>

                            <View style={styles.detailInfoRow}>
                                <AntDesign name="mail" size={16} color={colors.textGrey} />
                                <Text style={styles.detailUserContact}>{selectedUser.email}</Text>
                            </View>

                            {selectedUser.phoneNumber && (
                                <View style={styles.detailInfoRow}>
                                    <AntDesign name="phone" size={16} color={colors.textGrey} />
                                    <Text style={styles.detailUserContact}>{selectedUser.phoneNumber}</Text>
                                </View>
                            )}

                            <Text style={styles.sectionTitleModal}>Turmas matriculadas:</Text>
                            <View style={styles.classesList}>
                                {selectedUser.classes && selectedUser.classes.length > 0 ? (
                                    selectedUser.classes.map(classItem => (
                                        <View key={classItem.id} style={styles.classItem}>
                                            <Text style={styles.className}>{classItem.name}</Text>
                                            {classItem.description && (
                                                <Text style={styles.classDescription}>{classItem.description}</Text>
                                            )}
                                            {classItem.schedules && classItem.schedules.length > 0 && (
                                                <Text style={styles.classSchedule}>
                                                    Horário: {classItem.schedules.map(s =>
                                                        `${getWeekdayName(s.weekday)} ${minutesToTime(s.startTime)}`
                                                    ).join(', ')}
                                                </Text>
                                            )}
                                        </View>
                                    ))
                                ) : (
                                    <Text style={styles.noClassesText}>Nenhuma turma matriculada</Text>
                                )}
                            </View>

                            <TouchableOpacity
                                style={styles.checkInButton}
                                onPress={() => sendCheckInReminder(selectedUser)}
                                    accessibilityRole="button"
                                    accessibilityLabel="Enviar lembrete de check-in"
                            >
                                <Feather name="alert-circle" size={20} color={colors.textWhite} />
                                <Text style={styles.checkInButtonText}>Enviar aviso de check-in</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.customMessageButton}
                                onPress={() => setShowMessageInput(!showMessageInput)}
                                    accessibilityRole="button"
                                    accessibilityLabel={showMessageInput ? 'Cancelar mensagem personalizada' : 'Escrever mensagem personalizada'}
                            >
                                <Feather name="edit" size={20} color={colors.textWhite} />
                                <Text style={styles.customMessageButtonText}>
                                    {showMessageInput ? 'Cancelar mensagem' : 'Enviar mensagem personalizada'}
                                </Text>
                            </TouchableOpacity>

                            {showMessageInput && (
                                <>
                                    <TextInput
                                        style={styles.messageInput}
                                        placeholder="Digite sua mensagem personalizada..."
                                        accessibilityLabel="Mensagem personalizada"
                                        placeholderTextColor={colors.textGrey}
                                        multiline
                                        numberOfLines={4}
                                        value={customMessage}
                                        onChangeText={setCustomMessage}
                                    />
                                    <TouchableOpacity
                                        style={styles.sendCustomMessageButton}
                                        onPress={() => sendCustomMessage(selectedUser)}
                                            accessibilityRole="button"
                                            accessibilityLabel="Enviar mensagem"
                                    >
                                        <Text style={styles.sendCustomMessageButtonText}>Enviar Mensagem</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </View>
                )}
            </Modal>

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
    },
    containerScroll: {
        flex: 1,
        marginTop: 4,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    message: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.textWhite,
        fontFamily: 'Nunito',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundCardBlack,
        borderRadius: 30,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginTop: 20,
        marginBottom: 15,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        color: colors.textWhite,
        fontFamily: 'Nunito',
        fontSize: 16,
    },
    filterSection: {
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        fontWeight: '600',
        marginBottom: 10,
    },
    classFilterContainer: {
        flexDirection: 'row',
        gap: 8,
        paddingBottom: 5,
    },
    classFilterButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: colors.backgroundCardBlack,
        borderRadius: 20,
        marginRight: 8,
    },
    activeClassFilter: {
        backgroundColor: colors.textOrange,
    },
    classFilterText: {
        color: colors.textWhite,
        fontFamily: 'Nunito',
        fontSize: 14,
    },
    listSection: {
        marginTop: 10,
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    countBadge: {
        backgroundColor: colors.textOrange,
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    countText: {
        color: colors.textWhite,
        fontFamily: 'Nunito',
        fontSize: 14,
        fontWeight: '600',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyStateText: {
        color: colors.textGrey,
        fontFamily: 'Nunito',
        fontSize: 16,
        marginTop: 10,
        textAlign: 'center',
    },
    userCard: {
        backgroundColor: colors.backgroundCardBlack,
        borderRadius: 15,
        marginBottom: 10,
        overflow: 'hidden',
    },
    userCardContent: {
        padding: 16,
    },
    userHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontFamily: 'Nunito',
        color: colors.textOrange,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    userContact: {
        fontSize: 14,
        fontFamily: 'Nunito',
        color: colors.textGrey,
    },
    classesContainer: {
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
    },
    classesTitle: {
        fontSize: 14,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        marginBottom: 8,
        fontWeight: '500',
    },
    classesBadges: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    classBadge: {
        backgroundColor: colors.backgroundBlack,
        borderRadius: 12,
        paddingVertical: 6,
        paddingHorizontal: 12,
    },
    classBadgeText: {
        fontSize: 12,
        fontFamily: 'Nunito',
        color: colors.textWhite,
    },
    noClassesText: {
        fontSize: 12,
        fontFamily: 'Nunito',
        color: colors.textGrey,
        fontStyle: 'italic',
        marginTop: 5,
    },
    extraSpace: {
        height: 100,
    },

    /* Estilos do Modal */
    detailModalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    detailModalContainer: {
        width: '90%',
        backgroundColor: colors.backgroundCardBlack,
        borderRadius: 20,
        padding: 20,
        maxHeight: '80%',
    },
    detailUserName: {
        fontSize: 22,
        fontFamily: 'Nunito',
        color: colors.textOrange,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    detailUserRole: {
        fontSize: 16,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        marginBottom: 15,
    },
    detailInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
    },
    detailUserContact: {
        fontSize: 14,
        fontFamily: 'Nunito',
        color: colors.textGrey,
    },
    sectionTitleModal: {
        fontSize: 16,
        fontFamily: 'Nunito',
        color: colors.textOrange,
        marginTop: 20,
        marginBottom: 10,
        fontWeight: 'bold',
    },
    classesList: {
        marginTop: 10,
        maxHeight: 200,
    },
    classItem: {
        backgroundColor: colors.backgroundBlack,
        borderRadius: 20,
        padding: 12,
        marginBottom: 10,
    },
    className: {
        fontSize: 16,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    classDescription: {
        fontSize: 14,
        fontFamily: 'Nunito',
        color: colors.textGrey,
        marginBottom: 5,
    },
    classSchedule: {
        fontSize: 12,
        fontFamily: 'Nunito',
        color: colors.textOrange,
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
    checkInButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.textOrange,
        padding: 12,
        borderRadius: 25,
        marginTop: 20,
        gap: 10,
    },
    checkInButtonText: {
        color: colors.textWhite,
        fontFamily: 'Nunito',
        fontSize: 16,
        fontWeight: 'bold',
    },
    customMessageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.backgroundBlack,
        padding: 12,
        borderRadius: 25,
        marginTop: 10,
        gap: 10,
        borderWidth: 1,
        borderColor: colors.textOrange,
    },
    customMessageButtonText: {
        color: colors.textWhite,
        fontFamily: 'Nunito',
        fontSize: 16,
    },
    sendCustomMessageButton: {
        backgroundColor: '#25D366',
        padding: 12,
        borderRadius: 25,
        marginTop: 10,
        alignItems: 'center',
    },
    sendCustomMessageButtonText: {
        color: colors.textWhite,
        fontFamily: 'Nunito',
        fontSize: 16,
        fontWeight: 'bold',
    },
    messageInput: {
        backgroundColor: colors.backgroundBlack,
        borderRadius: 10,
        padding: 12,
        color: colors.textWhite,
        fontFamily: 'Nunito',
        fontSize: 14,
        minHeight: 100,
        textAlignVertical: 'top',
        marginTop: 10,
        borderWidth: 1,
        borderColor: colors.textGrey,
    },
});