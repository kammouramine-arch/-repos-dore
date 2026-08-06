import { createNavigationContainerRef } from '@react-navigation/native';

import type { RootStackParamList } from './types';

/**
 * Imperative access to the navigator, for the one caller that cannot be a
 * screen: the conversation engine.
 *
 * A voice command has to be able to move the app — "take me home" that only
 * changes state, without showing the route, is not an answer. Screens keep
 * using `useNavigation`; this is not a general-purpose escape hatch.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * The routes voice commands are allowed to reach.
 *
 * Narrower than the full param list on purpose: an engine that can push any
 * screen is a second navigation system, and this one only needs two.
 */
type VoiceRoute = Extract<keyof RootStackParamList, 'Home' | 'Guidance'>;

/** Navigates only when the navigator is mounted, so early calls cannot throw. */
export const navigateWhenReady = (route: VoiceRoute): void => {
  if (navigationRef.isReady()) navigationRef.navigate({ name: route, params: undefined });
};
