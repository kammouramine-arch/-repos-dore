/**
 * Notifications push mobiles.
 *
 * L'envoi passe par le service Expo Push, qui relaie ensuite vers APNs (iOS) et
 * FCM (Android). Aucune clé n'est nécessaire côté serveur : les certificats
 * APNs et la clé FCM sont configurés dans EAS, côté build mobile. Un jeton
 * d'accès Expo peut être fourni pour les envois authentifiés.
 */
import { env } from '../env';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const MAX_BATCH = 90;

export interface PushMessage {
  /** Jetons ExponentPushToken[...] des appareils destinataires. */
  tokens: string[];
  title: string;
  body?: string;
  /** Données transmises à l'application (navigation profonde). */
  data?: Record<string, string>;
  badge?: number;
}

export interface PushResult {
  sent: number;
  /** Jetons rejetés par le service : à désactiver en base. */
  invalidTokens: string[];
  skipped: boolean;
}

interface ExpoTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

/** Un jeton Expo valide a toujours cette forme. */
export function isExpoPushToken(token: string): boolean {
  return /^Expo(nent)?PushToken\[[^\]]+\]$/.test(token.trim());
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

export async function sendPush(message: PushMessage): Promise<PushResult> {
  const tokens = message.tokens.filter(isExpoPushToken);
  if (tokens.length === 0) return { sent: 0, invalidTokens: [], skipped: true };

  const accessToken = env().EXPO_ACCESS_TOKEN;
  const invalidTokens: string[] = [];
  let sent = 0;

  for (const batch of chunk(tokens, MAX_BATCH)) {
    const payload = batch.map((to) => ({
      to,
      title: message.title,
      body: message.body,
      data: message.data,
      badge: message.badge,
      sound: 'default',
      channelId: 'default',
      priority: 'high',
    }));

    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error('[push] envoi refusé par Expo', response.status);
        continue;
      }

      const result = (await response.json()) as { data?: ExpoTicket[] };
      result.data?.forEach((ticket, index) => {
        if (ticket.status === 'ok') {
          sent += 1;
          return;
        }
        if (ticket.details?.error === 'DeviceNotRegistered') {
          const token = batch[index];
          if (token) invalidTokens.push(token);
        }
      });
    } catch (error) {
      console.error('[push] service injoignable', error);
    }
  }

  return { sent, invalidTokens, skipped: false };
}
