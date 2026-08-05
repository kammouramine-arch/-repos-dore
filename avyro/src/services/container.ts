import type { AuthRepository } from '@/core/domain/ports/authRepository';
import type { CrashReporter } from '@/core/domain/ports/crashReporter';
import type { LocationTracker } from '@/core/domain/ports/locationTracker';
import type { Logger } from '@/core/domain/ports/logger';
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
import { createKeyValueStore } from '@/database/keyValueStore';
import { migrateBrandedStorageKeys } from '@/database/migrations/renameBrandedStorageKeys';
import { createSecureStore } from '@/database/secureStore';
import {
  createLocalOnboardingRepository,
  createLocalPreferencesRepository,
} from '@/database/repositories/localPreferencesRepository';
import { createLocalRecentDestinationsRepository } from '@/database/repositories/localRecentDestinationsRepository';
import { createAccountStore } from '@/services/auth/accountStore';
import { createLocalAuthRepository } from '@/services/auth/localAuthRepository';
import { createSessionStore } from '@/services/auth/sessionStore';
import { createHttpClient } from '@/services/http/httpClient';
import { createExpoLocationTracker } from '@/services/location/expoLocationTracker';
import { createConsoleLogger } from '@/services/observability/consoleLogger';
import { createLocalCrashReporter } from '@/services/observability/localCrashReporter';
import { createNominatimPlacesProvider } from '@/services/places/nominatimPlacesProvider';
import { createOsrmRoutingProvider } from '@/services/routing/osrmRoutingProvider';
import { createExpoSpeechEngine } from '@/voice/expoSpeechEngine';

/**
 * The one place where abstractions meet implementations.
 *
 * Nothing here runs at import time. `createServiceContainer` is called once
 * during bootstrap and the result is handed down through React context, which
 * is what makes the whole graph replaceable: a test builds a container out of
 * fakes, and Sprint 2's companion adapter is added here rather than reached for
 * from inside a feature.
 */
export interface ServiceContainer {
  logger: Logger;
  crashReporter: CrashReporter;
  authRepository: AuthRepository;
  placesProvider: PlacesProvider;
  routingProvider: RoutingProvider;
  locationTracker: LocationTracker;
  speechEngine: SpeechEngine;
  preferencesRepository: PreferencesRepository;
  onboardingRepository: OnboardingRepository;
  recentDestinationsRepository: RecentDestinationsRepository;
  /**
   * One-time local data migrations. Bootstrap runs this before any store
   * loads, so repositories only ever see records under the current keys.
   */
  migrateStorage: () => Promise<void>;
  useCases: {
    signIn: ReturnType<typeof createSignIn>;
    signUp: ReturnType<typeof createSignUp>;
    searchPlaces: ReturnType<typeof createSearchPlaces>;
    planTrip: ReturnType<typeof createPlanTrip>;
  };
}

/** Any part of the graph can be replaced; the rest is still wired for you. */
export type ServiceOverrides = Partial<Omit<ServiceContainer, 'useCases'>>;

export const createServiceContainer = (
  overrides: ServiceOverrides = {},
): ServiceContainer => {
  const logger = overrides.logger ?? createConsoleLogger();
  const crashReporter = overrides.crashReporter ?? createLocalCrashReporter(logger);

  const http = createHttpClient(logger);
  const keyValue = createKeyValueStore(logger);
  const secure = createSecureStore(logger);

  const authRepository =
    overrides.authRepository ??
    createLocalAuthRepository({
      accounts: createAccountStore(secure, logger),
      sessions: createSessionStore(secure),
      logger,
    });

  const placesProvider =
    overrides.placesProvider ?? createNominatimPlacesProvider({ http });
  const routingProvider =
    overrides.routingProvider ?? createOsrmRoutingProvider({ http });

  return {
    logger,
    crashReporter,
    authRepository,
    placesProvider,
    routingProvider,
    locationTracker: overrides.locationTracker ?? createExpoLocationTracker(),
    speechEngine: overrides.speechEngine ?? createExpoSpeechEngine(),
    preferencesRepository:
      overrides.preferencesRepository ?? createLocalPreferencesRepository(keyValue),
    onboardingRepository:
      overrides.onboardingRepository ?? createLocalOnboardingRepository(keyValue),
    recentDestinationsRepository:
      overrides.recentDestinationsRepository ??
      createLocalRecentDestinationsRepository(keyValue),
    migrateStorage:
      overrides.migrateStorage ??
      (() => migrateBrandedStorageKeys({ keyValue, secure, logger })),
    useCases: {
      signIn: createSignIn({ authRepository }),
      signUp: createSignUp({ authRepository }),
      searchPlaces: createSearchPlaces({ placesProvider }),
      planTrip: createPlanTrip({ routingProvider }),
    },
  };
};
