import { beforeEach, describe, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({
  get: vi.fn(), set: vi.fn(), permission: vi.fn(), requestPermission: vi.fn(), api: vi.fn(),
  initialize: vi.fn(), auto: vi.fn(), advertiser: vi.fn(), tracking: vi.fn(),
  log: vi.fn(), purchase: vi.fn(), flush: vi.fn(), behavior: vi.fn(),
}));
vi.mock('../../mobile/node_modules/react-native/index.js', () => ({ Platform: { OS: 'ios' } }));
vi.mock('../../mobile/node_modules/expo-constants/build/Constants.js', () => ({ default: { expoConfig: { extra: { metaEventsEnabled: true } } } }));
vi.mock('../../mobile/node_modules/expo-secure-store/build/SecureStore.js', () => ({ getItemAsync: m.get, setItemAsync: m.set, WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1 }));
vi.mock('../../mobile/node_modules/expo-tracking-transparency/build/TrackingTransparency.js', () => ({ getTrackingPermissionsAsync: m.permission, requestTrackingPermissionsAsync: m.requestPermission }));
vi.mock('../../mobile/src/lib/api', () => ({ api: { request: m.api } }));
vi.mock('../../mobile/node_modules/react-native-fbsdk-next/lib/commonjs/index.js', () => ({
  Settings: { initializeSDK: m.initialize, setAutoLogAppEventsEnabled: m.auto, setAdvertiserIDCollectionEnabled: m.advertiser, setAdvertiserTrackingEnabled: m.tracking },
  AppEventsLogger: { logEvent: m.log, logPurchase: m.purchase, flush: m.flush, setFlushBehavior: m.behavior },
}));
const modulePath = '../../mobile/src/lib/meta-events';
beforeEach(() => { vi.resetModules(); vi.resetAllMocks(); m.set.mockResolvedValue(undefined); m.tracking.mockResolvedValue(true); });
describe('Meta opt-in boundary', () => {
  it('does not initialize or contact the API before consent', async () => {
    m.get.mockResolvedValue(null);
    const { recordMetaRegistration } = await import(modulePath);
    await recordMetaRegistration();
    expect(m.api).not.toHaveBeenCalled(); expect(m.initialize).not.toHaveBeenCalled();
  });
  it('does not send when ATT is denied even if app consent was granted', async () => {
    m.get.mockResolvedValue('granted'); m.permission.mockResolvedValue({ status: 'denied' });
    const { recordMetaRegistration } = await import(modulePath);
    await recordMetaRegistration();
    expect(m.api).not.toHaveBeenCalled(); expect(m.initialize).not.toHaveBeenCalled();
  });
  it('serializes duplicate callbacks, allowing one native purchase handoff', async () => {
    const stored = new Map([['devisera.meta-consent.v1', 'granted']]);
    m.get.mockImplementation(async (key: string) => stored.get(key) ?? null);
    m.set.mockImplementation(async (key: string, value: string) => { stored.set(key, value); });
    m.permission.mockResolvedValue({ status: 'granted' });
    const { emitMetaEvent } = await import(modulePath);
    const event = { id: 'a'.repeat(64), name: 'fb_mobile_purchase', value: 29.99, currency: 'EUR' };
    await Promise.all([emitMetaEvent(event), emitMetaEvent(event)]);
    expect(m.purchase).toHaveBeenCalledOnce(); expect(m.flush).toHaveBeenCalledOnce();
  });
  it('withdrawal prevents subsequent handoff', async () => {
    m.get.mockResolvedValue('granted'); m.permission.mockResolvedValue({ status: 'granted' });
    const { setMetaConsent, emitMetaEvent } = await import(modulePath);
    await setMetaConsent(false);
    await emitMetaEvent({ id: 'b'.repeat(64), name: 'StartTrial' });
    expect(m.log).not.toHaveBeenCalled(); expect(m.initialize).not.toHaveBeenCalled();
  });
});
