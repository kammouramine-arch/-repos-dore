import { STORAGE_KEYS } from '@/config';
import {
  DEFAULT_PREFERENCES,
  type Preferences,
} from '@/core/domain/entities/preferences';
import type {
  OnboardingRepository,
  PreferencesRepository,
} from '@/core/domain/ports/preferencesRepository';
import { keyValueStore } from '@/database/keyValueStore';

/**
 * Stored preferences are merged over the defaults, so a release that adds a
 * new setting reads correctly on a device that was written by the previous one.
 */
export const createLocalPreferencesRepository = (): PreferencesRepository => ({
  async load(): Promise<Preferences> {
    const stored = await keyValueStore.readJson<Partial<Preferences>>(
      STORAGE_KEYS.preferences,
      {},
    );
    return { ...DEFAULT_PREFERENCES, ...stored };
  },

  async save(preferences: Preferences): Promise<void> {
    await keyValueStore.writeJson(STORAGE_KEYS.preferences, preferences);
  },
});

export const createLocalOnboardingRepository = (): OnboardingRepository => ({
  async hasCompleted(): Promise<boolean> {
    return keyValueStore.readJson<boolean>(STORAGE_KEYS.onboarding, false);
  },

  async markCompleted(): Promise<void> {
    await keyValueStore.writeJson(STORAGE_KEYS.onboarding, true);
  },
});
