/** Error shapes the UI knows how to explain, instead of leaking raw driver text. */
export class AppError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(message: string, code = 'unknown', retryable = true) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.retryable = retryable;
  }
}

/**
 * Pulls readable text out of whatever was thrown.
 *
 * supabase-js rejects with a plain PostgrestError object rather than an Error, so
 * `String(error)` on it yields "[object Object]" — which then became the message shown
 * to the user for every database failure in the app.
 */
function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const shape = error as { message?: unknown; error_description?: unknown; details?: unknown; hint?: unknown };
    for (const candidate of [shape.message, shape.error_description, shape.details, shape.hint]) {
      if (typeof candidate === 'string' && candidate.trim()) return candidate;
    }
    return '';
  }
  return error == null ? '' : String(error);
}

export function toAppError(error: unknown, fallback = 'Something went wrong.'): AppError {
  if (error instanceof AppError) return error;

  const message = messageOf(error);
  const lower = message.toLowerCase();

  if (lower.includes('network request failed') || lower.includes('fetch failed')) {
    return new AppError('You appear to be offline. Changes will sync when you reconnect.', 'offline');
  }
  if (lower.includes('jwt') || lower.includes('invalid claim') || lower.includes('not authenticated')) {
    return new AppError('Your session expired. Please sign in again.', 'auth', false);
  }
  if (lower.includes('row level security') || lower.includes('permission denied')) {
    return new AppError('You do not have access to that item.', 'forbidden', false);
  }
  if (lower.includes('rate limit') || lower.includes('429')) {
    return new AppError('Too many requests right now. Try again in a moment.', 'rate_limit');
  }
  return new AppError(message || fallback, 'unknown');
}

/** Message shown whenever the assistant itself is unreachable. */
export const AI_UNAVAILABLE_MESSAGE =
  "I'm having trouble connecting right now. Your existing plan is still available.";
