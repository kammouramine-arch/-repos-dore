import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { api } from './api';

/**
 * Notifications push.
 *
 * L'autorisation est demandée après connexion, jamais au premier lancement :
 * l'artisan comprend d'abord ce que l'application lui apporte.
 */

let cachedToken: string | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Activité DEVISIA',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 180, 90, 180],
    lightColor: '#2547E0',
  });
}

/**
 * Enregistre l'appareil auprès du backend.
 * Renvoie null si l'utilisateur refuse : l'application reste pleinement utilisable.
 */
export async function registerForPush(): Promise<string | null> {
  if (!Device.isDevice) return null;

  try {
    await ensureAndroidChannel();

    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;
    if (!granted && existing.canAskAgain) {
      const request = await Notifications.requestPermissionsAsync();
      granted = request.granted;
    }
    if (!granted) return null;

    const projectId =
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );

    await api.notifications.registerDevice({
      token,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      deviceName: Device.deviceName ?? undefined,
    });

    cachedToken = token;
    return token;
  } catch (error) {
    console.warn('[push] enregistrement impossible', error);
    return null;
  }
}

/** Retire l'appareil à la déconnexion pour ne plus recevoir les alertes. */
export async function unregisterPush(): Promise<void> {
  if (!cachedToken) return;
  await api.notifications.unregisterDevice(cachedToken).catch(() => undefined);
  cachedToken = null;
}

export { Notifications };
