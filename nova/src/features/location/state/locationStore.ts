import { create } from 'zustand';

import type { LocationPermission, UserPosition } from '@/core/domain/entities/geo';
import { messageFor } from '@/core/domain/errors/appError';
import type { ServiceContainer } from '@/services/container';

type LocationStatus = 'idle' | 'locating' | 'ready' | 'denied' | 'error';

export interface LocationState {
  position: UserPosition | null;
  permission: LocationPermission;
  status: LocationStatus;
  error: string | null;
  /** Asks for permission if needed, then takes a fix. Returns success. */
  locate: () => Promise<boolean>;
  setPosition: (position: UserPosition) => void;
}

/**
 * Last known position, shared by every screen that needs an origin.
 *
 * Keeping one fix in memory means opening search or planning a route does not
 * wait on the GPS again — the live guidance session runs its own high-rate
 * watch and feeds this store as it goes.
 */
export const createLocationStore = (services: ServiceContainer) =>
  create<LocationState>()((set) => ({
    position: null,
    permission: 'undetermined',
    status: 'idle',
    error: null,

    async locate() {
      set({ status: 'locating', error: null });

      const granted = await services.locationTracker.getPermission();
      const permission =
        granted === 'granted' ? granted : await services.locationTracker.requestPermission();

      if (permission !== 'granted') {
        set({
          permission,
          status: 'denied',
          error: 'Location access is off. Turn it on to navigate.',
        });
        return false;
      }

      try {
        const position = await services.locationTracker.getCurrentPosition();
        set({ position, permission, status: 'ready', error: null });
        return true;
      } catch (error) {
        set({
          permission,
          status: 'error',
          error: messageFor(error, 'Nova could not get a location fix.'),
        });
        return false;
      }
    },

    setPosition: (position) => set({ position, status: 'ready' }),
  }));
