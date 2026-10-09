import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Image, Modal, ActivityIndicator, StatusBar } from 'react-native';
import { colors } from '../styles/colors';
import { useFonts } from 'expo-font';
import { AntDesign } from '@expo/vector-icons';
import { AuthContext } from '../contexts/auth.js';

export default function NewsCarousel() {
    const [fontsLoaded] = useFonts({
        'Nunito': require('../../assets/fonts/Nunito-Regular.ttf'),
    });
    const [selectedNews, setSelectedNews] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [carouselLoading, setCarouselLoading] = useState(true);

    const { news, getAllNews } = useContext(AuthContext);

    useEffect(() => {
        loadCarouselNews();
    }, []);

    const loadCarouselNews = async () => {
        setCarouselLoading(true);
        if (getAllNews) {
            await getAllNews();
        }
        setCarouselLoading(false);
    };

    if (!fontsLoaded) {
        return null;
    }

    // Obter imagem da notícia - ajustado para seus campos
    const getImageSource = (item) => {
        if (item.image && typeof item.image === 'string') {
            return { uri: item.image };
        }
        // Imagem padrão
        return require('../../assets/splash.png');
    };

    // Se estiver carregando
    if (carouselLoading) {
        return (
            <View style={styles.carouselContainer}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.textOrange} />
                    <Text style={styles.loadingText}>Carregando destaques...</Text>
                </View>
            </View>
        );
    }

    // Se não houver notícias
    if (!news || news.length === 0) {
        return (
            <View style={styles.carouselContainer}>
                <View style={styles.noNewsContainer}>
                    <AntDesign name="frown" size={50} color={colors.textGrey} />
                    <Text style={styles.noNewsText}>Nenhuma notícia em destaque</Text>
                    <TouchableOpacity
                        style={styles.refreshButton}
                        onPress={loadCarouselNews}
                    accessibilityRole="button"
                    accessibilityLabel="Atualizar notícias"
                    >
                        <AntDesign name="reload" size={20} color={colors.textWhite} />
                        <Text style={styles.refreshText}>Tentar novamente</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // Limitar para mostrar apenas as 3 notícias mais recentes no carrossel
    const recentNews = news.slice(0, 3);

    return (
        <View style={styles.carouselContainer}>
            <FlatList
                data={recentNews}
                horizontal
                pagingEnabled
                snapToAlignment="center"
                decelerationRate="fast"
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.flatListContent}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.newsCard}
                        onPress={() => setSelectedNews(item)}
            accessibilityRole="button"
            accessibilityLabel={`Notícia: ${item.title}`}
                        activeOpacity={0.7}
                    >
                        <Image
                            source={getImageSource(item)}
                            style={styles.newsImage}
                            defaultSource={require('../../assets/splash.png')}
                        />
                        <View style={styles.newsContent}>
                            <Text style={styles.newsTitle} numberOfLines={2}>
                                {item.title || 'Sem título'}
                            </Text>
                            <Text style={styles.newsSummary} numberOfLines={3}>
                                {item.summary || item.content?.substring(0, 80) + '...' || 'Sem resumo'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                )}
                onMomentumScrollEnd={(event) => {
                    const index = Math.round(
                        event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width
                    );
                    setCurrentIndex(index);
                }}
            />

            {/* Indicadores de página (apenas se tiver mais de 1 notícia) */}
            {recentNews.length > 1 && (
                <View style={styles.indicatorContainer}>
                    {recentNews.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.indicator,
                                index === currentIndex && styles.activeIndicator
                            ]}
                        />
                    ))}
                </View>
            )}

            {/* Modal de detalhes */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={!!selectedNews}
                onRequestClose={() => setSelectedNews(null)}
                statusBarTranslucent={true}
            >
                {selectedNews && (
                    <View style={styles.detailModalOverlay}>

                        <StatusBar 
                            backgroundColor="rgba(0,0,0,0.7)" 
                            barStyle="light-content"
                            translucent={true}
                        />

                        <View style={styles.detailModalContainer}>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => setSelectedNews(null)}
                            accessibilityRole="button"
                            accessibilityLabel="Fechar notícia"
                                activeOpacity={0.7}
                            >
                                <AntDesign name="close" size={28} color={colors.textOrange} />
                            </TouchableOpacity>

                            <Image
                                source={getImageSource(selectedNews)}
                                style={styles.detailNewsImage}
                                defaultSource={require('../../assets/splash.png')}
                            />
                            <Text style={styles.detailNewsTitle}>
                                {selectedNews.title || 'Sem título'}
                            </Text>
                            <Text style={styles.detailNewsDate}>
                                {selectedNews.summary || selectedNews.date ||'Data não disponível'}
                            </Text>
                            <Text style={styles.detailNewsContent}>
                                {selectedNews.content || selectedNews.summary || 'Conteúdo não disponível'}
                            </Text>
                        </View>
                    </View>
                )}
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    carouselContainer: {
        width: '100%',
        marginTop: 20,
        minHeight: 250,
    },
    loadingContainer: {
        height: 250,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.backgroundBlack,
        borderRadius: 15,
        padding: 20,
    },
    loadingText: {
        color: colors.textWhite,
        marginTop: 10,
        fontFamily: 'Nunito',
        fontSize: 16,
    },
    noNewsContainer: {
        height: 250,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.backgroundBlack,
        borderRadius: 15,
        padding: 20,
    },
    noNewsText: {
        color: colors.textGrey,
        marginTop: 10,
        fontFamily: 'Nunito',
        fontSize: 16,
        textAlign: 'center',
    },
    refreshButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 15,
        paddingHorizontal: 15,
        paddingVertical: 8,
        backgroundColor: colors.textOrange,
        borderRadius: 20,
    },
    refreshText: {
        color: colors.textWhite,
        marginLeft: 8,
        fontFamily: 'Nunito',
        fontSize: 14,
    },
    flatListContent: {
        paddingHorizontal: 5,
        alignItems: 'center',
    },
    newsCard: {
        width: 280,
        marginHorizontal: 10,
        backgroundColor: colors.backgroundBlack,
        borderRadius: 15,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    newsImage: {
        width: '100%',
        height: 150,
        resizeMode: 'cover',
    },
    newsContent: {
        padding: 15,
        minHeight: 100,
    },
    newsTitle: {
        fontSize: 18,
        fontFamily: 'Nunito',
        color: colors.textOrange,
        fontWeight: 'bold',
        marginBottom: 8,
        lineHeight: 22,
    },
    newsSummary: {
        fontSize: 14,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        marginBottom: 8,
        lineHeight: 18,
    },
    newsDate: {
        fontSize: 12,
        fontFamily: 'Nunito',
        color: colors.textGrey,
        marginTop: 'auto',
    },
    indicatorContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 15,
    },
    indicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.textGrey,
        marginHorizontal: 5,
    },
    activeIndicator: {
        backgroundColor: colors.textOrange,
        width: 12,
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
        borderRadius: 20,
        padding: 20,
        minHeight: '60%',
        maxHeight: '80%',
    },
    detailNewsImage: {
        width: '100%',
        height: 200,
        borderRadius: 10,
        marginBottom: 15,
        resizeMode: 'cover',
    },
    detailNewsTitle: {
        fontSize: 22,
        fontFamily: 'Nunito',
        color: colors.textOrange,
        fontWeight: 'bold',
        marginBottom: 5,
        lineHeight: 26,
    },
    detailNewsDate: {
        fontSize: 14,
        fontFamily: 'Nunito',
        color: colors.textGrey,
        marginBottom: 15,
    },
    detailNewsContent: {
        fontSize: 16,
        fontFamily: 'Nunito',
        color: colors.textWhite,
        lineHeight: 24,
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
});