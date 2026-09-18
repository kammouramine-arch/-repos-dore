import { AppError } from '@/lib/errors';

/** Refus typé d'un jeton d'identité : le message est sûr à afficher. */
export function identityRejected(message: string): AppError {
  return new AppError('UNAUTHENTICATED', message);
}

export interface VerifiedIdentity {
  provider: 'APPLE' | 'GOOGLE';
  /** Identifiant stable de l'utilisateur chez le fournisseur (`sub`). */
  subject: string;
  email: string | null;
  emailVerified: boolean;
  /** Adresse de relais privé Apple. */
  privateRelay: boolean;
  firstName: string | null;
  lastName: string | null;
}

export function splitAudiences(value: string | undefined): string[] {
  return (value ?? '').split(',').map((entry) => entry.trim()).filter(Boolean);
}

/** Les adresses « Masquer mon adresse » d'Apple vivent toutes sous ce domaine. */
export function isApplePrivateRelay(email: string | null | undefined): boolean {
  return typeof email === 'string' && /@privaterelay\.appleid\.com$/i.test(email.trim());
}

export function normalizeProviderEmail(email: unknown): string | null {
  if (typeof email !== 'string') return null;
  const value = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
}

export function cleanName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim().slice(0, 80);
  return trimmed || null;
}
