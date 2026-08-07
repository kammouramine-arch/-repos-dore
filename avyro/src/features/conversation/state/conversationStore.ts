import { create } from 'zustand';

import type { Place } from '@/core/domain/entities/place';
import {
  conversationReducer,
  initialConversationState,
  type ConversationEffect,
  type ConversationEvent,
  type ConversationState,
} from '@/core/conversation/conversationMachine';
import type { VoiceSessionStatus } from '@/core/conversation/voiceSession';

/**
 * What the microphone is doing, for anything that has to show it.
 *
 * The full lifecycle lives in `voiceSession.ts` and is driven by the
 * controller; only the part a screen needs is published here. Settings reads
 * it so a driver who refuses the permission is told, rather than left looking
 * at a switch that turned itself back off.
 */
export interface VoiceStatusView {
  status: VoiceSessionStatus;
  message: string | null;
}

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
  /** Published by the controller from the voice session machine. */
  voice: VoiceStatusView;
  setReferent: (place: Place | null) => void;
  setVoice: (voice: VoiceStatusView) => void;
  dispatch: (event: ConversationEvent) => void;
  /** Marks effects as carried out. */
  drain: () => ConversationEffect[];
  reset: () => void;
}

const initialVoiceView: VoiceStatusView = { status: 'off', message: null };

export const createConversationStore = () =>
  create<ConversationStoreState>()((set, get) => ({
    ...initialConversationState,
    pending: [],
    referent: null,
    voice: initialVoiceView,

    setReferent: (place) => set({ referent: place }),

    setVoice: (voice) => set({ voice }),

    dispatch: (event) => {
      const { state, effects } = conversationReducer(get(), event);
      set({ ...state, pending: [...get().pending, ...effects] });
    },

    drain: () => {
      const { pending } = get();
      if (pending.length > 0) set({ pending: [] });
      return pending;
    },

    // The microphone's state is not part of a conversation turn and survives
    // one: resetting the machine must not claim voice commands are off.
    reset: () => set({ ...initialConversationState, pending: [], referent: null }),
  }));
