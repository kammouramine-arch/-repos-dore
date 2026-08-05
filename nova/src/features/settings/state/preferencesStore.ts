import { create } from 'zustand';

import {
  DEFAULT_PREFERENCES,
  type Preferences,
} from '@/core/domain/entities/preferences';
import type { ServiceContainer } from '@/services/container';
import { setHapticsEnabled } from '@/ui/feedback/haptics';

export interface PreferencesState {
  preferences: Preferences;
  hydrated: boolean;
  load: () => Promise<void>;
  update: (patch: Partial<Preferences>) => Promise<void>;
}

/**
 * Driver preferences.
 *
 * Updates apply optimistically — a settings toggle must never wait on a disk
 * write — and are persisted afterwards.
 */
export const createPreferencesStore = (services: ServiceContainer) =>
  create<PreferencesState>()((set, get) => ({
    preferences: DEFAULT_PREFERENCES,
    hydrated: false,

    async load() {
      const preferences = await services.preferencesRepository.load();
      setHapticsEnabled(preferences.hapticFeedback);
      set({ preferences, hydrated: true });
    },

    async update(patch) {
      const preferences = { ...get().preferences, ...patch };
      setHapticsEnabled(preferences.hapticFeedback);
      set({ preferences });

      await services.preferencesRepository.save(preferences);
    },
  }));
