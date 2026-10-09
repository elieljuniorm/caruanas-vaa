import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, TextInput, ActivityIndicator, StatusBar, Alert, RefreshControl } from 'react-native';
import { colors } from '../../styles/colors';
import { useFonts } from 'expo-font';
import * as Animatable from 'react-native-animatable';
import { AntDesign } from '@expo/vector-icons';
import Feather from '@expo/vector-icons/Feather';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import TabNavigator from '../../components/tabNavigator';
import { AuthContext } from '../../contexts/auth';
import HealthDeclarationModal from '../../components/healthDeclarationModal';
import { useNavigation } from '@react-navigation/native';

const statusOptions = [
    { id: 'all', label: 'Todos' },
    { id: 'VALID', label: 'Válidas' },
    { id: 'EXPIRED', label: 'Expiradas' },
    { id: 'PENDING', label: 'Pendentes' },
    { id: 'INVALID', label: 'Inválidas' }
];

export default function HealthDeclarations() {
    const { healthDeclarations, getAllHealthDeclarations, downloadHealthDeclarationPdf, user } = useContext(AuthContext);
    const navigation = useNavigation();

    const [fontsLoaded] = useFonts({
        'Nunito': require('../../../assets/fonts/Nunito-Regular.ttf'),
    });
    const [selectedDeclaration, setSelectedDeclaration] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingDeclaration, setEditingDeclaration] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [downloadingPdf, setDownloadingPdf] = useState(null);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadDeclarations();
        });

        loadDeclarations();

        return unsubscribe;
    }, [navigation]);

    const loadDeclarations = async () => {
        setIsLoading(true);
        try {
            await getAllHealthDeclarations();
        } catch (error) {
            console.error('Erro ao carregar declarações:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadDeclarations();
    };

    const handleDownloadPdf = async (declaration) => {
        if (!declaration.hasPdf) {
            Alert.alert('Informação', 'Esta declaração não possui PDF anexado.');
            return;
        }

        Alert.alert(
            'Baixar PDF',
            `Deseja baixar o PDF da declaração de ${declaration.userName}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Baixar',
                    onPress: async () => await downloadPdfFile(declaration)
                }
            ]
        );
    };

    const downloadPdfFile = async (declaration) => {
        setDownloadingPdf(declaration.id);
        try {
            // downloadHealthDeclarationPdf usa expo-file-system.downloadAsync
            // e retorna { success: true, data: "file://..." } com o arquivo já salvo em cache
            const result = await downloadHealthDeclarationPdf(declaration.id);

            if (result.success && result.data) {
                const fileUri = result.data; // URI do arquivo já baixado

                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(fileUri, {
                        mimeType: 'application/pdf',
                        dialogTitle: 'Salvar Declaração de Saúde',
                        UTI: 'com.adobe.pdf',
                    });
                } else {
                    Alert.alert('Sucesso', `PDF salvo em: ${fileUri}`);
                }
            } else {
                Alert.alert('Erro', result.errors?.global || 'Não foi possível baixar o PDF.');
            }
        } catch (error) {
            console.error('Erro no download:', error);
            Alert.alert('Erro', 'Falha ao baixar o PDF. Tente novamente.');
        } finally {
            setDownloadingPdf(null);
        }
    };

    const handleEditDeclaration = (declaration) => {
        setEditingDeclaration(declaration);
        setSelectedDeclaration(null);
        setShowEditModal(true);
    };

    const handleCloseEditModal = (shouldRefresh) => {
        setShowEditModal(false);
        setEditingDeclaration(null);
        if (shouldRefresh) {
            loadDeclarations();
        }
    };

    // INDICADOR DE PDF
    const renderPdfIndicator = (declaration) => {
        if (!declaration.hasPdf) return null;

        return (
            <View style={styles.pdfIndicatorContainer}>
                <Feather name="file-text" size={14} color={colors.textOrange} />
                <Text style={styles.pdfIndicatorText}>PDF</Text>
            </View>
        );
    };

    // BOTÃO DE DOWNLOAD
    const renderDownloadButton = (declaration) => {
        if (!declaration.hasPdf) return null;

        return (
            <TouchableOpacity
                style={styles.listDownloadButton}
                onPress={() => handleDownloadPdf(declaration)}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Baixar laudo de ${declaration.userName || 'aluno'}`}
                disabled={downloadingPdf === declaration.id}
            >
                {downloadingPdf === declaration.id ? (
                    <ActivityIndicator size="small" color={colors.textOrange} />
                ) : (
                    <Feather name="download" size={18} color={colors.textOrange} />
                )}
            </TouchableOpacity>
        );
    };

    if (!fontsLoaded) {
        return null;
    }

    const filteredDeclarations = (healthDeclarations || []).filter(declaration => {
        const statusMatch = statusFilter === 'all' || declaration.status === statusFilter;
        const nameMatch = (declaration.userName || '').toLowerCase().includes(searchQuery.toLowerCase());

        return statusMatch && nameMatch;
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'VALID': return '#4CAF50';
            case 'EXPIRED': return '#FF9800';
            case 'PENDING': return '#FFC107';
            case 'INVALID': return '#F44336';
            default: return colors.textGrey;
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'VALID': return 'Válida';
            case 'EXPIRED': return 'Expirada';
            case 'PENDING': return 'Pendente';
            case 'INVALID': return 'Inválida';
            default: return status;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            // Se já estiver no formato YYYY-MM-DD
            if (typeof dateString === 'string' && dateString.includes('-')) {
                const [year, month, day] = dateString.split('T')[0].split('-');
                return `${day}/${month}/${year}`;
            }
            const date = new Date(dateString);
            return date.toLocaleDateString('pt-BR');
        } catch {
            return dateString;
        }
    };

    return (
        <View style={styles.container}>
            <Animatable.View animation='fadeInLeft' delay={500} style={styles.containerHeader}>
                <Text style={styles.message}>Declarações de Saúde</Text>
            </Animatable.View>

            <Animatable.View animation='fadeInUp' style={styles.containerForm}>
                <ScrollView
                    style={styles.containerScroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            colors={[colors.textOrange]}
                            tintColor={colors.textOrange}
                        />
                    }
                >
                    {/* Barra de busca */}
                    <View style={styles.searchContainer}>
                        <Feather name="search" size={20} color={colors.textGrey} style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Buscar aluno..."
                        accessibilityLabel="Buscar aluno"
                            placeholderTextColor={colors.textGrey}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    {/* Filtros por status */}
                    <View style={styles.filterSection}>
                        <Text style={styles.sectionTitle}>Filtrar por status:</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.statusFilterContainer}
                        >
                            {statusOptions.map(option => (
                                <TouchableOpacity
                                    key={option.id}
                                    style={[
                                        styles.statusFilterButton,
                                        statusFilter === option.id && styles.activeStatusFilter,
                                    ]}
                                    onPress={() => setStatusFilter(option.id)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Filtrar por ${option.label}`}
                                    accessibilityState={{ selected: statusFilter === option.id }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.statusFilterText}>{option.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Lista de declarações */}
                    <View style={styles.listSection}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>
                                Declarações ({filteredDeclarations.length})
                            </Text>
                            <TouchableOpacity
                                style={styles.infoButton}
                                accessibilityRole="button"
                                accessibilityLabel="O que significam os ícones"
                                onPress={() => Alert.alert(
                                    'Informação',
                                    'Ícone 📄 indica que há PDF disponível. Clique no ícone de download para baixar diretamente ou no card para ver detalhes.'
                                )}
                            >
                                <Feather name="info" size={16} color={colors.textGrey} />
                            </TouchableOpacity>
                        </View>

                        {isLoading && !refreshing ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={colors.textOrange} />
                                <Text style={styles.loadingText}>Carregando declarações...</Text>
                            </View>
                        ) : filteredDeclarations.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Feather name="frown" size={40} color={colors.textGrey} />
                                <Text style={styles.emptyStateText}>Nenhuma declaração encontrada</Text>
                            </View>
                        ) : (
                            filteredDeclarations.map(declaration => (
                                <TouchableOpacity
                                    key={declaration.id}
                                    style={styles.declarationCard}
                                    onPress={() => setSelectedDeclaration(declaration)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Declaração de ${declaration.userName || 'aluno'}`}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.declarationHeader}>
                                        <View style={styles.nameContainer}>
                                            <Text style={styles.declarationName}>{declaration.userName}</Text>
                                            {renderPdfIndicator(declaration)}
                                        </View>
                                        <View style={styles.headerActions}>
                                            {/* BOTÃO DE DOWNLOAD NA LISTA */}
                                            {renderDownloadButton(declaration)}
                                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(declaration.status) }]}>
                                                <Text style={styles.statusBadgeText}>{getStatusLabel(declaration.status)}</Text>
                                            </View>
                                        </View>
                                    </View>

                                    <Text style={styles.declarationDate}>Data: {formatDate(declaration.declarationDate)}</Text>

                                    <View style={styles.declarationSummary}>
                                        <Text style={styles.summaryText} numberOfLines={2}>
                                            {declaration.canPracticeRowing ?
                                                "Apto para prática de remo" :
                                                "Não apto para prática de remo"}
                                            {declaration.description &&
                                                ` - ${declaration.description}`}
                                        </Text>
                                    </View>

                                    {declaration.statusReason && (
                                        <View style={styles.statusReasonRow}>
                                            <AntDesign name="info-circle" size={13} color={colors.textOrange} />
                                            <Text style={styles.statusReasonText}>{declaration.statusReason}</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))
                        )}

                        <View style={styles.extraSpace} />
                    </View>
                </ScrollView>
            </Animatable.View>

            {/* Modal de detalhes da declaração */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={!!selectedDeclaration}
                onRequestClose={() => setSelectedDeclaration(null)}
                statusBarTranslucent={true}
            >
                <StatusBar
                    backgroundColor="rgba(0,0,0,0.7)"
                    barStyle="light-content"
                    translucent={true}
                />
                {selectedDeclaration && (
                    <View style={styles.detailModalOverlay}>
                        <View style={styles.detailModalContainer}>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => setSelectedDeclaration(null)}
                                accessibilityRole="button"
                                accessibilityLabel="Fechar declaração"
                            >
                                <AntDesign name="close" size={28} color={colors.textOrange} />
                            </TouchableOpacity>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.detailHeader}>
                                    <Text style={styles.detailUserName}>{selectedDeclaration.userName}</Text>
                                    {/* INDICADOR DE PDF NO MODAL */}
                                    {selectedDeclaration.hasPdf && (
                                        <View style={styles.detailPdfBadge}>
                                            <Feather name="file-text" size={16} color={colors.textOrange} />
                                            <Text style={styles.detailPdfText}>PDF anexado</Text>
                                        </View>
                                    )}
                                </View>

                                <View style={styles.detailInfoRow}>
                                    <AntDesign name="calendar" size={16} color={colors.textGrey} />
                                    <Text style={styles.detailUserContact}>
                                        Data da declaração: {formatDate(selectedDeclaration.declarationDate)}
                                    </Text>
                                </View>

                                <View style={styles.detailInfoRow}>
                                    <AntDesign name="clock-circle" size={16} color={colors.textGrey} />
                                    <Text style={styles.detailUserContact}>
                                        Última atualização: {formatDate(selectedDeclaration.lastUpdate)}
                                    </Text>
                                </View>

                                <View style={styles.detailInfoRow}>
                                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedDeclaration.status) }]}>
                                        <Text style={styles.statusBadgeText}>{getStatusLabel(selectedDeclaration.status)}</Text>
                                    </View>
                                </View>

                                <Text style={styles.sectionTitleModal}>Condições de Saúde:</Text>

                                <View style={styles.summaryContainer}>
                                    <View style={styles.summaryItem}>
                                        <Text style={styles.summaryLabel}>Prática de remo permitida:</Text>
                                        <Text style={[styles.summaryValue, { color: selectedDeclaration.canPracticeRowing ? '#4CAF50' : '#F44336' }]}>
                                            {selectedDeclaration.canPracticeRowing ? 'Sim' : 'Não'}
                                        </Text>
                                    </View>

                                    <View style={styles.summaryItem}>
                                        <Text style={styles.summaryLabel}>Doenças crônicas:</Text>
                                        <Text style={styles.summaryValue}>
                                            {selectedDeclaration.chronicDiseases ? 'Sim' : 'Não'}
                                        </Text>
                                    </View>

                                    <View style={styles.summaryItem}>
                                        <Text style={styles.summaryLabel}>Medicação regular:</Text>
                                        <Text style={styles.summaryValue}>
                                            {selectedDeclaration.regularMedication ? 'Sim' : 'Não'}
                                        </Text>
                                    </View>

                                    <View style={styles.summaryItem}>
                                        <Text style={styles.summaryLabel}>Alergias:</Text>
                                        <Text style={styles.summaryValue}>
                                            {selectedDeclaration.allergies ? 'Sim' : 'Não'}
                                        </Text>
                                    </View>

                                    <View style={styles.summaryItem}>
                                        <Text style={styles.summaryLabel}>Lesões recentes:</Text>
                                        <Text style={styles.summaryValue}>
                                            {selectedDeclaration.recentInjuries ? 'Sim' : 'Não'}
                                        </Text>
                                    </View>

                                    <View style={styles.summaryItem}>
                                        <Text style={styles.summaryLabel}>Problemas cardíacos:</Text>
                                        <Text style={styles.summaryValue}>
                                            {selectedDeclaration.cardiacProblems ? 'Sim' : 'Não'}
                                        </Text>
                                    </View>

                                    <View style={styles.summaryItem}>
                                        <Text style={styles.summaryLabel}>Histórico cirúrgico:</Text>
                                        <Text style={styles.summaryValue}>
                                            {selectedDeclaration.surgicalHistory ? 'Sim' : 'Não'}
                                        </Text>
                                    </View>

                                    <View style={styles.summaryItem}>
                                        <Text style={styles.summaryLabel}>Problemas respiratórios:</Text>
                                        <Text style={styles.summaryValue}>
                                            {selectedDeclaration.respiratoryProblems ? 'Sim' : 'Não'}
                                        </Text>
                                    </View>

                                    <View style={styles.summaryItem}>
                                        <Text style={styles.summaryLabel}>Epilepsia/Convulsões:</Text>
                                        <Text style={styles.summaryValue}>
                                            {selectedDeclaration.epilepsyOrSeizures ? 'Sim' : 'Não'}
                                        </Text>
                                    </View>

                                    <View style={styles.summaryItem}>
                                        <Text style={styles.summaryLabel}>Diabetes:</Text>
                                        <Text style={styles.summaryValue}>
                                            {selectedDeclaration.diabetes ? 'Sim' : 'Não'}
                                        </Text>
                                    </View>

                                    {selectedDeclaration.description && (
                                        <View style={styles.descriptionContainer}>
                                            <Text style={styles.summaryLabel}>Descrição:</Text>
                                            <Text style={styles.descriptionText}>
                                                {selectedDeclaration.description}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                <Text style={styles.sectionTitleModal}>Laudo Médico:</Text>
                                <View style={styles.summaryContainer}>
                                    <View style={styles.summaryItem}>
                                        <Text style={styles.summaryLabel}>Possui laudo:</Text>
                                        <Text style={styles.summaryValue}>
                                            {selectedDeclaration.medicalReport ? 'Sim' : 'Não'}
                                        </Text>
                                    </View>
                                    {selectedDeclaration.medicalReport && (
                                        <>
                                            <View style={styles.summaryItem}>
                                                <Text style={styles.summaryLabel}>Data do laudo:</Text>
                                                <Text style={styles.summaryValue}>
                                                    {formatDate(selectedDeclaration.medicalReportDate)}
                                                </Text>
                                            </View>
                                            <View style={styles.summaryItem}>
                                                <Text style={styles.summaryLabel}>Expiração:</Text>
                                                <Text style={styles.summaryValue}>
                                                    {formatDate(selectedDeclaration.medicalReportExpiration)}
                                                </Text>
                                            </View>
                                        </>
                                    )}
                                </View>

                                <Text style={styles.sectionTitleModal}>Informações de Emergência:</Text>
                                <View style={styles.summaryContainer}>
                                    <View style={styles.summaryItem}>
                                        <Text style={styles.summaryLabel}>Contato:</Text>
                                        <Text style={[
                                            styles.summaryValue,
                                            !selectedDeclaration.emergencyContact && styles.summaryValueMissing,
                                        ]}>
                                            {selectedDeclaration.emergencyContact || 'Não informado'}
                                        </Text>
                                    </View>
                                    {selectedDeclaration.bloodType && (
                                        <View style={styles.summaryItem}>
                                            <Text style={styles.summaryLabel}>Tipo sanguíneo:</Text>
                                            <Text style={styles.summaryValue}>
                                                {selectedDeclaration.bloodType}
                                            </Text>
                                        </View>
                                    )}
                                    <View style={styles.summaryItem}>
                                        <Text style={styles.summaryLabel}>Plano de saúde:</Text>
                                        <Text style={styles.summaryValue}>
                                            {selectedDeclaration.healthInsurance ?
                                                (selectedDeclaration.healthInsuranceCompany || 'Sim') : 'Não'}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.buttonsContainer}>
                                    {selectedDeclaration.hasPdf && (
                                        <TouchableOpacity
                                            style={styles.downloadButton}
                                            onPress={() => handleDownloadPdf(selectedDeclaration)}
                                    accessibilityRole="button"
                                    accessibilityLabel="Baixar laudo médico"
                                            disabled={downloadingPdf === selectedDeclaration.id}
                                        >
                                            {downloadingPdf === selectedDeclaration.id ? (
                                                <ActivityIndicator color={colors.textWhite} size="small" />
                                            ) : (
                                                <>
                                                    <Feather name="download" size={20} color={colors.textWhite} />
                                                    <Text style={styles.downloadButtonText}>Baixar PDF</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    )}

                                    <TouchableOpacity
                                        style={styles.editButton}
                                        onPress={() => handleEditDeclaration(selectedDeclaration)}
                                    accessibilityRole="button"
                                    accessibilityLabel="Editar declaração"
                                    >
                                        <Feather name="edit" size={20} color={colors.textWhite} />
                                        <Text style={styles.editButtonText}>Editar</Text>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        </View>
                    </View>
                )}
            </Modal>

            {/* Modal de edição */}
            <HealthDeclarationModal
                visible={showEditModal}
                onClose={handleCloseEditModal}
                declarationData={editingDeclaration}
                userId={user?.id}
            />

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
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    message: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.textWhite,
        fontFamily: 'Nunito',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: 30,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginTop: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        color: colors.textWhite,
        fontFamily: 'Nunito',
        fontSize: 16,
    },
    filterSection: {
        marginTop: 20,
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        fontWeight: '600',
        marginBottom: 10,
    },
    statusFilterContainer: {
        flexDirection: 'row',
        gap: 10,
        paddingBottom: 5,
    },
    statusFilterButton: {
        paddingVertical: 8,
        paddingHorizontal: 15,
        backgroundColor: colors.backgroundCardBlack,
        borderRadius: 30,
    },
    activeStatusFilter: {
        backgroundColor: colors.textOrange,
    },
    statusFilterText: {
        color: colors.textWhite,
        fontFamily: 'Nunito',
        fontSize: 14,
    },
    listSection: {
        marginTop: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    infoButton: {
        padding: 5,
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 30,
    },
    loadingText: {
        color: colors.textGrey,
        fontFamily: 'Nunito',
        fontSize: 14,
        marginTop: 10,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 30,
    },
    emptyStateText: {
        color: colors.textGrey,
        fontFamily: 'Nunito',
        fontSize: 16,
        marginTop: 10,
    },
    declarationCard: {
        backgroundColor: colors.backgroundCardBlack,
        borderRadius: 30,
        padding: 16,
        marginBottom: 10,
    },
    declarationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    declarationName: {
        fontSize: 16,
        fontFamily: 'Nunito',
        color: colors.textOrange,
        fontWeight: 'bold',
    },
    pdfIndicatorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 165, 0, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    pdfIndicatorText: {
        fontSize: 10,
        fontFamily: 'Nunito',
        color: colors.textOrange,
        fontWeight: 'bold',
        marginLeft: 2,
    },
    statusBadge: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 30,
        marginLeft: 10,
    },
    statusBadgeText: {
        fontSize: 12,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        fontWeight: 'bold',
    },
    declarationDate: {
        fontSize: 14,
        fontFamily: 'Nunito',
        color: colors.textGrey,
        marginBottom: 10,
    },
    declarationSummary: {
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
    },
    summaryText: {
        fontSize: 14,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        lineHeight: 20,
    },
    extraSpace: {
        height: 100,
    },
    detailModalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    detailModalContainer: {
        width: '90%',
        backgroundColor: colors.backgroundCardBlack,
        borderRadius: 30,
        padding: 20,
        maxHeight: '85%',
    },
    detailUserName: {
        fontSize: 20,
        fontFamily: 'Nunito',
        color: colors.textOrange,
        fontWeight: 'bold',
        marginBottom: 5,
        marginTop: 30,
    },
    detailInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
    },
    detailUserContact: {
        fontSize: 14,
        fontFamily: 'Nunito',
        color: colors.textGrey,
    },
    sectionTitleModal: {
        fontSize: 16,
        fontFamily: 'Nunito',
        color: colors.textOrange,
        marginTop: 20,
        marginBottom: 10,
        fontWeight: 'bold',
    },
    summaryContainer: {
        backgroundColor: colors.backgroundBlack,
        borderRadius: 10,
        padding: 15,
    },
    summaryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    summaryLabel: {
        fontSize: 14,
        fontFamily: 'Nunito',
        color: colors.textGrey,
        flex: 1,
    },
    summaryValue: {
        fontSize: 14,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        flex: 1,
        textAlign: 'right',
    },
    summaryValueMissing: {
        color: colors.textOrange,
        fontStyle: 'italic',
    },
    statusReasonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 8,
    },
    statusReasonText: {
        flex: 1,
        fontSize: colors.fontP12,
        fontFamily: 'Nunito',
        color: colors.textOrange,
    },
    descriptionContainer: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
    },
    descriptionText: {
        fontSize: 14,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        marginTop: 5,
        lineHeight: 20,
    },
    buttonsContainer: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 20,
        marginBottom: 10,
    },
    downloadButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.textOrange,
        borderRadius: 35,
        padding: 15,
    },
    downloadButtonText: {
        color: colors.textWhite,
        fontFamily: 'Nunito',
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    editButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.backgroundBlack,
        borderRadius: 35,
        padding: 15,
        borderWidth: 1,
        borderColor: colors.textOrange,
    },
    editButtonText: {
        color: colors.textOrange,
        fontFamily: 'Nunito',
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    closeButton: {
        position: 'absolute',
        top: 15,
        right: 15,
        backgroundColor: colors.backgroundBlack,
        padding: 8,
        borderRadius: 50,
        zIndex: 1,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    listDownloadButton: {
        padding: 8,
        backgroundColor: 'rgba(255, 165, 0, 0.1)',
        borderRadius: 30,
        marginRight: 4,
    },
    detailHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
        marginTop: 30,
    },
    detailPdfBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 165, 0, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.textOrange,
    },
    detailPdfText: {
        fontSize: 12,
        fontFamily: 'Nunito',
        color: colors.textOrange,
        fontWeight: 'bold',
        marginLeft: 6,
    },
});