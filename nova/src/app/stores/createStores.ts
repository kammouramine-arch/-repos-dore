import type { StoreApi, UseBoundStore } from 'zustand';

import { createAuthStore, type AuthState } from '@/features/auth/state/authStore';
import {
  createLocationStore,
  type LocationState,
} from '@/features/location/state/locationStore';
import {
  createNavigationStore,
  type NavigationState,
} from '@/features/navigation/state/navigationStore';
import {
  createOnboardingStore,
  type OnboardingState,
} from '@/features/onboarding/state/onboardingStore';
import {
  createPreferencesStore,
  type PreferencesState,
} from '@/features/settings/state/preferencesStore';
import { createTripStore, type TripState } from '@/features/trip/state/tripStore';
import type { ServiceContainer } from '@/services/container';

export type Store<S> = UseBoundStore<StoreApi<S>>;

/**
 * Every store in the app, created together from one service container.
 *
 * Stores used to be module-level singletons, which meant they reached for a
 * global container and could never be built twice — not for a test, not for a
 * second scenario. Creating them here makes the whole application state a
 * value that bootstrap owns and hands down.
 */
export interface AppStores {
  auth: Store<AuthState>;
  preferences: Store<PreferencesState>;
  onboarding: Store<OnboardingState>;
  location: Store<LocationState>;
  trip: Store<TripState>;
  navigation: Store<NavigationState>;
}

export const createStores = (services: ServiceContainer): AppStores => ({
  auth: createAuthStore(services),
  preferences: createPreferencesStore(services),
  onboarding: createOnboardingStore(services),
  location: createLocationStore(services),
  trip: createTripStore(services),
  navigation: createNavigationStore(),
});
