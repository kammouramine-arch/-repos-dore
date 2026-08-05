export type AppErrorCode =
  | 'network'
  | 'timeout'
  | 'not-found'
  | 'invalid-credentials'
  | 'email-taken'
  | 'permission-denied'
  | 'no-route'
  | 'unknown';

/**
 * The single error type crossing service boundaries. Adapters translate their
 * own failures into an `AppError`, so features never branch on provider quirks
 * and every message is already safe to show a driver.
 */
export class AppError extends Error {
  readonly code: AppErrorCode;
  override readonly cause?: unknown;

  constructor(code: AppErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.cause = cause;
  }
}

/** Message safe to render in the UI for any thrown value. */
export const messageFor = (error: unknown, fallback: string): string =>
  error instanceof AppError ? error.message : fallback;
