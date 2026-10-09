import React, { useContext, useCallback, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, RefreshControl, StatusBar, Image, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import { useFonts } from 'expo-font';
import { colors } from '../../styles/colors';
import TabNavigator from '../../components/tabNavigator';
import { AuthContext } from '../../contexts/auth';
import { MaterialIcons, AntDesign, Feather, Ionicons } from '@expo/vector-icons';

export default function Classes() {
    const {
        userAll,
        getAllUsers,
        deleteUser,
        getUser,
        classesAll,
        classes,
        enrollUser,
        unenrollUser,
    } = useContext(AuthContext);

    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedUserFull, setSelectedUserFull] = useState(null);
    const [loadingUser, setLoadingUser] = useState(false);
    const [loadingClasses, setLoadingClasses] = useState(false);
    const [loadingAddToClass, setLoadingAddToClass] = useState(false);
    const [filter, setFilter] = useState('all');
    const [roleFilter, setRoleFilter] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedClassId, setSelectedClassId] = useState('');
    const [userClasses, setUserClasses] = useState([]);
    const [showAddToClass, setShowAddToClass] = useState(false);
    const [showClassSelector, setShowClassSelector] = useState(false);

    const [fontsLoaded] = useFonts({
        'Nunito': require('../../../assets/fonts/Nunito-Regular.ttf'),
    });

    useFocusEffect(
        useCallback(() => {
            loadUsers();
            fetchClasses();
        }, [])
    );

    const loadUsers = () => {
        setRefreshing(true);
        getAllUsers().finally(() => setRefreshing(false));
    };

    const fetchClasses = async () => {
        setLoadingClasses(true);
        try {
            await classesAll();
        } finally {
            setLoadingClasses(false);
        }
    };

    const handleSelectUser = async (user) => {
        setSelectedUser(user);
        setSelectedUserFull(null);
        setLoadingUser(true);
        setShowAddToClass(false);
        setSelectedClassId('');

        try {
            const result = await getUser(user.id);
            if (result.success && result.data) {
                setSelectedUserFull(result.data);
                await checkUserClasses(result.data);
            }
        } finally {
            setLoadingUser(false);
        }
    };

    const checkUserClasses = async (user) => {
        const result = await classesAll();
        const freshClasses = result?.data || [];

        if (freshClasses.length > 0 && user) {
            const userClassList = freshClasses.filter(classItem => {
                const isInstructor = classItem.instructors?.some(instr => instr.id === user.id);
                const isStudent = classItem.students?.some(student => student.id === user.id);
                return isInstructor || isStudent;
            });
            setUserClasses(userClassList);
        }
    };

    const handleCloseModal = () => {
        setSelectedUser(null);
        setSelectedUserFull(null);
        setUserClasses([]);
        setShowAddToClass(false);
        setSelectedClassId('');
    };

    const handleDelete = async (id) => {
        Alert.alert(
            "Confirmar exclusão",
            "Tem certeza que deseja excluir este usuário?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Excluir",
                    style: "destructive",
                    onPress: async () => {
                        await deleteUser(id);
                        handleCloseModal();
                    }
                }
            ]
        );
    };

    const getAvailableClasses = () => {
        if (!classes || !selectedUserFull) return [];
        return classes.filter(classItem => {
            const isInstructor = classItem.instructors?.some(instr => instr.id === selectedUserFull.id);
            const isStudent = classItem.students?.some(student => student.id === selectedUserFull.id);
            const currentStudents = classItem.students?.length || 0;
            const maxStudents = classItem.maxStudents || 25;
            return !isInstructor && !isStudent && currentStudents < maxStudents;
        });
    };

    const handleAddToClass = async () => {
        if (!selectedClassId) {
            Alert.alert("Aviso", "Selecione uma turma.");
            return;
        }

        setLoadingAddToClass(true);
        try {
            const classId = parseInt(selectedClassId, 10);
            const selectedClass = classes.find(c => c.id === classId);
            const currentStudents = selectedClass?.students?.length || 0;
            const maxStudents = selectedClass?.maxStudents || 25;

            if (currentStudents >= maxStudents) {
                Alert.alert("Turma cheia", `Limite de ${maxStudents} alunos atingido.`);
                setLoadingAddToClass(false);
                return;
            }

            const result = await enrollUser(selectedUserFull.id, classId);
            if (result?.success) {
                await checkUserClasses(selectedUserFull);
                setShowAddToClass(false);
                setSelectedClassId('');
                Alert.alert("Sucesso", "Usuário matriculado com sucesso!");
            } else {
                Alert.alert("Erro", result?.errors?.global || "Erro ao matricular.");
            }
        } catch {
            Alert.alert("Erro", "Não foi possível matricular.");
        } finally {
            setLoadingAddToClass(false);
        }
    };

    const handleRemoveFromClass = async (classItem) => {
        Alert.alert(
            "Confirmar remoção",
            `Remover da turma "${classItem.name}"?`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Remover",
                    style: "destructive",
                    onPress: async () => {
                        setLoadingAddToClass(true);
                        try {
                            const result = await unenrollUser(selectedUserFull.id, classItem.id);
                            if (result?.success) {
                                await checkUserClasses(selectedUserFull);
                                Alert.alert("Sucesso", "Matrícula removida!");
                            } else {
                                Alert.alert("Erro", result?.errors?.global || "Erro ao remover.");
                            }
                        } catch {
                            Alert.alert("Erro", "Não foi possível remover.");
                        } finally {
                            setLoadingAddToClass(false);
                        }
                    }
                }
            ]
        );
    };

    const getProfileImageUri = (profilePicture) => {
        if (!profilePicture) return null;
        return profilePicture.startsWith('data:image') ? profilePicture : `data:image/jpeg;base64,${profilePicture}`;
    };

    if (!fontsLoaded) return null;

    const displayUser = selectedUserFull || selectedUser;
    const availableClasses = getAvailableClasses();

    const filteredUsers = userAll
        .filter(user => {
            const statusMatch = filter === 'all' || (filter === 'active' && user.active) || (filter === 'inactive' && !user.active);
            const roleMatch = !roleFilter || (user.roles?.some(r => r.description === roleFilter));
            return statusMatch && roleMatch;
        })
        .sort((a, b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()));

    const uniqueRoles = [...new Set(userAll.flatMap(user => user.roles?.map(role => role.description) || []))];

    return (
        <View style={styles.container}>
            <Animatable.View animation='fadeInLeft' delay={500} style={styles.header}>
                <Text style={styles.headerTitle}>Usuários</Text>
            </Animatable.View>

            <Animatable.View animation='fadeInUp' style={styles.main}>
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={loadUsers}
                            colors={[colors.textOrange]}
                            tintColor={colors.textOrange}
                        />
                    }
                >
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Gerenciamento de usuários</Text>
                        <Text style={styles.sectionSubtitle}>Gerencie os usuários e vincule-os às turmas</Text>
                    </View>

                    <View style={styles.cardInfo}>
                        <View style={styles.row}>
                            <Ionicons name="information-circle" size={24} color={colors.textOrange} />
                            <Text style={styles.cardInfoText}>
                                Selecione um usuário e use <Text style={styles.highlight}>"Adicionar à turma"</Text> no modal
                            </Text>
                        </View>
                        <View style={styles.steps}>
                            <Text style={styles.step}>1. Clique no usuário</Text>
                            <Text style={styles.step}>2. Adicione à turma</Text>
                            <Text style={styles.step}>3. Confirme a vinculação</Text>
                        </View>
                        <View style={styles.note}>
                            <MaterialIcons name="info-outline" size={16} color={colors.textGrey} />
                            <Text style={styles.noteText}>Instrutores só podem ser vinculados através deste modal</Text>
                        </View>
                    </View>

                    <View style={styles.filterSection}>
                        <Text style={styles.filterLabel}>Filtrar por status</Text>
                        <View style={styles.filterRow}>
                            {['all', 'active', 'inactive'].map((type) => (
                                <TouchableOpacity
                                    key={type}
                                    style={[styles.filterBtn, filter === type && styles.filterActive]}
                                    onPress={() => setFilter(type)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Filtrar por ${type}`}
                                    accessibilityState={{ selected: filter === type }}
                                >
                                    <Text style={[styles.filterText, filter === type && styles.filterTextActive]}>
                                        {type === 'all' ? 'Todos' : type === 'active' ? 'Ativos' : 'Inativos'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.filterSection}>
                        <Text style={styles.filterLabel}>Filtrar por função</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roleScroll}>
                            <TouchableOpacity
                                style={[styles.roleBtn, !roleFilter && styles.roleActive]}
                                onPress={() => setRoleFilter(null)}
                                accessibilityRole="button"
                                accessibilityLabel="Todos os perfis"
                                accessibilityState={{ selected: !roleFilter }}
                            >
                                <Text style={[styles.roleText, !roleFilter && styles.roleTextActive]}>Todas</Text>
                            </TouchableOpacity>
                            {uniqueRoles.map(role => (
                                <TouchableOpacity
                                    key={role}
                                    style={[styles.roleBtn, roleFilter === role && styles.roleActive]}
                                    onPress={() => setRoleFilter(role)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Filtrar por perfil ${role}`}
                                    accessibilityState={{ selected: roleFilter === role }}
                                >
                                    <Text style={[styles.roleText, roleFilter === role && styles.roleTextActive]}>{role}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <View style={styles.listSection}>
                        <View style={styles.listHeader}>
                            <Text style={styles.listTitle}>Usuários encontrados</Text>
                            <View style={styles.badge}><Text style={styles.badgeText}>{filteredUsers.length}</Text></View>
                        </View>
                        {filteredUsers.length === 0 ? (
                            <View style={styles.empty}>
                                <MaterialIcons name="people-outline" size={48} color={colors.textGrey} />
                                <Text style={styles.emptyText}>Nenhum usuário encontrado</Text>
                                <Text style={styles.emptySub}>Tente ajustar os filtros</Text>
                            </View>
                        ) : (
                            filteredUsers.map(user => (
                                <TouchableOpacity
                                    key={user.id}
                                    style={styles.card}
                                    onPress={() => handleSelectUser(user)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Ver ${user.name || user.email}`}
                                >
                                    <View style={styles.cardBody}>
                                        <View style={styles.cardHeader}>
                                            <View style={styles.status}>
                                                <MaterialIcons name={user.active ? "check-circle" : "cancel"} size={16} color={user.active ? colors.textGreen : colors.textRed} />
                                                <Text style={[styles.statusText, user.active ? styles.statusActive : styles.statusInactive]}>
                                                    {user.active ? 'Ativo' : 'Inativo'}
                                                </Text>
                                            </View>
                                            <Feather name="chevron-right" size={20} color={colors.textGrey} />
                                        </View>
                                        <Text style={styles.userName}>{user.name || "Nome não cadastrado"}</Text>
                                        <Text style={styles.userEmail}>{user.email || "Email não cadastrado"}</Text>
                                        <View style={styles.cardFooter}>
                                            <View style={styles.roleBadge}>
                                                <MaterialIcons name="work" size={12} color={colors.textWhite} />
                                                <Text style={styles.roleBadgeText}>{user.roles?.[0]?.description || "Sem função"}</Text>
                                            </View>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}
                        <View style={styles.bottomSpace} />
                    </View>
                </ScrollView>
            </Animatable.View>

            <Modal animationType="slide" transparent visible={!!selectedUser} onRequestClose={handleCloseModal} statusBarTranslucent>
                <StatusBar backgroundColor="rgba(0,0,0,0.7)" barStyle="light-content" translucent />
                {displayUser && (
                    <View style={styles.modalOverlay}>
                        <ScrollView contentContainerStyle={styles.modalContent}>
                            <View style={styles.modalCard}>
                                <TouchableOpacity
                                style={styles.modalClose}
                                onPress={handleCloseModal}
                                accessibilityRole="button"
                                accessibilityLabel="Fechar detalhes do usuário"
                            >
                                    <AntDesign name="close" size={28} color={colors.textOrange} />
                                </TouchableOpacity>

                                <View style={styles.modalUser}>
                                    <View style={styles.avatar}>
                                        {loadingUser ? (
                                            <ActivityIndicator size="large" color={colors.textOrange} />
                                        ) : displayUser.profilePicture ? (
                                            <Image source={{ uri: getProfileImageUri(displayUser.profilePicture) }} style={styles.avatarImage} />
                                        ) : (
                                            <MaterialIcons name="person" size={40} color={colors.textWhite} />
                                        )}
                                    </View>
                                    <Text style={styles.modalUserName}>{displayUser.name || "Nome não cadastrado"}</Text>
                                </View>

                                <View style={styles.modalStatus}>
                                    <MaterialIcons name={displayUser.active ? "check-circle" : "cancel"} size={20} color={displayUser.active ? colors.textGreen : colors.textRed} />
                                    <Text style={[styles.modalStatusText, displayUser.active ? styles.statusActive : styles.statusInactive]}>
                                        {displayUser.active ? "Ativo" : "Inativo"}
                                    </Text>
                                </View>

                                <View style={styles.detailSection}>
                                    <Text style={styles.detailTitle}>Informações</Text>
                                    {[
                                        { icon: "email", label: "Email", value: displayUser.email || "Não cadastrado" },
                                        { icon: "phone", label: "Telefone", value: displayUser.phoneNumber || "Não cadastrado" },
                                        { icon: "work", label: "Função", value: displayUser.roles?.[0]?.description || "Não cadastrada" }
                                    ].map((item, index) => (
                                        <View key={index} style={styles.detailRow}>
                                            <MaterialIcons name={item.icon} size={20} color={colors.textGrey} style={styles.detailIcon} />
                                            <View>
                                                <Text style={styles.detailLabel}>{item.label}</Text>
                                                <Text style={styles.detailValue}>{item.value}</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>

                                <View style={styles.detailSection}>
                                    <Text style={styles.detailTitle}>Turmas</Text>
                                    {loadingClasses ? (
                                        <ActivityIndicator size="small" color={colors.textOrange} />
                                    ) : userClasses.length > 0 ? (
                                        userClasses.map(classItem => {
                                            const isInstructor = classItem.instructors?.some(instr => instr.id === displayUser.id);
                                            const currentStudents = classItem.students?.length || 0;
                                            const maxStudents = classItem.maxStudents || 25;
                                            return (
                                                <View key={classItem.id} style={styles.classCard}>
                                                    <View style={styles.classInfo}>
                                                        <Text style={styles.className}>{classItem.name}</Text>
                                                        <Text style={styles.classDesc}>{classItem.description || 'Sem descrição'}</Text>
                                                        <View style={styles.classMeta}>
                                                            <MaterialIcons name={isInstructor ? "school" : "people"} size={14} color={isInstructor ? colors.textOrange : colors.textGrey} />
                                                            <Text style={[styles.classMetaText, isInstructor && styles.instructorText]}>
                                                                {isInstructor ? 'Instrutor' : `Aluno (${currentStudents}/${maxStudents})`}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    <TouchableOpacity
                                                        onPress={() => handleRemoveFromClass(classItem)}
                                                        disabled={loadingAddToClass}
                                                        accessibilityRole="button"
                                                        accessibilityLabel={`Remover da turma ${classItem.name}`}
                                                        accessibilityState={{ disabled: loadingAddToClass }}
                                                    >
                                                        {loadingAddToClass ? <ActivityIndicator size="small" color={colors.textRed} /> : <MaterialIcons name="remove-circle" size={24} color={colors.textRed} />}
                                                    </TouchableOpacity>
                                                </View>
                                            );
                                        })
                                    ) : (
                                        <Text style={styles.emptyText}>Não está em nenhuma turma.</Text>
                                    )}
                                </View>

                                {!showAddToClass ? (
                                    <TouchableOpacity
                                                style={styles.btnPrimary}
                                                onPress={() => setShowAddToClass(true)}
                                                accessibilityRole="button"
                                                accessibilityLabel="Adicionar a uma turma"
                                            >
                                        <MaterialIcons name="add" size={20} color={colors.textWhite} />
                                        <Text style={styles.btnPrimaryText}>Adicionar à turma</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <View style={styles.addContainer}>
                                        <Text style={styles.addTitle}>Adicionar à turma</Text>
                                        {loadingClasses ? (
                                            <ActivityIndicator size="small" color={colors.textOrange} />
                                        ) : availableClasses.length > 0 ? (
                                            <>
                                                <Text style={styles.label}>Selecione a turma:</Text>
                                                <TouchableOpacity
                                                        style={styles.selector}
                                                        onPress={() => setShowClassSelector(true)}
                                                        accessibilityRole="button"
                                                        accessibilityLabel="Escolher turma"
                                                    >
                                                    <Text style={selectedClassId ? styles.selectorText : styles.selectorPlaceholder}>
                                                        {selectedClassId ? availableClasses.find(c => c.id.toString() === selectedClassId)?.name : "Toque para selecionar..."}
                                                    </Text>
                                                    <MaterialIcons name="arrow-drop-down" size={24} color={colors.textGrey} />
                                                </TouchableOpacity>

                                                <Modal animationType="slide" transparent visible={showClassSelector} onRequestClose={() => setShowClassSelector(false)}>
                                                    <View style={styles.selectorOverlay}>
                                                        <View style={styles.selectorModal}>
                                                            <View style={styles.selectorHeader}>
                                                                <Text style={styles.selectorTitle}>Selecione uma turma</Text>
                                                                <TouchableOpacity
                                                                    onPress={() => setShowClassSelector(false)}
                                                                    accessibilityRole="button"
                                                                    accessibilityLabel="Fechar lista de turmas"
                                                                >
                                                                    <MaterialIcons name="close" size={24} color={colors.textWhite} />
                                                                </TouchableOpacity>
                                                            </View>
                                                            <ScrollView>
                                                                {availableClasses.map(classItem => {
                                                                    const currentStudents = classItem.students?.length || 0;
                                                                    const maxStudents = classItem.maxStudents || 25;
                                                                    const isFull = currentStudents >= maxStudents;
                                                                    return (
                                                                        <TouchableOpacity
                                                                            key={classItem.id}
                                                                            style={[styles.selectorItem, selectedClassId === classItem.id.toString() && styles.selectorItemSelected]}
                                                                            accessibilityRole="button"
                                                                            accessibilityLabel={`Turma ${classItem.name}`}
                                                                            accessibilityState={{ selected: selectedClassId === classItem.id.toString() }}
                                                                            onPress={() => {
                                                                                if (!isFull) {
                                                                                    setSelectedClassId(classItem.id.toString());
                                                                                    setShowClassSelector(false);
                                                                                } else {
                                                                                    Alert.alert("Turma cheia", `Limite de ${maxStudents} alunos.`);
                                                                                }
                                                                            }}
                                                                            disabled={isFull}
                                                                        >
                                                                            <View style={styles.selectorItemContent}>
                                                                                <Text style={[styles.selectorItemName, isFull && styles.textDanger]}>{classItem.name}</Text>
                                                                                <Text style={styles.selectorItemDesc}>{classItem.description || 'Sem descrição'}</Text>
                                                                                <View style={styles.selectorItemMeta}>
                                                                                    <MaterialIcons name="people" size={14} color={isFull ? colors.textRed : colors.textGrey} />
                                                                                    <Text style={[styles.selectorItemMetaText, isFull && styles.textDanger]}>
                                                                                        {currentStudents}/{maxStudents} {isFull ? '- LOTADO' : ''}
                                                                                    </Text>
                                                                                </View>
                                                                            </View>
                                                                            {selectedClassId === classItem.id.toString() && <MaterialIcons name="check-circle" size={24} color={colors.textOrange} />}
                                                                        </TouchableOpacity>
                                                                    );
                                                                })}
                                                            </ScrollView>
                                                            <TouchableOpacity
                                                                style={styles.selectorClose}
                                                                onPress={() => setShowClassSelector(false)}
                                                                accessibilityRole="button"
                                                                accessibilityLabel="Fechar lista de turmas"
                                                            >
                                                                <Text style={styles.selectorCloseText}>Cancelar</Text>
                                                            </TouchableOpacity>
                                                        </View>
                                                    </View>
                                                </Modal>

                                                <View style={styles.actionRow}>
                                                    <TouchableOpacity
                                                        style={[styles.btn, styles.btnCancel]}
                                                        onPress={() => { setShowAddToClass(false); setSelectedClassId(''); }}
                                                        accessibilityRole="button"
                                                        accessibilityLabel="Cancelar matrícula"
                                                    >
                                                        <Text style={styles.btnCancelText}>Cancelar</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={[styles.btn, styles.btnConfirm]}
                                                        onPress={handleAddToClass}
                                                        disabled={loadingAddToClass || !selectedClassId}
                                                        accessibilityRole="button"
                                                        accessibilityLabel="Confirmar matrícula"
                                                        accessibilityState={{
                                                            disabled: loadingAddToClass || !selectedClassId,
                                                            busy: loadingAddToClass,
                                                        }}
                                                    >
                                                        {loadingAddToClass ? <ActivityIndicator size="small" color={colors.textWhite} /> : <Text style={styles.btnConfirmText}>Confirmar</Text>}
                                                    </TouchableOpacity>
                                                </View>
                                            </>
                                        ) : (
                                            <Text style={styles.emptyText}>Não há turmas disponíveis.</Text>
                                        )}
                                    </View>
                                )}

                                <TouchableOpacity
                                            style={styles.btnDanger}
                                            onPress={() => handleDelete(displayUser.id)}
                                            accessibilityRole="button"
                                            accessibilityLabel={`Remover cadastro de ${displayUser.name || displayUser.email}`}
                                        >
                                    <MaterialIcons name="delete-outline" size={20} color={colors.textWhite} />
                                    <Text style={styles.btnDangerText}>Excluir Usuário</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                )}
            </Modal>

            <TabNavigator />
        </View>
    );
}

const styles = StyleSheet.create({
    // Layout Base
    container: {
        flex: 1,
        backgroundColor: colors.backgroundOrange
    },
    header: {
        marginBottom: '2%',
        paddingStart: '5%'
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.textWhite,
        fontFamily: 'Nunito',
        paddingLeft: 10
    },
    main: {
        flex: 1,
        backgroundColor: colors.backgroundTransparent,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40
    },
    scroll: {
        borderTopLeftRadius: 41,
        borderTopRightRadius: 41
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 20
    },

    // Seção de cabeçalho
    section: {
        paddingTop: 15,
        marginBottom: 15
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.textWhite,
        fontFamily: 'Nunito',
        textAlign: 'center',
        marginBottom: 5
    },
    sectionSubtitle: {
        fontSize: 14,
        color: colors.textWhiteTransparent,
        fontFamily: 'Nunito',
        textAlign: 'center'
    },

    // Card de instruções
    cardInfo: {
        backgroundColor: 'rgba(255,140,0,0.06)',
        borderRadius: 12,
        padding: 15,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,140,0,0.15)'
    },
    cardInfoText: {
        fontSize: 14,
        fontFamily: 'Nunito',
        color: colors.textGrey,
        marginLeft: 10,
        flex: 1
    },
    highlight: {
        color: colors.textOrange,
        fontWeight: 'bold'
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8
    },
    steps: {
        marginVertical: 6
    },
    step: {
        fontSize: 13,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        marginBottom: 2
    },
    note: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        padding: 8,
        borderRadius: 8,
        marginTop: 4
    },
    noteText: {
        fontSize: 12,
        fontFamily: 'Nunito',
        color: colors.textGrey,
        marginLeft: 6,
        flex: 1
    },

    // Filtros
    filterSection: {
        marginTop: 10,
        marginBottom: 10
    },
    filterLabel: {
        fontSize: 16,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        fontWeight: '600',
        marginBottom: 12
    },
    filterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10
    },
    filterBtn: {
        flex: 1,
        paddingVertical: 12,
        backgroundColor: colors.backgroundCardBlack,
        borderRadius: 30,
        alignItems: 'center'
    },
    filterActive: {
        backgroundColor: colors.textOrange
    },
    filterText: {
        color: colors.textWhite,
        fontFamily: 'Nunito',
        fontSize: 14,
        fontWeight: '500'
    },
    filterTextActive: {
        color: colors.textWhite,
        fontWeight: '600'
    },

    // Roles
    roleScroll: {
        flexDirection: 'row',
        gap: 8,
        paddingBottom: 5
    },
    roleBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: colors.backgroundCardBlack,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    roleActive: {
        backgroundColor: colors.textOrange,
        borderColor: colors.textOrange
    },
    roleText: {
        color: colors.textWhite,
        fontFamily: 'Nunito',
        fontSize: 14
    },
    roleTextActive: {
        color: colors.textWhite,
        fontWeight: '600'
    },

    // Lista
    listSection: {
        marginTop: 20
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15
    },
    listTitle: {
        fontSize: 16,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        fontWeight: '600'
    },
    badge: {
        backgroundColor: colors.textOrange,
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4
    },
    badgeText: {
        color: colors.textWhite,
        fontFamily: 'Nunito',
        fontSize: 14,
        fontWeight: '600'
    },

    // Card de usuário
    card: {
        backgroundColor: colors.backgroundCardBlack,
        borderRadius: 15,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)'
    },
    cardBody: {
        padding: 16
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    status: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    statusText: {
        fontSize: 12,
        fontFamily: 'Nunito',
        marginLeft: 6,
        fontWeight: '500'
    },
    statusActive: {
        color: colors.textGreen
    },
    statusInactive: {
        color: colors.textRed
    },
    userName: {
        fontSize: 16,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        fontWeight: '600',
        marginBottom: 4
    },
    userEmail: {
        fontSize: 14,
        fontFamily: 'Nunito',
        color: colors.textGrey
    },
    cardFooter: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        paddingTop: 12
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 12,
        paddingVertical: 6,
        paddingHorizontal: 10,
        alignSelf: 'flex-start'
    },
    roleBadgeText: {
        color: colors.textWhite,
        fontFamily: 'Nunito',
        fontSize: 12,
        marginLeft: 6,
        fontWeight: '500'
    },

    // Estados vazios
    empty: {
        alignItems: 'center',
        padding: 40,
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 15,
        marginTop: 10
    },
    emptyText: {
        color: colors.textWhite,
        fontFamily: 'Nunito',
        fontSize: 16,
        fontWeight: '600',
        marginTop: 15
    },
    emptySub: {
        color: colors.textGrey,
        fontFamily: 'Nunito',
        fontSize: 14,
        marginTop: 5
    },
    bottomSpace: {
        height: 100
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)'
    },
    modalContent: {
        padding: 20,
        paddingTop: 40
    },
    modalCard: {
        backgroundColor: colors.backgroundCardBlack,
        borderRadius: 25,
        padding: 25
    },
    modalClose: {
        position: 'absolute',
        top: 15,
        right: 15,
        backgroundColor: 'rgba(0,0,0,0.3)',
        padding: 8,
        borderRadius: 20,
        zIndex: 1
    },
    modalUser: {
        alignItems: 'center',
        marginBottom: 20
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
        overflow: 'hidden'
    },
    avatarImage: {
        width: 80,
        height: 80,
        borderRadius: 40
    },
    modalUserName: {
        fontSize: 22,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        fontWeight: 'bold',
        textAlign: 'center'
    },
    modalStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 15,
        marginBottom: 25,
        alignSelf: 'center'
    },
    modalStatusText: {
        fontSize: 14,
        fontFamily: 'Nunito',
        marginLeft: 8,
        fontWeight: '600'
    },

    // Detalhes
    detailSection: {
        marginBottom: 25
    },
    detailTitle: {
        fontSize: 16,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        fontWeight: '600',
        marginBottom: 15,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)'
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16
    },
    detailIcon: {
        marginRight: 12
    },
    detailLabel: {
        fontSize: 12,
        fontFamily: 'Nunito',
        color: colors.textGrey,
        fontWeight: '500'
    },
    detailValue: {
        fontSize: 16,
        fontFamily: 'Nunito',
        color: colors.textWhite
    },

    // Turmas
    classCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 10
    },
    classInfo: {
        flex: 1,
        marginRight: 10
    },
    className: {
        fontSize: 16,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        fontWeight: '600',
        marginBottom: 4
    },
    classDesc: {
        fontSize: 14,
        fontFamily: 'Nunito',
        color: colors.textGrey,
        marginBottom: 4
    },
    classMeta: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    classMetaText: {
        fontSize: 12,
        fontFamily: 'Nunito',
        color: colors.textGrey,
        marginLeft: 4
    },
    instructorText: {
        color: colors.textOrange,
        fontWeight: '600'
    },

    // Botões
    btnPrimary: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.textOrange,
        padding: 12,
        borderRadius: 12,
        marginBottom: 15
    },
    btnPrimaryText: {
        color: colors.textWhite,
        fontSize: 14,
        fontFamily: 'Nunito',
        fontWeight: '600',
        marginLeft: 8
    },
    btn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8
    },
    btnConfirm: {
        backgroundColor: colors.textOrange
    },
    btnConfirmText: {
        color: colors.textWhite,
        fontSize: 14,
        fontFamily: 'Nunito',
        fontWeight: '600'
    },
    btnCancel: {
        backgroundColor: 'rgba(255,255,255,0.1)'
    },
    btnCancelText: {
        color: colors.textGrey,
        fontSize: 14,
        fontFamily: 'Nunito',
        fontWeight: '600'
    },
    btnDanger: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.backgroundRedButton,
        padding: 16,
        borderRadius: 15,
        marginTop: 10
    },
    btnDangerText: {
        color: colors.textWhite,
        fontSize: 16,
        fontFamily: 'Nunito',
        marginLeft: 10,
        fontWeight: '600'
    },

    // Adicionar à turma
    addContainer: {
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 12,
        padding: 15,
        marginBottom: 15
    },
    addTitle: {
        fontSize: 14,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        marginBottom: 15,
        textAlign: 'center'
    },
    label: {
        fontSize: 14,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        marginBottom: 8
    },
    selector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#333',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 12,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    selectorText: {
        color: colors.textWhite,
        fontSize: 14,
        fontFamily: 'Nunito',
        flex: 1
    },
    selectorPlaceholder: {
        color: '#999',
        fontSize: 14,
        fontFamily: 'Nunito',
        flex: 1
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10
    },

    // Selector Modal
    selectorOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        padding: 20
    },
    selectorModal: {
        backgroundColor: '#1a1a1a',
        borderRadius: 15,
        padding: 20,
        maxHeight: '80%'
    },
    selectorHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)'
    },
    selectorTitle: {
        fontSize: 18,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        fontWeight: 'bold'
    },
    selectorItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        borderRadius: 10,
        marginBottom: 8,
        backgroundColor: '#262626'
    },
    selectorItemSelected: {
        backgroundColor: '#333',
        borderWidth: 1,
        borderColor: colors.textOrange
    },
    selectorItemContent: {
        flex: 1,
        marginRight: 10
    },
    selectorItemName: {
        fontSize: 16,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        fontWeight: '600',
        marginBottom: 4
    },
    selectorItemDesc: {
        fontSize: 14,
        fontFamily: 'Nunito',
        color: colors.textGrey,
        marginBottom: 4
    },
    selectorItemMeta: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    selectorItemMetaText: {
        fontSize: 12,
        fontFamily: 'Nunito',
        color: colors.textGrey,
        marginLeft: 4
    },
    selectorClose: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 15
    },
    selectorCloseText: {
        color: colors.textGrey,
        fontSize: 16,
        fontFamily: 'Nunito',
        fontWeight: '600'
    },

    // Utilidades
    textDanger: {
        color: colors.textRed,
        fontWeight: 'bold'
    },
});