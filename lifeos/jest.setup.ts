/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { supabaseUrl: 'http://localhost', supabaseAnonKey: 'test-anon-key' } } },
}));

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (k: string) => store.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => void store.set(k, v)),
    deleteItemAsync: jest.fn(async (k: string) => void store.delete(k)),
    isAvailableAsync: jest.fn(async () => true),
  };
});

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  selectionAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(async () => ({ isConnected: true, isInternetReachable: true })),
}));

// Reanimated needs its native worklets runtime, which does not exist under Jest.
// The AI orb is the only consumer, and it only needs these primitives to render.
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  const identity = (value: unknown) => value;
  return {
    __esModule: true,
    default: { View, Text: View, ScrollView: View, createAnimatedComponent: () => View },
    View,
    useSharedValue: (initial: unknown) => ({ value: initial }),
    useAnimatedStyle: (factory: () => object) => factory(),
    withTiming: identity,
    withSpring: identity,
    withSequence: identity,
    withRepeat: identity,
    withDelay: (_delay: number, value: unknown) => value,
    // Entering/exiting animations are declarative objects; the chat surface only needs
    // them to be chainable so the components render.
    FadeIn: { duration: () => ({}) },
    FadeOut: { duration: () => ({}) },
    Easing: { inOut: () => identity, quad: identity, linear: identity },
  };
});

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(async () => true),
  getStringAsync: jest.fn(async () => ''),
}));

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});

// expo-router pulls in the whole navigation stack; component tests only need the API.
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    setParams: jest.fn(),
    dismissTo: jest.fn(),
    canDismiss: () => true,
  }),
  useLocalSearchParams: () => ({}),
  usePathname: () => '/',
  Link: ({ children }: { children: React.ReactNode }) => children,
  Redirect: () => null,
  Stack: Object.assign(() => null, { Screen: () => null }),
  Tabs: Object.assign(() => null, { Screen: () => null }),
}));
