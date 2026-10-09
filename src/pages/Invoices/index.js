import React, { useContext, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity, Image, Alert, RefreshControl, Linking } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { useNavigation } from '@react-navigation/native';
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
    if (amount == null) return 'R$ 0,00';
    return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
};

export default function Invoices() {
    const navigation = useNavigation();
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
        if (result.success) {
            setInvoices(result.data || []);
        }
    };

    const loadData = async () => {
        setLoading(true);
        await loadInvoices();
        setLoading(false);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadInvoices();
        setRefreshing(false);
    };

    useEffect(() => {
        loadData();
    }, [user?.id]);

    const openPaymentLink = async (invoice) => {
        try {
            const gateway = invoice.gatewayData ? JSON.parse(invoice.gatewayData) : null;
            const url = gateway?.ticketUrl;
            if (!url) {
                Alert.alert('Indisponível', 'Link de pagamento não disponível para esta fatura.');
                return;
            }
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                Alert.alert('Erro', 'Não foi possível abrir o link de pagamento.');
            }
        } catch {
            Alert.alert('Erro', 'Erro ao processar link de pagamento.');
        }
    };

    if (!fontsLoaded) return null;

    const pendentes = invoices.filter((inv) => inv.status === 'PENDING');

    return (
        <View style={styles.container}>
            <Animatable.View animation='fadeInLeft' delay={500} style={styles.containerHeader}>
                <Text style={styles.message}>Faturas</Text>
            </Animatable.View>

            <Animatable.View animation='fadeInUp' style={styles.containerForm}>
                <View style={styles.headerSection}>
                    <Text style={styles.title}>Pagamentos Pendentes</Text>
                    <Text style={styles.subtitle}>
                        {pendentes.length > 0
                            ? `Você tem ${pendentes.length} fatura${pendentes.length > 1 ? 's' : ''} em aberto`
                            : 'Todas as faturas estão em dia'}
                    </Text>
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textOrange} />
                    }
                >
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <View style={styles.loadingContent}>
                                <MaterialIcons name="attach-money" size={50} color={colors.textOrange} />
                                <Text style={styles.loadingText}>Carregando faturas...</Text>
                            </View>
                        </View>
                    ) : pendentes.length > 0 ? (
                        pendentes.map((invoice) => {
                            const overdue = isOverdue(invoice);
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
                                            <View style={[styles.statusDot, overdue && styles.statusDotOverdue]} />
                                            <Text style={[styles.statusText, overdue && styles.statusTextOverdue]}>
                                                {overdue ? 'Atrasada' : (STATUS_LABEL[invoice.status] || invoice.status)}
                                            </Text>
                                        </View>
                                    </View>

                                    <Text style={styles.invoiceDescription}>{invoice.description}</Text>

                                    <View style={styles.cardDetails}>
                                        <View style={styles.detailRow}>
                                            <View style={styles.detailItem}>
                                                <FontAwesome name="calendar" size={16} color={colors.textWhite} />
                                                <Text style={styles.detailLabel}>Vencimento:</Text>
                                                <Text style={styles.detailValue}>{formatDate(invoice.dueDate)}</Text>
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
                                    </View>

                                    <TouchableOpacity
                                        style={[styles.payButton, overdue && styles.payButtonOverdue]}
                                        onPress={() => openPaymentLink(invoice)}
                                        accessibilityRole="button"
                                        // Há um botão por fatura: sem o valor no rótulo,
                                        // o leitor anuncia vários "Pagar Agora" iguais.
                                        accessibilityLabel={`${overdue ? 'Regularizar pagamento' : 'Pagar agora'}, fatura de ${formatAmount(invoice.amount)}`}
                                    >
                                        <Feather name="credit-card" size={18} color={colors.textWhite} />
                                        <Text style={styles.payButtonText}>
                                            {overdue ? 'Regularizar Pagamento' : 'Pagar Agora'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            );
                        })
                    ) : (
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIcon}>
                                <FontAwesome name="check-circle" size={60} color={colors.textGreen} />
                            </View>
                            <Text style={styles.emptyTitle}>Tudo em dia!</Text>
                            <Text style={styles.emptySubText}>
                                Não há faturas pendentes. Consulte o histórico para ver seus pagamentos.
                            </Text>
                        </View>
                    )}

                    <View style={styles.divider} />

                    <TouchableOpacity
                        style={styles.buttonHistory}
                        onPress={() => navigation.navigate('InvoicesHistory')}
                        accessibilityRole="button"
                        accessibilityLabel="Histórico de pagamentos"
                    >
                        <Text style={styles.titleHistory}>Histórico de Pagamentos</Text>
                        <Image source={require('../../../assets/icons/double-arrow-up.png')} />
                    </TouchableOpacity>

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
        backgroundColor: 'rgba(76, 217, 100, 0.15)',
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
        backgroundColor: colors.textGreen,
        marginRight: 6,
    },
    statusDotOverdue: {
        backgroundColor: '#FF453A',
    },
    statusText: {
        fontSize: 12,
        color: colors.textGreen,
        fontFamily: 'Nunito',
        fontWeight: '600',
    },
    statusTextOverdue: {
        color: '#FF453A',
    },
    invoiceDescription: {
        fontSize: 14,
        color: colors.textGrey,
        fontFamily: 'Nunito',
        marginBottom: 16,
        lineHeight: 20,
    },
    cardDetails: {
        marginBottom: 20,
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
    payButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.textOrange,
        paddingVertical: 12,
        borderRadius: 10,
        gap: 10,
    },
    payButtonOverdue: {
        backgroundColor: '#FF453A',
    },
    payButtonText: {
        color: colors.textWhite,
        fontFamily: 'Nunito',
        fontSize: 15,
        fontWeight: '600',
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
    divider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        marginVertical: 20,
    },
    buttonHistory: {
        alignItems: 'center',
        margin: '10%',
    },
    titleHistory: {
        color: colors.textWhiteTransparent,
        fontWeight: 'bold',
        fontSize: colors.fontP20,
        fontFamily: 'Nunito',
    },
    bottomSpace: {
        height: 20,
    },
});