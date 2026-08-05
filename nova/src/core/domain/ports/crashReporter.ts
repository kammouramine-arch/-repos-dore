import type { LogFields } from './logger';

/**
 * Crash and non-fatal error reporting.
 *
 * Interface only for this release: the shipped implementation forwards to the
 * logger and drops everything in production. It is declared now, and called
 * from the paths that matter, so adopting a real backend (Sentry, Bugsnag,
 * Crashlytics) is a single adapter plus one line in the service container —
 * not a hunt through every `catch` in the app.
 *
 * Deliberately not part of this contract: automatic breadcrumb capture from
 * navigation or network. Those belong to the adapter that knows how to batch
 * them, not to the port.
 */
export interface CrashReporter {
  /** A non-fatal failure worth investigating. */
  captureError(error: unknown, fields?: LogFields): void;
  /** A step on the path to a failure, kept until the next report. */
  addBreadcrumb(message: string, fields?: LogFields): void;
  /**
   * Associates subsequent reports with an account, or clears the association
   * on sign-out. Pass the opaque user id only — never an email or a name.
   */
  identify(userId: string | null): void;
}
