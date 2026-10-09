import React, { useContext, useState } from 'react'
import { Image, ImageBackground, StyleSheet, Text, TouchableOpacity, View, Alert, ActivityIndicator } from 'react-native'
import * as Animatable from 'react-native-animatable'
import { useNavigation } from '@react-navigation/native'
import { useFonts } from 'expo-font';
import { colors } from '../../styles/colors'
import { AuthContext } from '../../contexts/auth'

export default function Welcome() {

    const navigation = useNavigation();
    const { signInWithBiometry, hasSavedCredentials, isBiometricAvailable } = useContext(AuthContext);
    const [isLoading, setIsLoading] = useState(false);

    const [fontsLoaded] = useFonts({
        'Nunito': require('../../../assets/fonts/Nunito-Regular.ttf'),
    });

    if (!fontsLoaded) {
        return null;
    }

    // Função para tentar autologin com biometria
    const handleAccessPress = async () => {
        setIsLoading(true);

        try {
            // Verifica se há credenciais salvas
            const hasCredentials = await hasSavedCredentials();

            if (!hasCredentials) {
                // Se não tem credenciais, vai direto para o login
                navigation.navigate('SignIn');
                setIsLoading(false);
                return;
            }

            // Verifica se biometria está disponível
            const hasBiometric = await isBiometricAvailable();

            if (!hasBiometric) {
                // Se não tem biometria, vai para login manual
                navigation.navigate('SignIn');
                setIsLoading(false);
                return;
            }

            // Tenta login com biometria
            const result = await signInWithBiometry();

            if (result.success) {
                // Sucesso! O navigation já é feito dentro do signInWithBiometry
                // Não precisa fazer nada aqui
            } else {
                // Falha na biometria - vai para login manual
                navigation.navigate('SignIn')
            }
        } catch (error) {
            navigation.navigate('SignIn')
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ImageBackground
            source={require('../../../assets/fundo_vaa_01.jpg')}
            style={styles.container}
            resizeMode="cover"
        >
            <View style={styles.containerLogo}>

                <Animatable.Image
                    source={require('../../../assets/caruanas_principal.png')}
                    style={{ width: 300, height: 300 }}
                    delay={400}
                    animation='bounceIn'
                    resizeMode="contain"
                />
            </View>

            <Animatable.View delay={600} style={styles.containerForm} animation='fadeInUp'>
                <Text style={styles.title}>Canoagem polinésia e amazônica</Text>
                <Text style={styles.text}></Text>
                <Text style={styles.text}>Faça login para começar!</Text>

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleAccessPress}
                    disabled={isLoading}
                    accessibilityRole="button"
                    accessibilityLabel={isLoading ? 'Entrando...' : 'Acessar'}
                    accessibilityState={{ disabled: isLoading, busy: isLoading }}
                >
                    {isLoading ? (
                        <ActivityIndicator color={colors.textWhite} size="small" />
                    ) : (
                        <Text style={styles.buttonText}>Acessar</Text>
                    )}
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Powered by </Text>
                    <Image source={require('../../../assets/footer_lepotitech.png')} style={styles.footerImage} />
                </View>

            </Animatable.View>
        </ImageBackground>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    containerLogo: {
        flex: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    containerForm: {
        flex: 1,
        backgroundColor: colors.backgroundTransparent,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        display: 'flex',
        alignItems: 'center',
    },
    title: {
        fontSize: colors.fontP24,
        marginTop: 30,
        textTransform: 'uppercase',
        textAlign: 'center',
        fontFamily: 'Nunito',
        color: colors.textWhite,
    },
    text: {
        color: colors.textOrange,
        fontSize: colors.fontP20,
        fontFamily: 'Nunito',
    },
    button: {
        position: 'absolute',
        backgroundColor: colors.backgroundOrange,
        borderRadius: 50,
        paddingVertical: 9,
        width: '60%',
        alignSelf: 'center',
        bottom: '32%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        fontSize: colors.fontP18,
        color: colors.textWhite,
        fontWeight: 'bold',
        fontFamily: 'Nunito',
        textTransform: 'uppercase',
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
})