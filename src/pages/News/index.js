import React, { useState, useEffect, useContext } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Image,
  Modal,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from "react-native";
import * as Animatable from "react-native-animatable";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { useFonts } from "expo-font";
import { colors } from "../../styles/colors";
import TabNavigator from "../../components/tabNavigator";
import NewsCarousel from "../../components/newsCarousel";
import { AntDesign } from "@expo/vector-icons";
import { AuthContext } from "../../contexts/auth";
import Feather from "@expo/vector-icons/Feather";

export default function News() {
  const [fontsLoaded] = useFonts({
    Nunito: require("../../../assets/fonts/Nunito-Regular.ttf"),
  });
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [editingNews, setEditingNews] = useState(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Estados para o modal de edição
  const [editTitle, setEditTitle] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editImage, setEditImage] = useState(null);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [editResponse, setEditResponse] = useState(null);

  const { getAllNews, news, updateNews, deleteNews, hasRole } = useContext(AuthContext);

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    setLoading(true);
    await getAllNews();
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await getAllNews();
    setRefreshing(false);
  };

  const openNewsModal = (item) => {
    setSelectedSubject(item);
  };

  const closeNewsModal = () => {
    setSelectedSubject(null);
  };

  const openEditModal = (item) => {
    setEditingNews(item);
    setEditTitle(item.title);
    setEditSummary(item.summary);
    setEditContent(item.content);
    setEditImage(item.image);
    setIsEditModalVisible(true);
    setEditResponse(null);
  };

  const closeEditModal = () => {
    setIsEditModalVisible(false);
    setEditingNews(null);
    setEditTitle("");
    setEditSummary("");
    setEditContent("");
    setEditImage(null);
    setEditResponse(null);
  };

  const pickImage = async () => {
    try {
      // Solicitar permissões
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permissão necessária",
          "Precisamos de acesso à sua galeria para selecionar uma imagem."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uri = asset.uri;

        // Verificar extensão
        const fileExtension = uri.toLowerCase().split('.').pop();
        const allowedExtensions = ['jpg', 'jpeg', 'png'];

        if (!allowedExtensions.includes(fileExtension)) {
          Alert.alert(
            "Formato não suportado",
            "Por favor, selecione apenas imagens JPG ou PNG."
          );
          return;
        }

        // Converter para base64
        try {
          const base64Data = await FileSystem.readAsStringAsync(uri, {
            encoding: 'base64',
          });

          // Determinar MIME type
          let mimeType = 'image/jpeg';
          if (fileExtension === 'png') {
            mimeType = 'image/png';
          }

          setEditImage(`data:${mimeType};base64,${base64Data}`);
        } catch (conversionError) {
          console.error("Erro na conversão:", conversionError);
          // Se falhar a conversão, use a URI normal
          setEditImage(uri);
        }
      }
    } catch (error) {
      console.error("Erro ao selecionar imagem:", error);
      Alert.alert(
        "Erro",
        "Não foi possível selecionar a imagem. Tente novamente."
      );
    }
  };

  const handleSaveEdit = async () => {
    // Validação
    if (!editTitle.trim() || !editSummary.trim() || !editContent.trim()) {
      setEditResponse({
        success: false,
        errors: { global: "Preencha todos os campos obrigatórios" },
      });
      return;
    }

    if (!editImage && !editingNews?.image) {
      setEditResponse({
        success: false,
        errors: { global: "Selecione uma imagem" },
      });
      return;
    }

    setIsEditLoading(true);
    setEditResponse(null);

    try {
      const newsData = {
        id: editingNews.id,
        title: editTitle.trim(),
        summary: editSummary.trim(),
        content: editContent.trim(),
        image: editImage || editingNews.image,
      };

      const result = await updateNews(editingNews.id, newsData);

      if (result?.success) {
        setEditResponse({
          success: true,
          message: "Notícia atualizada com sucesso!",
        });

        setTimeout(() => {
          closeEditModal();
          loadNews();
        }, 1500);
      } else {
        setEditResponse({
          success: false,
          errors: {
            global: result?.errors?.global || "Erro ao atualizar notícia",
          },
        });
      }
    } catch (error) {
      console.error("Erro na atualização:", error);
      setEditResponse({
        success: false,
        errors: {
          global: "Erro de conexão. Verifique sua internet e tente novamente.",
        },
      });
    } finally {
      setIsEditLoading(false);
    }
  };

  const handleDeleteNews = (item) => {
    Alert.alert(
      "Confirmar Exclusão",
      "Tem certeza que deseja excluir esta notícia? Esta ação não pode ser desfeita.",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            await deleteNews(item.id);
            loadNews();
          },
        },
      ]
    );
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.textOrange} />
      </View>
    );
  }

  const getImageSource = (item) => {
    if (item?.image) {
      // Verifica imagem
      if (item.image.startsWith('data:image') || item.image.startsWith('http')) {
        return { uri: item.image };
      }
      // Se não tiver prefixo, assume que é um caminho local
      return { uri: item.image };
    }
    return require("../../../assets/splash.png");
  };

  const renderNewsItem = ({ item }) => (
    <TouchableOpacity
      style={styles.newsCard}
      onPress={() => openNewsModal(item)}
                        accessibilityRole="button"
                        accessibilityLabel={`Notícia: ${item.title}`}
      activeOpacity={0.8}
    >
      <View style={styles.newsCardHeader}>
        <Text style={styles.newsId}>ID: {item.id}</Text>
        {hasRole("Administrador") && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              accessibilityRole="button"
              accessibilityLabel={`Editar notícia ${item.title}`}
              onPress={(e) => {
                e.stopPropagation();
                openEditModal(item);
              }}
              activeOpacity={0.7}
            >
              <AntDesign name="edit" size={18} color={colors.textWhite} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              accessibilityRole="button"
              accessibilityLabel={`Excluir notícia ${item.title}`}
              onPress={(e) => {
                e.stopPropagation();
                handleDeleteNews(item);
              }}
              activeOpacity={0.7}
            >
              <AntDesign name="delete" size={18} color={colors.textWhite} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Image
        source={getImageSource(item)}
        style={styles.newsImage}
        defaultSource={require("../../../assets/splash.png")}
      />
      <View style={styles.newsContent}>
        <Text style={styles.newsTitle} numberOfLines={2}>
          {item.title || "Sem título"}
        </Text>
        <Text style={styles.newsSummary} numberOfLines={3}>
          {item.summary ||
            (item.content
              ? item.content.substring(0, 100) + "..."
              : "Sem resumo")}
        </Text>
        <View style={styles.newsFooter}>
          <Feather
            name="calendar"
            size={14}
            color={colors.textWhiteTransparent}
          />
          <Text style={styles.newsDate}>Publicado recentemente</Text>
          <Feather
            name="arrow-right"
            size={16}
            color={colors.textOrange}
            style={styles.arrowIcon}
          />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar
        backgroundColor={colors.backgroundOrange}
        barStyle="light-content"
      />

      <Animatable.View
        animation="fadeInLeft"
        delay={500}
        style={styles.containerHeader}
      >
        <Text style={styles.message}>Notícias</Text>
      </Animatable.View>

      <Animatable.View animation="fadeInUp" style={styles.containerForm}>
        <ScrollView
          style={styles.mainScrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.textOrange]}
              tintColor={colors.textOrange}
            />
          }
        >
          <View style={styles.headerSection}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>Caruanas em Destaque</Text>
              <Text style={styles.subtitle}>
                Aqui na Caruanas, cada remada é uma nova aventura. Acompanhe as
                novidades e faça parte desse movimento!
              </Text>
            </View>
          </View>

          <View style={styles.carouselContainer}>
            <NewsCarousel />
          </View>

          <View style={styles.recentNewsSection}>
            <View style={styles.sectionHeader}>
              <Feather name="file-text" size={20} color={colors.textWhite} />
              <Text style={styles.sectionTitle}>Matérias Recentes</Text>
            </View>

            {loading && !refreshing ? (
              <View style={styles.loadingSection}>
                <ActivityIndicator size="large" color={colors.textOrange} />
                <Text style={styles.loadingText}>Carregando notícias...</Text>
              </View>
            ) : news.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIcon}>
                  <AntDesign
                    name="frown"
                    size={50}
                    color={colors.textWhiteTransparent}
                  />
                </View>
                <Text style={styles.emptyTitle}>
                  Nenhuma notícia encontrada
                </Text>
                <Text style={styles.emptySubtitle}>
                  Não há notícias disponíveis no momento. Tente novamente mais
                  tarde.
                </Text>
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={onRefresh}
                        accessibilityRole="button"
                        accessibilityLabel="Atualizar notícias"
                  activeOpacity={0.7}
                >
                  <AntDesign name="reload" size={18} color={colors.textWhite} />
                  <Text style={styles.refreshText}>Recarregar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.newsListContainer}>
                <FlatList
                  data={news}
                  renderItem={renderNewsItem}
                  keyExtractor={(item) => item.id.toString()}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
              </View>
            )}
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </Animatable.View>

      {/* Modal para mostrar notícia completa */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={!!selectedSubject}
        onRequestClose={closeNewsModal}
        statusBarTranslucent={true}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={closeNewsModal}
            // Área de toque fora do modal: existe para fechar, mas anunciá-la
            // atrapalharia a navegação por leitor — que já tem o botão Fechar.
            accessibilityElementsHidden
            importantForAccessibility="no"
            accessibilityLabel="Fechar notícia"
          />

          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={closeNewsModal}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Fechar notícia"
            >
              <AntDesign name="close" size={24} color={colors.textWhite} />
            </TouchableOpacity>

            <ScrollView
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={false}
              bounces={true}
            >
              <Image
                source={getImageSource(selectedSubject)}
                style={styles.modalImage}
                defaultSource={require("../../../assets/splash.png")}
              />

              <View style={styles.modalTextContent}>
                <Text style={styles.modalTitle}>
                  {selectedSubject?.title || "Sem título"}
                </Text>

                <View style={styles.modalMeta}>
                  <Feather
                    name="calendar"
                    size={16}
                    color={colors.textWhiteTransparent}
                  />
                  <Text style={styles.modalDate}>Publicado recentemente</Text>
                </View>

                <Text style={styles.modalContentText}>
                  {selectedSubject?.content ||
                    selectedSubject?.summary ||
                    "Conteúdo não disponível"}
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de Edição de Notícia - Somente para Administrador */}
      {hasRole("Administrador") && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={isEditModalVisible}
          onRequestClose={closeEditModal}
          statusBarTranslucent={true}
        >
          <KeyboardAvoidingView
            style={styles.editModalContainer}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
          >
            <TouchableOpacity
              style={styles.editModalOverlay}
              activeOpacity={1}
              onPress={closeEditModal}
              accessibilityElementsHidden
              importantForAccessibility="no"
              accessibilityLabel="Fechar edição"
            />

            <View style={styles.editModalContent}>
              <View style={styles.editModalHeader}>
                <Text style={styles.editModalTitle}>Editar Notícia</Text>
                <TouchableOpacity
                  style={styles.editCloseButton}
                  onPress={closeEditModal}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Fechar edição da notícia"
                >
                  <AntDesign name="close" size={24} color={colors.textWhite} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.editModalScrollView}
                contentContainerStyle={styles.editScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.editFormSection}>
                  <Text style={styles.editLabel}>Título *</Text>
                  <View style={styles.editInputContainer}>
                    <AntDesign
                      name="edit"
                      size={20}
                      color={colors.textOrange}
                      style={styles.editInputIcon}
                    />
                    <TextInput
                      style={styles.editInput}
                      placeholderTextColor={colors.textGrey}
                      value={editTitle}
                                accessibilityLabel="Título da notícia"
                      onChangeText={setEditTitle}
                      placeholder="Digite o título da notícia"
                      autoCorrect={true}
                      autoCapitalize="sentences"
                      keyboardType="default"
                      editable={!isEditLoading}
                    />
                  </View>

                  <Text style={styles.editLabel}>Resumo *</Text>
                  <View style={styles.editInputContainer}>
                    <AntDesign
                      name="file-text"
                      size={20}
                      color={colors.textOrange}
                      style={styles.editInputIcon}
                    />
                    <TextInput
                      style={[styles.editInput, styles.editTextArea]}
                      placeholderTextColor={colors.textGrey}
                      value={editSummary}
                                accessibilityLabel="Resumo da notícia"
                      onChangeText={setEditSummary}
                      placeholder="Digite um resumo da notícia"
                      autoCorrect={true}
                      autoCapitalize="sentences"
                      keyboardType="default"
                      multiline={true}
                      numberOfLines={3}
                      editable={!isEditLoading}
                      textAlignVertical="top"
                    />
                  </View>

                  <Text style={styles.editLabel}>Conteúdo *</Text>
                  <View style={styles.editInputContainer}>
                    <AntDesign
                      name="file"
                      size={20}
                      color={colors.textOrange}
                      style={styles.editInputIcon}
                    />
                    <TextInput
                      style={[styles.editInput, styles.editTextAreaLarge]}
                      placeholderTextColor={colors.textGrey}
                      value={editContent}
                                accessibilityLabel="Conteúdo da notícia"
                      onChangeText={setEditContent}
                      placeholder="Digite o conteúdo completo da notícia"
                      autoCorrect={true}
                      autoCapitalize="sentences"
                      keyboardType="default"
                      multiline={true}
                      editable={!isEditLoading}
                      textAlignVertical="top"
                    />
                  </View>

                  <Text style={styles.editLabel}>Imagem * (Apenas JPG/PNG)</Text>

                  <TouchableOpacity
                    style={styles.editImagePickerContainer}
                    onPress={pickImage}
                                accessibilityRole="button"
                                accessibilityLabel="Escolher imagem da notícia"
                    disabled={isEditLoading}
                    activeOpacity={0.7}
                  >
                    <View style={styles.editImagePickerContent}>
                      <AntDesign
                        name="picture"
                        size={20}
                        color={colors.textOrange}
                        style={styles.editInputIcon}
                      />
                      <Text style={styles.editImagePickerText}>
                        {editImage ? "Imagem selecionada" : "Selecione uma imagem"}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {editImage && (
                    <Animatable.View
                      animation="fadeIn"
                      duration={500}
                      style={styles.editImagePreviewContainer}
                    >
                      <Image
                        source={{ uri: editImage }}
                        style={styles.editImagePreview}
                        resizeMode="cover"
                      />
                      <TouchableOpacity
                        style={styles.editRemoveImageButton}
                        onPress={() => setEditImage(null)}
                                    accessibilityRole="button"
                                    accessibilityLabel="Remover imagem"
                        disabled={isEditLoading}
                      >
                        <AntDesign name="close" size={16} color={colors.textWhite} />
                      </TouchableOpacity>
                    </Animatable.View>
                  )}

                  <View style={styles.buttonSection}>
                    <TouchableOpacity
                      style={[
                        styles.saveButton,
                        isEditLoading && styles.disabledButton,
                      ]}
                      onPress={handleSaveEdit}
                      accessibilityRole="button"
                      accessibilityLabel={isEditLoading ? 'Salvando...' : 'Salvar notícia'}
                      accessibilityState={{ disabled: isEditLoading, busy: isEditLoading }}
                      disabled={isEditLoading}
                    >
                      {isEditLoading ? (
                        <Animatable.View
                          animation="rotate"
                          iterationCount="infinite"
                          duration={2000}
                          style={styles.loadingContainerButton}
                        >
                          <ActivityIndicator size="small" color="white" />
                        </Animatable.View>
                      ) : (
                        <Text style={styles.buttonText}>Salvar Alterações</Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  <View style={styles.responseContainer}>
                    {editResponse?.success && (
                      <Animatable.Text
                        animation="fadeIn"
                        duration={1000}
                        style={styles.successMessage}
                      >
                        {editResponse.message}
                      </Animatable.Text>
                    )}
                    {editResponse?.success === false && (
                      <Animatable.Text
                        animation="fadeIn"
                        duration={1000}
                        style={styles.errorMessage}
                      >
                        {editResponse.errors.global}
                      </Animatable.Text>
                    )}
                  </View>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      <TabNavigator />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundOrange,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.backgroundOrange,
  },
  containerHeader: {
    marginBottom: "2%",
    paddingStart: "5%",
  },
  containerForm: {
    flex: 1,
    backgroundColor: colors.backgroundTransparent,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    overflow: "hidden",
  },
  message: {
    fontSize: 32,
    fontWeight: "bold",
    color: colors.textWhite,
    fontFamily: "Nunito",
  },
  mainScrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  headerSection: {
    paddingHorizontal: 20,
    paddingTop: 25,
    paddingBottom: 15,
  },
  headerTextContainer: {
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.textWhite,
    fontFamily: "Nunito",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textWhiteTransparent,
    fontFamily: "Nunito",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  carouselContainer: {
    paddingHorizontal: 10,
    marginBottom: 25,
  },
  recentNewsSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.textWhite,
    fontFamily: "Nunito",
    marginLeft: 10,
  },
  loadingSection: {
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textWhiteTransparent,
    fontFamily: "Nunito",
    marginTop: 12,
  },
  newsListContainer: {
    marginTop: 5,
  },
  newsCard: {
    backgroundColor: colors.backgroundCardBlack,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  newsCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 5,
  },
  newsId: {
    fontSize: 12,
    color: colors.textWhiteTransparent,
    fontFamily: "Nunito",
  },
  actionsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.textOrange,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  deleteButton: {
    backgroundColor: "#E74C3C",
  },
  newsImage: {
    width: "100%",
    height: 180,
    resizeMode: "cover",
  },
  newsContent: {
    padding: 18,
  },
  newsTitle: {
    fontSize: 18,
    fontFamily: "Nunito",
    fontWeight: "bold",
    color: colors.textWhite,
    marginBottom: 10,
    lineHeight: 24,
  },
  newsSummary: {
    fontSize: 14,
    fontFamily: "Nunito",
    color: colors.textGrey,
    marginBottom: 15,
    lineHeight: 20,
  },
  newsFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  newsDate: {
    fontSize: 12,
    color: colors.textWhiteTransparent,
    fontFamily: "Nunito",
    marginLeft: 6,
    flex: 1,
  },
  arrowIcon: {
    marginLeft: 10,
  },
  separator: {
    height: 15,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.textWhite,
    fontFamily: "Nunito",
    textAlign: "center",
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textWhiteTransparent,
    fontFamily: "Nunito",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 25,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.textOrange,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  refreshText: {
    color: colors.textWhite,
    fontFamily: "Nunito",
    fontSize: 14,
    fontWeight: "600",
  },
  bottomSpacing: {
    height: 40,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
  },
  modalContent: {
    backgroundColor: colors.backgroundCardBlack,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    height: "90%",
    width: "100%",
    overflow: "hidden",
  },
  closeButton: {
    position: "absolute",
    top: 15,
    right: 15,
    zIndex: 1000,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    elevation: 10,
  },
  modalScrollView: {
    flex: 1,
  },
  modalImage: {
    width: "100%",
    height: 250,
    resizeMode: "cover",
  },
  modalTextContent: {
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: "Nunito",
    fontWeight: "bold",
    color: colors.textWhite,
    marginBottom: 15,
    lineHeight: 30,
  },
  modalMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  modalDate: {
    fontSize: 14,
    color: colors.textWhiteTransparent,
    fontFamily: "Nunito",
    marginLeft: 10,
  },
  modalContentText: {
    fontSize: 16,
    fontFamily: "Nunito",
    color: colors.textWhite,
    lineHeight: 26,
    textAlign: "left",
  },

  // Estilos do Modal de Edição
  editModalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  editModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
  },
  editModalContent: {
    backgroundColor: colors.backgroundBlack,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    height: "90%",
    width: "100%",
    overflow: "hidden",
  },
  editModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 25,
    paddingTop: 25,
    paddingBottom: 15,
    backgroundColor: colors.backgroundBlack,
  },
  editModalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.textWhite,
    fontFamily: "Nunito",
  },
  editCloseButton: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  editModalScrollView: {
    flex: 1,
  },
  editScrollContent: {
    paddingHorizontal: 25,
    paddingBottom: 100,
  },
  editFormSection: {
    paddingTop: 10,
  },
  editLabel: {
    fontSize: 16,
    marginTop: 20,
    fontFamily: "Nunito",
    color: colors.textWhite,
    fontWeight: "600",
    marginBottom: 8,
  },
  editInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.backgroundTransparent,
    borderRadius: 25,
    paddingLeft: 20,
    paddingRight: 20,
    minHeight: 50,
  },
  editInputIcon: {
    marginRight: 8,
  },
  editInput: {
    flex: 1,
    fontSize: 16,
    color: colors.textWhite,
    fontFamily: "Nunito",
    height: 50,
    paddingLeft: 8,
  },
  editTextArea: {
    minHeight: 60,
    paddingTop: 12,
    height: "auto",
  },
  editTextAreaLarge: {
    minHeight: 120,
    paddingTop: 12,
    height: "auto",
  },
  editImagePickerContainer: {
    backgroundColor: colors.backgroundTransparent,
    borderRadius: 25,
    minHeight: 50,
    justifyContent: "center",
    marginBottom: 10,
  },
  editImagePickerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 20,
    paddingRight: 20,
  },
  editImagePickerText: {
    flex: 1,
    fontSize: 16,
    paddingLeft: 8,
    color: colors.textWhite,
  },
  editImagePreviewContainer: {
    marginTop: 10,
    alignItems: "center",
    position: "relative",
    marginBottom: 20,
  },
  editImagePreview: {
    width: "100%",
    height: 200,
    borderRadius: 10,
  },
  imageStatusContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  imageStatusText: {
    color: colors.textWhite,
    fontSize: 12,
    fontFamily: "Nunito",
    textAlign: "center",
  },
  editRemoveImageButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonSection: {
    marginTop: 30,
    marginBottom: 20,
    alignItems: "center",
  },
  saveButton: {
    backgroundColor: colors.backgroundSave,
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 30,
    width: "80%",
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    color: colors.textWhite,
    fontWeight: "bold",
    fontFamily: "Nunito",
    textTransform: "uppercase",
    textAlign: "center",
  },
  responseContainer: {
    marginTop: 10,
    marginBottom: 30,
    alignItems: "center",
    minHeight: 40,
  },
  errorMessage: {
    color: "#FF6B6B",
    fontSize: 16,
    fontFamily: "Nunito",
    textAlign: "center",
    fontWeight: "600",
  },
  successMessage: {
    color: "#4CAF50",
    fontSize: 16,
    fontFamily: "Nunito",
    textAlign: "center",
    fontWeight: "600",
  },
  loadingContainerButton: {
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: 20,
  },
});