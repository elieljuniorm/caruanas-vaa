import React, { useContext, useState } from 'react';
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
import * as Animatable from 'react-native-animatable';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../styles/colors';
import { AuthContext } from '../../contexts/auth';
import { acceptConsent, urlDoDocumento } from '../../contexts/consent';

/**
 * Aceite dos termos e da política, exigido antes de usar o aplicativo.
 *
 * A tela é intencionalmente sem saída: não há botão de voltar nem de pular. Quem
 * cadastra o aluno é o clube, então este é o primeiro momento em que o titular
 * dos dados se manifesta — e sem essa manifestação não há base legal para operar
 * os dados dele. A única saída alternativa é sair da conta.
 *
 * O consentimento de dados de saúde NÃO é pedido aqui: ele é específico e
 * destacado (Art. 11 da LGPD), e aparece na tela da declaração de saúde.
 */
export default function Consent() {
    const navigation = useNavigation();
    const { token, signOut, consentStatus, setConsentStatus } = useContext(AuthContext);

    const [aceitouTermos, setAceitouTermos] = useState(false);
    const [aceitouPolitica, setAceitouPolitica] = useState(false);
    const [enviando, setEnviando] = useState(false);

    const podeContinuar = aceitouTermos && aceitouPolitica && !enviando;

    const abrirDocumento = async (url) => {
        try {
            const suportado = await Linking.canOpenURL(url);
            if (suportado) {
                await Linking.openURL(url);
            } else {
                Alert.alert('Não foi possível abrir', `Acesse pelo navegador:\n${url}`);
            }
        } catch (e) {
            Alert.alert('Não foi possível abrir', `Acesse pelo navegador:\n${url}`);
        }
    };

    const confirmar = async () => {
        setEnviando(true);
        const resultado = await acceptConsent(['TERMS_OF_USE', 'PRIVACY_POLICY'], token);
        setEnviando(false);

        if (resultado.success) {
            setConsentStatus?.(resultado.data);
            // reset, não navigate: a tela de aceite não deve ficar na pilha para
            // onde o botão de voltar do Android possa retornar.
            navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
            return;
        }

        Alert.alert(
            'Não foi possível registrar',
            resultado.errors?.global || 'Tente novamente em instantes.'
        );
    };

    const sair = () => {
        Alert.alert(
            'Sair da conta',
            'Sem aceitar os termos não é possível usar o aplicativo. Deseja sair?',
            [
                { text: 'Continuar aqui', style: 'cancel' },
                { text: 'Sair', style: 'destructive', onPress: () => signOut() },
            ]
        );
    };

    const Caixa = ({ marcado, aoAlternar, children, rotulo }) => (
        <TouchableOpacity
            style={styles.linhaCheck}
            onPress={aoAlternar}
            activeOpacity={0.7}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: marcado }}
            accessibilityLabel={rotulo}
        >
            <View style={[styles.caixa, marcado && styles.caixaMarcada]}>
                {marcado && <Ionicons name="checkmark" size={18} color={colors.textWhite} />}
            </View>
            <View style={styles.textoCheck}>{children}</View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <Animatable.View animation="fadeInDown" style={styles.cabecalho}>
                <Ionicons name="shield-checkmark-outline" size={42} color={colors.backgroundOrange} />
                <Text style={styles.titulo}>Antes de começar</Text>
                <Text style={styles.subtitulo}>
                    Para usar o Caruanas Va'a, você precisa conhecer e aceitar como seus dados
                    são tratados.
                </Text>
            </Animatable.View>

            <ScrollView
                style={styles.corpo}
                contentContainerStyle={styles.corpoConteudo}
                showsVerticalScrollIndicator={false}
            >
                <Caixa
                    marcado={aceitouTermos}
                    aoAlternar={() => setAceitouTermos(!aceitouTermos)}
                    rotulo="Aceitar os Termos de Uso"
                >
                    <Text style={styles.label}>
                        Li e aceito os{' '}
                        <Text
                            style={styles.link}
                            onPress={() => abrirDocumento(urlDoDocumento(consentStatus, 'TERMS_OF_USE'))}
                            accessibilityRole="link"
                            accessibilityLabel="Abrir os Termos de Uso"
                        >
                            Termos de Uso
                        </Text>
                    </Text>
                </Caixa>

                <Caixa
                    marcado={aceitouPolitica}
                    aoAlternar={() => setAceitouPolitica(!aceitouPolitica)}
                    rotulo="Aceitar a Política de Privacidade"
                >
                    <Text style={styles.label}>
                        Li e aceito a{' '}
                        <Text
                            style={styles.link}
                            onPress={() => abrirDocumento(urlDoDocumento(consentStatus, 'PRIVACY_POLICY'))}
                            accessibilityRole="link"
                            accessibilityLabel="Abrir a Política de Privacidade"
                        >
                            Política de Privacidade
                        </Text>
                    </Text>
                </Caixa>

                <View style={styles.aviso}>
                    <Ionicons name="information-circle-outline" size={20} color={colors.textGrey} />
                    <Text style={styles.avisoTexto}>
                        Os dados da sua declaração de saúde são tratados à parte: o consentimento
                        é pedido só quando você for preenchê-la, e pode ser retirado quando quiser
                        em Perfil → Privacidade.
                    </Text>
                </View>
            </ScrollView>

            <View style={styles.rodape}>
                <TouchableOpacity
                    style={[styles.botao, !podeContinuar && styles.botaoDesabilitado]}
                    onPress={confirmar}
                    disabled={!podeContinuar}
                    accessibilityRole="button"
                    accessibilityLabel="Aceitar e continuar"
                    accessibilityState={{ disabled: !podeContinuar }}
                >
                    {enviando ? (
                        <ActivityIndicator color={colors.textWhite} />
                    ) : (
                        <Text style={styles.botaoTexto}>Aceitar e continuar</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={sair}
                    style={styles.sair}
                    accessibilityRole="button"
                    accessibilityLabel="Sair da conta"
                >
                    <Text style={styles.sairTexto}>Sair da conta</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 24 },
    cabecalho: { alignItems: 'center', paddingTop: 64, paddingBottom: 24 },
    titulo: {
        color: colors.textWhite,
        fontSize: colors.fontP24,
        fontWeight: 'bold',
        marginTop: 12,
    },
    subtitulo: {
        color: colors.textGrey,
        fontSize: colors.fontP14,
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 20,
    },
    corpo: { flex: 1 },
    corpoConteudo: { paddingBottom: 16 },
    linhaCheck: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundCardBlack,
        borderRadius: 10,
        padding: 16,
        marginBottom: 12,
    },
    caixa: {
        width: 26,
        height: 26,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: colors.textGrey,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    caixaMarcada: {
        backgroundColor: colors.backgroundOrange,
        borderColor: colors.backgroundOrange,
    },
    textoCheck: { flex: 1 },
    label: { color: colors.textWhite, fontSize: colors.fontP16, lineHeight: 22 },
    link: { color: colors.backgroundOrange, textDecorationLine: 'underline' },
    aviso: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: 8,
        paddingHorizontal: 4,
    },
    avisoTexto: {
        color: colors.textGrey,
        fontSize: colors.fontP12,
        lineHeight: 18,
        marginLeft: 8,
        flex: 1,
    },
    rodape: { paddingBottom: 32, paddingTop: 8 },
    botao: {
        backgroundColor: colors.backgroundOrange,
        borderRadius: 10,
        paddingVertical: 16,
        alignItems: 'center',
    },
    botaoDesabilitado: { backgroundColor: colors.textDisebled },
    botaoTexto: {
        color: colors.textWhite,
        fontSize: colors.fontP16,
        fontWeight: 'bold',
    },
    sair: { alignItems: 'center', paddingVertical: 16 },
    sairTexto: { color: colors.textGrey, fontSize: colors.fontP14 },
});
