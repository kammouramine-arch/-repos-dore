import type {
  LogFields,
  LogLevel,
  LogRecord,
  Logger,
} from '@/core/domain/ports/logger';

const SEVERITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export interface ConsoleLoggerOptions {
  /** Records below this level are dropped. */
  minimumLevel?: LogLevel;
  scope?: string;
  /** Test seam: where records are written. Defaults to the platform console. */
  sink?: (record: LogRecord) => void;
}

const format = ({ level, scope, message, fields, error }: LogRecord): unknown[] => {
  const line = `[${level.toUpperCase()}] ${scope} · ${message}`;
  const parts: unknown[] = [line];

  if (fields && Object.keys(fields).length > 0) parts.push(fields);
  if (error !== undefined) parts.push(error);

  return parts;
};

const writeToConsole = (record: LogRecord): void => {
  const args = format(record);

  if (record.level === 'error') console.error(...args);
  else if (record.level === 'warn') console.warn(...args);
  else console.log(...args);
};

/**
 * The default logger: structured records on the platform console.
 *
 * Production defaults to `warn` so a release build stays quiet without any
 * call site having to guard itself, and so the records that do survive are the
 * ones a crash report would want alongside it.
 */
export const createConsoleLogger = ({
  minimumLevel = __DEV__ ? 'debug' : 'warn',
  scope = 'avyro',
  sink = writeToConsole,
}: ConsoleLoggerOptions = {}): Logger => {
  const write = (
    level: LogLevel,
    message: string,
    fields?: LogFields,
    error?: unknown,
  ): void => {
    if (SEVERITY[level] < SEVERITY[minimumLevel]) return;
    sink({ level, scope, message, fields, error, timestamp: Date.now() });
  };

  return {
    debug: (message, fields) => write('debug', message, fields),
    info: (message, fields) => write('info', message, fields),
    warn: (message, fields) => write('warn', message, fields),
    error: (message, error, fields) => write('error', message, fields, error),
    scoped: (child) =>
      createConsoleLogger({ minimumLevel, scope: `${scope}.${child}`, sink }),
  };
};
