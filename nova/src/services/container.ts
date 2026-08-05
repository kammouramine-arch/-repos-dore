import type { AuthRepository } from '@/core/domain/ports/authRepository';
import type { LocationTracker } from '@/core/domain/ports/locationTracker';
import type { PlacesProvider } from '@/core/domain/ports/placesProvider';
import type {
  OnboardingRepository,
  PreferencesRepository,
  RecentDestinationsRepository,
} from '@/core/domain/ports/preferencesRepository';
import type { RoutingProvider } from '@/core/domain/ports/routingProvider';
import type { SpeechEngine } from '@/core/domain/ports/speechEngine';
import { createSignIn, createSignUp } from '@/core/usecases/authenticate';
import { createPlanTrip } from '@/core/usecases/planTrip';
import { createSearchPlaces } from '@/core/usecases/searchPlaces';
import {
  createLocalOnboardingRepository,
  createLocalPreferencesRepository,
} from '@/database/repositories/localPreferencesRepository';
import { createLocalRecentDestinationsRepository } from '@/database/repositories/localRecentDestinationsRepository';
import { createLocalAuthRepository } from '@/services/auth/localAuthRepository';
import { createExpoLocationTracker } from '@/services/location/expoLocationTracker';
import { createNominatimPlacesProvider } from '@/services/places/nominatimPlacesProvider';
import { createOsrmRoutingProvider } from '@/services/routing/osrmRoutingProvider';
import { createExpoSpeechEngine } from '@/voice/expoSpeechEngine';

/**
 * The one place where abstractions meet implementations.
 *
 * Features depend on this container, never on a concrete adapter, so swapping
 * the geocoder, the router or the identity backend is a change confined to
 * this file — and tests can build a container out of fakes.
 */
export interface ServiceContainer {
  authRepository: AuthRepository;
  placesProvider: PlacesProvider;
  routingProvider: RoutingProvider;
  locationTracker: LocationTracker;
  speechEngine: SpeechEngine;
  preferencesRepository: PreferencesRepository;
  onboardingRepository: OnboardingRepository;
  recentDestinationsRepository: RecentDestinationsRepository;
  useCases: {
    signIn: ReturnType<typeof createSignIn>;
    signUp: ReturnType<typeof createSignUp>;
    searchPlaces: ReturnType<typeof createSearchPlaces>;
    planTrip: ReturnType<typeof createPlanTrip>;
  };
}

export const createServiceContainer = (
  overrides: Partial<Omit<ServiceContainer, 'useCases'>> = {},
): ServiceContainer => {
  const authRepository = overrides.authRepository ?? createLocalAuthRepository();
  const placesProvider = overrides.placesProvider ?? createNominatimPlacesProvider();
  const routingProvider = overrides.routingProvider ?? createOsrmRoutingProvider();

  return {
    authRepository,
    placesProvider,
    routingProvider,
    locationTracker: overrides.locationTracker ?? createExpoLocationTracker(),
    speechEngine: overrides.speechEngine ?? createExpoSpeechEngine(),
    preferencesRepository:
      overrides.preferencesRepository ?? createLocalPreferencesRepository(),
    onboardingRepository:
      overrides.onboardingRepository ?? createLocalOnboardingRepository(),
    recentDestinationsRepository:
      overrides.recentDestinationsRepository ?? createLocalRecentDestinationsRepository(),
    useCases: {
      signIn: createSignIn({ authRepository }),
      signUp: createSignUp({ authRepository }),
      searchPlaces: createSearchPlaces({ placesProvider }),
      planTrip: createPlanTrip({ routingProvider }),
    },
  };
};

/** Application-wide instance used by the feature layer. */
export const services = createServiceContainer();
