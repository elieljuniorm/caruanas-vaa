import React, { useContext, useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    Image,
    TextInput,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StatusBar
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Animatable from 'react-native-animatable';
import { useFonts } from 'expo-font';
import { colors } from '../../styles/colors';
import TabNavigator from '../../components/tabNavigator';
import { AuthContext } from '../../contexts/auth';
import { useNavigation } from '@react-navigation/native';
import { AntDesign } from '@expo/vector-icons';
import Feather from '@expo/vector-icons/Feather';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import HealthDeclarationModal from '../../components/healthDeclarationModal';

import profileIcon from '../../../assets/icons/person.png';
import one from '../../../assets/icons/admin.png';
import two from '../../../assets/icons/instrutor.png';
import three from '../../../assets/icons/aluno.png';

export default function EditProfile() {
    const {
        user,
        updateUser,
        getHealthDeclarationByUser
    } = useContext(AuthContext);
    const navigation = useNavigation();
    const [fontsLoaded] = useFonts({
        'Nunito': require('../../../assets/fonts/Nunito-Regular.ttf'),
    });

    const [name, setName] = useState(user.name || '');
    const [email, setEmail] = useState(user.email || '');
    const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedImage, setSelectedImage] = useState(user.profilePicture ? { uri: `data:image/jpeg;base64,${user.profilePicture}` } : null);
    const [base64Image, setBase64Image] = useState(user.profilePicture || null);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
    const [isHealthDeclarationModalVisible, setIsHealthDeclarationModalVisible] = useState(false); // ← RENOMEADO
    const [imageRemoved, setImageRemoved] = useState(false);
    const [userHealthDeclaration, setUserHealthDeclaration] = useState(null); // ← NOVO ESTADO
    const [isLoadingHealthDeclaration, setIsLoadingHealthDeclaration] = useState(false); // ← NOVO ESTADO

    useEffect(() => {
        if (user.profilePicture) {
            setSelectedImage({ uri: `data:image/jpeg;base64,${user.profilePicture}` });
            setBase64Image(user.profilePicture);
        }
    }, [user]);

    // Função para buscar a declaração de saúde do usuário
    const loadUserHealthDeclaration = async () => {
        if (!user?.id) return;

        setIsLoadingHealthDeclaration(true);
        try {
            const result = await getHealthDeclarationByUser(user.id);
            if (result.success && result.data) {
                setUserHealthDeclaration(result.data);
            } else {
                // Se não houver declaração, define como null
                setUserHealthDeclaration(null);
            }
        } catch (error) {
            console.error('Erro ao carregar declaração de saúde:', error);
            setUserHealthDeclaration(null);
        } finally {
            setIsLoadingHealthDeclaration(false);
        }
    };

    // Carrega a declaração quando o componente monta
    useEffect(() => {
        loadUserHealthDeclaration();
    }, [user.id]);

    const toggleHealthDeclarationModal = async () => {
        // Recarrega a declaração antes de abrir o modal
        await loadUserHealthDeclaration();
        setIsHealthDeclarationModalVisible(!isHealthDeclarationModalVisible);
    };

    if (!fontsLoaded) {
        return null;
    }

    const getProfileIcon = () => {
        if (selectedImage?.uri) {
            return selectedImage;
        }

        const roleCode = user.roles[0]?.code;
        switch (roleCode) {
            case 1: return one;
            case 2: return two;
            case 3: return three;
            default: return profileIcon;
        }
    };

    const compressImage = async (uri) => {
        const result = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 800 } }],
            { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
        return result;
    };

    const pickImage = async () => {
        setModalVisible(false);
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            // Solicita permissão se ainda não tiver
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permissão necessária', 'Precisamos de permissão para acessar sua galeria.');
                return;
            }

            // Abre a galeria
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets?.[0]) {
                const compressed = await compressImage(result.assets[0].uri);
                setSelectedImage({ uri: compressed.uri });
                setBase64Image(compressed.base64);
                setImageRemoved(false);
            }
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
        }
    };

    const takePhoto = async () => {
        setModalVisible(false);
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            // Solicita permissão da câmera
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permissão necessária', 'Precisamos de permissão para acessar sua câmera.');
                return;
            }

            // Abre a câmera
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets?.[0]) {
                const compressed = await compressImage(result.assets[0].uri);
                setSelectedImage({ uri: compressed.uri });
                setBase64Image(compressed.base64);
                setImageRemoved(false);
            }
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível acessar a câmera.');
        }
    };

    const removeImage = () => {
        Alert.alert(
            "Remover Foto",
            "Deseja remover sua foto de perfil?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Remover", style: "destructive", onPress: () => {
                        setSelectedImage(null);
                        setBase64Image(null);
                        setImageRemoved(true);
                    }
                }
            ]
        );
    };

    const handleSave = async () => {
        if (isLoading) return;

        if (password && password !== confirmPassword) {
            Alert.alert('Erro', 'As senhas não coincidem.');
            return;
        }

        if (password && password.length < 8) {
            Alert.alert('Erro', 'A senha deve ter pelo menos 8 caracteres.');
            return;
        }

        setIsLoading(true);
        try {
            const updatedUser = {
                id: user.id,
                name: name.trim(),
                email: email.trim(),
                phoneNumber: phoneNumber.trim(),
                active: user.active || true,
            };

            if (imageRemoved && !base64Image) {
                updatedUser.removeProfilePicture = true;
            } else if (base64Image) {
                updatedUser.profilePicture = base64Image;
            }

            if (password) {
                updatedUser.newPassword = password;
            }

            const result = await updateUser(updatedUser);

            if (result.success) {
                setPassword('');
                setConfirmPassword('');
                setImageRemoved(false);
            }
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível atualizar o perfil');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        navigation.navigate('Perfil');
    };

    // Função para lidar com o fechamento do modal de declaração de saúde
    const handleHealthDeclarationModalClose = (shouldRefresh) => {
        setIsHealthDeclarationModalVisible(false);
        if (shouldRefresh) {
            // Recarrega a declaração se houve alteração
            loadUserHealthDeclaration();
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <Animatable.View animation='fadeInLeft' delay={500} style={styles.containerHeader}>
                <Text style={styles.message}>Editar Perfil</Text>
            </Animatable.View>

            <Animatable.View animation='fadeInUp' style={styles.containerForm}>
                <ScrollView
                    style={styles.containerInput}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.photoContainer}>
                        <TouchableOpacity
                            onPress={() => setModalVisible(true)}
                            style={styles.photoButton}
                            accessibilityRole="button"
                            accessibilityLabel="Alterar foto de perfil"
                        >
                            <View style={styles.imageWrapper}>
                                <Image source={getProfileIcon()} style={styles.userImage} resizeMode="cover" />
                                <View style={styles.editIcon}>
                                    <Feather name="edit-2" size={20} color={colors.textWhite} />
                                </View>
                            </View>
                        </TouchableOpacity>

                        {selectedImage && (
                            <TouchableOpacity
                                style={styles.removeButton}
                                onPress={removeImage}
                                accessibilityRole="button"
                                accessibilityLabel="Remover foto selecionada"
                            >
                                <Feather name="x" size={20} color={colors.textWhite} />
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={styles.healthButton}
                            onPress={toggleHealthDeclarationModal}
                            accessibilityRole="button"
                            accessibilityLabel="Declaração de saúde"
                            accessibilityState={{ busy: isLoadingHealthDeclaration }}
                            disabled={isLoadingHealthDeclaration}
                        >
                            {isLoadingHealthDeclaration ? (
                                <ActivityIndicator size="small" color={colors.backgroundOrange} />
                            ) : (
                                <MaterialIcons name="medical-services" size={24} color={colors.backgroundOrange} />
                            )}
                        </TouchableOpacity>

                        <Text style={{ fontSize: colors.fontP16, color: colors.textWhite, fontFamily: 'Nunito', marginTop: 10 }}>
                            {user.roles[0]?.description}
                        </Text>
                    </View>

                    <View style={styles.inputsContainer}>
                        <Text style={styles.title}>Nome</Text>
                        <View style={styles.containerInputIcons}>
                            <AntDesign name="user" size={24} color={colors.textOrange} />
                            <TextInput
                                style={styles.input}
                                placeholderTextColor={colors.textGrey}
                                editable={!isLoading}
                                value={name}
                                accessibilityLabel="Nome"
                                onChangeText={setName}
                                placeholder="Nome"
                            />
                        </View>

                        <Text style={styles.title}>Email</Text>
                        <View style={styles.containerInputIcons}>
                            <AntDesign name="mail" size={24} color={colors.textOrange} />
                            <TextInput
                                style={styles.input}
                                placeholderTextColor={colors.textGrey}
                                editable={!isLoading}
                                value={email}
                                accessibilityLabel="Email"
                                onChangeText={setEmail}
                                placeholder="Email"
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <Text style={styles.title}>Telefone</Text>
                        <View style={styles.containerInputIcons}>
                            <AntDesign name="phone" size={24} color={colors.textOrange} />
                            <TextInput
                                style={styles.input}
                                placeholderTextColor={colors.textGrey}
                                editable={!isLoading}
                                value={phoneNumber}
                                accessibilityLabel="Telefone"
                                onChangeText={setPhoneNumber}
                                placeholder="Telefone"
                                keyboardType="phone-pad"
                            />
                        </View>

                        <Text style={styles.title}>Nova Senha (opcional)</Text>
                        <View style={styles.containerInputIcons}>
                            <AntDesign name="lock" size={24} color={colors.textOrange} />
                            <TextInput
                                style={styles.input}
                                placeholderTextColor={colors.textGrey}
                                editable={!isLoading}
                                value={password}
                                accessibilityLabel="Nova senha"
                                onChangeText={setPassword}
                                placeholder="Nova senha"
                                secureTextEntry={!isPasswordVisible}
                            />
                            <TouchableOpacity
                                onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                                accessibilityRole="button"
                                accessibilityLabel={isPasswordVisible ? 'Ocultar nova senha' : 'Mostrar nova senha'}
                                style={styles.eyeIcon}
                            >
                                <Feather name={isPasswordVisible ? "eye-off" : "eye"} size={20} color={colors.textGrey} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.title}>Confirmar Nova Senha</Text>
                        <View style={styles.containerInputIcons}>
                            <AntDesign name="lock" size={24} color={colors.textOrange} />
                            <TextInput
                                style={styles.input}
                                placeholderTextColor={colors.textGrey}
                                editable={!isLoading}
                                value={confirmPassword}
                                accessibilityLabel="Confirmar nova senha"
                                onChangeText={setConfirmPassword}
                                placeholder="Confirmar nova senha"
                                secureTextEntry={!isConfirmPasswordVisible}
                            />
                            <TouchableOpacity
                                onPress={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
                                accessibilityRole="button"
                                accessibilityLabel={isConfirmPasswordVisible ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
                                style={styles.eyeIcon}
                            >
                                <Feather name={isConfirmPasswordVisible ? "eye-off" : "eye"} size={20} color={colors.textGrey} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.cancelButton, isLoading && styles.disabledButton]}
                            onPress={handleCancel}
                            accessibilityRole="button"
                            accessibilityLabel="Cancelar"
                            accessibilityState={{ disabled: isLoading }}
                            disabled={isLoading}
                        >
                            <Text style={styles.buttonText}>Cancelar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.saveButton, isLoading && styles.disabledButton]}
                            onPress={handleSave}
                            accessibilityRole="button"
                            accessibilityLabel={isLoading ? 'Salvando...' : 'Atualizar perfil'}
                            accessibilityState={{ disabled: isLoading, busy: isLoading }}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.buttonText}>Atualizar</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </Animatable.View>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
                statusBarTranslucent={true}
            >
                {/* StatusBar personalizada para o modal */}
                <StatusBar
                    backgroundColor="rgba(0,0,0,0.7)"
                    barStyle="light-content"
                    translucent={true}
                />
                <TouchableOpacity
                    style={styles.modalContainer}
                    activeOpacity={1}
                    onPress={() => setModalVisible(false)}
                    // Fundo do modal: fecha ao toque, mas não deve ser um item de
                    // navegação — o botão Cancelar já cumpre esse papel no leitor.
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                    accessibilityLabel="Fechar"
                >
                    <TouchableOpacity
                        style={styles.modalContent}
                        activeOpacity={1}
                        onPress={(e) => e.stopPropagation()}
                        // Só existe para impedir que o toque feche o modal.
                        accessibilityLabel="Opções de foto"
                        accessibilityRole="none"
                    >
                        <Text style={styles.modalTitle}>Alterar Foto de Perfil</Text>

                        <Text style={styles.modalText}>
                            Escolha como deseja alterar sua foto
                        </Text>

                        {selectedImage?.uri && (
                            <View style={styles.previewContainer}>
                                <Text style={styles.previewTitle}>Prévia:</Text>
                                <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} resizeMode="cover" />
                            </View>
                        )}

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                            style={[styles.modalButton, styles.galleryButton]}
                            onPress={pickImage}
                            accessibilityRole="button"
                            accessibilityLabel="Escolher foto da galeria"
                        >
                                <Feather name="image" size={20} color={colors.textWhite} style={styles.modalButtonIcon} />
                                <Text style={styles.modalButtonText}>Galeria</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                            style={[styles.modalButton, styles.cameraButton]}
                            onPress={takePhoto}
                            accessibilityRole="button"
                            accessibilityLabel="Tirar foto com a câmera"
                        >
                                <Feather name="camera" size={20} color={colors.textWhite} style={styles.modalButtonIcon} />
                                <Text style={styles.modalButtonText}>Câmera</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelModalButton]}
                                onPress={() => setModalVisible(false)}
                                accessibilityRole="button"
                                accessibilityLabel="Cancelar"
                            >
                                <Text style={styles.modalButtonText}>Cancelar</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

            {/* Modal de Declaração de Saúde - AGORA COM OS DADOS CORRETOS */}
            <HealthDeclarationModal
                visible={isHealthDeclarationModalVisible}
                onClose={handleHealthDeclarationModalClose}
                declarationData={userHealthDeclaration}
                userId={user?.id}
            />

            <TabNavigator />
        </KeyboardAvoidingView>
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
    containerInput: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 150,
    },
    inputsContainer: {
        width: '100%',
        marginBottom: 20,
    },
    photoContainer: {
        display: 'flex',
        alignItems: 'center',
        marginTop: 20,
        position: 'relative',
    },
    photoButton: {
        position: 'relative',
    },
    imageWrapper: {
        position: 'relative',
    },
    userImage: {
        width: 150,
        height: 150,
        borderColor: colors.textOrange,
        borderWidth: 3,
        borderRadius: 100,
    },
    editIcon: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        backgroundColor: colors.backgroundOrange,
        borderRadius: 20,
        padding: 5,
    },
    removeButton: {
        position: 'absolute',
        top: 0,
        right: 100,
        backgroundColor: colors.backgroundRedButton,
        borderRadius: 15,
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    healthButton: {
        position: 'absolute',
        top: 10,
        right: 40,
        backgroundColor: colors.backgroundBlack,
        borderRadius: 30,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.backgroundRed,
    },
    message: {
        fontSize: colors.fontP28,
        fontWeight: 'bold',
        color: colors.textWhite,
        fontFamily: 'Nunito',
        paddingLeft: 10,
    },
    containerInputIcons: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        paddingLeft: 20,
        paddingRight: 20,
        backgroundColor: colors.backgroundTransparent,
        borderRadius: 25,
    },
    title: {
        fontSize: colors.fontP20,
        marginTop: 20,
        marginLeft: 10,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        textTransform: 'uppercase',
    },
    input: {
        flex: 1,
        height: 50,
        width: '100%',
        fontSize: colors.fontP16,
        paddingLeft: 8,
        color: colors.textWhite,
    },
    eyeIcon: {
        padding: 8,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 10,
        gap: 20,
    },
    saveButton: {
        backgroundColor: colors.backgroundGreenButton,
        borderRadius: 50,
        paddingVertical: 8,
        width: '40%',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
    },
    cancelButton: {
        backgroundColor: colors.backgroundRedButton,
        borderRadius: 50,
        paddingVertical: 8,
        width: '40%',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
    },
    disabledButton: {
        opacity: 0.6,
    },
    buttonText: {
        fontSize: colors.fontP16,
        color: colors.textWhite,
        fontWeight: 'bold',
        fontFamily: 'Nunito',
        textTransform: 'uppercase',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.backgroundmodalOverlay,
    },
    modalContent: {
        width: '80%',
        backgroundColor: colors.backgroundTransparent,
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: colors.fontP20,
        fontWeight: 'bold',
        color: colors.textWhite,
        marginBottom: 15,
        fontFamily: 'Nunito',
    },
    modalText: {
        fontSize: colors.fontP14,
        color: colors.textWhite,
        textAlign: 'center',
        marginBottom: 20,
        fontFamily: 'Nunito',
    },
    modalButtons: {
        width: '100%',
        marginTop: 10,
    },
    modalButton: {
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'center',
    },
    galleryButton: {
        backgroundColor: colors.backgroundGreenButton,
        borderRadius: 50,
    },
    cameraButton: {
        backgroundColor: colors.backgroundBlueButton,
        borderRadius: 50,
    },
    cancelModalButton: {
        backgroundColor: colors.backgroundOrange,
        borderRadius: 50,
    },
    modalButtonText: {
        color: colors.textWhite,
        fontWeight: 'bold',
        fontFamily: 'Nunito',
        marginLeft: 8,
    },
    modalButtonIcon: {
        marginRight: 8,
    },
    previewContainer: {
        width: '100%',
        alignItems: 'center',
        marginVertical: 15,
    },
    previewTitle: {
        fontSize: colors.fontP16,
        color: colors.textWhite,
        fontWeight: 'bold',
        marginBottom: 5,
        fontFamily: 'Nunito',
    },
    previewImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: colors.textOrange,
    },
    previewText: {
        fontSize: colors.fontP12,
        color: colors.textWhite,
        marginTop: 5,
        fontFamily: 'Nunito',
    },
});