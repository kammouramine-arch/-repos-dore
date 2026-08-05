import * as SystemUI from 'expo-system-ui';

import { useAuthStore } from '@/features/auth/state/authStore';
import { useOnboardingStore } from '@/features/onboarding/state/onboardingStore';
import { usePreferencesStore } from '@/features/settings/state/preferencesStore';
import { colors } from '@/ui/theme';

/**
 * Everything that has to be true before the first screen is drawn: the theme
 * behind the app, the driver's preferences, whether they have seen onboarding,
 * and whether they are still signed in.
 *
 * `allSettled` is deliberate — a single unreadable record must not keep the
 * app on the splash screen. Each store already falls back to a usable default.
 */
export const bootstrapApp = async (): Promise<void> => {
  await Promise.allSettled([
    SystemUI.setBackgroundColorAsync(colors.background),
    usePreferencesStore.getState().load(),
    useOnboardingStore.getState().load(),
    useAuthStore.getState().restore(),
  ]);
};
