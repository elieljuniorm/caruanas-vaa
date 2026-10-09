// Helper de push notifications (Expo).
//
// - registerForPushNotificationsAsync: pede permissão e retorna o Expo push token.
// - registerOnBackend: faz POST /user/device-token para o backend associar o token.
// - unregisterOnBackend: revoga no backend (logout).
//
// Chamado pelo AuthProvider após login bem-sucedido e no signOut.

import { Platform } from "react-native";
import { API_URL } from "@env";
import { apiFetch } from "./apiFetch";

let _Notifications = null;
let _Device = null;
function getNotifications() {
    if (_Notifications) return _Notifications;
    try {
        _Notifications = require("expo-notifications");
        return _Notifications;
    } catch {
        return null;
    }
}
function getDevice() {
    if (_Device) return _Device;
    try {
        _Device = require("expo-device");
        return _Device;
    } catch {
        return null;
    }
}

export async function configureNotificationHandler() {
    const Notifications = getNotifications();
    if (!Notifications) return;
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
        }),
    });
}

export async function registerForPushNotificationsAsync() {
    const Notifications = getNotifications();
    const Device = getDevice();
    if (!Notifications) return null;

    if (Device && !Device.isDevice) {
        // Push só funciona em device físico
        return null;
    }

    try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== "granted") {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== "granted") return null;

        if (Platform.OS === "android") {
            await Notifications.setNotificationChannelAsync("default", {
                name: "default",
                importance: Notifications.AndroidImportance.DEFAULT,
                lightColor: "#FF8C00",
            });
        }

        const tokenData = await Notifications.getExpoPushTokenAsync();
        return tokenData?.data || null;
    } catch (e) {
        console.warn("Falha ao obter push token:", e);
        return null;
    }
}

export async function registerOnBackend(pushToken, accessToken) {
    if (!pushToken || !accessToken) return;
    try {
        await apiFetch(`${API_URL}/v1/user/device-token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ token: pushToken, platform: "expo" }),
        });
    } catch (e) {
        console.warn("Falha ao registrar push token no backend:", e);
    }
}

export async function unregisterOnBackend(pushToken, accessToken) {
    if (!pushToken || !accessToken) return;
    try {
        await apiFetch(`${API_URL}/v1/user/device-token`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ token: pushToken }),
        });
    } catch (_) {
        // best-effort
    }
}
