import { create } from 'zustand';

import type {
  NavigationProgress,
  NavigationStatus,
} from '@/core/domain/entities/navigation';
import type { Place } from '@/core/domain/entities/place';
import type { Route } from '@/core/domain/entities/route';

export interface NavigationState {
  status: NavigationStatus;
  route: Route | null;
  destination: Place | null;
  progress: NavigationProgress | null;

  start: (route: Route, destination: Place) => void;
  /** Swaps in a freshly computed route after the driver left the old one. */
  replaceRoute: (route: Route) => void;
  setProgress: (progress: NavigationProgress) => void;
  setStatus: (status: NavigationStatus) => void;
  stop: () => void;
}

/**
 * Live guidance state.
 *
 * Deliberately separate from the trip store: planning a trip and driving one
 * have different lifetimes, and ending guidance must not erase the route the
 * driver may want to preview again.
 */
export const useNavigationStore = create<NavigationState>()((set) => ({
  status: 'idle',
  route: null,
  destination: null,
  progress: null,

  start: (route, destination) =>
    set({ status: 'guiding', route, destination, progress: null }),

  replaceRoute: (route) => set({ route, progress: null, status: 'guiding' }),

  setProgress: (progress) =>
    set((state) => ({
      progress,
      status: progress.hasArrived ? 'arrived' : state.status,
    })),

  setStatus: (status) => set({ status }),

  stop: () => set({ status: 'idle', route: null, destination: null, progress: null }),
}));
