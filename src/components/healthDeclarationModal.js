import React, { useState, useContext, useEffect } from 'react';
import {
    Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput,
    ActivityIndicator, Switch, Alert, StatusBar, Linking
} from 'react-native';
import { File, Directory, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { colors } from '../styles/colors';
import { useFonts } from 'expo-font';
import { AntDesign } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Feather from '@expo/vector-icons/Feather';
import { AuthContext } from '../contexts/auth';
import { acceptConsent, urlDoDocumento } from '../contexts/consent';

export default function HealthDeclarationModal({ visible, onClose, declarationData, userId }) {
    const { createHealthDeclaration, updateHealthDeclaration, token, consentStatus, setConsentStatus } =
        useContext(AuthContext);

    // Consentimento específico do Art. 11 da LGPD. Quem está editando uma
    // declaração que já existe necessariamente já consentiu para criá-la, então a
    // caixa só aparece — e só bloqueia — na criação.
    const jaConsentiu = consentStatus?.healthDataAccepted === true;
    const [consentiuAgora, setConsentiuAgora] = useState(false);

    const [fontsLoaded] = useFonts({
        'Nunito': require('../../assets/fonts/Nunito-Regular.ttf'),
    });

    // Estados para os campos
    const [isLoading, setIsLoading] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [chronicDiseases, setChronicDiseases] = useState(false);
    const [regularMedication, setRegularMedication] = useState(false);
    const [allergies, setAllergies] = useState(false);
    const [recentInjuries, setRecentInjuries] = useState(false);
    const [cardiacProblems, setCardiacProblems] = useState(false);
    const [canPracticeRowing, setCanPracticeRowing] = useState(true);
    const [surgicalHistory, setSurgicalHistory] = useState(false);
    const [respiratoryProblems, setRespiratoryProblems] = useState(false);
    const [description, setDescription] = useState('');
    const [epilepsyOrSeizures, setEpilepsyOrSeizures] = useState(false);
    const [diabetes, setDiabetes] = useState(false);
    const [medicalReport, setMedicalReport] = useState(false);
    const [medicalReportDate, setMedicalReportDate] = useState('');
    const [medicalReportExpiration, setMedicalReportExpiration] = useState('');
    const [emergencyContact, setEmergencyContact] = useState('');
    const [bloodType, setBloodType] = useState('');
    const [healthInsurance, setHealthInsurance] = useState(false);
    const [healthInsuranceCompany, setHealthInsuranceCompany] = useState('');

    // Estados para o PDF
    const [pdfBase64, setPdfBase64] = useState(null);
    const [pdfFileName, setPdfFileName] = useState('');
    const [isUploadingPdf, setIsUploadingPdf] = useState(false);
    const [hasExistingPdf, setHasExistingPdf] = useState(false);

    const isEditing = !!declarationData?.id;

    // Funções de máscara
    const applyDateMask = (value) => {
        // Remove tudo que não é número
        let cleaned = value.replace(/\D/g, '');

        // Limita a 8 caracteres (dd/mm/aaaa)
        if (cleaned.length > 8) {
            cleaned = cleaned.slice(0, 8);
        }

        // Aplica a máscara
        if (cleaned.length <= 2) {
            return cleaned;
        } else if (cleaned.length <= 4) {
            return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
        } else {
            return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
        }
    };

    const applyPhoneMask = (value) => {
        // Remove tudo que não é número
        let cleaned = value.replace(/\D/g, '');

        // Limita a 11 caracteres (telefone com DDD)
        if (cleaned.length > 11) {
            cleaned = cleaned.slice(0, 11);
        }

        // Aplica a máscara
        if (cleaned.length <= 2) {
            return cleaned;
        } else if (cleaned.length <= 6) {
            return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
        } else if (cleaned.length <= 10) {
            return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
        } else {
            // Celular com 9 dígitos
            return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
        }
    };

    // Handlers para campos com máscara
    const handleDateChange = (text, setter) => {
        const masked = applyDateMask(text);
        setter(masked);
    };

    const handlePhoneChange = (text) => {
        const masked = applyPhoneMask(text);
        setEmergencyContact(masked);
    };

    // Função para validar data
    const isValidDate = (dateString) => {
        if (!dateString) return false;
        const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        const match = dateString.match(regex);
        if (!match) return false;

        const day = parseInt(match[1]);
        const month = parseInt(match[2]) - 1;
        const year = parseInt(match[3]);

        const date = new Date(year, month, day);
        return date.getFullYear() === year &&
            date.getMonth() === month &&
            date.getDate() === day;
    };

    // Função para obter data atual no formato ISO 8601 com Z
    const getCurrentDateISOString = () => {
        return new Date().toISOString();
    };

    // Formato ISO
    const formatDateForApi = (dateString) => {
        if (!dateString) return null;

        try {
            // Remove máscara se existir
            const cleaned = dateString.replace(/\D/g, '');

            // Espera formato ddMMyyyy
            if (cleaned.length === 8) {
                const day = cleaned.slice(0, 2);
                const month = cleaned.slice(2, 4);
                const year = cleaned.slice(4, 8);

                // Criar data no formato ISO
                const date = new Date(`${year}-${month}-${day}T12:00:00.000Z`);
                if (isNaN(date.getTime())) {
                    console.error('Data inválida:', dateString);
                    return null;
                }
                return date.toISOString();
            }

            // Se já for uma data ISO, retorna como está
            if (dateString.includes('T') && dateString.includes('Z')) {
                return dateString;
            }

            // Fallback: tenta converter
            const date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                return date.toISOString();
            }

            return null;
        } catch (error) {
            console.error('Erro ao formatar data:', error);
            return null;
        }
    };

    const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        } catch {
            return '';
        }
    };

    // Carregar dados quando o modal abrir com dados existentes
    useEffect(() => {
        if (declarationData) {
            setChronicDiseases(declarationData.chronicDiseases || false);
            setRegularMedication(declarationData.regularMedication || false);
            setAllergies(declarationData.allergies || false);
            setRecentInjuries(declarationData.recentInjuries || false);
            setCardiacProblems(declarationData.cardiacProblems || false);
            setCanPracticeRowing(declarationData.canPracticeRowing !== false);
            setSurgicalHistory(declarationData.surgicalHistory || false);
            setRespiratoryProblems(declarationData.respiratoryProblems || false);
            setDescription(declarationData.description || '');
            setEpilepsyOrSeizures(declarationData.epilepsyOrSeizures || false);
            setDiabetes(declarationData.diabetes || false);
            setMedicalReport(declarationData.medicalReport || false);
            setMedicalReportDate(formatDateForInput(declarationData.medicalReportDate));
            setMedicalReportExpiration(formatDateForInput(declarationData.medicalReportExpiration));
            setEmergencyContact(declarationData.emergencyContact || '');
            setBloodType(declarationData.bloodType || '');
            setHealthInsurance(declarationData.healthInsurance || false);
            setHealthInsuranceCompany(declarationData.healthInsuranceCompany || '');
            setHasExistingPdf(declarationData.hasPdf || false);

            // Carregar o PDF
            setPdfBase64(null);
            setPdfFileName('');
        } else {
            resetForm();
        }
    }, [declarationData, visible]);

    const resetForm = () => {
        setChronicDiseases(false);
        setRegularMedication(false);
        setAllergies(false);
        setRecentInjuries(false);
        setCardiacProblems(false);
        setCanPracticeRowing(true);
        setSurgicalHistory(false);
        setRespiratoryProblems(false);
        setDescription('');
        setEpilepsyOrSeizures(false);
        setDiabetes(false);
        setMedicalReport(false);
        setMedicalReportDate('');
        setMedicalReportExpiration('');
        setEmergencyContact('');
        setBloodType('');
        setHealthInsurance(false);
        setHealthInsuranceCompany('');
        setPdfBase64(null);
        setPdfFileName('');
        setHasExistingPdf(false);
    };

    const validateForm = () => {
        const errors = [];

        if (medicalReport) {
            if (!medicalReportDate) {
                errors.push("Data do laudo é obrigatória quando possui laudo médico.");
            } else if (!isValidDate(medicalReportDate)) {
                errors.push("Data do laudo inválida. Use o formato dd/mm/aaaa.");
            }
            if (!medicalReportExpiration) {
                errors.push("Data de expiração do laudo é obrigatória quando possui laudo médico.");
            } else if (!isValidDate(medicalReportExpiration)) {
                errors.push("Data de expiração do laudo inválida. Use o formato dd/mm/aaaa.");
            }
        }

        // Sem contato de emergência a API grava a declaração como PENDENTE. Exigir
        // aqui evita o aluno salvar e não entender por que ela não fica válida.
        if (!emergencyContact || !emergencyContact.trim()) {
            errors.push("Contato de emergência é obrigatório — sem ele a declaração fica pendente.");
        } else if (emergencyContact.replace(/\D/g, '').length < 10) {
            errors.push("Contato de emergência deve ter pelo menos 10 dígitos.");
        }

        if (bloodType && !/^(A|B|AB|O)[+-]$/.test(bloodType.toUpperCase())) {
            errors.push("Tipo sanguíneo inválido. Use formatos como: A+, B-, O+, AB+");
        }

        return errors;
    };

    // Função para selecionar PDF
    const selectPdf = async () => {
        try {
            const MAX_SIZE = 10 * 1024 * 1024; // 10MB

            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets[0]) {
                setIsUploadingPdf(true);

                const asset = result.assets[0];

                // NOVA API: Usar File ao invés de FileSystem.getInfoAsync
                const file = new File(asset.uri);

                // Verificar se existe e o tamanho
                if (!file.exists) {
                    Alert.alert('Erro', 'Arquivo não encontrado.');
                    setIsUploadingPdf(false);
                    return;
                }

                if (file.size > MAX_SIZE) {
                    Alert.alert('Erro', 'O arquivo PDF é muito grande. O tamanho máximo é 10MB.');
                    setIsUploadingPdf(false);
                    return;
                }

                // NOVA API: Ler como base64
                const fileContent = await file.base64();

                if (!fileContent || fileContent.length === 0) {
                    Alert.alert('Erro', 'Não foi possível ler o conteúdo do PDF.');
                    setIsUploadingPdf(false);
                    return;
                }

                setPdfBase64(fileContent);
                setPdfFileName(asset.name);
                setIsUploadingPdf(false);
            }
        } catch (error) {
            console.error('Erro ao selecionar PDF:', error);
            Alert.alert('Erro', 'Não foi possível selecionar o PDF.');
            setIsUploadingPdf(false);
        }
    };

    const removePdf = () => {
        Alert.alert(
            'Remover PDF',
            'Deseja remover o PDF anexado?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Remover',
                    style: 'destructive',
                    onPress: () => {
                        setPdfBase64(null);
                        setPdfFileName('');
                    }
                }
            ]
        );
    };

    const viewExistingPdf = async () => {
        if (!declarationData?.id) return;
        Alert.alert('Info', 'Função de visualização em desenvolvimento.');
    };

    const handleSubmit = async () => {
        // Validação
        const validationErrors = validateForm();
        if (validationErrors.length > 0) {
            Alert.alert("Atenção", validationErrors.join('\n'));
            return;
        }

        setIsLoading(true);

        // Construir objeto no formato da API
        const healthData = {};

        // Campos booleanos 
        healthData.chronicDiseases = chronicDiseases;
        healthData.regularMedication = regularMedication;
        healthData.allergies = allergies;
        healthData.recentInjuries = recentInjuries;
        healthData.cardiacProblems = cardiacProblems;
        healthData.canPracticeRowing = canPracticeRowing;
        healthData.surgicalHistory = surgicalHistory;
        healthData.respiratoryProblems = respiratoryProblems;
        healthData.epilepsyOrSeizures = epilepsyOrSeizures;
        healthData.diabetes = diabetes;
        healthData.medicalReport = medicalReport;
        healthData.healthInsurance = healthInsurance;

        // Campos de texto (enviar null se vazio)
        healthData.description = description?.trim() || null;

        // Remove máscara do telefone antes de enviar
        healthData.emergencyContact = emergencyContact?.replace(/\D/g, '') || null;

        healthData.bloodType = bloodType?.trim().toUpperCase() || null;
        healthData.healthInsuranceCompany = healthInsuranceCompany?.trim() || null;

        // PDF - só envia se for selecionado
        if (pdfBase64) {
            healthData.pdfBase64 = pdfBase64;
        }

        // Datas no formato ISO
        if (medicalReport) {
            // Data do laudo (OBRIGATÓRIA)
            if (medicalReportDate) {
                const formattedDate = formatDateForApi(medicalReportDate);
                if (formattedDate) {
                    healthData.medicalReportDate = formattedDate;
                } else {
                    healthData.medicalReportDate = getCurrentDateISOString();
                }
            } else {
                healthData.medicalReportDate = getCurrentDateISOString();
            }

            // Data de expiração (OBRIGATÓRIA)
            if (medicalReportExpiration) {
                const formattedExpiration = formatDateForApi(medicalReportExpiration);
                if (formattedExpiration) {
                    healthData.medicalReportExpiration = formattedExpiration;
                }
            }
        }

        // Log para testes (sem mostrar o base64 inteiro)
        const logData = { ...healthData };
        if (logData.pdfBase64) {
            logData.pdfBase64 = `[BASE64 - ${logData.pdfBase64.length} caracteres]`;
        }

        try {
            let result;

            if (isEditing) {
                result = await updateHealthDeclaration(declarationData.id, healthData);
            } else {
                if (!userId) {
                    Alert.alert("Erro", "ID do usuário não disponível.");
                    setIsLoading(false);
                    return;
                }

                // Registra o consentimento antes de enviar o dado sensível: se a
                // gravação falhar depois, o que fica guardado é apenas a
                // manifestação de vontade, nunca o dado sem base legal.
                if (!jaConsentiu) {
                    const consentimento = await acceptConsent(['HEALTH_DATA'], token);
                    if (!consentimento.success) {
                        Alert.alert(
                            'Não foi possível registrar o consentimento',
                            consentimento.errors?.global || 'Tente novamente em instantes.'
                        );
                        setIsLoading(false);
                        return;
                    }
                    setConsentStatus?.(consentimento.data);
                }

                const createData = {
                    ...healthData,
                    userId: userId,
                    declarationDate: getCurrentDateISOString(),
                };
                result = await createHealthDeclaration(createData);
            }

            if (result.success) {
                setShowConfirmation(true);
                setTimeout(() => {
                    setShowConfirmation(false);
                    onClose(true);
                    if (!isEditing) {
                        resetForm();
                    }
                }, 2000);
            } else {
                console.error('Erro da API:', result.errors);

                let errorMessage = "Não foi possível salvar a declaração.";
                if (result.errors?.global) {
                    errorMessage = result.errors.global;
                } else if (result.message) {
                    errorMessage = result.message;
                } else if (result.errors?.details?.length) {
                    errorMessage = result.errors.details.join(', ');
                }

                console.log("Erro", errorMessage);
            }
        } catch (error) {
            console.error('Erro no submit:', error);
            Alert.alert("Erro", "Ocorreu um erro ao salvar a declaração.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!fontsLoaded) {
        return null;
    }

    // Renderização de campos reutilizáveis
    const renderSwitch = (label, value, setValue) => (
        <View style={styles.switchContainer}>
            <Text style={styles.label}>{label}</Text>
            <Switch
                accessibilityLabel={label}
                value={value}
                onValueChange={setValue}
                trackColor={{ false: colors.switchTrackOff, true: colors.switchOn }}
                thumbColor={value ? colors.switchTrackOn : colors.switchOff}
            />
        </View>
    );

    const renderEditableField = (label, value, setValue, multiline = false, placeholder = '', keyboardType = 'default', isDate = false, isPhone = false) => {
        let onChangeHandler = setValue;
        let inputProps = {};

        if (isDate) {
            onChangeHandler = (text) => handleDateChange(text, setValue);
            inputProps = {
                maxLength: 10,
                keyboardType: 'numeric',
            };
        } else if (isPhone) {
            onChangeHandler = handlePhoneChange;
            inputProps = {
                maxLength: 15,
                keyboardType: 'phone-pad',
            };
        } else if (keyboardType === 'numbers-and-punctuation') {
            inputProps = {
                maxLength: 3,
                keyboardType: 'default',
                autoCapitalize: 'characters',
            };
        } else {
            inputProps = {
                keyboardType: keyboardType,
            };
        }

        return (
            <View style={styles.editableFieldContainer}>
                <Text style={styles.label}>{label}</Text>
                <View style={styles.editableInputContainer}>
                    <TextInput
                        style={[
                            styles.input,
                            multiline && styles.multilineInput,
                            styles.editableInput
                        ]}
                        accessibilityLabel={label}
                        value={value}
                        onChangeText={onChangeHandler}
                        editable={true}
                        multiline={multiline}
                        placeholder={placeholder}
                        placeholderTextColor={colors.textGrey}
                        {...inputProps}
                    />
                    <MaterialIcons
                        name="edit"
                        size={18}
                        color={colors.textOrange}
                        style={styles.editIcon}
                    />
                </View>
            </View>
        );
    };

    const renderNonEditableField = (label, value) => (
        <View style={styles.inputRow}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                style={[styles.nonEditableInput]}
                accessibilityLabel={label}
                value={value}
                editable={false}
            />
        </View>
    );

    const formatDisplayDate = (dateString) => {
        if (!dateString) return 'Não informada';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('pt-BR');
        } catch {
            return dateString;
        }
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={() => onClose(false)}
            statusBarTranslucent={true}
        >
            <StatusBar
                backgroundColor="rgba(0,0,0,0.7)"
                barStyle="light-content"
                translucent={true}
            />
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.cardHeaderModal}>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => onClose(false)}
                            accessibilityRole="button"
                            accessibilityLabel="Fechar declaração de saúde"
                        >
                            <AntDesign name="close" size={28} color={colors.textOrange} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollContainer}>
                        <Text style={styles.title}>
                            {isEditing ? 'Editar Declaração de Saúde' : 'Nova Declaração de Saúde'}
                        </Text>

                        {/* Informações básicas - apenas para edição */}
                        {isEditing && declarationData && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Informações Básicas</Text>
                                {renderNonEditableField("Data da declaração:", formatDisplayDate(declarationData.declarationDate))}
                                {renderNonEditableField("Última atualização:", formatDisplayDate(declarationData.lastUpdate))}
                                {renderNonEditableField("Status:", declarationData.status === 'VALID' ? 'Válida' :
                                    declarationData.status === 'EXPIRED' ? 'Expirada' :
                                        declarationData.status === 'PENDING' ? 'Pendente' :
                                            declarationData.status === 'INVALID' ? 'Inválida' : declarationData.status)}
                            </View>
                        )}

                        {/* Condições de saúde */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Condições de Saúde</Text>
                            {renderSwitch("Doenças Crônicas", chronicDiseases, setChronicDiseases)}
                            {renderSwitch("Toma Medicação Regular", regularMedication, setRegularMedication)}
                            {renderSwitch("Alergias", allergies, setAllergies)}
                            {renderSwitch("Lesões Recentes", recentInjuries, setRecentInjuries)}
                            {renderSwitch("Problemas Cardíacos", cardiacProblems, setCardiacProblems)}
                            {renderSwitch("Pode Praticar Remo", canPracticeRowing, setCanPracticeRowing)}
                            {renderSwitch("Histórico Cirúrgico", surgicalHistory, setSurgicalHistory)}
                            {renderSwitch("Problemas Respiratórios", respiratoryProblems, setRespiratoryProblems)}
                            {renderSwitch("Epilepsia ou Convulsões", epilepsyOrSeizures, setEpilepsyOrSeizures)}
                            {renderSwitch("Diabetes", diabetes, setDiabetes)}
                            {renderEditableField("Descrição:", description, setDescription, true, "Descreva condições de saúde adicionais (opcional)")}
                        </View>

                        {/* Laudo Médico */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Laudo Médico</Text>
                            {renderSwitch("Possui Laudo Médico", medicalReport, setMedicalReport)}
                            {medicalReport && (
                                <>
                                    {renderEditableField("Data do Laudo:", medicalReportDate, setMedicalReportDate, false, "dd/mm/aaaa", 'default', true)}
                                    {renderEditableField("Expiração do Laudo:", medicalReportExpiration, setMedicalReportExpiration, false, "dd/mm/aaaa", 'default', true)}
                                </>
                            )}
                        </View>

                        {/* Informações adicionais */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Emergências</Text>
                            {renderEditableField("Contato de Emergência: *", emergencyContact, setEmergencyContact, false, "(99) 99999-9999", 'phone-pad', false, true)}
                            <Text style={styles.fieldHint}>
                                Obrigatório. A declaração só fica válida com o contato de emergência preenchido.
                            </Text>
                            {renderEditableField("Tipo Sanguíneo:", bloodType, setBloodType, false, "Ex: A+ (opcional)", 'numbers-and-punctuation', false)}
                            {renderSwitch("Possui Plano de Saúde", healthInsurance, setHealthInsurance)}
                            {healthInsurance && renderEditableField("Empresa do Plano:", healthInsuranceCompany, setHealthInsuranceCompany, false, "Nome do plano de saúde (opcional)")}
                        </View>

                        {/* Upload de PDF */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Documentos</Text>

                            {isEditing && hasExistingPdf && (
                                <View style={styles.existingPdfContainer}>
                                    <Text style={styles.existingPdfText}>✅ Existe um PDF anexado a esta declaração</Text>
                                    <TouchableOpacity
                                        style={styles.viewPdfButton}
                                        onPress={viewExistingPdf}
                                        accessibilityRole="button"
                                        accessibilityLabel="Ver laudo anexado"
                                    >
                                        <Feather name="eye" size={16} color={colors.textWhite} />
                                        <Text style={styles.viewPdfButtonText}>Visualizar PDF existente</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.uploadHint}>Selecione um novo PDF para substituir o existente</Text>
                                </View>
                            )}

                            <View style={styles.pdfUploadContainer}>
                                {pdfFileName ? (
                                    <View style={styles.pdfSelectedContainer}>
                                        <View style={styles.pdfInfo}>
                                            <Feather name="file-text" size={24} color={colors.textOrange} />
                                            <View style={styles.pdfDetails}>
                                                <Text style={styles.pdfFileName} numberOfLines={1}>{pdfFileName}</Text>
                                                <Text style={styles.pdfSelectedText}>PDF selecionado</Text>
                                            </View>
                                        </View>
                                        <TouchableOpacity
                                        style={styles.removePdfButton}
                                        onPress={removePdf}
                                        accessibilityRole="button"
                                        accessibilityLabel="Remover laudo anexado"
                                    >
                                            <Feather name="x" size={20} color={colors.textWhite} />
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        style={styles.uploadButton}
                                        onPress={selectPdf}
                                    accessibilityRole="button"
                                    accessibilityLabel="Anexar PDF do laudo"
                                    accessibilityState={{ disabled: isUploadingPdf, busy: isUploadingPdf }}
                                        disabled={isUploadingPdf}
                                    >
                                        {isUploadingPdf ? (
                                            <ActivityIndicator color={colors.textWhite} size="small" />
                                        ) : (
                                            <>
                                                <Feather name="upload" size={20} color={colors.textWhite} style={styles.uploadIcon} />
                                                <Text style={styles.uploadButtonText}>
                                                    {isEditing ? 'Substituir PDF do Laudo' : 'Anexar PDF do Laudo'}
                                                </Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                )}
                                <Text style={styles.uploadHint}>Selecione um arquivo PDF do laudo médico (opcional)</Text>
                            </View>
                        </View>

                        {showConfirmation && (
                            <Text style={styles.confirmationText}>
                                Declaração {isEditing ? 'atualizada' : 'criada'} com sucesso!
                            </Text>
                        )}

                        {!isEditing && !jaConsentiu && (
                            <TouchableOpacity
                                style={styles.consentBox}
                                onPress={() => setConsentiuAgora(!consentiuAgora)}
                                activeOpacity={0.7}
                                accessibilityRole="checkbox"
                                accessibilityState={{ checked: consentiuAgora }}
                                accessibilityLabel="Consentir com o tratamento dos dados de saúde"
                            >
                                <View style={[styles.consentCheck, consentiuAgora && styles.consentCheckOn]}>
                                    {consentiuAgora && (
                                        <Feather name="check" size={16} color={colors.textWhite} />
                                    )}
                                </View>
                                <Text style={styles.consentText}>
                                    Autorizo o tratamento dos meus dados de saúde para que o clube
                                    conduza as aulas com segurança, conforme a{' '}
                                    <Text
                                        style={styles.consentLink}
                                        onPress={() => Linking.openURL(urlDoDocumento(consentStatus, 'HEALTH_DATA'))}
                                        accessibilityRole="link"
                                    >
                                        Política de Privacidade
                                    </Text>
                                    . Posso retirar esta autorização quando quiser, em Privacidade.
                                </Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={[
                                styles.submitButton,
                                !isEditing && !jaConsentiu && !consentiuAgora && styles.submitButtonDisabled,
                            ]}
                            onPress={handleSubmit}
                            accessibilityRole="button"
                            accessibilityLabel={isEditing ? 'Atualizar declaração' : 'Criar declaração'}
                            accessibilityState={{
                                disabled: isLoading || (!isEditing && !jaConsentiu && !consentiuAgora),
                                busy: isLoading,
                            }}
                            disabled={isLoading || (!isEditing && !jaConsentiu && !consentiuAgora)}
                        >
                            {isLoading ? (
                                <ActivityIndicator color={colors.textWhite} />
                            ) : (
                                <Text style={styles.submitButtonText}>
                                    {isEditing ? 'Atualizar Declaração' : 'Criar Declaração'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.backgroundmodalOverlay,
    },
    modalContainer: {
        width: '90%',
        height: '85%',
        backgroundColor: colors.backgroundCardBlack,
        borderRadius: 20,
        padding: 15,
    },
    scrollContainer: {
        flex: 1,
    },
    cardHeaderModal: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 10,
    },
    closeButton: {
        backgroundColor: colors.backgroundBlack,
        padding: 8,
        borderRadius: 50,
    },
    title: {
        fontSize: 20,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
    },
    section: {
        marginBottom: 20,
        backgroundColor: colors.backgroundBlack,
        padding: 15,
        borderRadius: 10,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: 'Nunito',
        color: colors.textOrange,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    fieldHint: {
        fontSize: colors.fontP12,
        fontFamily: 'Nunito',
        color: colors.textWhiteDark,
        marginTop: 4,
        marginBottom: 4,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    editableFieldContainer: {
        marginTop: 10,
        marginBottom: 5,
    },
    editableInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    label: {
        fontSize: 14,
        fontFamily: 'Nunito',
        color: colors.textWhite,
    },
    input: {
        flex: 1,
        color: colors.textWhite,
        padding: 10,
        marginTop: 5,
        borderRadius: 5,
        fontSize: 14,
        fontFamily: 'Nunito',
    },
    nonEditableInput: {
        color: colors.textWhite,
        backgroundColor: colors.backgroundBlack,
        padding: 10,
        borderRadius: 5,
        fontSize: 14,
        fontFamily: 'Nunito',
        fontWeight: 'bold',
    },
    editableInput: {
        borderWidth: 1,
        borderColor: colors.textOrange,
    },
    multilineInput: {
        minHeight: 60,
        textAlignVertical: 'top',
    },
    editIcon: {
        position: 'absolute',
        right: 10,
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.backgroundLineDivider,
    },
    pdfUploadContainer: {
        marginTop: 10,
    },
    uploadButton: {
        backgroundColor: colors.backgroundOrange,
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    uploadIcon: {
        marginRight: 10,
    },
    uploadButtonText: {
        color: colors.textWhite,
        fontFamily: 'Nunito',
        fontSize: 14,
        fontWeight: 'bold',
    },
    uploadHint: {
        fontSize: 12,
        fontFamily: 'Nunito',
        color: colors.textGrey,
        marginTop: 5,
        textAlign: 'center',
    },
    pdfSelectedContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255, 165, 0, 0.1)',
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.textOrange,
    },
    pdfInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    pdfDetails: {
        marginLeft: 10,
        flex: 1,
    },
    pdfFileName: {
        fontSize: 14,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        fontWeight: 'bold',
    },
    pdfSelectedText: {
        fontSize: 12,
        fontFamily: 'Nunito',
        color: colors.textGrey,
    },
    removePdfButton: {
        backgroundColor: colors.backgroundRedButton,
        borderRadius: 15,
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
    existingPdfContainer: {
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        padding: 10,
        borderRadius: 8,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#4CAF50',
    },
    existingPdfText: {
        fontSize: 14,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        marginBottom: 5,
    },
    viewPdfButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundGreenButton,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 5,
        alignSelf: 'flex-start',
    },
    viewPdfButtonText: {
        color: colors.textWhite,
        fontFamily: 'Nunito',
        fontSize: 12,
        marginLeft: 5,
    },
    consentBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: colors.backgroundCard,
        borderRadius: 8,
        padding: 14,
        marginTop: 8,
        marginBottom: 14,
    },
    consentCheck: {
        width: 24,
        height: 24,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: colors.textGrey,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        marginTop: 2,
    },
    consentCheckOn: {
        backgroundColor: colors.backgroundOrange,
        borderColor: colors.backgroundOrange,
    },
    consentText: {
        flex: 1,
        color: colors.textWhite,
        fontSize: colors.fontP12,
        lineHeight: 18,
    },
    consentLink: {
        color: colors.backgroundOrange,
        textDecorationLine: 'underline',
    },
    submitButtonDisabled: {
        opacity: 0.5,
    },
    submitButton: {
        backgroundColor: colors.backgroundOrange,
        padding: 15,
        borderRadius: 20,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 20,
    },
    submitButtonText: {
        color: colors.textWhite,
        fontFamily: 'Nunito',
        fontSize: 16,
        fontWeight: 'bold',
    },
    confirmationText: {
        color: colors.textWhite,
        textAlign: 'center',
        fontFamily: 'Nunito',
        fontSize: 14,
        marginTop: 5,
        marginBottom: 10,
    },
});