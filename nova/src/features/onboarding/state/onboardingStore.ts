import { create } from 'zustand';

import { services } from '@/services/container';

interface OnboardingState {
  /** `null` until the persisted flag has been read. */
  completed: boolean | null;
  load: () => Promise<void>;
  complete: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>()((set) => ({
  completed: null,

  async load() {
    set({ completed: await services.onboardingRepository.hasCompleted() });
  },

  async complete() {
    // Flip first: the driver should move on immediately, not after a disk write.
    set({ completed: true });
    await services.onboardingRepository.markCompleted();
  },
}));
