import type { CrashReporter } from '@/core/domain/ports/crashReporter';
import type { LogFields, Logger } from '@/core/domain/ports/logger';

/** How many breadcrumbs to keep. Enough for context, small enough to be free. */
const BREADCRUMB_LIMIT = 25;

/**
 * The placeholder crash reporter for this release.
 *
 * It keeps a bounded breadcrumb trail in memory and writes captured errors to
 * the logger. Nothing leaves the device — wiring a real backend means writing
 * another `CrashReporter` and changing one line in the service container, and
 * every call site is already in place.
 */
export const createLocalCrashReporter = (logger: Logger): CrashReporter => {
  const scoped = logger.scoped('crash');
  const breadcrumbs: { message: string; fields?: LogFields; at: number }[] = [];
  let userId: string | null = null;

  return {
    captureError(error, fields) {
      scoped.error('captured', error, {
        ...fields,
        userId,
        breadcrumbs: breadcrumbs.slice(-5).map((crumb) => crumb.message),
      });
    },

    addBreadcrumb(message, fields) {
      breadcrumbs.push({ message, fields, at: Date.now() });
      if (breadcrumbs.length > BREADCRUMB_LIMIT) breadcrumbs.shift();
    },

    identify(id) {
      userId = id;
    },
  };
};
