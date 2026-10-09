import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import Routes from "./src/routes";
import AuthProvider from './src/contexts/auth';
import 'react-native-gesture-handler';

// Sentry — habilitado quando SENTRY_DSN estiver definido (via app.config / EAS env).
// Em dev local sem DSN, o init é no-op e console.error continua indo só pro Metro.
const SENTRY_DSN =
    Constants.expoConfig?.extra?.sentryDsn ||
    process.env.SENTRY_DSN ||
    process.env.EXPO_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
    Sentry.init({
        dsn: SENTRY_DSN,
        // Em produção, sample 100% errors mas só 10% das transações de performance
        tracesSampleRate: __DEV__ ? 1.0 : 0.1,
        environment: Constants.expoConfig?.extra?.env || (__DEV__ ? 'development' : 'production'),
        // Filtra ruído conhecido
        beforeSend(event) {
            // Não reporta erros de rede triviais (offline) — geram muito spam
            if (event.exception?.values?.[0]?.value?.includes('Network request failed')) {
                return null;
            }
            return event;
        },
    });
}

function App() {
    return (
        <NavigationContainer>
            <AuthProvider>
                <Routes />
            </AuthProvider>
        </NavigationContainer>
    );
}

// Sentry.wrap captura crashes JS e mantém ErrorBoundary nativo. Sem DSN, no-op.
export default SENTRY_DSN ? Sentry.wrap(App) : App;
