/** Erreurs applicatives typées — jamais de stack trace exposée à l'utilisateur. */

export type AppErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'PLAN_LIMIT'
  | 'PROVIDER_UNAVAILABLE'
  | 'INTERNAL';

const STATUS: Record<AppErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 422,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  PLAN_LIMIT: 402,
  PROVIDER_UNAVAILABLE: 503,
  INTERNAL: 500,
};

const DEFAULT_MESSAGE: Record<AppErrorCode, string> = {
  UNAUTHENTICATED: 'Vous devez être connecté pour effectuer cette action.',
  FORBIDDEN: "Vous n'avez pas les droits nécessaires pour cette action.",
  NOT_FOUND: 'Élément introuvable.',
  VALIDATION: 'Les informations transmises sont incomplètes ou invalides.',
  CONFLICT: 'Cette action entre en conflit avec des données existantes.',
  RATE_LIMITED: 'Trop de tentatives. Merci de réessayer dans quelques instants.',
  PLAN_LIMIT: 'Votre formule ne permet pas cette action. Passez à une formule supérieure.',
  PROVIDER_UNAVAILABLE: 'Un service externe est momentanément indisponible.',
  INTERNAL: "Une erreur inattendue s'est produite. Merci de réessayer.",
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly details?: Record<string, string[]>;
  readonly retryable: boolean;

  constructor(
    code: AppErrorCode,
    message?: string,
    options: { details?: Record<string, string[]>; retryable?: boolean; cause?: unknown } = {},
  ) {
    super(message ?? DEFAULT_MESSAGE[code], { cause: options.cause });
    this.name = 'AppError';
    this.code = code;
    this.status = STATUS[code];
    this.details = options.details;
    this.retryable = options.retryable ?? ['RATE_LIMITED', 'PROVIDER_UNAVAILABLE', 'INTERNAL'].includes(code);
  }
}

export const unauthenticated = (m?: string) => new AppError('UNAUTHENTICATED', m);
export const forbidden = (m?: string) => new AppError('FORBIDDEN', m);
export const notFound = (m?: string) => new AppError('NOT_FOUND', m);
export const conflict = (m?: string) => new AppError('CONFLICT', m);
export const validation = (m?: string, details?: Record<string, string[]>) =>
  new AppError('VALIDATION', m, { details });

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/** Message utilisateur sûr, quel que soit le type d'erreur reçu. */
export function toUserMessage(error: unknown): string {
  if (isAppError(error)) return error.message;
  return DEFAULT_MESSAGE.INTERNAL;
}
