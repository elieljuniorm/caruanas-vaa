import React, { useCallback, useContext, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../styles/colors';
import { AuthContext } from '../../contexts/auth';
import {
    exportMyData,
    getConsentStatus,
    revokeHealthConsent,
    urlDoDocumento,
} from '../../contexts/consent';

const EMAIL_ENCARREGADO = 'dpo@lepoti.tech';

/**
 * Exercício dos direitos do titular (Art. 18 da LGPD).
 *
 * Reúne num lugar só o que a lei garante e o app consegue entregar sozinho:
 * ler os documentos, baixar os próprios dados e retirar o consentimento de
 * saúde. A exclusão de conta passa pelo encarregado — o cadastro é do clube, e
 * apagar unilateralmente um aluno com mensalidade em aberto criaria problema
 * para os dois lados.
 */
export default function Privacy() {
    const navigation = useNavigation();
    const { token, consentStatus, setConsentStatus } = useContext(AuthContext);

    const [carregando, setCarregando] = useState(false);
    const [exportando, setExportando] = useState(false);
    const [revogando, setRevogando] = useState(false);

    const recarregar = useCallback(async () => {
        setCarregando(true);
        const resultado = await getConsentStatus(token);
        setCarregando(false);
        if (resultado.success) {
            setConsentStatus?.(resultado.data);
        }
    }, [token, setConsentStatus]);

    useFocusEffect(
        useCallback(() => {
            recarregar();
        }, [recarregar])
    );

    const abrir = async (url) => {
        try {
            await Linking.openURL(url);
        } catch (e) {
            Alert.alert('Não foi possível abrir', `Acesse pelo navegador:\n${url}`);
        }
    };

    const baixarMeusDados = async () => {
        setExportando(true);
        const resultado = await exportMyData(token);

        if (!resultado.success) {
            setExportando(false);
            Alert.alert('Erro', resultado.errors?.global || 'Não foi possível exportar seus dados.');
            return;
        }

        try {
            const conteudo = JSON.stringify(resultado.data, null, 2);
            const nome = `meus-dados-caruanas-${new Date().toISOString().slice(0, 10)}.json`;
            const caminho = `${FileSystem.cacheDirectory}${nome}`;

            await FileSystem.writeAsStringAsync(caminho, conteudo, {
                encoding: FileSystem.EncodingType.UTF8,
            });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(caminho, {
                    mimeType: 'application/json',
                    dialogTitle: 'Salvar meus dados',
                    UTI: 'public.json',
                });
            } else {
                Alert.alert('Arquivo gerado', `Seus dados foram salvos em:\n${caminho}`);
            }
        } catch (e) {
            console.error('Falha ao salvar export:', e);
            Alert.alert('Erro', 'Os dados foram obtidos, mas não foi possível salvar o arquivo.');
        } finally {
            setExportando(false);
        }
    };

    const revogarSaude = () => {
        Alert.alert(
            'Retirar consentimento',
            'Sua declaração de saúde deixará de poder ser preenchida ou atualizada, e o clube '
            + 'pode exigi-la para liberar sua participação nas aulas. Deseja continuar?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Retirar',
                    style: 'destructive',
                    onPress: async () => {
                        setRevogando(true);
                        const resultado = await revokeHealthConsent(token);
                        setRevogando(false);

                        if (resultado.success) {
                            setConsentStatus?.(resultado.data);
                            Alert.alert(
                                'Consentimento retirado',
                                'Para pedir também a exclusão dos dados de saúde já registrados, '
                                + `escreva para ${EMAIL_ENCARREGADO}.`
                            );
                        } else {
                            Alert.alert(
                                'Erro',
                                resultado.errors?.global || 'Não foi possível retirar o consentimento.'
                            );
                        }
                    },
                },
            ]
        );
    };

    const pedirExclusao = () => {
        const assunto = encodeURIComponent('Solicitação de exclusão de dados — Caruanas Va\'a');
        const corpo = encodeURIComponent(
            'Olá,\n\nSolicito a exclusão dos meus dados pessoais do aplicativo Caruanas Va\'a.\n\n'
            + 'Nome:\nE-mail cadastrado:\n\nObrigado.'
        );
        abrir(`mailto:${EMAIL_ENCARREGADO}?subject=${assunto}&body=${corpo}`);
    };

    const saudeAceita = consentStatus?.healthDataAccepted === true;

    const Item = ({ icone, titulo, descricao, aoTocar, carregando: ocupado, destrutivo }) => (
        <TouchableOpacity
            style={styles.item}
            onPress={aoTocar}
            disabled={ocupado}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={titulo}
            accessibilityHint={descricao}
        >
            <Ionicons
                name={icone}
                size={24}
                color={destrutivo ? colors.textRed : colors.backgroundOrange}
            />
            <View style={styles.itemTexto}>
                <Text style={[styles.itemTitulo, destrutivo && styles.itemTituloDestrutivo]}>
                    {titulo}
                </Text>
                <Text style={styles.itemDescricao}>{descricao}</Text>
            </View>
            {ocupado ? (
                <ActivityIndicator color={colors.textGrey} />
            ) : (
                <Ionicons name="chevron-forward" size={20} color={colors.textDisebled} />
            )}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.cabecalho}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    accessibilityRole="button"
                    accessibilityLabel="Voltar"
                    style={styles.voltar}
                >
                    <Ionicons name="arrow-back" size={26} color={colors.textWhite} />
                </TouchableOpacity>
                <Text style={styles.titulo}>Privacidade</Text>
            </View>

            <ScrollView contentContainerStyle={styles.conteudo} showsVerticalScrollIndicator={false}>
                <Text style={styles.secao}>Documentos</Text>
                <Item
                    icone="document-text-outline"
                    titulo="Política de Privacidade"
                    descricao="Quais dados tratamos, por quê e por quanto tempo"
                    aoTocar={() => abrir(urlDoDocumento(consentStatus, 'PRIVACY_POLICY'))}
                />
                <Item
                    icone="reader-outline"
                    titulo="Termos de Uso"
                    descricao="As condições de uso do aplicativo"
                    aoTocar={() => abrir(urlDoDocumento(consentStatus, 'TERMS_OF_USE'))}
                />

                <Text style={styles.secao}>Seus direitos</Text>
                <Item
                    icone="download-outline"
                    titulo="Baixar meus dados"
                    descricao="Uma cópia completa, em arquivo, de tudo o que guardamos sobre você"
                    aoTocar={baixarMeusDados}
                    carregando={exportando}
                />
                <Item
                    icone="mail-outline"
                    titulo="Solicitar exclusão da conta"
                    descricao={`Abre um e-mail para ${EMAIL_ENCARREGADO}. Respondemos em até 15 dias`}
                    aoTocar={pedirExclusao}
                />

                <Text style={styles.secao}>Dados de saúde</Text>
                <View style={styles.situacao}>
                    <Ionicons
                        name={saudeAceita ? 'checkmark-circle' : 'close-circle'}
                        size={20}
                        color={saudeAceita ? colors.textGreen : colors.textDisebled}
                    />
                    <Text style={styles.situacaoTexto}>
                        {carregando
                            ? 'Verificando...'
                            : saudeAceita
                                ? 'Você consentiu com o tratamento dos seus dados de saúde.'
                                : 'Você não consentiu com o tratamento dos seus dados de saúde.'}
                    </Text>
                </View>

                {saudeAceita && (
                    <Item
                        icone="hand-left-outline"
                        titulo="Retirar consentimento"
                        descricao="Você deixa de poder preencher ou atualizar a declaração de saúde"
                        aoTocar={revogarSaude}
                        carregando={revogando}
                        destrutivo
                    />
                )}

                <Text style={styles.rodape}>
                    Encarregado pela proteção de dados: {EMAIL_ENCARREGADO}
                </Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    cabecalho: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 56,
        paddingBottom: 16,
        paddingHorizontal: 20,
    },
    voltar: { padding: 4, marginRight: 12 },
    titulo: { color: colors.textWhite, fontSize: colors.fontP22, fontWeight: 'bold' },
    conteudo: { paddingHorizontal: 20, paddingBottom: 40 },
    secao: {
        color: colors.textGrey,
        fontSize: colors.fontP12,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 24,
        marginBottom: 10,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundCardBlack,
        borderRadius: 10,
        padding: 16,
        marginBottom: 10,
    },
    itemTexto: { flex: 1, marginLeft: 14, marginRight: 8 },
    itemTitulo: { color: colors.textWhite, fontSize: colors.fontP16, fontWeight: '600' },
    itemTituloDestrutivo: { color: colors.textRed },
    itemDescricao: { color: colors.textGrey, fontSize: colors.fontP12, marginTop: 3, lineHeight: 17 },
    situacao: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundCard,
        borderRadius: 10,
        padding: 14,
        marginBottom: 10,
    },
    situacaoTexto: { color: colors.textWhite, fontSize: colors.fontP14, marginLeft: 10, flex: 1 },
    rodape: {
        color: colors.textDisebled,
        fontSize: colors.fontP12,
        textAlign: 'center',
        marginTop: 28,
    },
});
