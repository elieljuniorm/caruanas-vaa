import React, { useContext, useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as Animatable from 'react-native-animatable';
import { useFonts } from 'expo-font';
import { colors } from '../../styles/colors';
import TabNavigator from '../../components/tabNavigator';
import { AuthContext } from '../../contexts/auth';
import { AntDesign } from '@expo/vector-icons';

export default function RegisterClasses() {
    const { createClass, getAllInstructors } = useContext(AuthContext);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [locationId, setLocationId] = useState('1');
    const [maxStudents, setMaxStudents] = useState('');
    const [checkInUnit, setCheckInUnit] = useState('hours');
    const [hoursStartValue, setHoursStartValue] = useState('');
    const [hoursEndValue, setHoursEndValue] = useState('');
    const [weekdayCheckIn, setWeekdayCheckIn] = useState('SATURDAY');
    const [weekdayCheckInTime, setWeekdayCheckInTime] = useState('');
    const [weekdayCloseTime, setWeekdayCloseTime] = useState('');
    const [weekday, setWeekday] = useState('SUNDAY');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [response, setResponse] = useState(null);
    const [availableInstructors, setAvailableInstructors] = useState([]);
    const [selectedInstructorIds, setSelectedInstructorIds] = useState([]);
    const [loadingInstructors, setLoadingInstructors] = useState(true);

    // Busca a lista de instrutores ao montar a tela (seletor múltiplo, opcional)
    useEffect(() => {
        let isMounted = true;
        (async () => {
            setLoadingInstructors(true);
            try {
                const result = await getAllInstructors();
                if (isMounted && result?.success && Array.isArray(result.data)) {
                    setAvailableInstructors(result.data);
                }
            } finally {
                if (isMounted) setLoadingInstructors(false);
            }
        })();
        return () => {
            isMounted = false;
        };
    }, []);

    const [fontsLoaded] = useFonts({
        'Nunito': require('../../../assets/fonts/Nunito-Regular.ttf'),
    });

    if (!fontsLoaded) {
        return null;
    }

    // Converte HH:mm para "HH:mm:00" (formato LocalTime do backend)
    const timeStringToApiFormat = (timeString) => {
        if (!timeString || !isValidTime(timeString)) return null;
        return `${timeString}:00`;
    };

    const formatTimeInput = (text) => {
        let cleaned = text.replace(/\D/g, '');
        cleaned = cleaned.slice(0, 4);
        if (cleaned.length > 2) {
            return `${cleaned.slice(0, 2)}:${cleaned.slice(2)}`;
        }
        return cleaned;
    };

    const isValidTime = (time) => {
        if (!time) return false;
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(time)) return false;

        const [hours, minutes] = time.split(':').map(Number);
        return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
    };

    const timeToMinutes = (timeString) => {
        if (!timeString || !isValidTime(timeString)) return 0;
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours * 60 + minutes;
    };

    // Mapa de dias da semana para o seletor do check-in (ordem Segunda..Domingo)
    const weekDaysMap = {
        MONDAY: 'Segunda-feira',
        TUESDAY: 'Terça-feira',
        WEDNESDAY: 'Quarta-feira',
        THURSDAY: 'Quinta-feira',
        FRIDAY: 'Sexta-feira',
        SATURDAY: 'Sábado',
        SUNDAY: 'Domingo',
    };

    // Índice dos dias da semana (0 = Domingo)
    const weekdayIndexMap = {
        SUNDAY: 0,
        MONDAY: 1,
        TUESDAY: 2,
        WEDNESDAY: 3,
        THURSDAY: 4,
        FRIDAY: 5,
        SATURDAY: 6,
    };

    // Converte horas (decimais) em minutos
    const convertHoursToMinutes = (hours) => {
        const numValue = Number(hours);
        if (isNaN(numValue) || numValue < 0) return 0;
        return Math.round(numValue * 60);
    };

    // Muda a unidade do check-in e reseta os valores do modo anterior
    const handleCheckInUnitChange = (unit) => {
        if (unit === checkInUnit) return;
        setCheckInUnit(unit);
        setHoursStartValue('');
        setHoursEndValue('');
        setWeekdayCheckInTime('');
        setWeekdayCloseTime('');
        setWeekdayCheckIn('SATURDAY');
    };

    // Formata e valida a entrada de hora (HH:mm)
    const handleTimeInput = (text, setter) => {
        const formatted = formatTimeInput(text);
        if (formatted.length === 5 && !isValidTime(formatted)) {
            return;
        }
        setter(formatted);
    };

    // Alterna a seleção de um instrutor no seletor múltiplo
    const toggleInstructor = (instructorId) => {
        setSelectedInstructorIds((prev) =>
            prev.includes(instructorId)
                ? prev.filter((id) => id !== instructorId)
                : [...prev, instructorId]
        );
    };

    const handleSave = async () => {
        // Validações
        let errors = [];

        if (!name || name.trim().length < 3) {
            errors.push('Nome da turma deve ter pelo menos 3 caracteres');
        }

        if (!isValidTime(startTime)) {
            errors.push('Horário de início inválido (formato HH:mm)');
        }

        if (!isValidTime(endTime)) {
            errors.push('Horário de término inválido (formato HH:mm)');
        }

        // Validações de lógica
        if (isValidTime(startTime) && isValidTime(endTime)) {
            if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
                errors.push('Horário de término deve ser depois do início');
            }
        }

        // Check-in: offsets em MINUTOS ANTES do início da aula
        let startCheckInMinutes = 0;
        let endCheckInMinutes = 0;
        const classStartMinutes = timeToMinutes(startTime);

        if (checkInUnit === 'hours') {
            // Modo Horas
            startCheckInMinutes = convertHoursToMinutes(hoursStartValue);
            endCheckInMinutes = convertHoursToMinutes(hoursEndValue);

            if (startCheckInMinutes <= 0) {
                errors.push('Início do check-in deve ser maior que 0 horas');
            }
            if (endCheckInMinutes <= 0) {
                errors.push('Término do check-in deve ser maior que 0 horas');
            }
            if (startCheckInMinutes > 0 && endCheckInMinutes > 0 && endCheckInMinutes >= startCheckInMinutes) {
                errors.push('Término do check-in deve ser antes do início (menos horas)');
            }
        } else {
            // Modo Dia da Semana
            if (!weekdayCheckIn) {
                errors.push('Selecione o dia da semana para o check-in');
            }
            if (!isValidTime(weekdayCheckInTime)) {
                errors.push('Horário de abertura do check-in inválido (formato HH:mm)');
            }
            if (!isValidTime(weekdayCloseTime)) {
                errors.push('Horário de fechamento do check-in inválido (formato HH:mm)');
            }

            if (isValidTime(startTime) && isValidTime(weekdayCheckInTime) && isValidTime(weekdayCloseTime) && weekdayCheckIn) {
                const lessonIndex = weekdayIndexMap[weekday];
                const openIndex = weekdayIndexMap[weekdayCheckIn];
                const openTimeMinutes = timeToMinutes(weekdayCheckInTime);
                const closeTimeMinutes = timeToMinutes(weekdayCloseTime);

                // dOpen = dias que o dia de abertura fica ANTES do dia da aula (0 se mesmo dia)
                const dOpen = (((lessonIndex - openIndex) % 7) + 7) % 7;
                startCheckInMinutes = dOpen * 1440 + (classStartMinutes - openTimeMinutes);
                endCheckInMinutes = classStartMinutes - closeTimeMinutes;

                // Fechamento deve ser antes do início da aula (closeOffset > 0)
                if (endCheckInMinutes <= 0) {
                    errors.push(`O fechamento do check-in deve ser antes do início da aula (${startTime})`);
                }
                // Abertura deve ser antes do fechamento (openOffset > closeOffset)
                if (startCheckInMinutes <= endCheckInMinutes) {
                    errors.push('A abertura do check-in deve ser antes do fechamento');
                }
                // Abertura deve ser antes do início da aula (openOffset > 0)
                if (startCheckInMinutes <= 0) {
                    errors.push('A abertura do check-in deve ser antes do início da aula');
                }
            }
        }

        // Validar maxStudents
        const maxStudentsNum = Number(maxStudents);
        if (isNaN(maxStudentsNum) || maxStudentsNum < 1 || maxStudentsNum > 25) {
            errors.push('Máximo de alunos deve ser entre 1 e 25');
        }

        // Validar locationId
        const locationIdNum = Number(locationId);
        if (isNaN(locationIdNum) || locationIdNum <= 0) {
            errors.push('Localização é obrigatória');
        }

        if (errors.length > 0) {
            Alert.alert('Erro', errors.join('. '));
            return;
        }

        setIsLoading(true);
        setResponse(null);

        try {
            const scheduleStartTime = timeStringToApiFormat(startTime);
            const scheduleEndTime = timeStringToApiFormat(endTime);

            if (!scheduleStartTime || !scheduleEndTime) {
                throw new Error('Erro ao converter horários para formato do backend');
            }

            // Preparar objeto conforme API ClassDto
            const classData = {
                name: name.trim(),
                description: description?.trim() || '',
                locationId: Number(locationId),
                maxStudents: Number(maxStudents),
                startCheckIn: startCheckInMinutes,
                endCheckIn: endCheckInMinutes,
                schedules: [{
                    weekday,
                    startTime: scheduleStartTime,
                    endTime: scheduleEndTime,
                }],
                instructors: selectedInstructorIds.map((id) => ({ id })),
                students: []
            };

            const result = await createClass(classData);

            if (result.success) {
                setResponse({
                    success: true,
                    message: 'Turma criada com sucesso!'
                });

                // Limpar formulário
                setName('');
                setDescription('');
                setMaxStudents('');
                setCheckInUnit('hours');
                setHoursStartValue('');
                setHoursEndValue('');
                setWeekdayCheckIn('SATURDAY');
                setWeekdayCheckInTime('');
                setWeekdayCloseTime('');
                setStartTime('');
                setEndTime('');
                setWeekday('SUNDAY');
                setSelectedInstructorIds([]);

                // Feedback visual
                Alert.alert(
                    'Sucesso!',
                    'Turma criada com sucesso.',
                    [{ text: 'OK' }]
                );
            } else {
                let errorMsg = "Erro ao criar a turma.";
                if (result.errors?.global) {
                    errorMsg = result.errors.global;
                } else if (result.data?.detail) {
                    errorMsg = result.data.detail;
                } else if (result.data?.message) {
                    errorMsg = result.data.message;
                }

                Alert.alert(
                    'Erro',
                    errorMsg,
                    [{ text: 'OK' }]
                );
            }
        } catch (error) {
            Alert.alert(
                'Erro',
                error.message || 'Erro de conexão. Verifique sua internet e tente novamente.',
                [{ text: 'OK' }]
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
            >
                <Animatable.View animation='fadeInLeft' delay={500} style={styles.containerHeader}>
                    <Text style={styles.message}>Nova Turma</Text>
                </Animatable.View>

                <Animatable.View animation='fadeInUp' style={styles.containerForm}>
                    <ScrollView
                        style={styles.containerScroll}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.formSection}>
                            <Text style={styles.title}>Nome da Turma *</Text>
                            <View style={styles.inputContainer}>
                                <AntDesign name="user" size={20} color={colors.textOrange} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholderTextColor={colors.textWhiteTransparent}
                                    value={name}
                                accessibilityLabel="Nome da turma"
                                    onChangeText={setName}
                                    placeholder="Ex: Turma de Remo Iniciantes"
                                    autoCorrect={true}
                                    autoCapitalize="sentences"
                                    keyboardType="default"
                                    editable={!isLoading}
                                    maxLength={120}
                                />
                            </View>

                            <Text style={styles.title}>Descrição</Text>
                            <View style={[styles.inputContainer, styles.textAreaContainer]}>
                                <AntDesign name="file-text" size={20} color={colors.textOrange} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholderTextColor={colors.textWhiteTransparent}
                                    value={description}
                                accessibilityLabel="Descrição da turma"
                                    onChangeText={setDescription}
                                    placeholder="Descrição da turma (opcional)"
                                    autoCorrect={true}
                                    autoCapitalize="sentences"
                                    keyboardType="default"
                                    multiline={true}
                                    numberOfLines={3}
                                    editable={!isLoading}
                                    textAlignVertical="top"
                                    maxLength={500}
                                />
                            </View>

                            <Text style={styles.title}>Localização ID *</Text>
                            <View style={styles.inputContainer}>
                                <AntDesign name="environment" size={20} color={colors.textOrange} style={styles.inputIcon} />
                                <View style={styles.pickerWrapper}>
                                    <Picker
                                        selectedValue={locationId}
                                        onValueChange={setLocationId}
                                        style={styles.picker}
                                        dropdownIconColor={colors.textWhite}
                                        enabled={!isLoading}
                                    >
                                        <Picker.Item label="Base Caruanas (ID: 1)" value="1" />
                                    </Picker>
                                </View>
                            </View>

                            <Text style={styles.title}>Máximo de Alunos * (1-25)</Text>
                            <View style={styles.inputContainer}>
                                <AntDesign name="team" size={20} color={colors.textOrange} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholderTextColor={colors.textWhiteTransparent}
                                    value={maxStudents}
                                accessibilityLabel="Máximo de alunos"
                                    onChangeText={(text) => {
                                        const num = text.replace(/[^0-9]/g, '');
                                        const maxNum = Math.min(Math.max(parseInt(num) || 1, 1), 25);
                                        setMaxStudents(maxNum.toString());
                                    }}
                                    placeholder="Ex: 15"
                                    keyboardType="number-pad"
                                    editable={!isLoading}
                                />
                            </View>

                            {/* ===== SEÇÃO DE INSTRUTORES ===== */}
                            <Text style={styles.title}>Instrutores</Text>
                            <View style={styles.instructorsContainer}>
                                {loadingInstructors ? (
                                    <ActivityIndicator
                                        size="small"
                                        color={colors.textOrange}
                                        style={styles.instructorsLoading}
                                    />
                                ) : availableInstructors.length === 0 ? (
                                    <Text style={styles.instructorsEmptyText}>Nenhum instrutor cadastrado</Text>
                                ) : (
                                    availableInstructors.map((instructor) => {
                                        const isSelected = selectedInstructorIds.includes(instructor.id);
                                        return (
                                            <TouchableOpacity
                                                key={instructor.id}
                                                style={styles.instructorRow}
                                                onPress={() => toggleInstructor(instructor.id)}
                                        accessibilityRole="checkbox"
                                        accessibilityLabel={`Instrutor ${instructor.name}`}
                                                disabled={isLoading}
                                                activeOpacity={0.7}
                                            >
                                                <AntDesign
                                                    name={isSelected ? 'checkcircle' : 'checkcircleo'}
                                                    size={20}
                                                    color={colors.textOrange}
                                                    style={styles.instructorIcon}
                                                />
                                                <Text
                                                    style={[
                                                        styles.instructorRowText,
                                                        isSelected && styles.instructorSelectedText,
                                                    ]}
                                                >
                                                    {instructor.name}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })
                                )}
                            </View>

                            {/* ===== SEÇÃO DE CHECK-IN ===== */}
                            <View style={styles.checkInSection}>
                                <Text style={styles.title}>Configuração do Check-in *</Text>

                                {/* Seletor de tipo */}
                                <View style={styles.unitSelectorContainer}>
                                    <Text style={styles.unitSelectorLabel}>Tipo:</Text>
                                    <View style={styles.unitSelector}>
                                        <TouchableOpacity
                                            style={[
                                                styles.unitButton,
                                                checkInUnit === 'hours' && styles.unitButtonActive
                                            ]}
                                            onPress={() => handleCheckInUnitChange('hours')}
                                            accessibilityRole="button"
                                            accessibilityLabel="Definir check-in por horas antes da aula"
                                            accessibilityState={{ selected: checkInUnit === 'hours' }}
                                            disabled={isLoading}
                                        >
                                            <Text style={[
                                                styles.unitButtonText,
                                                checkInUnit === 'hours' && styles.unitButtonTextActive
                                            ]}>Horas</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[
                                                styles.unitButton,
                                                checkInUnit === 'weekday' && styles.unitButtonActive
                                            ]}
                                            onPress={() => handleCheckInUnitChange('weekday')}
                                            accessibilityRole="button"
                                            accessibilityLabel="Definir check-in por horário fixo"
                                            accessibilityState={{ selected: checkInUnit === 'weekday' }}
                                            disabled={isLoading}
                                        >
                                            <Text style={[
                                                styles.unitButtonText,
                                                checkInUnit === 'weekday' && styles.unitButtonTextActive
                                            ]}>Dia da Semana</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {checkInUnit === 'hours' ? (
                                    // Modo Horas
                                    <>
                                        <Text style={styles.label}>Início do Check-in (horas antes) *</Text>
                                        <View style={styles.inputContainer}>
                                            <AntDesign name="clock-circle" size={20} color={colors.textOrange} style={styles.inputIcon} />
                                            <TextInput
                                                style={styles.input}
                                                placeholderTextColor={colors.textWhiteTransparent}
                                                value={hoursStartValue}
                                accessibilityLabel="Horas antes da aula para abrir o check-in"
                                                onChangeText={(text) => setHoursStartValue(text.replace(/[^0-9.]/g, ''))}
                                                placeholder="Ex: 8"
                                                keyboardType="decimal-pad"
                                                editable={!isLoading}
                                            />
                                            <Text style={styles.inputUnitLabel}>horas</Text>
                                        </View>

                                        <Text style={styles.label}>Término do Check-in (horas antes) *</Text>
                                        <View style={styles.inputContainer}>
                                            <AntDesign name="clock-circle" size={20} color={colors.textOrange} style={styles.inputIcon} />
                                            <TextInput
                                                style={styles.input}
                                                placeholderTextColor={colors.textWhiteTransparent}
                                                value={hoursEndValue}
                                accessibilityLabel="Horas antes da aula para fechar o check-in"
                                                onChangeText={(text) => setHoursEndValue(text.replace(/[^0-9.]/g, ''))}
                                                placeholder="Ex: 2"
                                                keyboardType="decimal-pad"
                                                editable={!isLoading}
                                            />
                                            <Text style={styles.inputUnitLabel}>horas</Text>
                                        </View>

                                        <Text style={styles.checkInHelperText}>
                                            ⚠️ O check-in abre X horas antes da aula e fecha Y horas antes
                                        </Text>
                                        <Text style={styles.checkInHelperText}>
                                            💡 Exemplo: Se a aula começa às 10:00 e você define 8 horas antes,
                                            o check-in abre às 02:00 e fecha às 08:00
                                        </Text>
                                    </>
                                ) : (
                                    // Modo Dia da Semana
                                    <>
                                        <Text style={styles.label}>Dia da semana para abrir o check-in *</Text>
                                        <View style={styles.inputContainer}>
                                            <AntDesign name="calendar" size={20} color={colors.textOrange} style={styles.inputIcon} />
                                            <View style={styles.pickerWrapper}>
                                                <Picker
                                                    selectedValue={weekdayCheckIn}
                                                    onValueChange={(itemValue) => setWeekdayCheckIn(itemValue)}
                                                    style={styles.picker}
                                                    dropdownIconColor={colors.textWhite}
                                                    enabled={!isLoading}
                                                >
                                                    {Object.entries(weekDaysMap).map(([key, value]) => (
                                                        <Picker.Item key={key} label={value} value={key} />
                                                    ))}
                                                </Picker>
                                            </View>
                                        </View>

                                        <Text style={styles.label}>Horário de abertura do check-in *</Text>
                                        <View style={styles.inputContainer}>
                                            <AntDesign name="clock-circle" size={20} color={colors.textOrange} style={styles.inputIcon} />
                                            <TextInput
                                                style={styles.input}
                                                placeholderTextColor={colors.textWhiteTransparent}
                                                value={weekdayCheckInTime}
                                accessibilityLabel="Horário de abertura do check-in"
                                                onChangeText={(text) => handleTimeInput(text, setWeekdayCheckInTime)}
                                                placeholder="--:--"
                                                keyboardType="number-pad"
                                                maxLength={5}
                                                editable={!isLoading}
                                            />
                                            <Text style={styles.inputUnitLabel}>HH:MM</Text>
                                        </View>

                                        <Text style={styles.checkInHelperText}>
                                            ⚠️ O check-in abrirá no(a) {weekDaysMap[weekdayCheckIn]} às {weekdayCheckInTime || '--:--'}
                                        </Text>

                                        <Text style={styles.label}>Horário de fechamento do check-in (no dia da aula) *</Text>
                                        <View style={styles.inputContainer}>
                                            <AntDesign name="clock-circle" size={20} color={colors.textOrange} style={styles.inputIcon} />
                                            <TextInput
                                                style={styles.input}
                                                placeholderTextColor={colors.textWhiteTransparent}
                                                value={weekdayCloseTime}
                                accessibilityLabel="Horário de fechamento do check-in"
                                                onChangeText={(text) => handleTimeInput(text, setWeekdayCloseTime)}
                                                placeholder="--:--"
                                                keyboardType="number-pad"
                                                maxLength={5}
                                                editable={!isLoading}
                                            />
                                            <Text style={styles.inputUnitLabel}>HH:MM</Text>
                                        </View>

                                        <Text style={styles.checkInHelperText}>
                                            ⚠️ O horário de fechamento deve ser ANTES do início da aula ({startTime || '--:--'})
                                        </Text>
                                        <Text style={styles.checkInHelperText}>
                                            💡 Exemplo: Se a aula é na Quarta às 10:00 e você escolhe
                                            Segunda-feira às 08:00 para abrir, o check-in abre na Segunda 08:00
                                            e fecha na Quarta às 09:30 (30 min antes da aula)
                                        </Text>
                                    </>
                                )}
                            </View>

                            <Text style={styles.title}>Dia da Semana *</Text>
                            <View style={styles.inputContainer}>
                                <AntDesign name="calendar" size={20} color={colors.textOrange} style={styles.inputIcon} />
                                <View style={styles.pickerWrapper}>
                                    <Picker
                                        selectedValue={weekday}
                                        onValueChange={setWeekday}
                                        style={styles.picker}
                                        dropdownIconColor={colors.textWhite}
                                        enabled={!isLoading}
                                    >
                                        <Picker.Item label="Domingo" value="SUNDAY" />
                                        <Picker.Item label="Segunda-feira" value="MONDAY" />
                                        <Picker.Item label="Terça-feira" value="TUESDAY" />
                                        <Picker.Item label="Quarta-feira" value="WEDNESDAY" />
                                        <Picker.Item label="Quinta-feira" value="THURSDAY" />
                                        <Picker.Item label="Sexta-feira" value="FRIDAY" />
                                        <Picker.Item label="Sábado" value="SATURDAY" />
                                    </Picker>
                                </View>
                            </View>

                            <Text style={styles.title}>Horário de Início *</Text>
                            <View style={styles.inputContainer}>
                                <AntDesign name="clock-circle" size={20} color={colors.textOrange} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholderTextColor={colors.textWhiteTransparent}
                                    value={startTime}
                                accessibilityLabel="Horário de início"
                                    onChangeText={(text) => setStartTime(formatTimeInput(text))}
                                    placeholder="HH:mm (ex: 09:00)"
                                    keyboardType="number-pad"
                                    maxLength={5}
                                    editable={!isLoading}
                                />
                            </View>

                            <Text style={styles.title}>Horário de Término *</Text>
                            <View style={styles.inputContainer}>
                                <AntDesign name="clock-circle" size={20} color={colors.textOrange} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholderTextColor={colors.textWhiteTransparent}
                                    value={endTime}
                                accessibilityLabel="Horário de término"
                                    onChangeText={(text) => setEndTime(formatTimeInput(text))}
                                    placeholder="HH:mm (ex: 11:30)"
                                    keyboardType="number-pad"
                                    maxLength={5}
                                    editable={!isLoading}
                                />
                            </View>

                            <View style={styles.buttonSection}>
                                <TouchableOpacity
                                    style={[styles.saveButton, isLoading && styles.disabledButton]}
                                    onPress={handleSave}
                            accessibilityRole="button"
                            accessibilityLabel={isLoading ? 'Salvando...' : 'Salvar turma'}
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
                                        <Text style={styles.buttonText}>Criar Turma</Text>
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
        borderRadius: 35,
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
    textAreaContainer: {
        minHeight: 80,
        paddingVertical: 10,
    },
    textArea: {
        minHeight: 60,
        paddingTop: 12,
        height: 'auto',
        textAlignVertical: 'top',
    },
    pickerWrapper: {
        flex: 1,
        justifyContent: 'center',
        marginLeft: 8,
    },
    picker: {
        color: colors.textWhite,
        fontSize: colors.fontP16,
        fontFamily: 'Nunito',
        height: 50,
    },
    buttonSection: {
        marginTop: 35,
        marginBottom: 20,
        alignItems: 'center',
    },
    saveButton: {
        backgroundColor: colors.backgroundSave,
        paddingVertical: 16,
        paddingHorizontal: 40,
        borderRadius: 30,
        width: '70%',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    disabledButton: {
        opacity: 0.6,
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
        backgroundColor: 'rgba(255, 152, 0, 0.1)',
        padding: 10,
        borderRadius: 8,
        width: '100%',
    },
    successMessage: {
        color: colors.textWhite,
        fontSize: colors.fontP16,
        fontFamily: 'Nunito',
        textAlign: 'center',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        padding: 10,
        borderRadius: 8,
        width: '100%',
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: 20,
    },
    // Estilos da seção de check-in (copiados de EditClasses)
    label: {
        fontSize: colors.fontP14,
        color: colors.textWhite,
        marginTop: 16,
        marginBottom: 8,
        fontFamily: 'Nunito',
        fontWeight: '600',
    },
    inputUnitLabel: {
        fontSize: colors.fontP14,
        color: colors.textGrey,
        fontFamily: 'Nunito',
        marginLeft: 8,
        fontWeight: '500',
    },
    checkInSection: {
        marginTop: 8,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
    },
    unitSelectorContainer: {
        flexDirection: 'column',
        marginBottom: 12,
        marginTop: 4,
    },
    unitSelectorLabel: {
        fontSize: colors.fontP14,
        color: colors.textWhite,
        fontFamily: 'Nunito',
        fontWeight: '600',
        marginBottom: 8,
    },
    unitSelector: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 25,
        padding: 4,
    },
    unitButton: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        alignItems: 'center',
    },
    unitButtonActive: {
        backgroundColor: colors.textOrange,
    },
    unitButtonText: {
        fontSize: colors.fontP12,
        color: colors.textGrey,
        fontFamily: 'Nunito',
        fontWeight: '500',
    },
    unitButtonTextActive: {
        color: colors.textWhite,
        fontWeight: 'bold',
    },
    checkInHelperText: {
        fontSize: colors.fontP12,
        color: colors.textGrey,
        fontFamily: 'Nunito',
        marginTop: 8,
        fontStyle: 'italic',
    },
    // Estilos do seletor múltiplo de instrutores
    instructorsContainer: {
        backgroundColor: colors.backgroundTransparent,
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 8,
    },
    instructorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
    },
    instructorIcon: {
        marginRight: 12,
    },
    instructorRowText: {
        flex: 1,
        fontSize: colors.fontP16,
        color: colors.textWhite,
        fontFamily: 'Nunito',
    },
    instructorSelectedText: {
        color: colors.textOrange,
        fontWeight: 'bold',
    },
    instructorsEmptyText: {
        fontSize: colors.fontP14,
        color: colors.textGrey,
        fontFamily: 'Nunito',
        fontStyle: 'italic',
        paddingVertical: 12,
        paddingHorizontal: 8,
    },
    instructorsLoading: {
        paddingVertical: 16,
    },
});