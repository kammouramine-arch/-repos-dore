import { create } from 'zustand';

import type { Coordinates } from '@/core/domain/entities/geo';
import type { Place, RecentDestination } from '@/core/domain/entities/place';
import type { Route, RoutePlan } from '@/core/domain/entities/route';
import { messageFor } from '@/core/domain/errors/appError';
import { services } from '@/services/container';

export interface TripState {
  destination: Place | null;
  plan: RoutePlan | null;
  selectedRouteId: string | null;
  planning: boolean;
  error: string | null;
  recents: RecentDestination[];

  loadRecents: () => Promise<void>;
  clearRecents: () => Promise<void>;
  /** Plans a trip and returns whether a route was found. */
  planTrip: (destination: Place, origin: Coordinates) => Promise<boolean>;
  selectRoute: (routeId: string) => void;
  clearTrip: () => void;
}

/**
 * The trip the driver is currently working on — chosen destination, planned
 * routes, selected alternative.
 *
 * This lives in a store rather than in navigation params because four screens
 * read it (search, preview, guidance, home) and it has to survive every
 * transition between them.
 */
export const useTripStore = create<TripState>()((set) => ({
  destination: null,
  plan: null,
  selectedRouteId: null,
  planning: false,
  error: null,
  recents: [],

  async loadRecents() {
    set({ recents: await services.recentDestinationsRepository.list() });
  },

  async clearRecents() {
    await services.recentDestinationsRepository.clear();
    set({ recents: [] });
  },

  async planTrip(destination, origin) {
    set({ planning: true, error: null, destination });

    try {
      const plan = await services.useCases.planTrip({ destination, origin });
      const recents = await services.recentDestinationsRepository.add(destination);

      set({
        plan,
        selectedRouteId: plan.routes[0]?.id ?? null,
        planning: false,
        recents,
      });
      return true;
    } catch (error) {
      set({
        planning: false,
        plan: null,
        selectedRouteId: null,
        error: messageFor(error, 'Nova could not plan that trip.'),
      });
      return false;
    }
  },

  selectRoute: (routeId) => set({ selectedRouteId: routeId }),

  clearTrip: () =>
    set({ destination: null, plan: null, selectedRouteId: null, error: null }),
}));

/** The route the driver is about to take, or `null` before planning. */
export const selectActiveRoute = (state: TripState): Route | null =>
  state.plan?.routes.find((route) => route.id === state.selectedRouteId) ??
  state.plan?.routes[0] ??
  null;

export const useActiveRoute = () => useTripStore(selectActiveRoute);
