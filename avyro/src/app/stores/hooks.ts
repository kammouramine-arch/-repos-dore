import { useStores } from '@/app/runtime/AppRuntime';
import type { AuthState } from '@/features/auth/state/authStore';
import type { ConversationStoreState } from '@/features/conversation/state/conversationStore';
import type { LocationState } from '@/features/location/state/locationStore';
import type { NavigationState } from '@/features/navigation/state/navigationStore';
import type { OnboardingState } from '@/features/onboarding/state/onboardingStore';
import type { PreferencesState } from '@/features/settings/state/preferencesStore';
import { selectActiveRoute, type TripState } from '@/features/trip/state/tripStore';
import type { AppStores, Store } from './createStores';

/**
 * A store hook with the same call shape a module-level zustand store has:
 * call it bare for the whole state, or with a selector for a slice.
 */
export interface BoundStoreHook<S> {
  (): S;
  <T>(selector: (state: S) => T): T;
}

/**
 * Binds a store from context into a hook.
 *
 * Preserving the `useXStore(selector)` shape is deliberate: the move to
 * injected stores changes where state comes from, not how any screen reads it,
 * so this release touches no rendering code.
 */
const bind = <S,>(pick: (stores: AppStores) => Store<S>): BoundStoreHook<S> => {
  const useBoundStore = (selector?: (state: S) => unknown) => {
    const store = pick(useStores());
    return selector ? store(selector) : store();
  };

  return useBoundStore as BoundStoreHook<S>;
};

export const useAuthStore = bind<AuthState>((stores) => stores.auth);
export const usePreferencesStore = bind<PreferencesState>((stores) => stores.preferences);
export const useOnboardingStore = bind<OnboardingState>((stores) => stores.onboarding);
export const useLocationStore = bind<LocationState>((stores) => stores.location);
export const useTripStore = bind<TripState>((stores) => stores.trip);
export const useNavigationStore = bind<NavigationState>((stores) => stores.navigation);
export const useConversationStore = bind<ConversationStoreState>(
  (stores) => stores.conversation,
);

/** The route the driver is about to take, or `null` before planning. */
export const useActiveRoute = () => useTripStore(selectActiveRoute);

/** The unit every formatted distance in the app is rendered in. */
export const useDistanceUnit = () =>
  usePreferencesStore((state) => state.preferences.distanceUnit);
