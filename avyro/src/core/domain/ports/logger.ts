export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Structured fields attached to a record. Keep them small and machine-readable
 * — a log line is a query, not a sentence. Never put a password, a token or a
 * precise coordinate in here.
 */
export type LogFields = Record<string, unknown>;

export interface LogRecord {
  level: LogLevel;
  /** Where the record came from, e.g. `guidance` or `routing.osrm`. */
  scope: string;
  message: string;
  fields?: LogFields;
  error?: unknown;
  timestamp: number;
}

/**
 * Application logging.
 *
 * The port exists so the app never talks to `console` directly: swapping in a
 * remote sink, a file sink or a test spy is a container change. `scoped`
 * returns a child logger that tags every record, which is what makes the output
 * greppable once several subsystems are talking at once.
 */
export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, error?: unknown, fields?: LogFields): void;
  scoped(scope: string): Logger;
}
