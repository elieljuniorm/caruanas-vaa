import React, { useContext, useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View, 
  ActivityIndicator, 
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Keyboard
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import { AuthContext } from '../../contexts/auth';
import { useFonts } from 'expo-font';
import { colors } from '../../styles/colors';
import TabNavigator from '../../components/tabNavigator';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';

export default function Register() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phoneNumber: '',
        password: '',
        codeRole: ''
    });
    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showRolePicker, setShowRolePicker] = useState(false);
    const [passwordRequirements, setPasswordRequirements] = useState({
        minLength: false,
        hasUppercase: false,
        hasLowercase: false,
        hasNumber: false,
        hasSpecialChar: false,
    });

    const { register, registerResponse } = useContext(AuthContext);
    
    // Refs para scroll e inputs
    const scrollViewRef = useRef(null);
    const inputRefs = useRef({});

    const roleOptions = [
        { value: '1', label: 'Administrador' },
        { value: '2', label: 'Instrutor' },
        { value: '3', label: 'Aluno' }
    ];

    useEffect(() => {
        // Valida os requisitos da senha conforme o usuário digita
        const requirements = {
            minLength: formData.password.length >= 8,
            hasUppercase: /[A-Z]/.test(formData.password),
            hasLowercase: /[a-z]/.test(formData.password),
            hasNumber: /[0-9]/.test(formData.password),
            hasSpecialChar: /[@#$%^&+=]/.test(formData.password),
        };
        setPasswordRequirements(requirements);
    }, [formData.password]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        // Limpa erro do campo quando o usuário começa a digitar
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const getRoleLabel = () => {
        const role = roleOptions.find(r => r.value === formData.codeRole);
        return role ? role.label : 'Selecione o tipo de usuário';
    };

    async function handleRegister() {
        // Fecha o teclado antes de fazer o registro
        Keyboard.dismiss();
        setIsLoading(true);
        try {
            const result = await register(formData);

            if (result?.errors) {
                setErrors(result.errors);
            } else {
                setErrors({});
                // Limpa o formulário após sucesso
                setFormData({
                    name: '',
                    email: '',
                    phoneNumber: '',
                    password: '',
                    codeRole: ''
                });
            }
        } catch (error) {
            console.error('Registration error:', error);
            setErrors({ global: 'Erro ao processar cadastro' });
        } finally {
            setIsLoading(false);
        }
    }

    // Função para focar no próximo input
    const focusNextInput = (nextField) => {
        if (inputRefs.current[nextField]) {
            inputRefs.current[nextField].focus();
        }
    };

    // Função para rolar até o input quando focado
    const handleInputFocus = (fieldName) => {
        setTimeout(() => {
            if (scrollViewRef.current) {
                // Calcula a posição aproximada para rolar
                let offset = 0;
                switch (fieldName) {
                    case 'name':
                        offset = 0;
                        break;
                    case 'email':
                        offset = 100;
                        break;
                    case 'phoneNumber':
                        offset = 200;
                        break;
                    case 'password':
                        offset = 350;
                        break;
                    default:
                        offset = 0;
                }
                scrollViewRef.current.scrollTo({ y: offset, animated: true });
            }
        }, 100);
    };

    const [fontsLoaded] = useFonts({
        'Nunito': require('../../../assets/fonts/Nunito-Regular.ttf'),
    });

    if (!fontsLoaded) {
        return null;
    }

    return (
        <KeyboardAvoidingView 
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <Animatable.View animation='fadeInLeft' delay={500} style={styles.containerHeader}>
                <Text style={styles.message}>Cadastrar Usuário</Text>
            </Animatable.View>

            <Animatable.View style={styles.containerForm} animation='fadeInUp'>
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.scrollContainer}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                >
                    <View style={styles.formSection}>
                        {/* Campo Nome */}
                        <Text style={styles.title}>Nome Completo</Text>
                        <View style={styles.inputContainer}>
                            <FontAwesome5 name="user-alt" size={18} color={colors.textOrange} />
                            <TextInput
                                ref={ref => inputRefs.current.name = ref}
                                accessibilityLabel="Nome completo"
                                placeholder='Digite o nome completo'
                                placeholderTextColor={colors.textGrey}
                                style={styles.input}
                                value={formData.name}
                                onChangeText={(text) => handleInputChange('name', text)}
                                editable={!isLoading}
                                maxLength={100}
                                returnKeyType="next"
                                onSubmitEditing={() => focusNextInput('email')}
                                onFocus={() => handleInputFocus('name')}
                            />
                        </View>
                        {errors.name ? <Text style={styles.errorMessage}>{errors.name}</Text> : null}

                        {/* Campo Email */}
                        <Text style={styles.title}>Email</Text>
                        <View style={styles.inputContainer}>
                            <Feather name="mail" size={20} color={colors.textOrange} />
                            <TextInput
                                ref={ref => inputRefs.current.email = ref}
                                accessibilityLabel="Email"
                                placeholder='Digite o email'
                                placeholderTextColor={colors.textGrey}
                                style={styles.input}
                                value={formData.email}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                onChangeText={(text) => handleInputChange('email', text)}
                                editable={!isLoading}
                                returnKeyType="next"
                                onSubmitEditing={() => focusNextInput('phoneNumber')}
                                onFocus={() => handleInputFocus('email')}
                            />
                        </View>
                        {errors.email ? <Text style={styles.errorMessage}>{errors.email}</Text> : null}

                        {/* Campo Telefone */}
                        <Text style={styles.title}>Telefone</Text>
                        <View style={styles.inputContainer}>
                            <Feather name="phone" size={20} color={colors.textOrange} />
                            <TextInput
                                ref={ref => inputRefs.current.phoneNumber = ref}
                                accessibilityLabel="Telefone"
                                placeholder='Digite o telefone (ex: 11999999999)'
                                placeholderTextColor={colors.textGrey}
                                style={styles.input}
                                value={formData.phoneNumber}
                                keyboardType="phone-pad"
                                onChangeText={(text) => handleInputChange('phoneNumber', text)}
                                editable={!isLoading}
                                maxLength={15}
                                returnKeyType="next"
                                onSubmitEditing={() => setShowRolePicker(true)}
                                onFocus={() => handleInputFocus('phoneNumber')}
                            />
                        </View>
                        {errors.phoneNumber ? <Text style={styles.errorMessage}>{errors.phoneNumber}</Text> : null}

                        {/* Campo Tipo de Usuário */}
                        <Text style={styles.title}>Tipo de Usuário</Text>
                        <TouchableOpacity
                            style={styles.pickerContainer}
                            onPress={() => !isLoading && setShowRolePicker(true)}
                                accessibilityRole="button"
                                accessibilityLabel="Tipo de usuário"
                                accessibilityValue={{ text: roleOptions.find(r => r.value === formData.codeRole)?.label || 'não selecionado' }}
                            disabled={isLoading}
                            onFocus={() => handleInputFocus('codeRole')}
                        >
                            <View style={styles.pickerContent}>
                                <Feather name="users" size={20} color={colors.textOrange} />
                                <Text style={[
                                    styles.pickerText,
                                    !formData.codeRole && styles.pickerPlaceholder
                                ]}>
                                    {getRoleLabel()}
                                </Text>
                            </View>
                            <Feather name="chevron-down" size={20} color={colors.textOrange} />
                        </TouchableOpacity>
                        {errors.codeRole ? <Text style={styles.errorMessage}>{errors.codeRole}</Text> : null}

                        {/* Campo Senha */}
                        <Text style={styles.title}>Senha</Text>
                        <View style={styles.inputContainer}>
                            <Feather name="key" size={20} color={colors.textOrange} />
                            <TextInput
                                ref={ref => inputRefs.current.password = ref}
                                accessibilityLabel="Senha"
                                placeholder='Digite uma senha segura'
                                placeholderTextColor={colors.textGrey}
                                style={styles.input}
                                value={formData.password}
                                secureTextEntry={!showPassword}
                                onChangeText={(text) => handleInputChange('password', text)}
                                editable={!isLoading}
                                returnKeyType="done"
                                onSubmitEditing={handleRegister}
                                onFocus={() => handleInputFocus('password')}
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword(!showPassword)}
                                    accessibilityRole="button"
                                    accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                disabled={isLoading}
                                style={styles.eyeButton}
                            >
                                <Ionicons
                                    name={showPassword ? "eye-off" : "eye"}
                                    size={20}
                                    color={isLoading ? colors.textGrey : colors.textOrange}
                                />
                            </TouchableOpacity>
                        </View>
                        {errors.password ? <Text style={styles.errorMessage}>{errors.password}</Text> : null}

                        {/* Mapa de validação de senha */}
                        <View style={styles.validationContainer}>
                            <Text style={styles.validationTitle}>Requisitos da senha:</Text>

                            <View style={styles.requirementItem}>
                                <MaterialIcons
                                    name={passwordRequirements.minLength ? "check-circle" : "circle"}
                                    size={18}
                                    color={passwordRequirements.minLength ? '#4CAF50' : colors.textGrey}
                                    style={styles.requirementIcon}
                                />
                                <Text style={styles.requirementText}>
                                    Mínimo 8 caracteres
                                </Text>
                            </View>

                            <View style={styles.requirementItem}>
                                <MaterialIcons
                                    name={passwordRequirements.hasUppercase ? "check-circle" : "circle"}
                                    size={18}
                                    color={passwordRequirements.hasUppercase ? '#4CAF50' : colors.textGrey}
                                    style={styles.requirementIcon}
                                />
                                <Text style={styles.requirementText}>
                                    Pelo menos uma letra maiúscula
                                </Text>
                            </View>

                            <View style={styles.requirementItem}>
                                <MaterialIcons
                                    name={passwordRequirements.hasLowercase ? "check-circle" : "circle"}
                                    size={18}
                                    color={passwordRequirements.hasLowercase ? '#4CAF50' : colors.textGrey}
                                    style={styles.requirementIcon}
                                />
                                <Text style={styles.requirementText}>
                                    Pelo menos uma letra minúscula
                                </Text>
                            </View>

                            <View style={styles.requirementItem}>
                                <MaterialIcons
                                    name={passwordRequirements.hasNumber ? "check-circle" : "circle"}
                                    size={18}
                                    color={passwordRequirements.hasNumber ? '#4CAF50' : colors.textGrey}
                                    style={styles.requirementIcon}
                                />
                                <Text style={styles.requirementText}>
                                    Pelo menos um número
                                </Text>
                            </View>

                            <View style={styles.requirementItem}>
                                <MaterialIcons
                                    name={passwordRequirements.hasSpecialChar ? "check-circle" : "circle"}
                                    size={18}
                                    color={passwordRequirements.hasSpecialChar ? '#4CAF50' : colors.textGrey}
                                    style={styles.requirementIcon}
                                />
                                <Text style={styles.requirementText}>
                                    Pelo menos um caractere especial (@#$%^&+=)
                                </Text>
                            </View>
                        </View>

                        {/* Botão de Cadastro */}
                        <View style={styles.buttonSection}>
                            <TouchableOpacity
                                accessibilityRole="button"
                                accessibilityLabel={isLoading ? 'Cadastrando...' : 'Cadastrar usuário'}
                                accessibilityState={{ busy: isLoading }}
                                style={[
                                    styles.saveButton,
                                    (isLoading || 
                                     !formData.name || 
                                     !formData.email || 
                                     !formData.phoneNumber || 
                                     !formData.codeRole || 
                                     !formData.password || 
                                     !passwordRequirements.minLength ||
                                     !passwordRequirements.hasUppercase ||
                                     !passwordRequirements.hasLowercase ||
                                     !passwordRequirements.hasNumber ||
                                     !passwordRequirements.hasSpecialChar) && styles.disabledButton
                                ]}
                                onPress={handleRegister}
                                disabled={
                                    isLoading || 
                                    !formData.name || 
                                    !formData.email || 
                                    !formData.phoneNumber || 
                                    !formData.codeRole || 
                                    !formData.password || 
                                    !passwordRequirements.minLength ||
                                    !passwordRequirements.hasUppercase ||
                                    !passwordRequirements.hasLowercase ||
                                    !passwordRequirements.hasNumber ||
                                    !passwordRequirements.hasSpecialChar
                                }
                            >
                                {isLoading ? (
                                    <Animatable.View
                                        animation="rotate"
                                        iterationCount="infinite"
                                        duration={2000}
                                        style={styles.loadingContainer}
                                    >
                                        <ActivityIndicator size="small" color="white" />
                                    </Animatable.View>
                                ) : (
                                    <Text style={styles.buttonText}>Cadastrar Usuário</Text>
                                )}
                            </TouchableOpacity>

                            {/* Mensagens de resposta */}
                            <View style={styles.responseContainer}>
                                {registerResponse?.success && (
                                    <Animatable.Text
                                        animation="fadeIn"
                                        duration={1000}
                                        style={styles.successMessage}
                                    >
                                        {registerResponse.message}
                                    </Animatable.Text>
                                )}
                                {registerResponse?.success === false && (
                                    <Animatable.Text
                                        animation="fadeIn"
                                        duration={1000}
                                        style={styles.errorMessage}
                                    >
                                        {registerResponse.errors?.global || 'Erro ao cadastrar usuário'}
                                    </Animatable.Text>
                                )}
                                {errors.global && (
                                    <Animatable.Text
                                        animation="fadeIn"
                                        duration={1000}
                                        style={styles.errorMessage}
                                    >
                                        {errors.global}
                                    </Animatable.Text>
                                )}
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </Animatable.View>

            {/* Modal para selecionar tipo de usuário */}
            <Modal
                transparent={true}
                visible={showRolePicker}
                animationType="slide"
                onRequestClose={() => setShowRolePicker(false)}
            >
                <TouchableWithoutFeedback
                    onPress={() => setShowRolePicker(false)}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                    accessibilityLabel="Fechar"
                >
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback accessibilityLabel="Tipo de usuário">
                            <View style={styles.modalContent}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Selecione o Tipo de Usuário</Text>
                                    <TouchableOpacity
                                        onPress={() => setShowRolePicker(false)}
                                        accessibilityRole="button"
                                        accessibilityLabel="Fechar seleção de tipo"
                                    >
                                        <Feather name="x" size={24} color={colors.textWhite} />
                                    </TouchableOpacity>
                                </View>
                                {roleOptions.map((role) => (
                                    <TouchableOpacity
                                        key={role.value}
                                        style={styles.modalOption}
                                        accessibilityRole="button"
                                        accessibilityLabel={role.label}
                                        accessibilityState={{ selected: formData.codeRole === role.value }}
                                        onPress={() => {
                                            handleInputChange('codeRole', role.value);
                                            setShowRolePicker(false);
                                            // Foca no campo de senha após selecionar o tipo
                                            setTimeout(() => {
                                                if (inputRefs.current.password) {
                                                    inputRefs.current.password.focus();
                                                }
                                            }, 300);
                                        }}
                                    >
                                        <Text style={styles.modalOptionText}>{role.label}</Text>
                                        {formData.codeRole === role.value && (
                                            <Feather name="check" size={20} color={colors.textOrange} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

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

    },
    scrollContainer: {
        flex: 1,
        marginTop: 4,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
    },
    scrollContent: {
        paddingHorizontal: 25,
        paddingBottom: 100,
    },
    formSection: {
        paddingTop: 20,
        minHeight: '100%',
    },
    message: {
        fontSize: colors.fontP28,
        fontWeight: 'bold',
        color: colors.textWhite,
        fontFamily: 'Nunito',
        paddingLeft: 10,
    },
    title: {
        fontSize: colors.fontP16,
        marginTop: 20,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        fontWeight: '600',
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundTransparent,
        borderRadius: 35,
        paddingHorizontal: 15,
        minHeight: 50,
    },
    input: {
        flex: 1,
        fontSize: colors.fontP16,
        color: colors.textWhite,
        fontFamily: 'Nunito',
        paddingVertical: 12,
        marginLeft: 10,
        paddingRight: 10,
    },
    eyeButton: {
        padding: 5,
    },
    pickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.backgroundTransparent,
        borderRadius: 35,
        paddingHorizontal: 15,
        minHeight: 50,
        marginTop: 5,
    },
    pickerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    pickerText: {
        fontSize: colors.fontP16,
        color: colors.textWhite,
        fontFamily: 'Nunito',
        marginLeft: 10,
    },
    pickerPlaceholder: {
        color: colors.textGrey,
    },
    validationContainer: {
        marginTop: 25,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: 15,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    validationTitle: {
        fontSize: colors.fontP16,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        fontWeight: '600',
        marginBottom: 15,
    },
    requirementItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    requirementIcon: {
        marginRight: 12,
    },
    requirementText: {
        fontSize: colors.fontP14,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        flex: 1,
    },
    buttonSection: {
        marginTop: 30,
        marginBottom: 50,
    },
    saveButton: {
        backgroundColor: colors.backgroundOrange,
        paddingVertical: 16,
        borderRadius: 35,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    disabledButton: {
        opacity: 0.5,
    },
    buttonText: {
        fontSize: colors.fontP18,
        color: colors.textWhite,
        fontWeight: 'bold',
        fontFamily: 'Nunito',
    },
    responseContainer: {
        marginTop: 15,
        alignItems: 'center',
        minHeight: 40,
    },
    errorMessage: {
        color: colors.textOrange,
        fontSize: colors.fontP16,
        fontFamily: 'Nunito',
        textAlign: 'center',
        fontWeight: '500',
    },
    successMessage: {
        color: colors.textWhite,
        fontSize: colors.fontP16,
        fontFamily: 'Nunito',
        textAlign: 'center',
        fontWeight: '500',
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: 24,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: colors.backgroundTransparent,
        borderRadius: 20,
        width: '100%',
        maxWidth: 400,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    modalTitle: {
        fontSize: colors.fontP18,
        color: colors.textWhite,
        fontFamily: 'Nunito',
        fontWeight: '600',
    },
    modalOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    modalOptionText: {
        fontSize: colors.fontP16,
        color: colors.textWhite,
        fontFamily: 'Nunito',
    },
});