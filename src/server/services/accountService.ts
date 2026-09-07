import 'server-only';
import { randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { hashToken } from '@/lib/auth/tokens';
import { verifyPassword } from '@/lib/auth/password';
import { AppError, conflict, forbidden, validation } from '@/lib/errors';
import { getEmailProvider, layout, esc } from '@/lib/email';

const TTL = 10 * 60_000;
const HOUR = 60 * 60_000;
const digest = (id: string, userId: string, email: string, code: string) => hashToken(`${id}:${userId}:${email}:${code}`);

/** Canonical representation used by both the email and the confirmation API. */
export function normalizeEmailCode(value: string): string {
  return value.normalize('NFKC').replace(/\s+/g, '').trim();
}

export async function updateAccountName(userId: string, firstName: string, lastName: string) {
  await prisma.user.update({ where: { id: userId }, data: { firstName: firstName.trim() || null, lastName: lastName.trim() || null } });
}

/**
 * Deletes the person's account access without silently destroying an organisation's
 * commercial records. Those records may need statutory retention and require a
 * separate owner/legal decision before an organisation is purged.
 */
export async function deletePersonalAccount(userId: string, password: string, confirmation: string) {
  if (confirmation !== 'SUPPRIMER') throw validation('Saisissez SUPPRIMER pour confirmer la suppression.');
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true, deletedAt: true } });
  if (!user || user.deletedAt || !await verifyPassword(password, user.passwordHash)) {
    throw validation('Mot de passe incorrect. Votre compte reste inchangé.');
  }
  const ownedOrganizations = await prisma.organizationMember.findMany({
    where: { userId, role: 'OWNER', deletedAt: null },
    select: { organizationId: true },
  });
  if (ownedOrganizations.length) {
    const ownerCounts = await Promise.all(ownedOrganizations.map(({ organizationId }) => prisma.organizationMember.count({ where: { organizationId, role: 'OWNER', deletedAt: null } })));
    if (ownerCounts.some((count) => count < 2)) {
      throw validation('Transférez la propriété de votre espace avant de supprimer ce compte. Les données commerciales restent rattachées à leur entreprise.');
    }
  }
  const now = new Date();
  const replacementEmail = `deleted+${userId}@invalid.devisia.local`;
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { email: replacementEmail, firstName: null, lastName: null, phone: null, emailVerifiedAt: null, deletedAt: now } });
    await tx.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } });
    await tx.authToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: now } });
    await tx.emailChallenge.updateMany({ where: { userId, usedAt: null }, data: { usedAt: now } });
    await tx.organizationMember.updateMany({ where: { userId, deletedAt: null }, data: { deletedAt: now } });
  });
  return { deleted: true, businessRecordsRetained: true };
}

/** Serialized on the user row: limits survive serverless instances and concurrent requests. */
export async function requestEmailCode(userId: string, input: { email: string; password?: string; language?: 'fr' | 'en' }) {
  const email = input.email.trim().toLowerCase();
  const provider = getEmailProvider();
  if (provider.name === 'console' || !provider.available) {
    throw new AppError('PROVIDER_UNAVAILABLE', 'La vérification par email est momentanément indisponible. Votre adresse actuelle reste inchangée.');
  }
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.deletedAt) throw forbidden();
  // Changing the login address requires reauthentication, including before the first purchase.
  if (email !== user.email && (!input.password || !await verifyPassword(input.password, user.passwordHash))) {
    throw validation('Saisissez votre mot de passe actuel pour changer d’adresse email.');
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const id = randomUUID();
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
    const current = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (current.email !== user.email || current.passwordHash !== user.passwordHash || current.deletedAt) throw conflict('Votre compte a changé. Rechargez vos informations.');
    const previous = await tx.emailChallenge.findUnique({ where: { userId } });
    const sameWindow = previous && now.getTime() - previous.windowStart.getTime() < HOUR;
    if (previous && (now.getTime() - previous.sentAt.getTime() < 60_000 || (sameWindow && previous.sendCount >= 5))) {
      throw new AppError('RATE_LIMITED', 'Patientez avant de demander un nouveau code. Maximum : cinq envois par heure.');
    }
    const data = { id, email, tokenHash: digest(id, userId, email, code), expiresAt: new Date(now.getTime() + TTL), sentAt: now, attempts: 0, usedAt: null, windowStart: sameWindow ? previous.windowStart : now, sendCount: sameWindow ? previous.sendCount + 1 : 1 };
    await tx.emailChallenge.upsert({ where: { userId }, create: { userId, ...data }, update: data });
  });
  try {
    const english = input.language === 'en';
    const sent = await provider.send({
      to: email,
      subject: english ? 'Your DEVISERA verification code' : 'Votre code de confirmation DEVISERA',
      text: english ? `Your DEVISERA code: ${code}. Valid for 10 minutes. Never share it. If you did not request it, ignore this email.` : `Votre code DEVISERA : ${code}. Valable 10 minutes. Ne le communiquez à personne. Si vous n’avez pas demandé ce code, ignorez cet email.`,
      html: layout({ language: english ? 'en' : 'fr', title: english ? 'Verify your email address' : 'Confirmez votre adresse email', body: english ? `<p>Your verification code:</p><p style="font-size:32px;letter-spacing:8px;font-weight:700">${esc(code)}</p><p>Valid for 10 minutes. Never share it. If you did not request it, ignore this email.</p>` : `<p>Votre code de confirmation :</p><p style="font-size:32px;letter-spacing:8px;font-weight:700">${esc(code)}</p><p>Valable 10 minutes. Ne le communiquez à personne. Si vous n’avez pas demandé ce code, ignorez cet email.</p>` }),
    });
    if (!sent.delivered) throw new AppError('PROVIDER_UNAVAILABLE', 'Le code n’a pas pu être envoyé. Réessayez plus tard.');
  } catch (error) {
    // Le refus du fournisseur était perdu ici : en production, on voyait un
    // 503 sans savoir si Resend refusait le domaine, le destinataire ou la
    // clé. On journalise sa raison — jamais le code ni l'adresse.
    const cause = error instanceof Error && error.cause instanceof Object ? error.cause : error;
    const detail = cause && typeof cause === 'object' ? { name: (cause as { name?: string }).name, message: (cause as { message?: string }).message, statusCode: (cause as { statusCode?: number }).statusCode } : { message: String(cause) };
    console.error('[auth] envoi du code de vérification refusé', detail);
    await prisma.emailChallenge.updateMany({ where: { userId, id }, data: { usedAt: new Date() } });
    throw new AppError('PROVIDER_UNAVAILABLE', 'Le code n’a pas pu être envoyé. Votre adresse actuelle reste inchangée.');
  }
  return { requested: true, email, expiresInSeconds: TTL / 1000 };
}

export async function confirmEmailCode(userId: string, sessionId: string, code: string) {
  const canonicalCode = normalizeEmailCode(code);
  let outcome: string;
  try {
    outcome = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
      const challenge = await tx.emailChallenge.findUnique({ where: { userId } });
      const now = new Date();
      if (!challenge || challenge.usedAt || challenge.expiresAt <= now || challenge.attempts >= 5) return 'invalid';
      const expected = Buffer.from(challenge.tokenHash, 'hex');
      const actual = Buffer.from(digest(challenge.id, userId, challenge.email, canonicalCode), 'hex');
      if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
        // Return instead of throwing: commit the failed attempt, don't roll it back.
        await tx.emailChallenge.update({ where: { userId }, data: { attempts: { increment: 1 } } });
        return 'invalid';
      }
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      if (user.deletedAt) return 'invalid';
      const existing = await tx.user.findUnique({ where: { email: challenge.email }, select: { id: true } });
      if (existing && existing.id !== userId) {
        await tx.emailChallenge.update({ where: { userId }, data: { usedAt: now } });
        return 'conflict';
      }
      await tx.user.update({ where: { id: userId }, data: { email: challenge.email, emailVerifiedAt: now } });
      await tx.emailChallenge.update({ where: { userId }, data: { usedAt: now } });
      // Old reset and verification links must never apply to the new address.
      await tx.authToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: now } });
      if (user.email !== challenge.email) {
        await tx.session.updateMany({ where: { userId, id: { not: sessionId }, revokedAt: null }, data: { revokedAt: now } });
      }
      return 'ok';
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw conflict('Cette adresse est déjà utilisée par un autre compte.');
    throw error;
  }
  if (outcome === 'conflict') throw conflict('Cette adresse est déjà utilisée par un autre compte.');
  if (outcome !== 'ok') throw validation('Code incorrect ou expiré. Après cinq essais, demandez un nouveau code.');
  return { verified: true };
}
