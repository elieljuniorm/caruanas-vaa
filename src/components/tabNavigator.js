import React, { useCallback, useContext } from 'react';
import { Image, StyleSheet, TouchableOpacity } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AuthContext } from '../contexts/auth';

const FooterTabs = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { hasRole } = useContext(AuthContext);

    // Verifica se o usuário tem o papel de 'Administrador' ou 'Instrutor'
    const isAdminOrInstructor = hasRole('Administrador', 'Instrutor');

    // Função para navegar e garantir que não navegue para a mesma tela
    const handleNavigation = useCallback((targetRoute) => {
        if (route.name !== targetRoute) {
            navigation.navigate(targetRoute);
        }
    }, [navigation, route.name]);

    return (
        <Animatable.View animation='fadeInUp' style={styles.footer}>
            {/* Botão Home - sempre ativo */}
            <TouchableOpacity
                style={styles.button}
                onPress={() => handleNavigation('Inicio')}
                accessibilityRole="tab"
                accessibilityLabel="Início"
                accessibilityState={{ selected: route.name === 'Inicio' }}
            >
                <Image
                    source={
                        route.name === 'Inicio'
                            ? require('../../assets/icons/home-active.png')
                            : require('../../assets/icons/home.png')
                    }
                    style={styles.buttonImage}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                />
            </TouchableOpacity>

            {/* Botão Faturas - desabilitado para Admin/Instrutor (sem utilidade nesses perfis) */}
            <TouchableOpacity
                style={styles.button}
                onPress={() => {
                    if (!isAdminOrInstructor) {
                        handleNavigation('Faturas');
                    }
                }}
                accessibilityRole="tab"
                accessibilityLabel="Faturas"
                // O botão não some para admin/instrutor, só deixa de responder —
                // sem o estado o leitor de tela anunciaria uma aba que não navega.
                accessibilityState={{
                    selected: route.name === 'Faturas',
                    disabled: isAdminOrInstructor,
                }}
            >
                <Image
                    source={
                        isAdminOrInstructor
                            ? require('../../assets/icons/fatura-disable.png')
                            : route.name === 'Faturas'
                                ? require('../../assets/icons/fatura-active.png')
                                : require('../../assets/icons/fatura.png')
                    }
                    style={styles.buttonImage}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                />
            </TouchableOpacity>

            {/* Botão Treino - desabilitado para Admin/Instrutor */}
            <TouchableOpacity
                style={styles.button}
                onPress={() => {
                    if (!isAdminOrInstructor) {
                        handleNavigation('Treino');
                    }
                }}
                accessibilityRole="tab"
                accessibilityLabel="Treino"
                accessibilityState={{
                    selected: route.name === 'Treino',
                    disabled: isAdminOrInstructor,
                }}
            >
                <Image
                    source={
                        isAdminOrInstructor
                            ? require('../../assets/icons/treino-disable.png')
                            : route.name === 'Treino'
                                ? require('../../assets/icons/treino-active.png')
                                : require('../../assets/icons/treino.png')
                    }
                    style={styles.buttonImage}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                />
            </TouchableOpacity>
        </Animatable.View>
    );
};

const styles = StyleSheet.create({
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'absolute',
        bottom: 35,
        alignSelf: 'center',
        width: '80%',
        backgroundColor: 'black',
        borderRadius: 40,
        paddingVertical: 10,
        zIndex: 10,
    },
    button: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 5,
        borderRadius: 5,
    },
    buttonImage: {
        width: 30,
        height: 30,
        paddingBottom: 0,
    },
});

export default FooterTabs;