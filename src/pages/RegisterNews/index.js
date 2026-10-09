import React, { useState, useContext, useCallback } from 'react';
import { StyleSheet, Text, View, TextInput, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Animatable from 'react-native-animatable';
import { useFonts } from 'expo-font';
import { colors } from '../../styles/colors';
import TabNavigator from '../../components/tabNavigator';
import { AntDesign } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AuthContext } from '../../contexts/auth';

export default function RegisterNews() {
    const { createNews } = useContext(AuthContext);
    const [title, setTitle] = useState('');
    const [summary, setSummary] = useState('');
    const [content, setContent] = useState('');
    const [image, setImage] = useState(null);
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [response, setResponse] = useState(null);

    const [fontsLoaded] = useFonts({
        'Nunito': require('../../../assets/fonts/Nunito-Regular.ttf'),
    });

    if (!fontsLoaded) {
        return null;
    }

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
            base64: true,
        });

        if (!result.canceled) {
            try {
                const base64 = result.assets[0].base64;
                const mimeType = result.assets[0].mimeType || 'image/jpeg';
                setImage(`data:${mimeType};base64,${base64}`);
            } catch (error) {
                console.error('Erro ao converter imagem para base64:', error);
                setResponse({ success: false, errors: { global: 'Erro ao processar a imagem' } });
            }
        }
    };
    const formatDate = (date) => {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    // useCallback não é otimização aqui: o DateTimePicker do Android reabre o dialog a cada
    // troca de identidade de `onChange`, e o módulo nativo responde chamando `updateDate` no
    // dialog aberto — o calendário volta pro mês do `value` e não dá pra navegar.
    const handleDateChange = useCallback((event, selectedDate) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setDate(selectedDate);
        }
    }, []);

    const handleSave = async () => {
        if (!title) {
            setResponse({ success: false, errors: { global: 'Por favor, insira o título da notícia' } });
            return;
        }
        if (!summary) {
            setResponse({ success: false, errors: { global: 'Por favor, insira o resumo da notícia' } });
            return;
        }
        if (!content) {
            setResponse({ success: false, errors: { global: 'Por favor, insira o conteúdo da notícia' } });
            return;
        }
        if (!image) {
            setResponse({ success: false, errors: { global: 'Por favor, selecione uma imagem para a notícia' } });
            return;
        }

        setIsLoading(true);

        const newsData = {
            title,
            summary,
            content,
            image,
        };

        const result = await createNews(newsData);

        if (result.success) {
            setResponse({
                success: true,
                message: 'Notícia cadastrada com sucesso!'
            });

            // Limpar formulário após sucesso
            setTitle('');
            setSummary('');
            setContent('');
            setImage(null);
            setDate(new Date());
        } else {
            setResponse({
                success: false,
                errors: { global: result.errors.global || 'Erro ao cadastrar notícia' }
            });
        }

        setIsLoading(false);
    };

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
            >
                <Animatable.View animation='fadeInLeft' delay={500} style={styles.containerHeader}>
                    <Text style={styles.message}>Nova Notícia</Text>
                </Animatable.View>

                <Animatable.View animation='fadeInUp' style={styles.containerForm}>
                    <ScrollView
                        style={styles.containerScroll}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.formSection}>
                            <Text style={styles.title}>Título</Text>
                            <View style={styles.inputContainer}>
                                <AntDesign name="edit" size={20} color={colors.textOrange} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholderTextColor={colors.textGrey}
                                    value={title}
                            accessibilityLabel="Título da notícia"
                                    onChangeText={setTitle}
                                    placeholder="Digite o título da notícia"
                                    autoCorrect={true}
                                    autoCapitalize="sentences"
                                    keyboardType="default"
                                    editable={!isLoading}
                                    spellCheck={true}
                                />
                            </View>

                            <Text style={styles.title}>Resumo</Text>
                            <View style={styles.inputContainer}>
                                <AntDesign name="file-text" size={20} color={colors.textOrange} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholderTextColor={colors.textGrey}
                                    value={summary}
                            accessibilityLabel="Resumo da notícia"
                                    onChangeText={setSummary}
                                    placeholder="Digite um resumo da notícia"
                                    autoCorrect={true}
                                    autoCapitalize="sentences"
                                    keyboardType="default"
                                    multiline={true}
                                    numberOfLines={3}
                                    editable={!isLoading}
                                    spellCheck={true}
                                    textAlignVertical="top"
                                />
                            </View>

                            <Text style={styles.title}>Conteúdo</Text>
                            <View style={styles.inputContainer}>
                                <AntDesign name="file" size={20} color={colors.textOrange} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, styles.textAreaLarge]}
                                    placeholderTextColor={colors.textGrey}
                                    value={content}
                            accessibilityLabel="Conteúdo da notícia"
                                    onChangeText={setContent}
                                    placeholder="Digite o conteúdo completo da notícia"
                                    autoCorrect={true}
                                    autoCapitalize="sentences"
                                    keyboardType="default"
                                    multiline={true}
                                    editable={!isLoading}
                                    spellCheck={true}
                                    textAlignVertical="top"
                                />
                            </View>

                            <Text style={styles.title}>Imagem</Text>
                            <TouchableOpacity
                                style={styles.imagePickerContainer}
                                onPress={pickImage}
                            accessibilityRole="button"
                            accessibilityLabel="Escolher imagem da notícia"
                                disabled={isLoading}
                                activeOpacity={0.7}
                            >
                                <View style={styles.imagePickerContent}>
                                    <AntDesign name="picture" size={20} color={colors.textOrange} style={styles.inputIcon} />
                                    <Text style={styles.imagePickerText}>
                                        {image ? 'Imagem selecionada' : 'Selecione uma imagem da galeria'}
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            {image && (
                                <Animatable.View animation="fadeIn" duration={500} style={styles.imagePreviewContainer}>
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
                                        disabled={isLoading}
                                    >
                                        <AntDesign name="close" size={16} color={colors.textWhite} />
                                    </TouchableOpacity>
                                </Animatable.View>
                            )}

                            <Text style={styles.title}>Data da Notícia</Text>
                            <TouchableOpacity
                                style={styles.datePickerContainer}
                                onPress={() => setShowDatePicker(true)}
                            accessibilityRole="button"
                            accessibilityLabel="Escolher data de publicação"
                                disabled={isLoading}
                                activeOpacity={0.7}
                            >
                                <View style={styles.datePickerContent}>
                                    <AntDesign name="calendar" size={20} color={colors.textOrange} style={styles.inputIcon} />
                                    <Text style={styles.dateText}>
                                        {formatDate(date)}
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            {showDatePicker && (
                                <DateTimePicker
                                    value={date}
                                    mode="date"
                                    display="default"
                                    onChange={handleDateChange}
                                />
                            )}

                            <View style={styles.buttonSection}>
                                <TouchableOpacity
                                    style={[styles.saveButton, isLoading && styles.disabledButton]}
                                    onPress={handleSave}
                        accessibilityRole="button"
                        accessibilityLabel={isLoading ? 'Salvando...' : 'Salvar notícia'}
                        accessibilityState={{ disabled: isLoading, busy: isLoading }}
                                    disabled={isLoading}
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
                                        <Text style={styles.buttonText}>Salvar Notícia</Text>
                                    )}
                                </TouchableOpacity>
                            </View>

                            <View style={styles.responseContainer}>
                                {response?.success && (
                                    <Animatable.Text
                                        animation="fadeIn"
                                        duration={1000}
                                        style={styles.successMessage}
                                    >
                                        {response.message}
                                    </Animatable.Text>
                                )}
                                {response?.success === false && (
                                    <Animatable.Text
                                        animation="fadeIn"
                                        duration={1000}
                                        style={styles.errorMessage}
                                    >
                                        {response.errors.global}
                                    </Animatable.Text>
                                )}
                            </View>
                        </View>
                    </ScrollView>
                </Animatable.View>
            </KeyboardAvoidingView>
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
        paddingHorizontal: 25,
        paddingBottom: 120,
    },
    formSection: {
        paddingTop: 20,
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
        borderRadius: 25,
        paddingLeft: 20,
        paddingRight: 20,
        minHeight: 50,
    },
    inputIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontSize: colors.fontP16,
        color: colors.textWhite,
        fontFamily: 'Nunito',
        height: 50,
        paddingLeft: 8,
    },
    textArea: {
        minHeight: 60,
        paddingTop: 12,
        height: 'auto',
    },
    textAreaLarge: {
        minHeight: 120,
        paddingTop: 12,
        height: 'auto',
    },
    imagePickerContainer: {
        backgroundColor: colors.backgroundTransparent,
        borderRadius: 25,
        minHeight: 50,
        justifyContent: 'center',
    },
    imagePickerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 20,
        paddingRight: 20,
    },
    imagePickerText: {
        flex: 1,
        fontSize: colors.fontP16,
        paddingLeft: 8,
        color: colors.textWhite,
    },
    imagePreviewContainer: {
        marginTop: 10,
        alignItems: 'center',
        position: 'relative',
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
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 15,
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    datePickerContainer: {
        backgroundColor: colors.backgroundTransparent,
        borderRadius: 25,
        minHeight: 50,
        justifyContent: 'center',
    },
    datePickerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 20,
        paddingRight: 20,
    },
    dateText: {
        flex: 1,
        fontSize: colors.fontP16,
        paddingLeft: 8,
        color: colors.textWhite,
    },
    buttonSection: {
        marginTop: 35,
        marginBottom: 20,
        alignItems: 'center',
    },
    saveButton: {
        backgroundColor: colors.backgroundSave,
        paddingVertical: 14,
        paddingHorizontal: 30,
        borderRadius: 30,
        width: '60%',
        alignItems: 'center',
        justifyContent: 'center',
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
    responseContainer: {
        marginTop: 10,
        marginBottom: 30,
        alignItems: 'center',
        minHeight: 40,
    },
    errorMessage: {
        color: colors.textOrange,
        fontSize: colors.fontP16,
        fontFamily: 'Nunito',
        textAlign: 'center',
    },
    successMessage: {
        color: colors.textWhite,
        fontSize: colors.fontP16,
        fontFamily: 'Nunito',
        textAlign: 'center',
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: 20,
    },
});