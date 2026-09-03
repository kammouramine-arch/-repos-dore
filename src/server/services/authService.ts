import 'server-only';
import type { AuthTokenKind } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { generateToken, hashToken } from '@/lib/auth/tokens';
import { AppError, conflict, unauthenticated, validation } from '@/lib/errors';
import { appUrl } from '@/lib/env';
import { getEmailProvider, resetPasswordEmail, verifyEmailTemplate, welcomeEmail } from '@/lib/email';
import { createOrganization } from './organizationService';
import { recordAudit } from './auditService';
import { trackEvent } from './analyticsService';

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export interface SignUpInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  companyName: string;
  phone?: string;
  ip?: string | null;
}

/** Inscription : utilisateur + organisation + email de bienvenue. */
export async function signUp(input: SignUpInput) {
  const email = normalizeEmail(input.email);
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    throw conflict('Un compte existe déjà avec cette adresse email.');
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: input.firstName?.trim() || null,
      lastName: input.lastName?.trim() || null,
      phone: input.phone?.trim() || null,
    },
  });

  const organization = await createOrganization({
    name: input.companyName.trim(),
    ownerUserId: user.id,
    ownerName: [input.firstName, input.lastName].filter(Boolean).join(' ') || null,
    email,
    phone: input.phone ?? null,
  });

  await recordAudit({
    action: 'auth.signup',
    userId: user.id,
    organizationId: organization.id,
    ip: input.ip,
  });
  await trackEvent('signup', { organizationId: organization.id, userId: user.id });

  await sendVerificationEmail(user.id, email).catch((error) =>
    console.error('[auth] envoi de vérification impossible', error),
  );
  await getEmailProvider()
    .send({ to: email, ...welcomeEmail({ firstName: user.firstName }) })
    .catch((error) => console.error('[auth] email de bienvenue impossible', error));

  return { user, organization };
}

export interface SignInInput {
  email: string;
  password: string;
  ip?: string | null;
}

/** Connexion : message d'erreur volontairement identique pour ne pas révéler l'existence d'un compte. */
export async function signIn(input: SignInInput) {
  const email = normalizeEmail(input.email);
  const user = await prisma.user.findUnique({ where: { email } });
  const genericError = unauthenticated('Email ou mot de passe incorrect.');

  if (!user || user.deletedAt) {
    // Coût constant : évite de distinguer un compte inexistant par le temps de réponse.
    await verifyPassword(input.password, '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv');
    throw genericError;
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) throw genericError;

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: user.id, deletedAt: null },
    include: { organization: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!membership) {
    throw new AppError('FORBIDDEN', "Votre compte n'est rattaché à aucune entreprise.");
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await recordAudit({
    action: 'auth.login',
    userId: user.id,
    organizationId: membership.organizationId,
    ip: input.ip,
  });

  return { user, organizationId: membership.organizationId };
}

async function issueToken(userId: string, kind: AuthTokenKind, ttlMs: number) {
  const token = generateToken(32);
  await prisma.authToken.updateMany({
    where: { userId, kind, usedAt: null },
    data: { usedAt: new Date() },
  });
  await prisma.authToken.create({
    data: { userId, kind, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + ttlMs) },
  });
  return token;
}

export async function sendVerificationEmail(userId: string, email: string) {
  const token = await issueToken(userId, 'EMAIL_VERIFICATION', VERIFICATION_TTL_MS);
  const url = appUrl(`/verification?token=${encodeURIComponent(token)}`);
  await getEmailProvider().send({ to: email, ...verifyEmailTemplate({ url }) });
}

export async function verifyEmail(token: string) {
  const record = await prisma.authToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!record || record.kind !== 'EMAIL_VERIFICATION' || record.usedAt || record.expiresAt < new Date()) {
    throw validation('Ce lien de vérification est invalide ou expiré.');
  }
  await prisma.$transaction([
    prisma.authToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
  ]);
  return record.user;
}

/** Toujours silencieuse : ne révèle pas si l'adresse existe. */
export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
  if (!user || user.deletedAt) return;
  const token = await issueToken(user.id, 'PASSWORD_RESET', RESET_TTL_MS);
  const url = appUrl(`/mot-de-passe/nouveau?token=${encodeURIComponent(token)}`);
  await getEmailProvider().send({ to: user.email, ...resetPasswordEmail({ url }) });
}

export async function resetPassword(token: string, password: string, ip?: string | null) {
  const record = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.kind !== 'PASSWORD_RESET' || record.usedAt || record.expiresAt < new Date()) {
    throw validation('Ce lien de réinitialisation est invalide ou expiré.');
  }
  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.authToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    // Toutes les sessions existantes sont invalidées après un changement de mot de passe.
    prisma.session.updateMany({ where: { userId: record.userId }, data: { revokedAt: new Date() } }),
  ]);
  await recordAudit({ action: 'auth.password_reset', userId: record.userId, ip });
  return record.userId;
}
