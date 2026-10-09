import React, { useContext, useState, useEffect } from 'react';
import {
    Image, ImageBackground, StyleSheet, Text, TextInput, TouchableOpacity, View, ScrollView, ActivityIndicator, Alert, Platform
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import { AuthContext } from '../../contexts/auth';
import { useFonts } from 'expo-font';
import { colors } from '../../styles/colors';
import { AntDesign } from '@expo/vector-icons';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function SignIn({ navigation }) {
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);
    const [biometryAvailable, setBiometryAvailable] = useState(false);
    const [isCheckingBiometry, setIsCheckingBiometry] = useState(true);

    const {
        signIn,
        signInWithBiometry,
        isBiometricAvailable,
        hasSavedCredentials,
        isAuthenticating
    } = useContext(AuthContext);

    // Verificar credenciais salvas e biometria ao carregar a tela
    useEffect(() => {
        const checkAuthOptions = async () => {
            try {
                const [hasCredentials, bioAvailable] = await Promise.all([
                    hasSavedCredentials(),
                    isBiometricAvailable()
                ]);

                setBiometryAvailable(hasCredentials && bioAvailable);
            } catch (error) {
                console.error('Erro ao verificar opções de autenticação:', error);
            } finally {
                setIsCheckingBiometry(false);
            }
        };

        checkAuthOptions();
    }, []);

    const [fontsLoaded] = useFonts({
        'Nunito': require('../../../assets/fonts/Nunito-Regular.ttf'),
    });

    if (!fontsLoaded) {
        return null;
    }

    if (isCheckingBiometry) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.backgroundOrange} />
            </View>
        );
    }

    async function handleLogin() {
        if (isAuthenticating) return;

        const result = await signIn(email, password, rememberMe);

        if (result?.errors) {
            setErrors(result.errors);
        } else if (result?.error) {
            Alert.alert("Erro", result.error);
        } else {
            setErrors({});
        }
    }

    async function handleBiometricLogin() {
        if (isAuthenticating) return;

        const result = await signInWithBiometry();

        if (result?.error) {
            Alert.alert("Erro", result.error);
        } else if (result?.errors) {
            setErrors(result.errors);
        }
    }

    return (
        <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
        >
            <ImageBackground
                source={require('../../../assets/pexels-karolina-grabowska-4996805.jpg')}
                style={styles.container}
                resizeMode="cover"
            >
                <Animatable.View animation='fadeInLeft' delay={500} style={styles.containerHeader}>
                    <Text style={styles.message}>Bem-vindo(a)</Text>
                </Animatable.View>

                <Animatable.View style={styles.containerForm} animation='fadeInUp'>
                    <View style={styles.containerInput}>
                        <Text style={styles.title}>Email</Text>
                        <View style={styles.containerInputIcons}>
                            <Feather name="user" size={24} color={colors.textOrange} />
                            <TextInput
                                placeholder='Digite seu email'
                                placeholderTextColor={colors.textWhite}
                                style={styles.input}
                                // O placeholder some assim que o campo tem texto;
                                // sem o label o leitor anuncia só "campo de edição".
                                accessibilityLabel="Email"
                                value={email}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                onChangeText={(text) => setEmail(text)}
                                editable={!isAuthenticating}
                            />
                        </View>
                        {errors.email && (
                            <Text style={styles.errorMessage}>{errors.email}</Text>
                        )}

                        <Text style={styles.title}>Senha</Text>
                        <View style={styles.containerInputIcons}>
                            <Feather name="key" size={20} color={colors.textOrange} style={styles.inputIcon} />
                            <TextInput
                                placeholder='Digite sua senha'
                                placeholderTextColor={colors.textWhite}
                                style={styles.input}
                                accessibilityLabel="Senha"
                                value={password}
                                secureTextEntry={!showPassword}
                                onChangeText={(text) => setPassword(text)}
                                editable={!isAuthenticating}
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword(!showPassword)}
                                disabled={isAuthenticating}
                                accessibilityRole="button"
                                accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                accessibilityState={{ disabled: isAuthenticating }}
                            >
                                <Ionicons
                                    name={showPassword ? "eye-off" : "eye"}
                                    size={24}
                                    color={isAuthenticating ? colors.textGrey : colors.textOrange}
                                />
                            </TouchableOpacity>
                        </View>
                        {errors.password && (
                            <Text style={styles.errorMessage}>{errors.password}</Text>
                        )}
                    </View>

                    {/* Opção Lembrar-me */}
                    <TouchableOpacity
                        style={styles.rememberMeContainer}
                        onPress={() => setRememberMe(!rememberMe)}
                        disabled={isAuthenticating}
                        accessibilityRole="checkbox"
                        accessibilityLabel="Lembrar-me"
                        accessibilityState={{ checked: rememberMe, disabled: isAuthenticating }}
                    >
                        <AntDesign
                             name={rememberMe ? "check-square" : "minus-square"}
                            size={24}
                            color={rememberMe ? colors.backgroundOrange : colors.textWhite}
                        />
                        <Text style={styles.rememberMeText}>Lembrar-me</Text>
                    </TouchableOpacity>

                    {/* Botão de Login Normal */}
                    <TouchableOpacity
                        style={[styles.button, isAuthenticating && styles.disabledButton]}
                        onPress={handleLogin}
                        disabled={isAuthenticating}
                        accessibilityRole="button"
                        // Durante o login o texto vira spinner: sem o label o botão
                        // ficaria sem nome nenhum justamente enquanto está ocupado.
                        accessibilityLabel={isAuthenticating ? 'Entrando...' : 'Entrar'}
                        accessibilityState={{ disabled: isAuthenticating, busy: isAuthenticating }}
                    >
                        {isAuthenticating ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <Text style={styles.buttonText}>Entrar</Text>
                        )}
                    </TouchableOpacity>

                    {/* Botão de Biometria (se disponível) */}
                    {biometryAvailable && (
                        <>
                            <View style={styles.separatorContainer}>
                                <View style={styles.separatorLine} />
                                <Text style={styles.separatorText}>OU</Text>
                                <View style={styles.separatorLine} />
                            </View>

                            <TouchableOpacity
                                style={[styles.biometricButton, isAuthenticating && styles.disabledButton]}
                                onPress={handleBiometricLogin}
                                disabled={isAuthenticating}
                                accessibilityRole="button"
                                accessibilityLabel={Platform.OS === 'ios'
                                    ? 'Entrar com Face ID'
                                    : 'Entrar com biometria'}
                                accessibilityState={{ disabled: isAuthenticating, busy: isAuthenticating }}
                            >
                                {isAuthenticating ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <>
                                        <Ionicons
                                            name={Platform.OS === 'ios' ? "face-id" : "finger-print"}
                                            size={24}
                                            color="white"
                                        />
                                        <Text style={styles.biometricButtonText}>
                                            {Platform.OS === 'ios' ? 'Entrar com Face ID' : 'Entrar com Digital'}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </>
                    )}

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Powered by </Text>
                        <Image
                            source={require('../../../assets/footer_lepotitech.png')}
                            style={styles.footerImage}
                        />
                    </View>
                </Animatable.View>
            </ImageBackground>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        height: '100%',
        width: '100%',
    },
    containerHeader: {
        flex: 1,
        marginTop: '14%',
        marginBottom: '8%',
        paddingStart: '5%',
    },
    message: {
        fontSize: colors.fontP28,
        fontWeight: 'bold',
        color: colors.textWhite,
        fontFamily: 'Nunito',
        paddingLeft: 10,
    },
    containerForm: {
        flex: 2,
        backgroundColor: colors.backgroundTransparent,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        paddingStart: '5%',
        paddingEnd: '5%',
        paddingBottom: '5%',
    },
    containerInput: {
        marginBottom: 20,
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
        marginTop: 28,
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
    button: {
        backgroundColor: colors.backgroundOrange,
        borderRadius: 50,
        paddingVertical: 12,
        width: '60%',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        height: 50,
        marginTop: 20,
    },
    disabledButton: {
        opacity: 0.7,
    },
    buttonText: {
        fontSize: colors.fontP18,
        color: colors.textWhite,
        fontWeight: 'bold',
        fontFamily: 'Nunito',
        textTransform: 'uppercase',
    },
    errorMessage: {
        color: colors.textOrange,
        fontSize: colors.fontP16,
        fontFamily: 'Nunito',
        marginTop: 8,
        marginLeft: 10,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        marginBottom: 50,
    },
    footerText: {
        color: colors.textWhite,
        fontFamily: 'Nunito',
    },
    footerImage: {
        width: 75,
        height: 23,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    rememberMeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
    },
    rememberMeText: {
        marginLeft: 10,
        color: colors.textWhite,
        fontFamily: 'Nunito',
    },
    biometricButton: {
        backgroundColor: colors.backgroundOrange,
        borderRadius: 50,
        paddingVertical: 12,
        width: '80%',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        height: 50,
        flexDirection: 'row',
        marginTop: 15,
    },
    biometricButtonText: {
        fontSize: colors.fontP16,
        color: colors.textWhite,
        fontWeight: 'bold',
        fontFamily: 'Nunito',
        marginLeft: 10,
    },
    separatorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 15,
    },
    separatorLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.textWhite,
        opacity: 0.5,
    },
    separatorText: {
        width: 50,
        textAlign: 'center',
        color: colors.textWhite,
        fontFamily: 'Nunito',
    },
    forgotPasswordContainer: {
        alignSelf: 'center',
        marginTop: 20,
    },
    forgotPasswordText: {
        color: colors.textWhite,
        fontFamily: 'Nunito',
        textDecorationLine: 'underline',
    },
});