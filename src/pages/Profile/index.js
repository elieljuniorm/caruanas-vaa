import React, { useContext, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, ScrollView, Button, Image, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { useFonts } from 'expo-font';
import { colors } from '../../styles/colors';
import TabNavigator from '../../components/tabNavigator'
import { AuthContext } from '../../contexts/auth';
import { useNavigation } from '@react-navigation/native';
import { AntDesign } from '@expo/vector-icons';

import profileIcon from '../../../assets/icons/person.png';
import one from '../../../assets/icons/admin.png'
import two from '../../../assets/icons/instrutor.png'
import three from '../../../assets/icons/aluno.png'

export default function Profile() {

    const { user } = useContext(AuthContext);

    const navigation = useNavigation();

    const [fontsLoaded] = useFonts({
        'Nunito': require('../../../assets/fonts/Nunito-Regular.ttf'),
    });

    if (!fontsLoaded) {
        return null;
    }

    const getProfileIcon = () => {
        // Se tiver profilePicture em base64, use-a
        if (user?.profilePicture) {
            return { uri: `data:image/jpeg;base64,${user.profilePicture}` };
        }
        
        // Caso contrário, use os ícones padrão baseados no role
        const roleCode = user?.roles?.[0]?.code;
        switch (roleCode) {
            case 1:
                return one;
            case 2:
                return two;
            case 3:
                return three;
            default:
                return profileIcon;
        }
    };

    // Verifica se a profilePicture é uma base64 válida
    const isBase64Image = () => {
        return user?.profilePicture && typeof user.profilePicture === 'string' && user.profilePicture.length > 0;
    };

    return (
        <View style={styles.container}>
            <Animatable.View animation='fadeInLeft' delay={500} style={styles.containerHeader}>
                <Text style={styles.message}>Perfil</Text>
            </Animatable.View>

            <Animatable.View animation='fadeInUp' style={styles.containerForm}>
                <ScrollView
                    style={styles.containerInput}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.containerImg}>
                        <Image 
                            source={getProfileIcon()} 
                            style={styles.userImage} 
                            resizeMode="cover"
                            onError={(error) => console.log('Erro ao carregar imagem:', error)}
                        />
                        <Text style={{ fontSize: colors.fontP16, color: colors.textWhite, fontFamily: 'Nunito', marginTop: 10 }}>
                            {user?.roles?.[0]?.description || ''}
                        </Text>
                    </View>

                    <View style={styles.inputsContainer}>
                        <Text style={styles.title}>Nome</Text>
                        <View style={styles.containerInputIcons}>
                            <AntDesign name="user" size={24} color={colors.textOrange} />
                            <TextInput
                                style={styles.input}
                                placeholderTextColor={colors.textGrey}
                                editable={false}
                                value={user?.name || ''}
                                placeholder="Nome"
                                keyboardType="number-pad"
                                accessibilityLabel="Nome"
                                accessibilityValue={{ text: user?.name || 'não informado' }}
                            />
                        </View>

                        <Text style={styles.title}>Email</Text>
                        <View style={styles.containerInputIcons}>
                            <AntDesign name="mail" size={24} color={colors.textOrange} />
                            <TextInput
                                style={styles.input}
                                placeholderTextColor={colors.textGrey}
                                editable={false}
                                value={user?.email || ''}
                                placeholder="Nome"
                                keyboardType="number-pad"
                                accessibilityLabel="Email"
                                accessibilityValue={{ text: user?.email || 'não informado' }}
                            />
                        </View>

                        <Text style={styles.title}>Telefone</Text>
                        <View style={styles.containerInputIcons}>
                            <AntDesign name="phone" size={24} color={colors.textOrange} />
                            <TextInput
                                style={styles.input}
                                placeholderTextColor={colors.textGrey}
                                editable={false}
                                value={user?.phoneNumber || ''}
                                placeholder="Nome"
                                keyboardType="number-pad"
                                accessibilityLabel="Telefone"
                                accessibilityValue={{ text: user?.phoneNumber || 'não informado' }}
                            />
                        </View>
                    </View>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={styles.buttonEdit}
                            onPress={() => navigation.navigate('EditProfile')}
                            accessibilityRole="button"
                            accessibilityLabel="Editar perfil"
                        >
                            <Text style={styles.buttonText}>Editar perfil</Text>
                        </TouchableOpacity>
                    </View>


                </ScrollView>

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
    containerImg: {
        display: 'flex',
        alignItems: 'center',
        marginTop: 20,
    },
    message: {
        fontSize: colors.fontP28,
        fontWeight: 'bold',
        color: colors.textWhite,
        fontFamily: 'Nunito',
        paddingLeft: 10,
    },
    userImage: {
        width: 150,
        height: 150,
        borderColor: colors.backgroundTransparent,
        borderWidth: 5,
        borderRadius: 100,
        backgroundColor: colors.backgroundTransparent, // Fundo caso a imagem não carregue
    },
    buttonContainer: {
        marginTop: 10,
    },
    buttonEdit: {
        backgroundColor: colors.backgroundBlueButton,
        borderRadius: 50,
        paddingVertical: 8,
        width: '60%',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
    },
    buttonText: {
        fontSize: colors.fontP18,
        color: colors.textWhite,
        fontWeight: 'bold',
        fontFamily: 'Nunito',
        textTransform: 'uppercase',
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
        color: colors.textDisebled,
    },
});