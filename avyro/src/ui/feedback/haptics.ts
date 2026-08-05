import * as Haptics from 'expo-haptics';

/**
 * Haptics respect the driver's preference without every call site having to
 * ask. The settings store pushes the flag in through `setHapticsEnabled`,
 * which keeps the design system free of any dependency on feature state.
 */
let enabled = true;

export const setHapticsEnabled = (value: boolean): void => {
  enabled = value;
};

/** Fire-and-forget: a missing taptic engine must never surface as an error. */
const run = (effect: () => Promise<void>): void => {
  if (!enabled) return;
  void effect().catch(() => undefined);
};

export const haptics = {
  /** Moving between options: segmented controls, list selection. */
  selection: () => run(() => Haptics.selectionAsync()),
  /** Confirming a primary action. */
  tap: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** A maneuver is imminent, or a trip has started. */
  emphasis: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  success: () =>
    run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error: () =>
    run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
