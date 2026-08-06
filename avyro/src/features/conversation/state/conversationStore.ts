import { create } from 'zustand';

import type { Place } from '@/core/domain/entities/place';
import {
  conversationReducer,
  initialConversationState,
  type ConversationEffect,
  type ConversationEvent,
  type ConversationState,
} from '@/core/conversation/conversationMachine';

export interface ConversationStoreState extends ConversationState {
  /**
   * Effects produced by the last event, waiting to be carried out.
   *
   * The store holds the machine and nothing else — no microphone, no speech.
   * The controller drains this queue, which keeps every decision in the pure
   * reducer where it can be tested, and every side effect in one hook.
   */
  pending: ConversationEffect[];
  /**
   * The place Avyro last named, which "take me there" resolves against.
   *
   * In memory only, never persisted, and cleared the moment it is acted on.
   * Anaphora resolution for the current exchange — not a record of the driver.
   */
  referent: Place | null;
  setReferent: (place: Place | null) => void;
  dispatch: (event: ConversationEvent) => void;
  /** Marks effects as carried out. */
  drain: () => ConversationEffect[];
  reset: () => void;
}

export const createConversationStore = () =>
  create<ConversationStoreState>()((set, get) => ({
    ...initialConversationState,
    pending: [],
    referent: null,

    setReferent: (place) => set({ referent: place }),

    dispatch: (event) => {
      const { state, effects } = conversationReducer(get(), event);
      set({ ...state, pending: [...get().pending, ...effects] });
    },

    drain: () => {
      const { pending } = get();
      if (pending.length > 0) set({ pending: [] });
      return pending;
    },

    reset: () => set({ ...initialConversationState, pending: [], referent: null }),
  }));
