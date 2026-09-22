import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { getTrackingPermissionsAsync, requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import type { AcquisitionEvent } from '@devisia/shared/acquisition';
import { api } from './api';

const KEY = 'devisera.meta-consent.v1';
let blocked = false;
let sdk: typeof import('react-native-fbsdk-next') | undefined;
let initialized = false;
let queue: Promise<unknown> = Promise.resolve();
export const metaConfigured = Platform.OS === 'ios' && Constants.expoConfig?.extra?.metaEventsEnabled === true;

export async function metaConsented() {
  return metaConfigured && !blocked && await SecureStore.getItemAsync(KEY) === 'granted';
}

export async function setMetaConsent(allow: boolean) {
  blocked = true;
  await SecureStore.setItemAsync(KEY, 'denied', { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  if (sdk) {
    sdk.Settings.setAutoLogAppEventsEnabled(false);
    sdk.Settings.setAdvertiserIDCollectionEnabled(false);
    await sdk.Settings.setAdvertiserTrackingEnabled(false);
  }
  if (!allow || !metaConfigured) return false;
  const permission = await requestTrackingPermissionsAsync();
  if (permission.status !== 'granted') return false;
  await SecureStore.setItemAsync(KEY, 'granted', { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  blocked = false;
  return true;
}

/** Recheck ATT on every attempt; no fallback identifiers, hashed emails or deferred opt-in replay. */
export async function metaReady(): Promise<boolean> {
  if (!await metaConsented()) return false;
  if ((await getTrackingPermissionsAsync()).status !== 'granted') return false;
  if (!sdk) sdk = await import('react-native-fbsdk-next');
  if (!await metaConsented()) return false;
  sdk.Settings.setAutoLogAppEventsEnabled(false);
  sdk.Settings.setAdvertiserIDCollectionEnabled(true);
  await sdk.Settings.setAdvertiserTrackingEnabled(true);
  if (!await metaConsented()) {
    sdk.Settings.setAdvertiserIDCollectionEnabled(false);
    await sdk.Settings.setAdvertiserTrackingEnabled(false);
    return false;
  }
  if (!initialized) {
    sdk.AppEventsLogger.setFlushBehavior('explicit_only');
    sdk.Settings.initializeSDK();
    initialized = true;
  }
  return true;
}

export function emitMetaEvent(event: AcquisitionEvent | null | undefined): Promise<void> {
  const operation = queue.then(async () => {
    if (!event || !/^[a-f0-9]{64}$/.test(event.id) || !await metaReady()) return;
    const key = `devisera.meta.sent.${event.id}`;
    if (await SecureStore.getItemAsync(key)) return;
    // Persist before the native handoff. Prefer missing an event to duplicate revenue.
    await SecureStore.setItemAsync(key, '1', { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    if (!await metaConsented() || (await getTrackingPermissionsAsync()).status !== 'granted') return;
    const parameters: Record<string, string | number> = { event_id: event.id };
    if (event.productId) parameters.fb_content_id = event.productId;
    if (event.name === 'fb_mobile_purchase') {
      if (!Number.isFinite(event.value) || event.value! <= 0 || !/^[A-Z]{3}$/.test(event.currency ?? '')) return;
      sdk!.AppEventsLogger.logPurchase(event.value!, event.currency!, parameters);
    } else if (event.name === 'StartTrial' || event.name === 'fb_mobile_complete_registration') {
      sdk!.AppEventsLogger.logEvent(event.name, parameters);
    } else return;
    sdk!.AppEventsLogger.flush();
  });
  queue = operation.catch(() => undefined);
  return operation;
}

export async function recordMetaRegistration() {
  if (!await metaReady()) return;
  const result = await api.request<{ event: AcquisitionEvent | null }>('/api/acquisition/registration', {
    method: 'POST', json: { consent: 'meta-v1-att-authorized' },
  });
  await emitMetaEvent(result.event);
}
