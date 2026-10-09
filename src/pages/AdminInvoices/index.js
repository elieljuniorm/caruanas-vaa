import React, { useContext, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
} from "react-native";
import * as Animatable from "react-native-animatable";
import { useFonts } from "expo-font";
import TabNavigator from "../../components/tabNavigator";
import Feather from "@expo/vector-icons/Feather";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { colors } from "../../styles/colors";
import { AuthContext } from "../../contexts/auth";

const STATUS_FILTERS = [
  { key: "ALL", label: "Todas" },
  { key: "PENDING", label: "Pendentes" },
  { key: "OVERDUE", label: "Atrasadas" },
  { key: "PAID", label: "Pagas" },
  { key: "CANCELED", label: "Canceladas" },
];

const STATUS_LABEL = {
  PENDING: "Pendente",
  PAID: "Paga",
  CANCELED: "Cancelada",
  OVERDUE: "Atrasada",
};

const STATUS_COLOR = {
  PENDING: "#F4A261",
  PAID: "#2A9D8F",
  CANCELED: "#9B9B9B",
  OVERDUE: "#E76F51",
};

const fmtMoney = (v) =>
  v == null
    ? "R$ 0,00"
    : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (s) => (s ? new Date(s).toLocaleDateString("pt-BR") : "—");

export default function AdminInvoices() {
  const { getAllInvoices, verifyPayment, cancelInvoice, getUser } = useContext(AuthContext);

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  // Distingue "não há faturas" de "não deu para carregar" — sem isso a lista vazia
  // por falha de rede parecia um clube sem faturas nenhuma.
  const [loadError, setLoadError] = useState(null);
  const [actingId, setActingId] = useState(null);
  const [usersCache, setUsersCache] = useState({});
  const [loadingUsers, setLoadingUsers] = useState({});

  const [fontsLoaded] = useFonts({
    Nunito: require("../../../assets/fonts/Nunito-Regular.ttf"),
    "Nunito-Bold": require("../../../assets/fonts/Nunito-Bold.ttf"),
  });

  // Função para buscar dados do usuário
  async function fetchUserData(userId) {
    if (!userId) return null;

    // Verifica se já temos o usuário em cache
    if (usersCache[userId]) {
      return usersCache[userId];
    }

    // Verifica se já está carregando este usuário
    if (loadingUsers[userId]) {
      return null;
    }

    setLoadingUsers(prev => ({ ...prev, [userId]: true }));

    try {
      const result = await getUser(userId);
      if (result.success && result.data) {
        setUsersCache(prev => ({
          ...prev,
          [userId]: result.data
        }));
        return result.data;
      }
    } catch (error) {
      console.error(`Erro ao buscar usuário ${userId}:`, error);
    } finally {
      setLoadingUsers(prev => ({ ...prev, [userId]: false }));
    }

    return null;
  }

  async function load() {
    setLoading(true);
    try {
      // A API resolve OVERDUE tanto no filtro quanto no status retornado — não há
      // mais peneira no cliente, que só enxergava a página atual da paginação.
      const params = {};
      if (statusFilter !== "ALL") {
        params.status = statusFilter;
      }
      const result = await getAllInvoices(params);
      if (result && result.success === false) {
        setLoadError(result.errors?.global || "Não foi possível carregar as faturas.");
        setInvoices([]);
        return;
      }
      setLoadError(null);
      const data = Array.isArray(result?.data) ? result.data : result?.data?.content || [];
      setInvoices(data);

      // Busca os dados de todos os usuários das faturas
      const uniqueUserIds = [...new Set(data.map(invoice => invoice.userId).filter(Boolean))];
      await Promise.all(uniqueUserIds.map(id => fetchUserData(id)));

    } catch (e) {
      console.error(e);
      setLoadError("Não foi possível carregar as faturas.");
      setInvoices([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  async function handleVerify(invoice) {
    setActingId(invoice.id);
    const result = await verifyPayment(invoice.id);
    setActingId(null);
    if (result?.success) {
      Alert.alert("Verificação", `Status atualizado: ${STATUS_LABEL[result.data?.status] || result.data?.status}`);
      load();
    } else {
      Alert.alert("Erro", result?.errors?.global || "Não foi possível verificar a fatura.");
    }
  }

  async function handleCancel(invoice) {
    Alert.alert(
      "Cancelar fatura",
      `Confirma o cancelamento da fatura #${invoice.id} (${fmtMoney(invoice.amount)})?`,
      [
        { text: "Manter", style: "cancel" },
        {
          text: "Cancelar fatura",
          style: "destructive",
          onPress: async () => {
            setActingId(invoice.id);
            const result = await cancelInvoice(invoice.id);
            setActingId(null);
            if (result?.success) {
              Alert.alert("Cancelada", "Fatura cancelada com sucesso.");
              load();
            } else {
              Alert.alert("Erro", result?.errors?.global || "Não foi possível cancelar.");
            }
          },
        },
      ]
    );
  }

  if (!fontsLoaded) return null;

  const renderItem = ({ item }) => {
    // A API já devolve OVERDUE; o cálculo local fica como rede de segurança para
    // faturas vindas de endpoints que não passam pelo effectiveStatus do backend.
    const effectiveStatus =
      item.status === "PENDING" && item.dueDate && new Date(item.dueDate) < new Date()
        ? "OVERDUE"
        : item.status;
    // Fatura atrasada é PENDING no banco: continua podendo ser verificada e
    // cancelada — é justamente a que mais precisa de ação.
    const canVerify = effectiveStatus === "PENDING" || effectiveStatus === "OVERDUE";
    const canCancel = canVerify || effectiveStatus === "PAID";

    // Busca os dados do usuário
    const userData = usersCache[item.userId];
    const userName = userData?.nome || userData?.name || userData?.fullName || `ID: ${item.userId}`;
    const userEmail = userData?.email || '';
    const userPhone = userData?.phone || userData?.telefone || '';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.classNameContainer}>
            <Feather name="file-text" size={18} color={colors.textOrange} />
            <Text style={styles.className}>Fatura #{item.id}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLOR[effectiveStatus]}20` }]}>
            <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[effectiveStatus] }]} />
            <Text style={[styles.statusText, { color: STATUS_COLOR[effectiveStatus] }]}>
              {STATUS_LABEL[effectiveStatus] || effectiveStatus}
            </Text>
          </View>
        </View>

        <Text style={styles.amount}>{fmtMoney(item.amount)}</Text>
        <Text style={styles.description}>{item.description}</Text>

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Feather name="user" size={16} color={colors.textWhite} />
              <Text style={styles.detailLabel}>Aluno:</Text>
              <Text style={styles.detailValue}>
                {loadingUsers[item.userId] ? (
                  <Text style={styles.loadingText}>Carregando...</Text>
                ) : (
                  userName
                )}
              </Text>
            </View>
          </View>

          {userEmail && (
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Feather name="mail" size={16} color={colors.textWhite} />
                <Text style={styles.detailLabel}>Email:</Text>
                <Text style={styles.detailValue}>{userEmail}</Text>
              </View>
            </View>
          )}

          {userPhone && (
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Feather name="phone" size={16} color={colors.textWhite} />
                <Text style={styles.detailLabel}>Telefone:</Text>
                <Text style={styles.detailValue}>{userPhone}</Text>
              </View>
            </View>
          )}

          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <FontAwesome name="calendar" size={16} color={colors.textWhite} />
              <Text style={styles.detailLabel}>Vencimento:</Text>
              <Text style={styles.detailValue}>{fmtDate(item.dueDate)}</Text>
            </View>
          </View>

          {item.paymentDate && (
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Feather name="check-circle" size={16} color={colors.textGreen} />
                <Text style={styles.detailLabel}>Pago em:</Text>
                <Text style={styles.detailValue}>{fmtDate(item.paymentDate)}</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          {canVerify && (
            <TouchableOpacity
              style={[styles.actionButton, styles.verifyButton, actingId === item.id && styles.actionButtonDisabled]}
              disabled={actingId === item.id}
              onPress={() => handleVerify(item)}
              accessibilityRole="button"
              accessibilityLabel="Verificar pagamento desta fatura"
              accessibilityState={{ disabled: actingId === item.id, busy: actingId === item.id }}
            >
              <Feather name="check-circle" size={16} color={colors.textWhite} />
              <Text style={styles.actionButtonText}>
                {actingId === item.id ? "Verificando..." : "Verificar"}
              </Text>
            </TouchableOpacity>
          )}
          {canCancel && (
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton, actingId === item.id && styles.actionButtonDisabled]}
              disabled={actingId === item.id}
              onPress={() => handleCancel(item)}
              accessibilityRole="button"
              accessibilityLabel="Cancelar esta fatura"
              accessibilityState={{ disabled: actingId === item.id, busy: actingId === item.id }}
            >
              <Feather name="x-circle" size={16} color={colors.textWhite} />
              <Text style={styles.actionButtonText}>Cancelar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Animatable.View animation="fadeInLeft" delay={500} style={styles.containerHeader}>
        <Text style={styles.message}>Faturas</Text>
      </Animatable.View>

      <Animatable.View animation="fadeInUp" style={styles.containerForm}>
        <View style={styles.headerSection}>
          <Text style={styles.title}>Gerenciar Faturas</Text>
          <Text style={styles.subtitle}>Gerencie todas as faturas do clube</Text>
        </View>

        <View style={styles.filtersContainer}>
          <FlatList
            data={STATUS_FILTERS}
            keyExtractor={(f) => f.key}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersList}
            renderItem={({ item }) => {
              const active = statusFilter === item.key;
              return (
                <TouchableOpacity
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setStatusFilter(item.key)}
                  accessibilityRole="button"
                  accessibilityLabel={`Filtrar por ${item.label}`}
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingContent}>
              <MaterialIcons name="receipt" size={50} color={colors.textOrange} />
              <Text style={styles.loadingText}>Carregando faturas...</Text>
            </View>
          </View>
        ) : loadError ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <MaterialIcons name="cloud-off" size={60} color={colors.textOrange} />
            </View>
            <Text style={styles.emptyTitle}>Não foi possível carregar</Text>
            <Text style={styles.emptySubText}>{loadError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={load}
                        accessibilityRole="button"
                        accessibilityLabel="Tentar carregar novamente">
              <Feather name="refresh-cw" size={16} color={colors.textWhite} />
              <Text style={styles.retryButtonText}>Tentar de novo</Text>
            </TouchableOpacity>
          </View>
        ) : invoices.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <FontAwesome name="inbox" size={60} color={colors.textWhite} />
            </View>
            <Text style={styles.emptyTitle}>Nenhuma fatura encontrada</Text>
            <Text style={styles.emptySubText}>
              Não há faturas registradas no momento.
            </Text>
          </View>
        ) : (
          <FlatList
            data={invoices}
            keyExtractor={(it) => String(it.id)}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.textOrange}
              />
            }
          />
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
  filtersContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  filtersList: {
    paddingHorizontal: 4,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.textWhiteTransparent,
    marginRight: 10,
    backgroundColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: colors.textOrange,
    borderColor: colors.textOrange,
  },
  filterText: {
    color: colors.textWhite,
    fontFamily: 'Nunito',
    fontSize: 13,
  },
  filterTextActive: {
    color: colors.textWhite,
    fontFamily: 'Nunito-Bold',
  },
  listContent: {
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
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyIcon: {
    marginBottom: 20,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 18,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 30,
    backgroundColor: colors.backgroundOrange,
  },
  retryButtonText: {
    color: colors.textWhite,
    fontFamily: "Nunito-Bold",
    fontSize: colors.fontP14,
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
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
  amount: {
    fontSize: 24,
    fontFamily: 'Nunito-Bold',
    color: colors.textOrange,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: colors.textGrey,
    fontFamily: 'Nunito',
    marginBottom: 16,
    lineHeight: 20,
  },
  cardDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
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
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  verifyButton: {
    backgroundColor: colors.textGreen,
  },
  cancelButton: {
    backgroundColor: '#E76F51',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: colors.textWhite,
    fontFamily: 'Nunito',
    fontSize: 13,
    fontWeight: '600',
  },
});