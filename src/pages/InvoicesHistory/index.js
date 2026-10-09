import React, { useState, useContext, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View, RefreshControl } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { useFonts } from 'expo-font';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors } from '../../styles/colors';
import TabNavigator from '../../components/tabNavigator';
import { AuthContext } from '../../contexts/auth';

// A API marca a fatura vencida como OVERDUE na resposta (o banco guarda PENDING).
// A comparação de data fica como rede de segurança para respostas mais antigas.
const isOverdue = (invoice) =>
    invoice.status === 'OVERDUE' ||
    (invoice.status === 'PENDING' && invoice.dueDate && new Date(invoice.dueDate) < new Date());

const STATUS_LABEL = {
    PENDING: 'Pendente',
    PAID: 'Pago',
    CANCELED: 'Cancelada',
};

const formatAmount = (amount) => {
    if (amount == null) return '';
    return Number(amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
};

const formatFullDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function InvoicesHistory() {
    const { user, getInvoicesByUser } = useContext(AuthContext);

    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [fontsLoaded] = useFonts({
        'Nunito': require('../../../assets/fonts/Nunito-Regular.ttf'),
        'Nunito-Bold': require('../../../assets/fonts/Nunito-Bold.ttf'),
    });

    const loadInvoices = async () => {
        if (!user?.id) return;
        const result = await getInvoicesByUser(user.id);
        if (result?.success && result.data) {
            const sorted = [...result.data].sort(
                (a, b) => new Date(b.dueDate) - new Date(a.dueDate)
            );
            setInvoices(sorted);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadInvoices();
        setRefreshing(false);
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await loadInvoices();
            setLoading(false);
        };
        init();
    }, [user?.id]);

    if (!fontsLoaded) return null;

    return (
        <View style={styles.container}>
            <Animatable.View animation='fadeInLeft' delay={500} style={styles.containerHeader}>
                <Text style={styles.message}>Histórico</Text>
            </Animatable.View>

            <Animatable.View animation='fadeInUp' style={styles.containerForm}>
                <View style={styles.headerSection}>
                    <Text style={styles.title}>Histórico de Pagamentos</Text>
                    <Text style={styles.subtitle}>
                        {invoices.length > 0
                            ? `Total de ${invoices.length} fatura${invoices.length > 1 ? 's' : ''} registrada${invoices.length > 1 ? 's' : ''}`
                            : 'Nenhuma fatura encontrada'}
                    </Text>
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.textOrange}
                        />
                    }
                >
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <View style={styles.loadingContent}>
                                <MaterialIcons name="receipt" size={50} color={colors.textOrange} />
                                <Text style={styles.loadingText}>Carregando histórico...</Text>
                            </View>
                        </View>
                    ) : invoices.length > 0 ? (
                        invoices.map((invoice) => {
                            const overdue = isOverdue(invoice);
                            const getStatusColor = () => {
                                if (overdue) return '#FF453A';
                                switch (invoice.status) {
                                    case 'PAID': return colors.textGreen;
                                    case 'CANCELED': return colors.textGrey;
                                    default: return colors.textOrange;
                                }
                            };
                            const getStatusText = () => {
                                if (overdue) return 'Atrasada';
                                return STATUS_LABEL[invoice.status] || invoice.status;
                            };
                            return (
                                <View key={invoice.id} style={styles.card}>
                                    <View style={styles.cardHeader}>
                                        <View style={styles.classNameContainer}>
                                            <Feather name="credit-card" size={18} color={colors.textOrange} />
                                            <Text style={styles.className}>
                                                {formatDate(invoice.dueDate)}
                                            </Text>
                                        </View>
                                        <View style={[styles.statusBadge, overdue && styles.statusBadgeOverdue]}>
                                            <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
                                            <Text style={[styles.statusText, { color: getStatusColor() }]}>
                                                {getStatusText()}
                                            </Text>
                                        </View>
                                    </View>

                                    <Text style={styles.invoiceDescription}>{invoice.description}</Text>

                                    <View style={styles.cardDetails}>
                                        <View style={styles.detailRow}>
                                            <View style={styles.detailItem}>
                                                <FontAwesome name="calendar" size={16} color={colors.textWhite} />
                                                <Text style={styles.detailLabel}>Vencimento:</Text>
                                                <Text style={styles.detailValue}>{formatFullDate(invoice.dueDate)}</Text>
                                            </View>
                                        </View>

                                        <View style={styles.detailRow}>
                                            <View style={styles.detailItem}>
                                                <FontAwesome name="money" size={16} color={colors.textWhite} />
                                                <Text style={styles.detailLabel}>Valor:</Text>
                                                <Text style={[styles.detailValue, styles.amountHighlight]}>
                                                    {formatAmount(invoice.amount)}
                                                </Text>
                                            </View>
                                        </View>

                                        {invoice.status === 'PAID' && invoice.paidAt && (
                                            <View style={styles.detailRow}>
                                                <View style={styles.detailItem}>
                                                    <Feather name="check-circle" size={16} color={colors.textGreen} />
                                                    <Text style={styles.detailLabel}>Pago em:</Text>
                                                    <Text style={styles.detailValue}>
                                                        {new Date(invoice.paidAt).toLocaleDateString('pt-BR')}
                                                    </Text>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            );
                        })
                    ) : (
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIcon}>
                                <FontAwesome name="inbox" size={60} color={colors.textWhite} />
                            </View>
                            <Text style={styles.emptyTitle}>Nenhuma fatura encontrada</Text>
                            <Text style={styles.emptySubText}>
                                Não há faturas registradas no momento.
                            </Text>
                        </View>
                    )}

                    <View style={styles.bottomSpace} />
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
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        overflow: 'hidden',
    },
    message: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.textWhite,
        fontFamily: 'Nunito-Bold',
    },
    headerSection: {
        paddingHorizontal: 20,
        paddingTop: 25,
        paddingBottom: 15,
        alignItems: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.textWhite,
        fontFamily: 'Nunito',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: colors.textWhiteTransparent,
        fontFamily: 'Nunito',
        textAlign: 'center',
        lineHeight: 20,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 100,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 50,
    },
    loadingContent: {
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: colors.textWhite,
        fontFamily: 'Nunito',
        marginTop: 15,
    },
    card: {
        backgroundColor: colors.backgroundCardBlack,
        borderRadius: 16,
        padding: 20,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    classNameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    className: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textWhite,
        fontFamily: 'Nunito',
        marginLeft: 8,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusBadgeOverdue: {
        backgroundColor: 'rgba(255, 69, 58, 0.15)',
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    statusText: {
        fontSize: 12,
        fontFamily: 'Nunito',
        fontWeight: '600',
    },
    invoiceDescription: {
        fontSize: 14,
        color: colors.textGrey,
        fontFamily: 'Nunito',
        marginBottom: 16,
        lineHeight: 20,
    },
    cardDetails: {
        marginBottom: 0,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    detailLabel: {
        fontSize: 13,
        color: colors.textWhiteTransparent,
        fontFamily: 'Nunito',
        marginLeft: 8,
        marginRight: 4,
    },
    detailValue: {
        fontSize: 13,
        color: colors.textWhite,
        fontFamily: 'Nunito',
        fontWeight: '600',
    },
    amountHighlight: {
        fontSize: 16,
        color: colors.textOrange,
        fontWeight: 'bold',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 30,
    },
    emptyIcon: {
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.textWhite,
        fontFamily: 'Nunito',
        textAlign: 'center',
        marginBottom: 12,
    },
    emptySubText: {
        fontSize: 14,
        color: colors.textWhiteTransparent,
        fontFamily: 'Nunito',
        textAlign: 'center',
        lineHeight: 22,
    },
    bottomSpace: {
        height: 20,
    },
});