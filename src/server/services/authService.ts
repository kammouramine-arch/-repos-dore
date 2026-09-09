import 'server-only';
import { safeErrorCategory } from '@/lib/safe-error';
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
import { requestEmailCode } from './accountService';
import { acceptInvitationForNewUser, invitationPreview } from './teamService';

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export interface SignUpInput {
  billingProvider?: 'apple';
  verificationMethod?: 'code';
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  companyName: string;
  phone?: string;
  invitationToken?: string;
  locale?: 'fr' | 'en';
  ip?: string | null;
}

/** Inscription : utilisateur + organisation + email de bienvenue. */
export async function signUp(input: SignUpInput) {
  const email = normalizeEmail(input.email);
  const existing = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        where: { deletedAt: null },
        include: { organization: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (existing) {
    // A failed verification email must not strand the account. Retrying the
    // same signup with the original password re-authenticates the pending
    // account and sends a fresh challenge instead of creating a duplicate.
    if (!existing.deletedAt && !existing.emailVerifiedAt) {
      const validPassword = await verifyPassword(input.password, existing.passwordHash);
      const membership = existing.memberships[0];
      if (validPassword && membership && !membership.organization.deletedAt) {
        // Retried native signup must not inherit a pre-Apple promotional trial.
        // Never replace a provider binding or an invited team's entitlement.
        if (input.billingProvider === 'apple' && membership.role === 'OWNER') {
          await prisma.subscription.updateMany({
            where: { organizationId: membership.organization.id, status: 'trialing', appleOriginalTransactionId: null, appleProductId: null, stripeSubscriptionId: null },
            data: { status: 'incomplete', trialStartedAt: null, trialEndsAt: null },
          });
        }
        await requestEmailCode(existing.id, { email, language: input.locale ?? existing.locale });
        return { user: existing, organization: membership.organization, existingPending: true };
      }
      throw new AppError('CONFLICT', 'Un compte existe déjà mais votre adresse email n’est pas encore vérifiée.', {
        details: { pendingVerification: ['true'] },
      });
    }
    throw conflict('Un compte existe déjà avec cette adresse email.');
  }

  const invitation = input.invitationToken ? await invitationPreview(input.invitationToken) : null;
  if (invitation && invitation.email !== email) {
    throw validation('Cette invitation a été envoyée à une autre adresse email.');
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: input.firstName?.trim() || null,
      lastName: input.lastName?.trim() || null,
      phone: input.phone?.trim() || null,
      locale: input.locale ?? 'fr',
    },
  });

  let organization;
  try {
    organization = invitation
      ? await acceptInvitationForNewUser(user.id, input.invitationToken!)
      : await createOrganization({
          requireApplePurchase: input.billingProvider === 'apple',
          locale: input.locale,
          name: input.companyName.trim(),
          ownerUserId: user.id,
          ownerName: [input.firstName, input.lastName].filter(Boolean).join(' ') || null,
          email,
          phone: input.phone ?? null,
        });
  } catch (error) {
    await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
    throw error;
  }

  await recordAudit({
    action: 'auth.signup',
    userId: user.id,
    organizationId: organization.id,
    ip: input.ip,
  });
  await trackEvent('signup', { organizationId: organization.id, userId: user.id });

  // Never report a verification step as successful when the provider did not
  // accept the message. `requestEmailCode` deliberately throws when Resend is
  // not configured or rejects the request; let that typed error reach the API
  // so the mobile client can show a recoverable failure instead of an inbox
  // screen for a code that cannot exist. The account is kept so the user can
  // sign in and retry the verification request after the provider is fixed.
  if (input.verificationMethod === 'code' || input.billingProvider === 'apple') {
    await requestEmailCode(user.id, { email, language: input.locale });
  } else {
    await sendVerificationEmail(user.id, email, input.locale);
  }
  await getEmailProvider()
    .send({ to: email, ...welcomeEmail({ firstName: user.firstName, language: input.locale }) })
.catch((error) => console.error('[auth] email de bienvenue impossible', safeErrorCategory(error)));

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

async function issueToken(userId: string, kind: AuthTokenKind, ttlMs: number, email: string) {
  const token = generateToken(32);
  await prisma.$transaction(async (tx) => {
  await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.email !== email || user.deletedAt) throw validation('Votre adresse a changé. Renouvelez votre demande.');
  await tx.authToken.updateMany({
    where: { userId, kind, usedAt: null },
    data: { usedAt: new Date() },
  });
  await tx.authToken.create({
    data: { userId, kind, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + ttlMs) },
  });
  });
  return token;
}

export async function sendVerificationEmail(userId: string, email: string, language?: 'fr' | 'en') {
  const token = await issueToken(userId, 'EMAIL_VERIFICATION', VERIFICATION_TTL_MS, email);
  const url = appUrl(`/verification?token=${encodeURIComponent(token)}`);
  const sent = await getEmailProvider().send({ to: email, ...verifyEmailTemplate({ url, language }) });
  if (!sent.delivered) {
    throw new AppError('PROVIDER_UNAVAILABLE', 'Le lien de vérification n’a pas pu être envoyé. Réessayez plus tard.');
  }
}

export async function verifyEmail(token: string) {
  const record = await prisma.authToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!record || record.kind !== 'EMAIL_VERIFICATION' || record.usedAt || record.expiresAt < new Date()) {
    throw validation('Ce lien de vérification est invalide ou expiré.');
  }
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${record.userId}::uuid FOR UPDATE`;
    const claimed = await tx.authToken.updateMany({ where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
    if (claimed.count !== 1) throw validation('Ce lien de vérification est invalide ou expiré.');
    await tx.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } });
  });
  return record.user;
}

/** Toujours silencieuse : ne révèle pas si l'adresse existe. */
export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) }, select: { id: true, email: true, deletedAt: true, locale: true } });
  if (!user || user.deletedAt) return;
  const token = await issueToken(user.id, 'PASSWORD_RESET', RESET_TTL_MS, user.email);
  const url = appUrl(`/mot-de-passe/nouveau?token=${encodeURIComponent(token)}`);
  await getEmailProvider().send({ to: user.email, ...resetPasswordEmail({ url, language: user.locale === 'en' ? 'en' : 'fr' }) });
}

export async function resetPassword(token: string, password: string, ip?: string | null) {
  const record = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.kind !== 'PASSWORD_RESET' || record.usedAt || record.expiresAt < new Date()) {
    throw validation('Ce lien de réinitialisation est invalide ou expiré.');
  }
  const passwordHash = await hashPassword(password);
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${record.userId}::uuid FOR UPDATE`;
    const claimed = await tx.authToken.updateMany({ where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
    if (claimed.count !== 1) throw validation('Ce lien de réinitialisation est invalide ou expiré.');
    await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
    await tx.emailChallenge.updateMany({ where: { userId: record.userId, usedAt: null }, data: { usedAt: new Date() } });
    // Toutes les sessions existantes sont invalidées après un changement de mot de passe.
    await tx.session.updateMany({ where: { userId: record.userId }, data: { revokedAt: new Date() } });
  });
  await recordAudit({ action: 'auth.password_reset', userId: record.userId, ip });
  return record.userId;
}
