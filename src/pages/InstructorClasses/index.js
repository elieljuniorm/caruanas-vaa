import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, Modal, TouchableOpacity, TextInput, Image, StatusBar } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { useFonts } from 'expo-font';
import { colors } from '../../styles/colors';
import TabNavigator from '../../components/tabNavigator';
import { AntDesign } from '@expo/vector-icons';
import Feather from '@expo/vector-icons/Feather';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import * as Linking from 'expo-linking';
import { AuthContext } from '../../contexts/auth';

export default function InstructorClasses() {
    const { classes, classesAll, user, hasRole } = useContext(AuthContext);
    const [loading, setLoading] = useState(true);
    const [selectedClass, setSelectedClass] = useState(null);
    const [shareModalVisible, setShareModalVisible] = useState(false);
    const [message, setMessage] = useState('');
    const [image, setImage] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const weekDaysMap = {
        MONDAY: 'Segunda-feira',
        TUESDAY: 'Terça-feira',
        WEDNESDAY: 'Quarta-feira',
        THURSDAY: 'Quinta-feira',
        FRIDAY: 'Sexta-feira',
        SATURDAY: 'Sábado',
        SUNDAY: 'Domingo',
    };

    const formatMinutesToTime = (minutes) => {
        if (minutes === null || minutes === undefined) return '--:--';
        const hours = Math.floor(minutes / 60) % 24;
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    };

    // Converte startTime/endTime (string "HH:mm:ss" ou array legado) para minutos
    const timeArrayToMinutes = (value) => {
        if (!value) return null;
        if (typeof value === 'string') {
            const match = value.match(/^(\d{2}):(\d{2})/);
            return match ? parseInt(match[1]) * 60 + parseInt(match[2]) : null;
        }
        if (Array.isArray(value) && value.length >= 5) {
            const [, , , hour, minute] = value;
            return hour * 60 + minute;
        }
        return null;
    };

    // Função para gerar a mensagem padrão baseada na turma selecionada
    const generateDefaultMessage = (classItem) => {
        if (!classItem) return '';

        const schedule = classItem.schedules?.[0];

        // Converte os arrays de tempo para minutos
        const startMinutes = schedule?.startTime ? timeArrayToMinutes(schedule.startTime) : null;
        const endMinutes = schedule?.endTime ? timeArrayToMinutes(schedule.endTime) : null;

        return `📢 Informações da Turma: ${classItem.name}\n\n` +
            `📅 Dia: ${weekDaysMap[schedule?.weekday] || 'Não definido'}\n` +
            `⏰ Horário: ${startMinutes ? formatMinutesToTime(startMinutes) : '--:--'} - ${endMinutes ? formatMinutesToTime(endMinutes) : '--:--'}\n` +
            `📍 Local: ${classItem.locationName || getLocationName(classItem.locationId)}\n\n` +
            `🔹 ${classItem.description || 'Sem descrição'}\n\n` +
            `👥 Alunos: ${classItem.students?.length || 0}/${classItem.maxStudents}\n\n` +
            `Por favor, confirmem presença!`;
    };

    const [fontsLoaded] = useFonts({
        'Nunito': require('../../../assets/fonts/Nunito-Regular.ttf'),
    });

    useEffect(() => {
        loadClasses();
    }, []);

    const loadClasses = async () => {
        try {
            setLoading(true);
            await classesAll();
        } catch (error) {
            console.error('Erro ao carregar turmas:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadClasses();
    };

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const shareToWhatsApp = async () => {
        if (!message.trim() && !image) {
            alert('Por favor, adicione um texto ou uma imagem para compartilhar');
            return;
        }

        try {
            if (image) {
                // Compartilha apenas a imagem
                await Sharing.shareAsync(image, {
                    dialogTitle: 'Compartilhar imagem',
                    mimeType: 'image/jpeg',
                    UTI: 'image/jpeg',
                });
            } else {
                // Compartilha apenas o texto
                const encodedMessage = encodeURIComponent(message);
                Linking.openURL(`whatsapp://send?text=${encodedMessage}`)
                    .catch(() => {
                        alert('Não foi possível abrir o WhatsApp. Verifique se o aplicativo está instalado.');
                    });
            }
        } catch (error) {
            console.error('Erro ao compartilhar:', error);
            alert('Erro ao compartilhar. Tente novamente.');
        }
    };

    const getLocationName = (locationId) => {
        const locations = {
            1: 'Base Caruanas',
        };
        return locations[locationId] || `Local ${locationId}`;
    };

    // Função para abrir o modal com a turma selecionada
    const openShareModal = (classItem) => {
        setSelectedClass(classItem);
        setMessage(generateDefaultMessage(classItem));
        setImage(null);
        setShareModalVisible(true);
    };

    // Função para fechar o modal
    const closeShareModal = () => {
        setShareModalVisible(false);
        setSelectedClass(null);
        setMessage('');
        setImage(null);
    };

    // Filtrar turmas baseado no papel do usuário
    const getFilteredClasses = () => {
        if (!classes || !Array.isArray(classes)) return [];

        if (hasRole('Administrador')) {
            return classes;
        } else if (hasRole('Instrutor')) {
            return classes.filter(classItem =>
                classItem.instructors?.some(instructor => instructor.id === user.id)
            );
        } else {
            return classes.filter(classItem =>
                classItem.students?.some(student => student.id === user.id)
            );
        }
    };

    if (!fontsLoaded) {
        return null;
    }

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.textOrange} />
                <Text style={styles.loadingText}>Carregando turmas...</Text>
            </View>
        );
    }

    const filteredClasses = getFilteredClasses();

    return (
        <View style={styles.container}>
            <Animatable.View animation='fadeInLeft' delay={500} style={styles.containerHeader}>
                <Text style={styles.message}>Minhas Turmas</Text>
            </Animatable.View>

            <Animatable.View animation='fadeInUp' style={styles.containerForm}>
                <View style={styles.containerAlignMessage}>
                    <Text style={styles.messageContainer}>Suas turmas ativas</Text>
                    <Text style={styles.messageContainerSub}>Visualize informações de cada turma</Text>
                </View>

                {filteredClasses && filteredClasses.length > 0 ? (
                    <FlatList
                        data={filteredClasses}
                        style={styles.flatList}
                        contentContainerStyle={{ paddingBottom: 120 }}
                        keyExtractor={(item) => item.id.toString()}
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        renderItem={({ item }) => {
                            const schedule = item.schedules?.[0];

                            const startMinutes = schedule?.startTime ? timeArrayToMinutes(schedule.startTime) : null;
                            const endMinutes = schedule?.endTime ? timeArrayToMinutes(schedule.endTime) : null;

                            return (
                                <TouchableOpacity
                                    style={styles.card}
                                    onPress={() => openShareModal(item)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Compartilhar com a turma ${item.name}`}
                                >
                                    <View style={styles.infoRow}>
                                        <AntDesign name="profile" size={20} color={colors.textOrange} />
                                        <Text style={styles.textItens}>Descrição: {item.description || 'Não informada'}</Text>
                                    </View>

                                    {schedule ? (
                                        <View>
                                            <View style={styles.infoRow}>
                                                <AntDesign name="calendar" size={20} color={colors.textOrange} />
                                                <Text style={styles.textItens}>Dia:</Text>
                                                <Text style={styles.textItensBold}>
                                                    {schedule.weekday ? weekDaysMap[schedule.weekday] : 'Não definido'}
                                                </Text>
                                            </View>

                                            <View style={styles.infoRow}>
                                                <AntDesign name="clock-circle" size={24} color={colors.textOrange} />
                                                <Text style={styles.textItens}>Horário:</Text>
                                                <Text style={styles.textItensBold}>
                                                    {startMinutes ? formatMinutesToTime(startMinutes) : '--:--'} - {endMinutes ? formatMinutesToTime(endMinutes) : '--:--'}
                                                </Text>
                                            </View>
                                        </View>
                                    ) : (
                                        <View>
                                            <View style={styles.infoRow}>
                                                <AntDesign name="calendar" size={20} color={colors.textOrange} />
                                                <Text style={styles.textItens}>Dia:</Text>
                                                <Text style={styles.textItensBold}>Não definido</Text>
                                            </View>

                                            <View style={styles.infoRow}>
                                                <AntDesign name="clock-circle" size={20} color={colors.textOrange} />
                                                <Text style={styles.textItens}>Horário:</Text>
                                                <Text style={styles.textItensBold}>--:--</Text>
                                            </View>
                                        </View>
                                    )}

                                    <View style={styles.infoRow}>
                                        <AntDesign name="user" size={20} color={colors.textOrange} />
                                        <Text style={styles.textItens}>Alunos:</Text>
                                        <Text style={styles.textItensBold}>{item.students?.length || 0}/{item.maxStudents}</Text>
                                    </View>

                                    <View style={styles.infoRow}>
                                        <AntDesign name="environment" size={20} color={colors.textOrange} />
                                        <Text style={styles.textItens}>Local:</Text>
                                        <Text style={styles.textItensBold}>{item.locationName || getLocationName(item.locationId)}</Text>
                                    </View>

                                    {item.instructors && item.instructors.length > 0 && (
                                        <View style={styles.infoRow}>
                                            <AntDesign name="user-add" size={20} color={colors.textOrange} />
                                            <Text style={styles.textItens}>Instrutor(es):</Text>
                                            <Text style={styles.textItensBold}>
                                                {item.instructors.map(inst => inst.name).join(', ')}
                                            </Text>
                                        </View>
                                    )}

                                    <TouchableOpacity
                                        style={styles.shareButton}
                                        onPress={() => openShareModal(item)}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Compartilhar com a turma ${item.name}`}
                                    >
                                        <Feather name="share-2" size={20} color={colors.textWhite} />
                                        <Text style={styles.shareButtonText}>Compartilhar turma</Text>
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            );
                        }}
                    />
                ) : (
                    <View style={styles.emptyContainer}>
                        <AntDesign name="exclamation-circle" size={50} color={colors.textWhite} />
                        <Text style={styles.emptyText}>Nenhuma turma encontrada</Text>
                        <Text style={styles.emptySubText}>
                            {hasRole('Administrador')
                                ? 'Não há turmas cadastradas no sistema'
                                : hasRole('Instrutor')
                                    ? 'Você não está vinculado a nenhuma turma como instrutor'
                                    : 'Você não está matriculado em nenhuma turma'}
                        </Text>
                    </View>
                )}
            </Animatable.View>

            {/* Modal de compartilhamento */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={shareModalVisible}
                onRequestClose={closeShareModal}
                statusBarTranslucent={true}
            >
                <StatusBar
                    backgroundColor="rgba(0,0,0,0.7)"
                    barStyle="light-content"
                    translucent={true}
                />
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={closeShareModal}
                                accessibilityRole="button"
                                accessibilityLabel="Fechar compartilhamento"
                        >
                            <AntDesign name="close" size={24} color={colors.textOrange} />
                        </TouchableOpacity>

                        <Text style={styles.modalTitle}>Compartilhar turma</Text>

                        {selectedClass && (
                            <>
                                <Text style={styles.className}>{selectedClass.name}</Text>
                                <Text style={styles.classDescription}>{selectedClass.description}</Text>

                                {/* Mostra o campo de texto apenas se não houver imagem */}
                                {!image && (
                                    <TextInput
                                        style={styles.messageInput}
                                        multiline
                                        numberOfLines={6}
                                        value={message}
                                accessibilityLabel="Mensagem para a turma"
                                        onChangeText={setMessage}
                                        placeholder="Digite sua mensagem aqui..."
                                        placeholderTextColor={colors.textGrey}
                                    />
                                )}

                                {/* Botão de adicionar imagem */}
                                <TouchableOpacity
                                    style={styles.addImageButton}
                                    onPress={pickImage}
                                accessibilityRole="button"
                                accessibilityLabel="Anexar imagem"
                                >
                                    <Feather name="image" size={20} color={colors.textWhite} />
                                    <Text style={styles.addImageButtonText}>
                                        {image ? 'Alterar imagem' : 'Adicionar imagem'}
                                    </Text>
                                </TouchableOpacity>

                                {/* Preview da imagem quando existir */}
                                {image && (
                                    <View style={styles.imagePreviewContainer}>
                                        <Image
                                            source={{ uri: image }}
                                            style={styles.imagePreview}
                                            resizeMode="cover"
                                        />
                                        <TouchableOpacity
                                            style={styles.removeImageButton}
                                            onPress={() => setImage(null)}
                                        accessibilityRole="button"
                                        accessibilityLabel="Remover imagem"
                                        >
                                            <AntDesign name="close" size={16} color={colors.textWhite} />
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {/* Botão de compartilhar */}
                                <TouchableOpacity
                                    style={[styles.shareNowButton, (!message.trim() && !image) && styles.buttonDisabled]}
                                    onPress={shareToWhatsApp}
                                    disabled={!message.trim() && !image}
                                    accessibilityRole="button"
                                    accessibilityLabel="Compartilhar no WhatsApp"
                                    accessibilityState={{ disabled: !message.trim() && !image }}
                                >
                                    <Feather name="share-2" size={20} color={colors.textWhite} />
                                    <Text style={styles.shareNowButtonText}>Compartilhar</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
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
        paddingStart: '5%',
        paddingEnd: '5%',
    },
    message: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.textWhite,
        fontFamily: 'Nunito',
        paddingLeft: 10,
    },
    flatList: {
        marginTop: 10,
    },
    containerAlignMessage: {
        alignItems: 'center',
        marginEnd: 5,
        marginStart: 5,
    },
    messageContainer: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.textWhite,
        fontFamily: 'Nunito',
        paddingTop: 20,
        textAlign: 'center',
    },
    messageContainerSub: {
        fontSize: 16,
        color: colors.textWhiteTransparent,
        fontFamily: 'Nunito',
        paddingTop: 5,
        textAlign: 'justify',
    },
    card: {
        backgroundColor: colors.background,
        borderRadius: 20,
        padding: 20,
        marginBottom: 10,
        shadowColor: colors.boxShadow,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
        width: '90%',
        paddingEnd: 5,
        paddingStart: 5,
    },
    textItens: {
        fontSize: 16,
        color: colors.textWhite,
        fontFamily: 'Nunito',
        marginLeft: 10,
        flexShrink: 1,
    },
    textItensBold: {
        fontSize: 16,
        color: colors.textWhite,
        fontWeight: 'bold',
        fontFamily: 'Nunito',
        marginLeft: 10,
        flexShrink: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.backgroundOrange,
    },
    loadingText: {
        fontSize: 16,
        color: colors.textWhite,
        marginTop: 10,
        fontFamily: 'Nunito',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    emptyText: {
        fontSize: 18,
        color: colors.textWhite,
        fontFamily: 'Nunito',
        fontWeight: 'bold',
        marginTop: 20,
        textAlign: 'center',
    },
    emptySubText: {
        fontSize: 14,
        color: colors.textWhiteTransparent,
        fontFamily: 'Nunito',
        marginTop: 10,
        textAlign: 'center',
    },
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.textOrange,
        padding: 10,
        borderRadius: 10,
        marginTop: 15,
        gap: 10,
    },
    shareButtonText: {
        color: colors.textWhite,
        fontFamily: 'Nunito',
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    modalContainer: {
        width: '90%',
        backgroundColor: colors.backgroundCardBlack,
        borderRadius: 20,
        padding: 20,
        maxHeight: '80%',
    },
    closeButton: {
        position: 'absolute',
        top: 15,
        right: 15,
        backgroundColor: colors.backgroundBlack,
        padding: 8,
        borderRadius: 20,
        zIndex: 1,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.textOrange,
        fontFamily: 'Nunito',
        marginBottom: 15,
        textAlign: 'center',
    },
    className: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.textWhite,
        fontFamily: 'Nunito',
        marginBottom: 5,
        textAlign: 'center',
    },
    classDescription: {
        fontSize: 14,
        color: colors.textGrey,
        fontFamily: 'Nunito',
        marginBottom: 20,
        textAlign: 'center',
    },
    messageInput: {
        backgroundColor: colors.backgroundBlack,
        borderRadius: 10,
        padding: 15,
        color: colors.textWhite,
        fontFamily: 'Nunito',
        fontSize: 16,
        minHeight: 150,
        textAlignVertical: 'top',
        marginBottom: 15,
        borderWidth: 1,
        borderColor: colors.textGrey,
    },
    addImageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.backgroundBlack,
        padding: 12,
        borderRadius: 10,
        marginBottom: 15,
        gap: 10,
        borderWidth: 1,
        borderColor: colors.textOrange,
    },
    addImageButtonText: {
        color: colors.textWhite,
        fontFamily: 'Nunito',
        fontSize: 16,
    },
    imagePreviewContainer: {
        position: 'relative',
        marginBottom: 15,
    },
    imagePreview: {
        width: '100%',
        height: 200,
        borderRadius: 10,
    },
    removeImageButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.7)',
        borderRadius: 15,
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    shareNowButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#25D366',
        padding: 15,
        borderRadius: 10,
        gap: 10,
    },
    shareNowButtonText: {
        color: colors.textWhite,
        fontFamily: 'Nunito',
        fontSize: 16,
        fontWeight: 'bold',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
});