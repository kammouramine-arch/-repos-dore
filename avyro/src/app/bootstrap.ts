import * as SystemUI from 'expo-system-ui';

import type { AppRuntime } from '@/app/runtime/AppRuntime';
import { colors } from '@/ui/theme';

/**
 * Everything that has to be true before the first screen is drawn: the theme
 * behind the app, the driver's preferences, whether they have seen onboarding,
 * and whether they are still signed in.
 *
 * `allSettled` is deliberate — a single unreadable record must not keep the
 * app on the splash screen, and each store already falls back to a usable
 * default. What changed here is that failures are reported rather than
 * discarded: a device that cannot read its own keystore used to be
 * indistinguishable from a fresh install, permanently and silently.
 */
export const bootstrapApp = async ({ services, stores }: AppRuntime): Promise<void> => {
  const logger = services.logger.scoped('bootstrap');

  // Ahead of everything else: records written under the pre-rebrand keys are
  // moved onto the current ones, so the stores below read a complete device.
  try {
    await services.migrateStorage();
  } catch (error) {
    logger.error('storage migration failed', error);
    services.crashReporter.captureError(error, { step: 'migrateStorage' });
  }

  const steps: [string, Promise<unknown>][] = [
    ['system-ui', SystemUI.setBackgroundColorAsync(colors.background)],
    ['preferences', stores.preferences.getState().load()],
    ['onboarding', stores.onboarding.getState().load()],
    ['session', stores.auth.getState().restore()],
  ];

  const results = await Promise.allSettled(steps.map(([, work]) => work));

  results.forEach((result, index) => {
    if (result.status !== 'rejected') return;

    const [step] = steps[index];
    logger.error('bootstrap step failed', result.reason, { step });
    services.crashReporter.captureError(result.reason, { step });
  });

  services.crashReporter.identify(stores.auth.getState().session?.user.id ?? null);
  logger.info('bootstrap complete', {
    failed: results.filter((result) => result.status === 'rejected').length,
  });
};
