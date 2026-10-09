import React, { useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
    StyleSheet,
    Text,
    Alert,
    View,
    FlatList,
    TextInput,
    Modal,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    ScrollView
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as Animatable from 'react-native-animatable';
import { useFonts } from 'expo-font';
import { colors } from '../../styles/colors';
import TabNavigator from '../../components/tabNavigator';
import { AuthContext } from '../../contexts/auth';
import { AntDesign } from '@expo/vector-icons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

/**
 * "2026-09-30" -> 30/09/2026 no fuso local. `new Date("2026-09-30")` seria meia-noite UTC,
 * que em UTC-3 cai no dia 29 — o date picker abria sempre um dia antes do valor no campo.
 */
const parseDataLocal = (iso) => {
    if (!iso) return new Date();
    const [ano, mes, dia] = iso.split('-').map(Number);
    return new Date(ano, mes - 1, dia);
};

/** Date -> "AAAA-MM-DD" pelo calendário local, sem passar por UTC. */
const formatarDataLocal = (data) => {
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${data.getFullYear()}-${mes}-${dia}`;
};

export default function EditClasses() {
    const {
        classes,
        classesAll,
        updateClass,
        deleteClass,
        generateLessons,
        generateAllLessons,
        getLessonsByClass,
        getAllInstructors
    } = useContext(AuthContext);

    const [modalVisible, setModalVisible] = useState(false);
    const [selectedClass, setSelectedClass] = useState(null);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [startCheckIn, setStartCheckIn] = useState('');
    const [endCheckIn, setEndCheckIn] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [updateResponse, setUpdateResponse] = useState(null);
    const [filter, setFilter] = useState('all');
    const [weekdayFilter, setWeekdayFilter] = useState('MONDAY');
    const [checkInUnit, setCheckInUnit] = useState('hours');
    const [hoursStartValue, setHoursStartValue] = useState('');
    const [hoursEndValue, setHoursEndValue] = useState('');
    const [weekdayCheckIn, setWeekdayCheckIn] = useState('MONDAY');
    const [weekdayCheckInTime, setWeekdayCheckInTime] = useState('');
    const [weekdayCloseTime, setWeekdayCloseTime] = useState('');
    const [generateModalVisible, setGenerateModalVisible] = useState(false);
    const [generateClassId, setGenerateClassId] = useState(null);
    const [generateFromDate, setGenerateFromDate] = useState('');
    const [generateToDate, setGenerateToDate] = useState('');
    const [showFromDatePicker, setShowFromDatePicker] = useState(false);
    const [showToDatePicker, setShowToDatePicker] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedLessons, setGeneratedLessons] = useState([]);
    const [showLessonsModal, setShowLessonsModal] = useState(false);
    const [loadingLessons, setLoadingLessons] = useState(false);
    const [selectedClassForLessons, setSelectedClassForLessons] = useState(null);
    const [availableInstructors, setAvailableInstructors] = useState([]);
    const [selectedInstructorIds, setSelectedInstructorIds] = useState([]);
    const [loadingInstructors, setLoadingInstructors] = useState(true);

    const weekDaysMap = {
        MONDAY: 'Segunda-feira',
        TUESDAY: 'Terça-feira',
        WEDNESDAY: 'Quarta-feira',
        THURSDAY: 'Quinta-feira',
        FRIDAY: 'Sexta-feira',
        SATURDAY: 'Sábado',
        SUNDAY: 'Domingo',
    };

    // FUNÇÕES DE VALIDAÇÃO E FORMATAÇÃO DE HORA
    const formatTimeInput = (text) => {
        // Remove tudo que não for número
        let cleaned = text.replace(/\D/g, '');
        cleaned = cleaned.slice(0, 4);

        if (cleaned.length > 2) {
            return `${cleaned.slice(0, 2)}:${cleaned.slice(2)}`;
        }
        return cleaned;
    };

    const isValidTime = (time) => {
        if (!time || time === '') return false;
        const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(time)) return false;
        const [hours, minutes] = time.split(':').map(Number);
        return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
    };

    const validateAndFormatTime = (text) => {
        const formatted = formatTimeInput(text);
        return formatted;
    };

    const timeToMinutes = (timeString) => {
        if (!timeString || !isValidTime(timeString)) return 0;
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours * 60 + minutes;
    };

    const formatMinutesToTime = (minutes) => {
        if (minutes === null || minutes === undefined || minutes === '') return '';
        const numMinutes = Number(minutes);
        if (isNaN(numMinutes)) return '';
        const hours = Math.floor(numMinutes / 60);
        const mins = numMinutes % 60;
        if (hours >= 24) {
            // Se for mais de 24h, mostrar em dias
            const days = Math.floor(hours / 24);
            const remainingHours = hours % 24;
            return `${days}d ${String(remainingHours).padStart(2, '0')}:${String(mins).padStart(2, '0')}h`;
        }
        return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    };

    // FUNÇÕES DE CONVERSÃO
    const convertHoursToMinutes = (hours) => {
        const numValue = Number(hours);
        if (isNaN(numValue) || numValue < 0) return 0;
        return Math.round(numValue * 60);
    };

    const convertMinutesToHours = (minutes) => {
        if (!minutes && minutes !== 0) return '';
        const numMinutes = Number(minutes);
        if (isNaN(numMinutes)) return '';
        const hours = numMinutes / 60;
        if (Number.isInteger(hours)) {
            return hours.toString();
        }
        return hours.toFixed(1);
    };

    // Calcula o offset (minutos ANTES do início da aula) para a abertura do check-in.
    // openWeekday/openTime = dia e horário em que o check-in abre.
    // lessonWeekday/lessonStartMinutes = dia e horário de início da aula.
    const calculateWeekdayStartMinutes = (openWeekday, openTime, lessonWeekday, lessonStartMinutes) => {
        const weekdayMap = {
            SUNDAY: 0,
            MONDAY: 1,
            TUESDAY: 2,
            WEDNESDAY: 3,
            THURSDAY: 4,
            FRIDAY: 5,
            SATURDAY: 6,
        };

        const openIndex = weekdayMap[openWeekday];
        const lessonIndex = weekdayMap[lessonWeekday];
        if (openIndex === undefined || lessonIndex === undefined) return 0;

        const openTimeMinutes = timeToMinutes(openTime);

        // dOpen = dias que o dia de abertura fica ANTES do dia da aula (0 se mesmo dia)
        const dOpen = (((lessonIndex - openIndex) % 7) + 7) % 7;

        // Offset em minutos antes do início da aula
        return dOpen * 1440 + (lessonStartMinutes - openTimeMinutes);
    };

    const toTimeString = (value) => {
        if (!value) return '';
        if (typeof value === 'string') return value.substring(0, 5);
        if (Array.isArray(value) && value.length >= 5) {
            const [, , , h, m] = value;
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        }
        return '';
    };

    const timeStringToApiFormat = (timeString) => {
        if (!timeString || !isValidTime(timeString)) return null;
        return `${timeString}:00`;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Data não definida';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch {
            return 'Data inválida';
        }
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return 'Data não definida';
        try {
            const date = new Date(dateString);
            return date.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return 'Data inválida';
        }
    };

    const fetchClasses = useCallback(() => {
        classesAll();
    }, [classesAll]);

    useEffect(() => {
        fetchClasses();
    }, [fetchClasses]);

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

    const getFilteredClasses = () => {
        if (!classes || !Array.isArray(classes)) return [];

        if (filter === 'all') {
            return classes;
        }

        if (filter === 'today') {
            const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
            const today = days[new Date().getDay()];
            return classes.filter(cls =>
                cls.schedules?.some(schedule =>
                    schedule.weekday === today
                )
            );
        }

        if (filter === 'weekday') {
            return classes.filter(cls =>
                cls.schedules?.some(schedule =>
                    schedule.weekday === weekdayFilter
                )
            );
        }

        return classes;
    };

    const filteredClasses = getFilteredClasses();

    const [fontsLoaded] = useFonts({
        'Nunito': require('../../../assets/fonts/Nunito-Regular.ttf'),
    });

    if (!fontsLoaded) {
        return null;
    }

    const handleOpenModal = (item) => {
        setSelectedClass(item);
        setUpdateResponse(null);
        // Pré-seleciona os instrutores já vinculados à turma
        setSelectedInstructorIds(item.instructors?.map((i) => i.id) || []);

        let initialStartTime = '';
        let initialEndTime = '';

        // Horários da turma
        if (item.schedules && item.schedules.length > 0) {
            initialStartTime = toTimeString(item.schedules[0]?.startTime);
            initialEndTime = toTimeString(item.schedules[0]?.endTime);
        }

        setStartTime(initialStartTime);
        setEndTime(initialEndTime);

        // Carregar valores de check-in — decodifica SEMPRE para o modo "Dia da Semana"
        // (representa qualquer offset e faz round-trip exato).
        setCheckInUnit('weekday');

        const lessonWeekday = item.schedules?.[0]?.weekday || 'MONDAY';
        const weekdayMapIndex = {
            SUNDAY: 0,
            MONDAY: 1,
            TUESDAY: 2,
            WEDNESDAY: 3,
            THURSDAY: 4,
            FRIDAY: 5,
            SATURDAY: 6,
        };
        const weekdayByIndex = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
        const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

        const lessonIndex = weekdayMapIndex[lessonWeekday] ?? 1;
        const lessonStartMinutes = timeToMinutes(initialStartTime);

        if (
            item.startCheckIn !== null && item.startCheckIn !== undefined &&
            item.endCheckIn !== null && item.endCheckIn !== undefined
        ) {
            const openOffset = Number(item.startCheckIn);
            const closeOffset = Number(item.endCheckIn);

            // Momento absoluto de abertura (minutos desde a meia-noite de domingo)
            let absOpen = (lessonIndex * 1440 + lessonStartMinutes) - openOffset;
            while (absOpen < 0) absOpen += 7 * 1440;

            const openIndex = Math.floor(absOpen / 1440) % 7;
            const openTime = absOpen % 1440;
            const closeTime = lessonStartMinutes - closeOffset;

            setWeekdayCheckIn(weekdayByIndex[openIndex] || 'MONDAY');
            setWeekdayCheckInTime(fmt(openTime));
            setWeekdayCloseTime(fmt(closeTime));
        } else {
            // Sem valores salvos: campos vazios no modo "Dia da Semana"
            setWeekdayCheckIn(lessonWeekday);
            setWeekdayCheckInTime('');
            setWeekdayCloseTime('');
        }

        setModalVisible(true);
    };

    const handleOpenGenerateModal = (classItem) => {
        setGenerateClassId(classItem.id);
        setSelectedClassForLessons(classItem);
        const now = new Date();
        const fromDate = formatarDataLocal(now);
        const toDate = formatarDataLocal(new Date(now.getFullYear(), now.getMonth() + 1, 0));
        setGenerateFromDate(fromDate);
        setGenerateToDate(toDate);
        setGenerateModalVisible(true);
        setGeneratedLessons([]);
    };

    /*
     * `value` e `onChange` precisam manter a identidade entre renders. O
     * DateTimePicker do Android re-executa `DateTimePickerAndroid.open()` sempre que uma
     * dessas duas props muda, e o módulo nativo, vendo o dialog já aberto, chama
     * `updateDate(value)` nele — o que joga o calendário de volta no mês do `value`.
     * Com `onChange` inline (função nova a cada render) e a tela re-renderizando sozinha,
     * isso acontecia dezenas de vezes por segundo: trocar de mês ou escolher um dia era
     * desfeito antes de aparecer, e só OK/Cancelar respondiam.
     */
    const valorDataInicio = useMemo(() => parseDataLocal(generateFromDate), [generateFromDate]);
    const valorDataFim = useMemo(() => parseDataLocal(generateToDate), [generateToDate]);

    const aoEscolherDataInicio = useCallback((event, dataEscolhida) => {
        setShowFromDatePicker(false);
        if (dataEscolhida) {
            setGenerateFromDate(formatarDataLocal(dataEscolhida));
        }
    }, []);

    const aoEscolherDataFim = useCallback((event, dataEscolhida) => {
        setShowToDatePicker(false);
        if (dataEscolhida) {
            setGenerateToDate(formatarDataLocal(dataEscolhida));
        }
    }, []);

    const handleGenerateLessons = async () => {
        if (!generateClassId) {
            Alert.alert("Erro", "ID da turma não encontrado");
            return;
        }

        if (!generateFromDate || !generateToDate) {
            Alert.alert("Erro", "Selecione as datas de início e fim");
            return;
        }

        if (generateFromDate > generateToDate) {
            Alert.alert("Erro", "Data de início não pode ser maior que data de fim");
            return;
        }

        setIsGenerating(true);

        try {
            const result = await generateLessons(generateClassId, generateFromDate, generateToDate);

            if (result.success) {
                Alert.alert(
                    "Sucesso",
                    `${result.data.created} aulas geradas! ${result.data.skippedExisting} aulas já existiam.`
                );
                setGenerateModalVisible(false);
                fetchClasses();
            } else {
                Alert.alert("Erro", result.errors?.global || "Erro ao gerar aulas");
            }
        } catch (error) {
            Alert.alert("Erro", error.message || "Erro ao gerar aulas");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerateAll = async () => {
        Alert.alert(
            "Gerar todas as aulas",
            "Deseja gerar aulas para todas as turmas ativas?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Gerar",
                    onPress: async () => {
                        try {
                            const result = await generateAllLessons(4);
                            if (result.success) {
                                Alert.alert("Sucesso", `${result.data} aulas geradas para todas as turmas!`);
                                fetchClasses();
                            } else {
                                Alert.alert("Erro", result.errors?.global || "Erro ao gerar aulas");
                            }
                        } catch (error) {
                            Alert.alert("Erro", error.message || "Erro ao gerar aulas");
                        }
                    }
                }
            ]
        );
    };

    const handleViewLessons = async (classItem) => {
        setSelectedClassForLessons(classItem);
        setLoadingLessons(true);
        setShowLessonsModal(true);
        setGeneratedLessons([]);

        try {
            const result = await getLessonsByClass(classItem.id);

            if (result.success) {
                let lessons = [];
                if (Array.isArray(result.data)) {
                    lessons = result.data;
                } else if (result.data && typeof result.data === 'object') {
                    lessons = result.data.content || result.data.lessons || [];
                    if (!Array.isArray(lessons)) {
                        lessons = [result.data];
                    }
                }

                const sortedLessons = lessons.sort((a, b) =>
                    new Date(a.startAt) - new Date(b.startAt)
                );
                setGeneratedLessons(sortedLessons);
            } else {
                setGeneratedLessons([]);
                console.log('Erro ao buscar aulas:', result.errors);
            }
        } catch (error) {
            console.error('Erro ao buscar aulas:', error);
            setGeneratedLessons([]);
        } finally {
            setLoadingLessons(false);
        }
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
        if (!selectedClass) return;

        let errors = [];

        if (!selectedClass.name || selectedClass.name.trim().length < 3) {
            errors.push('Nome da turma deve ter pelo menos 3 caracteres');
        }

        if (!isValidTime(startTime)) {
            errors.push('Horário de início inválido (formato HH:mm)');
        }

        if (!isValidTime(endTime)) {
            errors.push('Horário de término inválido (formato HH:mm)');
        }

        if (isValidTime(startTime) && isValidTime(endTime)) {
            if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
                errors.push('Horário de término deve ser depois do início');
            }
        }

        const maxStudentsNum = Number(selectedClass.maxStudents);
        if (isNaN(maxStudentsNum) || maxStudentsNum < 1 || maxStudentsNum > 25) {
            errors.push('Máximo de alunos deve ser entre 1 e 25');
        }

        const locationIdNum = Number(selectedClass.locationId);
        if (isNaN(locationIdNum) || locationIdNum <= 0) {
            errors.push('Localização é obrigatória');
        }

        // Converter valores de check-in baseado na unidade
        let startCheckInMinutes = 0;
        let endCheckInMinutes = 0;

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

            // Validar horário de abertura do check-in
            if (!isValidTime(weekdayCheckInTime)) {
                errors.push('Horário de abertura do check-in inválido (formato HH:mm)');
            }

            // Validar horário de fechamento do check-in
            if (!isValidTime(weekdayCloseTime)) {
                errors.push('Horário de fechamento do check-in inválido (formato HH:mm)');
            }

            if (isValidTime(startTime) && isValidTime(weekdayCheckInTime) && isValidTime(weekdayCloseTime) && weekdayCheckIn) {
                // Dia e horário da aula (vindos do formulário)
                const lessonWeekday = selectedClass.schedules?.[0]?.weekday || 'MONDAY';
                const classStartMinutes = timeToMinutes(startTime);
                const checkInCloseMinutes = timeToMinutes(weekdayCloseTime);

                // openOffset = minutos antes do início da aula em que o check-in ABRE
                startCheckInMinutes = calculateWeekdayStartMinutes(
                    weekdayCheckIn,
                    weekdayCheckInTime,
                    lessonWeekday,
                    classStartMinutes
                );

                // closeOffset = minutos antes do início da aula em que o check-in FECHA
                endCheckInMinutes = classStartMinutes - checkInCloseMinutes;

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

        if (errors.length > 0) {
            Alert.alert('Erro', errors.join('. '));
            return;
        }

        setIsSaving(true);
        setUpdateResponse(null);

        try {
            const scheduleWeekday = selectedClass.schedules?.[0]?.weekday || 'MONDAY';
            const scheduleStartTime = timeStringToApiFormat(startTime);
            const scheduleEndTime = timeStringToApiFormat(endTime);

            if (!scheduleStartTime || !scheduleEndTime) {
                throw new Error('Erro ao converter horários para formato do backend');
            }

            const updatedClass = {
                id: Number(selectedClass.id),
                name: selectedClass.name.trim(),
                description: selectedClass.description?.trim() || '',
                locationId: Number(selectedClass.locationId),
                maxStudents: Number(selectedClass.maxStudents),
                startCheckIn: startCheckInMinutes,
                endCheckIn: endCheckInMinutes,
                schedules: [{
                    id: selectedClass.schedules?.[0]?.id || null,
                    weekday: scheduleWeekday,
                    startTime: scheduleStartTime,
                    endTime: scheduleEndTime,
                }],
                instructors: selectedInstructorIds.map((id) => ({ id })),
                students: selectedClass.students || [],
            };

            const result = await updateClass(updatedClass);

            if (result.success) {
                setUpdateResponse(result);
                setTimeout(() => {
                    setModalVisible(false);
                    fetchClasses();
                }, 1500);
            } else {
                let errorMsg = "Erro ao atualizar a turma.";
                if (result.errors?.global) {
                    errorMsg = result.errors.global;
                } else if (result.data?.detail) {
                    errorMsg = result.data.detail;
                } else if (result.data?.message) {
                    errorMsg = result.data.message;
                }
                Alert.alert("Erro", errorMsg);
            }
        } catch (error) {
            Alert.alert("Erro", error.message || "Erro de conexão. Verifique sua internet e tente novamente.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        Alert.alert(
            'Confirmar Exclusão',
            'Tem certeza que deseja excluir esta turma? Esta ação não pode ser desfeita.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    onPress: async () => {
                        try {
                            setIsDeleting(true);
                            const result = await deleteClass(selectedClass.id);

                            if (result.success) {
                                setModalVisible(false);
                                await fetchClasses();
                                Alert.alert('Sucesso', 'Turma excluída com sucesso');
                            } else {
                                Alert.alert('Erro', result.errors?.global || 'Não foi possível excluir a turma.');
                            }
                        } catch (error) {
                            Alert.alert('Erro', error.message || 'Não foi possível excluir a turma.');
                        } finally {
                            setIsDeleting(false);
                        }
                    },
                    style: 'destructive',
                },
            ],
            { cancelable: false }
        );
    };

    const handleWeekdayChange = (weekdayKey) => {
        if (!selectedClass) return;

        const updatedSchedules = selectedClass.schedules?.length > 0
            ? selectedClass.schedules.map((schedule) => ({
                ...schedule,
                weekday: weekdayKey
            }))
            : [{
                id: null,
                weekday: weekdayKey,
                startTime: null,
                endTime: null
            }];

        setSelectedClass({
            ...selectedClass,
            schedules: updatedSchedules
        });
    };

    // Mudar unidade de check-in
    const handleCheckInUnitChange = (unit) => {
        if (unit === checkInUnit) return;
        setCheckInUnit(unit);
        // Resetar valores ao mudar
        setHoursStartValue('');
        setHoursEndValue('');
        setWeekdayCheckInTime('');
        setWeekdayCloseTime('');
        setWeekdayCheckIn('MONDAY');
    };

    // Formatar e validar entrada de hora
    const handleTimeInput = (text, setter) => {
        const formatted = validateAndFormatTime(text);
        // Validar se a hora é válida (00:00 a 23:59)
        if (formatted.length === 5) {
            if (!isValidTime(formatted)) {
                // Se for inválido, não atualiza
                return;
            }
        }
        setter(formatted);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'SCHEDULED': return colors.textOrange;
            case 'ONGOING': return colors.backgroundIconGreen;
            case 'FINISHED': return colors.textGrey;
            case 'CANCELLED': return colors.textRed;
            default: return colors.textWhite;
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'SCHEDULED': return 'Agendada';
            case 'ONGOING': return 'Em andamento';
            case 'FINISHED': return 'Finalizada';
            case 'CANCELLED': return 'Cancelada';
            default: return status || 'Agendada';
        }
    };

    const renderClassCard = ({ item }) => {
        const safeItem = {
            id: item.id || 0,
            name: item.name || 'Sem nome',
            description: item.description || 'Sem descrição',
            locationId: item.locationId || 0,
            maxStudents: item.maxStudents || 1,
            startCheckIn: item.startCheckIn || null,
            endCheckIn: item.endCheckIn || null,
            schedules: item.schedules || [],
            instructors: item.instructors || [],
            students: item.students || [],
        };

        let displayStartTime = '';
        let displayEndTime = '';

        if (safeItem.schedules && safeItem.schedules.length > 0) {
            displayStartTime = toTimeString(safeItem.schedules[0].startTime);
            displayEndTime = toTimeString(safeItem.schedules[0].endTime);
        }

        const getCheckInDisplay = () => {
            if (safeItem.startCheckIn === null || safeItem.startCheckIn === undefined) return 'Não definido';
            const minutes = Number(safeItem.startCheckIn);

            // Se for maior que 7 dias, é um valor de "Dia da Semana"
            if (minutes > 10080) {
                const days = Math.floor(minutes / (24 * 60));
                const remainingMinutes = minutes % (24 * 60);
                const hours = Math.floor(remainingMinutes / 60);
                const mins = remainingMinutes % 60;

                // Encontrar o dia da semana
                const today = new Date();
                const todayIndex = today.getDay();
                const weekdayMap = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
                let targetIndex = (todayIndex + days) % 7;

                let display = `${weekdayMap[targetIndex]} às ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

                // Mostrar horário de fechamento
                if (safeItem.endCheckIn !== null) {
                    const endMinutes = Number(safeItem.endCheckIn);
                    const endHours = Math.floor(endMinutes / 60);
                    const endMins = endMinutes % 60;
                    display += ` | Fecha: ${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
                }

                return display;
            }

            // Para horas, mostrar em dias se > 24h ou horas se < 24h
            const totalHours = minutes / 60;
            if (totalHours >= 24) {
                const days = Math.floor(totalHours / 24);
                const remainingHours = totalHours % 24;
                return `${days} dia${days > 1 ? 's' : ''} e ${remainingHours.toFixed(2).replace('.', ':')} horas antes`;
            }
            return `${totalHours.toFixed(2).replace('.', ':')} horas antes`;
        };

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.cardTitleContainer}>
                        <MaterialIcons name="class" size={20} color={colors.textOrange} />
                        <Text style={styles.cardTitle}>Turma #{safeItem.id}</Text>
                    </View>
                    <View style={styles.cardActions}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleViewLessons(safeItem)}
                            accessibilityRole="button"
                            accessibilityLabel={`Ver aulas da turma ${safeItem.name}`}
                        >
                            <AntDesign name="calendar" size={18} color={colors.textWhite} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleOpenGenerateModal(safeItem)}
                            accessibilityRole="button"
                            accessibilityLabel={`Gerar aulas da turma ${safeItem.name}`}
                        >
                            <AntDesign name="plus" size={18} color={colors.textWhite} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleOpenModal(safeItem)}
                            accessibilityRole="button"
                            accessibilityLabel={`Editar turma ${safeItem.name}`}
                        >
                            <AntDesign name="edit" size={18} color={colors.textWhite} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.cardContent}>
                    <View style={styles.infoRow}>
                        <AntDesign name="profile" size={16} color={colors.textWhite} style={styles.infoIcon} />
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.infoLabel}>Nome:</Text>
                            <Text style={styles.infoValue} numberOfLines={1}>{safeItem.name}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <AntDesign name="info" size={16} color={colors.textWhite} style={styles.infoIcon} />
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.infoLabel}>Descrição:</Text>
                            <Text style={styles.infoValue} numberOfLines={2}>{safeItem.description}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <FontAwesome name="users" size={16} color={colors.textWhite} style={styles.infoIcon} />
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.infoLabel}>Vagas:</Text>
                            <Text style={styles.infoValue}>
                                {safeItem.maxStudents} aluno(s)
                            </Text>
                        </View>
                    </View>

                    {safeItem.schedules && safeItem.schedules.length > 0 ? (
                        <>
                            <View style={styles.infoRow}>
                                <AntDesign name="calendar" size={16} color={colors.textWhite} style={styles.infoIcon} />
                                <View style={styles.infoTextContainer}>
                                    <Text style={styles.infoLabel}>Dia da semana:</Text>
                                    <Text style={styles.infoValue}>
                                        {safeItem.schedules[0].weekday ? weekDaysMap[safeItem.schedules[0].weekday] : 'Não definido'}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.infoRow}>
                                <AntDesign name="clock-circle" size={16} color={colors.textWhite} style={styles.infoIcon} />
                                <View style={styles.infoTextContainer}>
                                    <Text style={styles.infoLabel}>Horário:</Text>
                                    <Text style={styles.infoValue}>
                                        {displayStartTime} - {displayEndTime}
                                    </Text>
                                </View>
                            </View>
                        </>
                    ) : (
                        <View style={styles.infoRow}>
                            <AntDesign name="calendar" size={16} color={colors.textWhite} style={styles.infoIcon} />
                            <View style={styles.infoTextContainer}>
                                <Text style={styles.infoLabel}>Horário:</Text>
                                <Text style={styles.infoValue}>Não definido</Text>
                            </View>
                        </View>
                    )}

                    <View style={styles.checkInRow}>
                        <View style={styles.checkInItem}>
                            <AntDesign name="clock-circle" size={14} color={colors.textWhite} />
                            <Text style={styles.checkInLabel}>Check-in:</Text>
                            <Text style={styles.checkInValue}>
                                {getCheckInDisplay()}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    // Renderiza o cabeçalho estático interno do modal de aulas
    const renderLessonsHeader = () => {
        if (!selectedClassForLessons) return null;
        return (
            <View style={styles.lessonsHeaderContainer}>
                <Text style={styles.lessonsClassTitle}>
                    {selectedClassForLessons.name}
                </Text>
                <Text style={styles.lessonsClassId}>
                    ID: #{selectedClassForLessons.id}
                </Text>
                {generatedLessons.length > 0 && !loadingLessons && (
                    <Text style={styles.lessonsCount}>
                        Total: {generatedLessons.length} aula(s)
                    </Text>
                )}
            </View>
        );
    };

    // Renderiza cada card de aula individualmente
    const renderLessonItem = ({ item: lesson, index }) => {
        return (
            <View style={styles.lessonItem}>
                <View style={styles.lessonHeader}>
                    <Text style={styles.lessonItemText}>
                        Aula #{lesson.id || index + 1}
                    </Text>
                    <View style={[styles.lessonStatusBadge, { backgroundColor: getStatusColor(lesson.status) + '33' }]}>
                        <Text style={[styles.lessonStatusText, { color: getStatusColor(lesson.status) }]}>
                            {getStatusText(lesson.status)}
                        </Text>
                    </View>
                </View>
                <Text style={styles.lessonItemSub}>
                    📅 {formatDateTime(lesson.startAt)}
                </Text>
                {lesson.endAt && (
                    <Text style={styles.lessonItemSub}>
                        ⏰ Término: {formatDateTime(lesson.endAt)}
                    </Text>
                )}
                <View style={styles.lessonFooter}>
                    <Text style={styles.lessonCapacityInfo}>
                        👥 {lesson.enrolledCount || 0}/{lesson.maxStudents || 0} alunos
                    </Text>
                    {lesson.checkinOpensAt && (
                        <Text style={styles.lessonCheckinInfo}>
                            ✅ Check-in: {formatDateTime(lesson.checkinOpensAt)}
                        </Text>
                    )}
                </View>
            </View>
        );
    };

    // Renderiza o conteúdo vazio ou em carregamento das aulas
    const renderLessonsEmptyOrLoading = () => {
        if (loadingLessons) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.textOrange} />
                    <Text style={styles.loadingText}>Carregando aulas...</Text>
                </View>
            );
        }
        return (
            <View style={styles.emptyLessonsContainer}>
                <MaterialIcons name="event-busy" size={50} color={colors.textGrey} />
                <Text style={styles.emptyLessonsText}>
                    Nenhuma aula encontrada para esta turma
                </Text>
                <Text style={styles.emptyLessonsSubText}>
                    Clique no botão (+) para gerar aulas
                </Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Animatable.View animation='fadeInLeft' delay={500} style={styles.containerHeader}>
                <Text style={styles.message}>Editar Turma</Text>
            </Animatable.View>

            <Animatable.View animation='fadeInUp' style={styles.containerForm}>
                <View style={styles.headerSection}>
                    <Text style={styles.messageContainer}>Gerenciamento de turma</Text>
                    <Text style={styles.messageContainerSub}>Organize e mantenha as turmas atualizadas</Text>
                </View>

                <View style={styles.filterSection}>
                    <View style={styles.filterHeader}>
                        <Text style={styles.sectionTitle}>Filtrar por:</Text>
                        <TouchableOpacity
                            style={styles.generateAllButton}
                            onPress={handleGenerateAll}
                            accessibilityRole="button"
                            accessibilityLabel="Gerar aulas de todas as turmas"
                        >
                            <AntDesign name="plus" size={16} color={colors.textWhite} />
                            <Text style={styles.generateAllText}>Gerar Todas</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.filterRow}>
                        <TouchableOpacity
                            style={[styles.filterButton, filter === 'all' && styles.activeFilter]}
                            onPress={() => setFilter('all')}
                            accessibilityRole="button"
                            accessibilityLabel="Mostrar todas as turmas"
                            accessibilityState={{ selected: filter === 'all' }}
                        >
                            <Text style={styles.filterText}>Todas</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.filterButton, filter === 'today' && styles.activeFilter]}
                            onPress={() => setFilter('today')}
                            accessibilityRole="button"
                            accessibilityLabel="Filtrar turmas de hoje"
                            accessibilityState={{ selected: filter === 'today' }}
                        >
                            <Text style={styles.filterText}>Hoje</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.filterButton, filter === 'weekday' && styles.activeFilter]}
                            onPress={() => setFilter('weekday')}
                            accessibilityRole="button"
                            accessibilityLabel="Filtrar por dia da semana"
                            accessibilityState={{ selected: filter === 'weekday' }}
                        >
                            <Text style={styles.filterText}>Dia</Text>
                        </TouchableOpacity>
                    </View>

                    {filter === 'weekday' && (
                        <View style={styles.weekdayPickerContainer}>
                            <Picker
                                selectedValue={weekdayFilter}
                                onValueChange={(itemValue) => setWeekdayFilter(itemValue)}
                                style={styles.weekdayPicker}
                                dropdownIconColor={colors.textWhite}
                            >
                                {Object.entries(weekDaysMap).map(([key, value]) => (
                                    <Picker.Item key={key} label={value} value={key} />
                                ))}
                            </Picker>
                        </View>
                    )}
                </View>

                {filteredClasses && filteredClasses.length > 0 ? (
                    <FlatList
                        data={filteredClasses}
                        style={styles.flatList}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                        renderItem={renderClassCard}
                    />
                ) : (
                    <View style={styles.emptyContainer}>
                        <MaterialIcons name="class" size={50} color={colors.textWhite} />
                        <Text style={styles.emptyText}>Nenhuma turma encontrada</Text>
                        <Text style={styles.emptySubText}>Nenhuma turma corresponde aos filtros selecionados</Text>
                    </View>
                )}

                {/* Modal de Edição */}
                {selectedClass && (
                    <Modal
                        animationType="slide"
                        transparent={true}
                        visible={modalVisible}
                        onRequestClose={() => setModalVisible(false)}
                        statusBarTranslucent={true}
                    >
                        <StatusBar
                            backgroundColor="rgba(0,0,0,0.7)"
                            barStyle="light-content"
                            translucent={true}
                        />
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContainer}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Editar Turma {selectedClass.id}</Text>
                                    <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}
                                    accessibilityRole="button"
                                    accessibilityLabel="Fechar edição da turma">
                                        <AntDesign name="close" size={24} color={colors.textOrange} />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView
                                    style={styles.scrollContainer}
                                    contentContainerStyle={styles.scrollContentContainer}
                                    showsVerticalScrollIndicator={true}
                                    keyboardShouldPersistTaps="handled"
                                >
                                    <View style={styles.modalContent}>
                                        <Text style={styles.label}>Nome da Turma *</Text>
                                        <View style={styles.inputContainer}>
                                            <TextInput
                                                style={styles.input}
                                                value={selectedClass.name}
                                            accessibilityLabel="Nome da turma"
                                                onChangeText={(text) => setSelectedClass({ ...selectedClass, name: text })}
                                                placeholder="Nome da turma"
                                                placeholderTextColor={colors.textWhiteTransparent}
                                                editable={!isSaving && !isDeleting}
                                            />
                                        </View>

                                        <Text style={styles.label}>Descrição</Text>
                                        <View style={[styles.inputContainer, styles.textAreaContainer]}>
                                            <TextInput
                                                style={[styles.input, styles.textArea]}
                                                value={selectedClass.description || ''}
                                            accessibilityLabel="Descrição da turma"
                                                onChangeText={(text) => setSelectedClass({ ...selectedClass, description: text })}
                                                placeholder="Descrição da turma"
                                                placeholderTextColor={colors.textWhiteTransparent}
                                                editable={!isSaving && !isDeleting}
                                                multiline={true}
                                                numberOfLines={3}
                                                textAlignVertical="top"
                                            />
                                        </View>

                                        <Text style={styles.label}>Localização ID *</Text>
                                        <View style={styles.inputContainer}>
                                            <TextInput
                                                style={styles.input}
                                                value={selectedClass.locationId?.toString() || ''}
                                            accessibilityLabel="ID da localização"
                                                onChangeText={(text) => {
                                                    const num = text.replace(/[^0-9]/g, '');
                                                    setSelectedClass({ ...selectedClass, locationId: num });
                                                }}
                                                placeholder="ID da localização"
                                                placeholderTextColor={colors.textWhiteTransparent}
                                                keyboardType="numeric"
                                                editable={!isSaving && !isDeleting}
                                            />
                                        </View>

                                        <Text style={styles.label}>Máximo de Alunos * (1-25)</Text>
                                        <View style={styles.inputContainer}>
                                            <TextInput
                                                style={styles.input}
                                                value={selectedClass.maxStudents?.toString() || '1'}
                                            accessibilityLabel="Máximo de alunos"
                                                onChangeText={(text) => {
                                                    const num = text.replace(/[^0-9]/g, '');
                                                    const maxStudentsNum = Math.min(Math.max(parseInt(num) || 1, 1), 25);
                                                    setSelectedClass({ ...selectedClass, maxStudents: maxStudentsNum });
                                                }}
                                                placeholder="Ex: 15"
                                                placeholderTextColor={colors.textWhiteTransparent}
                                                keyboardType="numeric"
                                                editable={!isSaving && !isDeleting}
                                            />
                                        </View>

                                        {/* ===== SEÇÃO DE INSTRUTORES ===== */}
                                        <Text style={styles.label}>Instrutores</Text>
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
                                                            disabled={isSaving || isDeleting}
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

                                        <Text style={styles.label}>Dia da Semana *</Text>
                                        <View style={styles.pickerContainer}>
                                            <Picker
                                                selectedValue={selectedClass.schedules?.[0]?.weekday || 'MONDAY'}
                                                onValueChange={(itemValue) => handleWeekdayChange(itemValue)}
                                                style={styles.picker}
                                                dropdownIconColor={colors.textWhite}
                                                enabled={!isSaving && !isDeleting}
                                            >
                                                {Object.entries(weekDaysMap).map(([key, value]) => (
                                                    <Picker.Item key={key} label={value} value={key} />
                                                ))}
                                            </Picker>
                                        </View>

                                        <Text style={styles.label}>Horário de Início *</Text>
                                        <View style={styles.inputContainer}>
                                            <TextInput
                                                style={styles.input}
                                                value={startTime}
                                            accessibilityLabel="Horário de início"
                                                onChangeText={(text) => handleTimeInput(text, setStartTime)}
                                                placeholder="HH:MM"
                                                placeholderTextColor={colors.textWhiteTransparent}
                                                keyboardType="number-pad"
                                                maxLength={5}
                                                editable={!isSaving && !isDeleting}
                                            />
                                        </View>

                                        <Text style={styles.label}>Horário de Término *</Text>
                                        <View style={styles.inputContainer}>
                                            <TextInput
                                                style={styles.input}
                                                value={endTime}
                                            accessibilityLabel="Horário de término"
                                                onChangeText={(text) => handleTimeInput(text, setEndTime)}
                                                placeholder="HH:MM"
                                                placeholderTextColor={colors.textWhiteTransparent}
                                                keyboardType="number-pad"
                                                maxLength={5}
                                                editable={!isSaving && !isDeleting}
                                            />
                                        </View>

                                        {/* ===== SEÇÃO DE CHECK-IN ===== */}
                                        <View style={styles.checkInSection}>
                                            <Text style={styles.label}>Configuração do Check-in</Text>

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
                                                        disabled={isSaving || isDeleting}
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
                                                        disabled={isSaving || isDeleting}
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
                                                    <Text style={styles.label}>
                                                        Início do Check-in (horas antes) *
                                                    </Text>
                                                    <View style={styles.inputContainer}>
                                                        <TextInput
                                                            style={styles.input}
                                                            value={hoursStartValue}
                                            accessibilityLabel="Horas antes da aula para abrir o check-in"
                                                            onChangeText={(text) => {
                                                                const cleaned = text.replace(/[^0-9.]/g, '');
                                                                setHoursStartValue(cleaned);
                                                                setStartCheckIn(cleaned);
                                                            }}
                                                            placeholder="Ex: 8"
                                                            placeholderTextColor={colors.textWhiteTransparent}
                                                            keyboardType="decimal-pad"
                                                            editable={!isSaving && !isDeleting}
                                                        />
                                                        <Text style={styles.inputUnitLabel}>horas</Text>
                                                    </View>

                                                    <Text style={styles.label}>
                                                        Término do Check-in (horas antes) *
                                                    </Text>
                                                    <View style={styles.inputContainer}>
                                                        <TextInput
                                                            style={styles.input}
                                                            value={hoursEndValue}
                                            accessibilityLabel="Horas antes da aula para fechar o check-in"
                                                            onChangeText={(text) => {
                                                                const cleaned = text.replace(/[^0-9.]/g, '');
                                                                setHoursEndValue(cleaned);
                                                                setEndCheckIn(cleaned);
                                                            }}
                                                            placeholder="Ex: 2"
                                                            placeholderTextColor={colors.textWhiteTransparent}
                                                            keyboardType="decimal-pad"
                                                            editable={!isSaving && !isDeleting}
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
                                                    <Text style={styles.label}>
                                                        Dia da semana para abrir o check-in *
                                                    </Text>
                                                    <View style={styles.pickerContainer}>
                                                        <Picker
                                                            selectedValue={weekdayCheckIn}
                                                            onValueChange={(itemValue) => setWeekdayCheckIn(itemValue)}
                                                            style={styles.picker}
                                                            dropdownIconColor={colors.textWhite}
                                                            enabled={!isSaving && !isDeleting}
                                                        >
                                                            {Object.entries(weekDaysMap).map(([key, value]) => (
                                                                <Picker.Item key={key} label={value} value={key} />
                                                            ))}
                                                        </Picker>
                                                    </View>

                                                    <Text style={styles.label}>
                                                        Horário de abertura do check-in *
                                                    </Text>
                                                    <View style={styles.inputContainer}>
                                                        <TextInput
                                                            style={styles.input}
                                                            value={weekdayCheckInTime}
                                            accessibilityLabel="Horário de abertura do check-in"
                                                            onChangeText={(text) => handleTimeInput(text, setWeekdayCheckInTime)}
                                                            placeholder="--:--"
                                                            placeholderTextColor={colors.textWhiteTransparent}
                                                            keyboardType="number-pad"
                                                            maxLength={5}
                                                            editable={!isSaving && !isDeleting}
                                                        />
                                                        <Text style={styles.inputUnitLabel}>HH:MM</Text>
                                                    </View>

                                                    <Text style={styles.checkInHelperText}>
                                                        ⚠️ O check-in abrirá no(a) {weekDaysMap[weekdayCheckIn]} às {weekdayCheckInTime || '--:--'}
                                                    </Text>

                                                    <Text style={styles.label}>
                                                        Horário de fechamento do check-in (no dia da aula) *
                                                    </Text>
                                                    <View style={styles.inputContainer}>
                                                        <TextInput
                                                            style={styles.input}
                                                            value={weekdayCloseTime}
                                            accessibilityLabel="Horário de fechamento do check-in"
                                                            onChangeText={(text) => handleTimeInput(text, setWeekdayCloseTime)}
                                                            placeholder="--:--"
                                                            placeholderTextColor={colors.textWhiteTransparent}
                                                            keyboardType="number-pad"
                                                            maxLength={5}
                                                            editable={!isSaving && !isDeleting}
                                                        />
                                                        <Text style={styles.inputUnitLabel}>HH:MM</Text>
                                                    </View>

                                                    <Text style={styles.checkInHelperText}>
                                                        ⚠️ O horário de fechamento deve ser ANTES do início da aula ({startTime})
                                                    </Text>
                                                    <Text style={styles.checkInHelperText}>
                                                        💡 Exemplo: Se a aula é na Quarta às 10:00 e você escolhe
                                                        Segunda-feira às 08:00 para abrir, o check-in abre na Segunda 08:00
                                                        e fecha na Quarta às 09:30 (30 min antes da aula)
                                                    </Text>
                                                </>
                                            )}
                                        </View>

                                        <View style={styles.modalButtonContainer}>
                                            <TouchableOpacity
                                                style={[styles.saveButton, (isSaving || isDeleting) && styles.disabledButton]}
                                                onPress={handleSave}
                                                disabled={isSaving || isDeleting}
                                                accessibilityRole="button"
                                                accessibilityLabel={isSaving ? 'Salvando...' : 'Salvar alterações da turma'}
                                                accessibilityState={{ disabled: isSaving || isDeleting, busy: isSaving }}
                                            >
                                                {isSaving ? (
                                                    <ActivityIndicator size="small" color="white" />
                                                ) : (
                                                    <Text style={styles.buttonText}>Salvar</Text>
                                                )}
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={[styles.deleteButton, (isSaving || isDeleting) && styles.disabledButton]}
                                                onPress={handleDelete}
                                                disabled={isSaving || isDeleting}
                                                accessibilityRole="button"
                                                accessibilityLabel={isDeleting ? 'Excluindo...' : 'Excluir turma'}
                                                accessibilityState={{ disabled: isSaving || isDeleting, busy: isDeleting }}
                                            >
                                                {isDeleting ? (
                                                    <ActivityIndicator size="small" color="white" />
                                                ) : (
                                                    <Text style={styles.buttonText}>Excluir</Text>
                                                )}
                                            </TouchableOpacity>
                                        </View>

                                        {updateResponse && (
                                            <Animatable.Text
                                                animation="fadeIn"
                                                duration={1000}
                                                style={[
                                                    styles.responseMessage,
                                                    updateResponse.success ? styles.successMessage : styles.errorMessage
                                                ]}
                                            >
                                                {updateResponse.success
                                                    ? "Turma atualizada com sucesso!"
                                                    : updateResponse.errors?.global || "Erro ao atualizar"}
                                            </Animatable.Text>
                                        )}
                                    </View>
                                </ScrollView>
                            </View>
                        </View>
                    </Modal>
                )}

                {/* Modal de Geração de Aulas */}
                {generateModalVisible && (
                    <Modal
                        animationType="slide"
                        transparent={true}
                        visible={generateModalVisible}
                        onRequestClose={() => {
                            setGenerateModalVisible(false);
                            setSelectedClassForLessons(null);
                        }}
                        statusBarTranslucent={true}
                    >
                        <StatusBar
                            backgroundColor="rgba(0,0,0,0.7)"
                            barStyle="light-content"
                            translucent={true}
                        />
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContainerLessons}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Gerar Aulas</Text>
                                    <TouchableOpacity
                                        style={styles.closeButton}
                                        onPress={() => {
                                            setGenerateModalVisible(false);
                                            setSelectedClassForLessons(null);
                                        }}
                                        accessibilityRole="button"
                                        accessibilityLabel="Fechar geração de aulas"
                                    >
                                        <AntDesign name="close" size={24} color={colors.textOrange} />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView
                                    style={styles.scrollContainer}
                                    contentContainerStyle={styles.scrollContentContainer}
                                >
                                    <View style={styles.modalContent}>
                                        <Text style={styles.modalSubtitle}>
                                            Turma: {selectedClassForLessons?.name || generateClassId}
                                        </Text>

                                        <Text style={styles.label}>Data de Início</Text>
                                        <TouchableOpacity
                                            style={styles.dateButton}
                                            onPress={() => setShowFromDatePicker(true)}
                                        accessibilityRole="button"
                                        accessibilityLabel="Escolher data inicial"
                                        >
                                            <Text style={styles.dateText}>{generateFromDate || 'Selecionar data'}</Text>
                                            <AntDesign name="calendar" size={20} color={colors.textWhite} />
                                        </TouchableOpacity>

                                        {showFromDatePicker && (
                                            <DateTimePicker
                                                value={valorDataInicio}
                                                mode="date"
                                                display="default"
                                                onChange={aoEscolherDataInicio}
                                            />
                                        )}

                                        <Text style={styles.label}>Data de Fim</Text>
                                        <TouchableOpacity
                                            style={styles.dateButton}
                                            onPress={() => setShowToDatePicker(true)}
                                        accessibilityRole="button"
                                        accessibilityLabel="Escolher data final"
                                        >
                                            <Text style={styles.dateText}>{generateToDate || 'Selecionar data'}</Text>
                                            <AntDesign name="calendar" size={20} color={colors.textWhite} />
                                        </TouchableOpacity>

                                        {showToDatePicker && (
                                            <DateTimePicker
                                                value={valorDataFim}
                                                mode="date"
                                                display="default"
                                                onChange={aoEscolherDataFim}
                                            />
                                        )}

                                        <TouchableOpacity
                                            style={styles.generateMonthButton}
                                            accessibilityRole="button"
                                            accessibilityLabel="Preencher com o mês atual"
                                            onPress={() => {
                                                const now = new Date();
                                                const fromDate = formatarDataLocal(now);
                                                const toDate = formatarDataLocal(new Date(now.getFullYear(), now.getMonth() + 1, 0));
                                                setGenerateFromDate(fromDate);
                                                setGenerateToDate(toDate);
                                            }}
                                        >
                                            <Text style={styles.generateMonthText}>📅 Gerar mês atual</Text>
                                        </TouchableOpacity>

                                        <View style={styles.modalButtonContainer}>
                                            <TouchableOpacity
                                                style={[styles.saveButton, isGenerating && styles.disabledButton]}
                                                onPress={handleGenerateLessons}
                                        accessibilityRole="button"
                                        accessibilityLabel={isGenerating ? 'Gerando aulas...' : 'Gerar aulas'}
                                        accessibilityState={{ disabled: isGenerating, busy: isGenerating }}
                                                disabled={isGenerating}
                                            >
                                                {isGenerating ? (
                                                    <ActivityIndicator size="small" color="white" />
                                                ) : (
                                                    <Text style={styles.buttonText}>Gerar Aulas</Text>
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </ScrollView>
                            </View>
                        </View>
                    </Modal>
                )}

                {/* Modal de Visualização de Aulas */}
                {showLessonsModal && (
                    <Modal
                        animationType="slide"
                        transparent={true}
                        visible={showLessonsModal}
                        onRequestClose={() => {
                            setShowLessonsModal(false);
                            setGeneratedLessons([]);
                            setSelectedClassForLessons(null);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Fechar lista de aulas"
                        statusBarTranslucent={true}
                    >
                        <StatusBar
                            backgroundColor="rgba(0,0,0,0.7)"
                            barStyle="light-content"
                            translucent={true}
                        />
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContainer}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Aulas da Turma</Text>
                                    <TouchableOpacity
                                        style={styles.closeButton}
                                        onPress={() => {
                                            setShowLessonsModal(false);
                                            setGeneratedLessons([]);
                                            setSelectedClassForLessons(null);
                                        }}
                                        accessibilityRole="button"
                                        accessibilityLabel="Fechar lista de aulas"
                                    >
                                        <AntDesign name="close" size={24} color={colors.textOrange} />
                                    </TouchableOpacity>
                                </View>

                                <FlatList
                                    data={generatedLessons}
                                    keyExtractor={(lesson, index) => lesson.id?.toString() || index.toString()}
                                    renderItem={renderLessonItem}
                                    ListHeaderComponent={renderLessonsHeader}
                                    ListEmptyComponent={renderLessonsEmptyOrLoading}
                                    contentContainerStyle={styles.modalListContentContainer}
                                    showsVerticalScrollIndicator={true}
                                />
                            </View>
                        </View>
                    </Modal>
                )}
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
    },
    message: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.textWhite,
        fontFamily: 'Nunito',
        paddingLeft: 10,
    },
    flatList: {
        flex: 1,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 120,
        paddingTop: 10,
    },
    headerSection: {
        paddingHorizontal: 20,
        paddingTop: 20,
        marginBottom: 15,
    },
    messageContainer: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.textWhite,
        fontFamily: 'Nunito',
        textAlign: 'center',
        marginBottom: 5,
    },
    messageContainerSub: {
        fontSize: 14,
        color: colors.textWhiteTransparent,
        fontFamily: 'Nunito',
        textAlign: 'center',
    },
    filterSection: {
        paddingHorizontal: 20,
        marginBottom: 15,
    },
    filterHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 16,
        color: colors.textWhite,
        fontFamily: 'Nunito',
        fontWeight: '600',
    },
    filterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
        marginBottom: 10,
    },
    filterButton: {
        flex: 1,
        paddingVertical: 12,
        backgroundColor: colors.backgroundCardBlack,
        borderRadius: 30,
        alignItems: 'center',
    },
    activeFilter: {
        backgroundColor: colors.textOrange,
        borderColor: colors.textOrange,
    },
    filterText: {
        color: colors.textWhite,
        fontFamily: 'Nunito',
        fontSize: 14,
        fontWeight: '500',
    },
    weekdayPickerContainer: {
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: 30,
        marginTop: 5,
        paddingHorizontal: 10,
    },
    weekdayPicker: {
        color: colors.textWhite,
        fontFamily: 'Nunito',
    },
    card: {
        backgroundColor: colors.backgroundCardBlack,
        borderRadius: 15,
        marginBottom: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    cardTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.textWhite,
        fontFamily: 'Nunito',
        marginLeft: 8,
    },
    cardActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
    },
    actionButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: colors.textOrange,
    },
    cardContent: {
        padding: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    infoIcon: {
        marginTop: 2,
        marginRight: 12,
    },
    infoTextContainer: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: colors.textGrey,
        fontFamily: 'Nunito',
        marginBottom: 2,
        fontWeight: '500',
    },
    infoValue: {
        fontSize: 14,
        color: colors.textWhite,
        fontFamily: 'Nunito',
    },
    checkInRow: {
        marginTop: 10,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
    },
    checkInItem: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    checkInLabel: {
        fontSize: 12,
        color: colors.textGrey,
        fontFamily: 'Nunito',
        marginLeft: 8,
        marginRight: 6,
        fontWeight: '500',
    },
    checkInValue: {
        fontSize: 13,
        color: colors.textWhite,
        fontFamily: 'Nunito',
        fontWeight: '500',
        flex: 1,
    },
    generateAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundCheckInButton,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    generateAllText: {
        fontSize: 12,
        color: colors.textWhite,
        fontFamily: 'Nunito',
        marginLeft: 4,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 40,
    },
    emptyText: {
        fontSize: 18,
        color: colors.textWhite,
        marginTop: 20,
        textAlign: 'center',
        fontFamily: 'Nunito',
        fontWeight: '600',
    },
    emptySubText: {
        fontSize: 14,
        color: colors.textWhiteTransparent,
        marginTop: 10,
        textAlign: 'center',
        fontFamily: 'Nunito',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    modalContainer: {
        width: '90%',
        height: '75%',
        maxHeight: '75%',
        backgroundColor: colors.backgroundCardBlack,
        borderRadius: 20,
        overflow: 'hidden',
    },
    modalContainerLessons: {
        width: '90%',
        height: '50%',
        backgroundColor: colors.backgroundCardBlack,
        borderRadius: 20,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.textWhite,
        fontFamily: 'Nunito',
        flex: 1,
    },
    modalSubtitle: {
        fontSize: 14,
        color: colors.textGrey,
        fontFamily: 'Nunito',
        marginBottom: 15,
        textAlign: 'center',
    },
    closeButton: {
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        padding: 8,
        borderRadius: 20,
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContentContainer: {
        flexGrow: 1,
    },
    modalContent: {
        padding: 20,
        paddingBottom: 30,
    },
    modalListContentContainer: {
        padding: 20,
        paddingBottom: 180,
    },
    lessonsHeaderContainer: {
        width: '100%',
        alignItems: 'center',
    },
    label: {
        fontSize: 14,
        color: colors.textWhite,
        marginTop: 16,
        marginBottom: 8,
        fontFamily: 'Nunito',
        fontWeight: '600',
    },
    inputContainer: {
        backgroundColor: colors.backgroundTransparent,
        borderRadius: 25,
        paddingHorizontal: 15,
        height: 50,
        justifyContent: 'center',
        flexDirection: 'row',
        alignItems: 'center',
    },
    textAreaContainer: {
        height: 80,
        paddingVertical: 10,
    },
    textArea: {
        height: 60,
        textAlignVertical: 'top',
    },
    input: {
        fontSize: 16,
        color: colors.textWhite,
        fontFamily: 'Nunito',
        flex: 1,
    },
    inputUnitLabel: {
        fontSize: 14,
        color: colors.textGrey,
        fontFamily: 'Nunito',
        marginLeft: 8,
        fontWeight: '500',
    },
    pickerContainer: {
        backgroundColor: colors.backgroundTransparent,
        borderRadius: 25,
        marginTop: 8,
        marginBottom: 8,
        paddingHorizontal: 10,
    },
    picker: {
        fontSize: 16,
        color: colors.textWhite,
        fontFamily: 'Nunito',
        height: 50,
    },
    dateButton: {
        backgroundColor: colors.backgroundTransparent,
        borderRadius: 25,
        paddingHorizontal: 15,
        height: 50,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    dateText: {
        fontSize: 16,
        color: colors.textWhite,
        fontFamily: 'Nunito',
    },
    modalButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 25,
        gap: 12,
        marginBottom: 20,
    },
    saveButton: {
        backgroundColor: colors.backgroundSave,
        paddingVertical: 14,
        borderRadius: 12,
        flex: 1,
        alignItems: 'center',
    },
    deleteButton: {
        backgroundColor: colors.backgroundCancel,
        paddingVertical: 14,
        borderRadius: 12,
        flex: 1,
        alignItems: 'center',
    },
    disabledButton: {
        opacity: 0.6,
    },
    buttonText: {
        fontSize: 16,
        color: colors.textWhite,
        fontWeight: 'bold',
        fontFamily: 'Nunito',
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 30,
    },
    loadingText: {
        fontSize: 14,
        color: colors.textGrey,
        fontFamily: 'Nunito',
        marginTop: 10,
    },
    responseMessage: {
        marginTop: 15,
        textAlign: 'center',
        fontSize: 14,
        fontFamily: 'Nunito',
        padding: 10,
        borderRadius: 8,
    },
    successMessage: {
        color: colors.textWhite,
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
    },
    errorMessage: {
        color: colors.textOrange,
        backgroundColor: 'rgba(255, 152, 0, 0.2)',
    },
    lessonItem: {
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        padding: 14,
        borderRadius: 10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        width: '100%',
    },
    lessonHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    lessonItemText: {
        fontSize: 16,
        color: colors.textWhite,
        fontFamily: 'Nunito',
        fontWeight: '600',
    },
    lessonStatusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 12,
    },
    lessonStatusText: {
        fontSize: 11,
        fontFamily: 'Nunito',
        fontWeight: '600',
    },
    lessonItemSub: {
        fontSize: 13,
        color: colors.textGrey,
        fontFamily: 'Nunito',
        marginTop: 3,
    },
    lessonFooter: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
        flexDirection: 'row',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
    },
    lessonCapacityInfo: {
        fontSize: 12,
        color: colors.textOrange,
        fontFamily: 'Nunito',
    },
    lessonCheckinInfo: {
        fontSize: 12,
        color: colors.backgroundIconGreen,
        fontFamily: 'Nunito',
    },
    lessonsClassTitle: {
        fontSize: 18,
        color: colors.textOrange,
        fontFamily: 'Nunito',
        fontWeight: 'bold',
        marginBottom: 5,
        textAlign: 'center',
    },
    lessonsClassId: {
        fontSize: 14,
        color: colors.textGrey,
        fontFamily: 'Nunito',
        marginBottom: 15,
        textAlign: 'center',
    },
    lessonsCount: {
        fontSize: 14,
        color: colors.textGrey,
        fontFamily: 'Nunito',
        marginBottom: 15,
        textAlign: 'center',
    },
    emptyLessonsContainer: {
        alignItems: 'center',
        paddingVertical: 40,
        width: '100%',
    },
    emptyLessonsText: {
        fontSize: 16,
        color: colors.textWhite,
        fontFamily: 'Nunito',
        marginTop: 15,
        textAlign: 'center',
    },
    emptyLessonsSubText: {
        fontSize: 14,
        color: colors.textGrey,
        fontFamily: 'Nunito',
        marginTop: 8,
        textAlign: 'center',
    },
    generateMonthButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        alignSelf: 'center',
        marginTop: 15,
    },
    generateMonthText: {
        fontSize: 14,
        color: colors.textWhite,
        fontFamily: 'Nunito',
    },
    // Novos estilos
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
        fontSize: 14,
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
        fontSize: 12,
        color: colors.textGrey,
        fontFamily: 'Nunito',
        fontWeight: '500',
    },
    unitButtonTextActive: {
        color: colors.textWhite,
        fontWeight: 'bold',
    },
    checkInHelperText: {
        fontSize: 12,
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
        marginTop: 8,
        marginBottom: 8,
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
        fontSize: 16,
        color: colors.textWhite,
        fontFamily: 'Nunito',
    },
    instructorSelectedText: {
        color: colors.textOrange,
        fontWeight: 'bold',
    },
    instructorsEmptyText: {
        fontSize: 14,
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