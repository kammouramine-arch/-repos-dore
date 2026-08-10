import type { ConversationStatus } from '@/core/domain/entities/conversation';
import type { VoiceSessionStatus } from './voiceSession';

/**
 * What the driver is told the microphone is doing.
 *
 * Pure, because "does Avyro know it heard me" is the single most important
 * thing this app communicates and it should be assertable without a device.
 * Until now the conversation engine rendered nothing at all, so every failure
 * — and every success — looked identical from the driver's seat.
 */

export type VoiceTone =
  /** Waiting, not listening. */
  | 'idle'
  /** The microphone is open. */
  | 'listening'
  /** Working on an answer. */
  | 'thinking'
  /** Avyro is talking. */
  | 'speaking'
  /** Something went wrong, and the driver should know. */
  | 'error';

export interface VoicePrompt {
  /** Shown on screen. Short enough to read at a glance from a driving seat. */
  label: string;
  tone: VoiceTone;
  /** False when nothing should be on screen at all. */
  visible: boolean;
}

const hidden: VoicePrompt = { label: '', tone: 'idle', visible: false };

/**
 * The prompt for the current turn.
 *
 * `speaking` shows Avyro's own words rather than a generic label — the driver
 * hears them, and seeing them confirms they were heard correctly. A maneuver
 * interrupt is still "speaking" from the driver's point of view: guidance is
 * Avyro's voice too.
 */
export const voicePromptFor = (
  status: ConversationStatus,
  speaking: string | null,
  error: string | null,
): VoicePrompt => {
  switch (status) {
    case 'listening':
      return { label: 'Listening…', tone: 'listening', visible: true };

    case 'thinking':
      return { label: 'Thinking…', tone: 'thinking', visible: true };

    case 'speaking':
    case 'navigation-interrupt':
    case 'resuming':
      return speaking
        ? { label: speaking, tone: 'speaking', visible: true }
        : hidden;

    case 'cancelled':
      // A turn that ended because the microphone failed is worth reporting.
      // A turn the driver cancelled themselves is not — they know.
      return error
        ? { label: 'Sorry, I didn’t catch that.', tone: 'error', visible: true }
        : hidden;

    case 'idle':
    default:
      return hidden;
  }
};

/**
 * Whether tap-to-talk should be offered.
 *
 * The wake phrase is foreground-only and depends on a recogniser that Apple
 * stops after about a minute, so a button the driver can actually press is not
 * a fallback — it is the reliable path. It is hidden only when voice cannot
 * work at all, or when a turn is already under way.
 */
export const canStartVoiceTurn = (
  voice: VoiceSessionStatus,
  conversation: ConversationStatus,
): boolean => {
  if (voice === 'off' || voice === 'unsupported' || voice === 'blocked') return false;
  return conversation === 'idle' || conversation === 'cancelled';
};
