import React, { useContext, useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as Animatable from "react-native-animatable";
import { useFonts } from "expo-font";
import Feather from "@expo/vector-icons/Feather";
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { API_URL } from "@env";
import { colors } from "../../styles/colors";
import { AuthContext } from "../../contexts/auth";
import { apiFetch } from "../../utils/apiFetch";

const fmtDateTime = (s) => (s ? new Date(s).toLocaleString("pt-BR") : "—");

export default function Invites() {
  const { token, user, acceptInvite } = useContext(AuthContext);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(null);

  const [fontsLoaded] = useFonts({
    Nunito: require("../../../assets/fonts/Nunito-Regular.ttf"),
    "Nunito-Bold": require("../../../assets/fonts/Nunito-Bold.ttf"),
  });

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await apiFetch(`${API_URL}/v1/checkin/invites/me`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) setInvites(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    load();
  }, [load]);

  async function handleAccept(invite) {
    setAccepting(invite.inviteId);
    const result = await acceptInvite(invite.inviteId, { userId: user?.id });
    setAccepting(null);
    if (result?.success || result?.checkinId) {
      Alert.alert("Convite aceito", "Você está confirmado nessa aula!");
      load();
    } else {
      Alert.alert("Erro", result?.errors?.global || "Não foi possível aceitar o convite.");
    }
  }

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      <Animatable.View animation='fadeInLeft' delay={500} style={styles.containerHeader}>
        <Text style={styles.message}>Convites</Text>
      </Animatable.View>

      <Animatable.View animation='fadeInUp' style={styles.containerForm}>
        <View style={styles.headerSection}>
          <Text style={styles.title}>Aulas disponíveis para você</Text>
          <Text style={styles.subtitle}>Aulas com vagas que abriram pra você</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingContent}>
              <MaterialIcons name="rowing" size={50} color={colors.textOrange} />
              <Text style={styles.loadingText}>Carregando convites...</Text>
            </View>
          </View>
        ) : invites.length === 0 ? (
          <ScrollView
            contentContainerStyle={styles.emptyScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <FontAwesome name="inbox" size={60} color={colors.textWhite} />
              </View>
              <Text style={styles.emptyTitle}>Nenhum convite ativo</Text>
              <Text style={styles.emptySubText}>
                Quando uma vaga abrir em uma aula da fila, o convite aparecerá aqui.
              </Text>
            </View>
          </ScrollView>
        ) : (
          <FlatList
            data={invites}
            keyExtractor={(it) => String(it.inviteId)}
            style={styles.flatList}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.classNameContainer}>
                    <Feather name="mail" size={18} color={colors.textOrange} />
                    <Text style={styles.className}>{item.className || "Aula"}</Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>Disponível</Text>
                  </View>
                </View>

                <View style={styles.cardDetails}>
                  <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                      <Feather name="calendar" size={16} color={colors.textWhite} />
                      <Text style={styles.detailLabel}>Aula em:</Text>
                      <Text style={styles.detailValue}>{fmtDateTime(item.startAt)}</Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                      <Feather name="clock" size={16} color={colors.textWhite} />
                      <Text style={styles.detailLabel}>Expira em:</Text>
                      <Text style={styles.detailValue}>{fmtDateTime(item.expiresAt)}</Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.acceptButton,
                    accepting === item.inviteId && styles.acceptButtonDisabled,
                  ]}
                  disabled={accepting === item.inviteId}
                  onPress={() => handleAccept(item)}
                  accessibilityRole="button"
                  // A lista tem um botão por convite; o nome da turma distingue
                  // qual vaga está sendo aceita.
                  accessibilityLabel={`Aceitar vaga na turma ${item.className || ''}`.trim()}
                  accessibilityState={{
                    disabled: accepting === item.inviteId,
                    busy: accepting === item.inviteId,
                  }}
                >
                  <Feather name="check-circle" size={18} color={colors.textWhite} />
                  <Text style={styles.acceptButtonText}>
                    {accepting === item.inviteId ? "Aceitando..." : "Aceitar Vaga"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </Animatable.View>
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
    paddingBottom: '5%',
  },
  message: {
    fontSize: colors.fontP28,
    fontWeight: 'bold',
    color: colors.textWhite,
    fontFamily: 'Nunito',
    paddingLeft: 10,
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
    marginBottom: 10,
  },
  flatList: {
    flex: 1,
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
  emptyScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  emptyIcon: {
    marginBottom: 25,
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
    marginBottom: 30,
  },
  suggestionCard: {
    backgroundColor: colors.backgroundCardBlack,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textWhite,
    fontFamily: 'Nunito',
    marginTop: 15,
    marginBottom: 12,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  suggestionText: {
    fontSize: 14,
    color: colors.textWhite,
    fontFamily: 'Nunito',
    marginLeft: 10,
    flex: 1,
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
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textGreen,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: colors.textGreen,
    fontFamily: 'Nunito',
    fontWeight: '600',
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
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.textOrange,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 10,
  },
  acceptButtonDisabled: {
    opacity: 0.5,
  },
  acceptButtonText: {
    color: colors.textWhite,
    fontFamily: 'Nunito',
    fontSize: 15,
    fontWeight: '600',
  },
});