import 'server-only';
import { Prisma, type AuthProvider } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AppError, conflict, forbidden } from '@/lib/errors';
import { seal } from '@/lib/auth/secret-box';
import type { VerifiedIdentity } from '@/server/auth/providers/claims';
import { createOrganization } from './organizationService';
import { recordAudit } from './auditService';
import { trackEvent } from './analyticsService';

/**
 * Authentification par identité fournisseur (Apple, Google).
 *
 * Le compte DEVISERA est l'identité permanente ; une adresse email n'en est
 * qu'un attribut. Règles, dans l'ordre :
 *
 * 1. L'identité (fournisseur, `sub`) est déjà rattachée → c'est ce compte,
 *    quelle que soit l'adresse transmise aujourd'hui.
 * 2. Sinon, si le fournisseur transmet une adresse vérifiée qui est celle
 *    d'un compte DEVISERA **vérifié** → l'identité y est rattachée : les deux
 *    parties ont prouvé le contrôle de la même boîte. Une adresse de relais
 *    Apple suit la même règle ; elle ne peut appartenir qu'à cet utilisateur.
 * 3. Si l'adresse est celle d'un compte **jamais vérifié**, ce compte n'a pas
 *    de propriétaire prouvé : il est réclamé par l'utilisateur du fournisseur,
 *    et son mot de passe comme ses sessions sont révoqués. Rattacher sans
 *    cela offrirait une porte d'entrée à qui aurait pré-créé le compte.
 * 4. Sinon, un compte est créé, sans mot de passe, avec une entreprise à
 *    nommer lors de l'onboarding.
 *
 * Deux comptes existants ne sont jamais fusionnés.
 */
export interface IdentityAuthInput {
  identity: VerifiedIdentity;
  locale?: 'fr' | 'en';
  ip?: string | null;
  /** Jeton de rafraîchissement Apple obtenu par échange du code, à conserver chiffré. */
  appleRefreshToken?: string | null;
  /** Le client iOS doit passer par l'achat Apple ; le web démarre un essai. */
  billingProvider?: 'apple';
}

export interface IdentityAuthResult {
  user: { id: string; email: string; locale: 'fr' | 'en' };
  organizationId: string;
  outcome: 'signed_in' | 'linked' | 'claimed' | 'created';
}

const providerLabel: Record<AuthProvider, string> = { APPLE: 'Apple', GOOGLE: 'Google' };

export async function authenticateWithIdentity(input: IdentityAuthInput): Promise<IdentityAuthResult> {
  const { identity } = input;
  const now = new Date();
  const refreshTokenCiphertext = input.appleRefreshToken ? seal(input.appleRefreshToken) : undefined;

  // 1. Identité connue.
  const known = await prisma.authIdentity.findUnique({
    where: { provider_providerUserId: { provider: identity.provider, providerUserId: identity.subject } },
    include: { user: { include: { memberships: { where: { deletedAt: null }, include: { organization: true }, orderBy: { createdAt: 'asc' } } } } },
  });
  if (known) {
    if (known.user.deletedAt) {
      // Le compte a été supprimé : l'identité orpheline est retirée et le
      // parcours reprend comme pour une première connexion.
      await prisma.authIdentity.delete({ where: { id: known.id } });
    } else {
      const membership = known.user.memberships.find((entry) => !entry.organization.deletedAt);
      if (!membership) throw new AppError('FORBIDDEN', "Votre compte n'est rattaché à aucune entreprise.");
      await prisma.$transaction([
        prisma.authIdentity.update({
          where: { id: known.id },
          data: { lastUsedAt: now, email: identity.email ?? known.email, emailVerified: identity.emailVerified || known.emailVerified, privateRelay: identity.privateRelay, ...(refreshTokenCiphertext ? { refreshTokenCiphertext } : {}) },
        }),
        prisma.user.update({ where: { id: known.userId }, data: { lastLoginAt: now } }),
      ]);
      await recordAudit({ action: 'auth.login', userId: known.userId, organizationId: membership.organizationId, ip: input.ip, metadata: { provider: identity.provider } });
      return { user: { id: known.user.id, email: known.user.email, locale: known.user.locale }, organizationId: membership.organizationId, outcome: 'signed_in' };
    }
  }

  // 2 et 3. Rattachement à un compte existant portant la même adresse vérifiée.
  if (identity.email && identity.emailVerified) {
    const existing = await prisma.user.findUnique({
      where: { email: identity.email },
      include: { memberships: { where: { deletedAt: null }, include: { organization: true }, orderBy: { createdAt: 'asc' } } },
    });
    if (existing && !existing.deletedAt) {
      const membership = existing.memberships.find((entry) => !entry.organization.deletedAt);
      if (!membership) throw new AppError('FORBIDDEN', "Votre compte n'est rattaché à aucune entreprise.");
      const claimed = !existing.emailVerifiedAt;
      await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM users WHERE id = ${existing.id}::uuid FOR UPDATE`;
        await tx.authIdentity.create({
          data: { userId: existing.id, provider: identity.provider, providerUserId: identity.subject, email: identity.email, emailVerified: true, privateRelay: identity.privateRelay, refreshTokenCiphertext: refreshTokenCiphertext ?? null, lastUsedAt: now },
        });
        await tx.user.update({
          where: { id: existing.id },
          data: {
            lastLoginAt: now,
            emailVerifiedAt: existing.emailVerifiedAt ?? now,
            firstName: existing.firstName ?? identity.firstName,
            lastName: existing.lastName ?? identity.lastName,
            // Un compte jamais vérifié n'a pas de propriétaire prouvé : ses
            // identifiants antérieurs ne doivent plus ouvrir ce compte.
            ...(claimed ? { passwordHash: null } : {}),
          },
        });
        if (claimed) {
          await tx.session.updateMany({ where: { userId: existing.id, revokedAt: null }, data: { revokedAt: now } });
          await tx.authToken.updateMany({ where: { userId: existing.id, usedAt: null }, data: { usedAt: now } });
          await tx.emailChallenge.updateMany({ where: { userId: existing.id, usedAt: null }, data: { usedAt: now } });
        }
      });
      await recordAudit({
        action: claimed ? 'auth.identity_claimed' : 'auth.identity_linked',
        userId: existing.id,
        organizationId: membership.organizationId,
        ip: input.ip,
        metadata: { provider: identity.provider, privateRelay: identity.privateRelay },
      });
      return { user: { id: existing.id, email: existing.email, locale: existing.locale }, organizationId: membership.organizationId, outcome: claimed ? 'claimed' : 'linked' };
    }
  }

  // 4. Nouveau compte.
  if (!identity.email) {
    // Apple transmet toujours une adresse (réelle ou relayée) dans le jeton ;
    // sans elle, DEVISERA ne peut ni joindre l'artisan ni le retrouver.
    throw new AppError('VALIDATION', `${providerLabel[identity.provider]} n’a transmis aucune adresse email. Réessayez en autorisant le partage de votre adresse.`);
  }
  if (!identity.emailVerified) {
    throw new AppError('VALIDATION', `${providerLabel[identity.provider]} n’a pas confirmé votre adresse email. Continuez avec l’adresse e-mail pour recevoir un code.`);
  }

  const ownerName = [identity.firstName, identity.lastName].filter(Boolean).join(' ') || null;
  let user;
  try {
    user = await prisma.user.create({
      data: {
        email: identity.email,
        passwordHash: null,
        firstName: identity.firstName,
        lastName: identity.lastName,
        locale: input.locale ?? 'fr',
        emailVerifiedAt: now,
        lastLoginAt: now,
        identities: {
          create: { provider: identity.provider, providerUserId: identity.subject, email: identity.email, emailVerified: true, privateRelay: identity.privateRelay, refreshTokenCiphertext: refreshTokenCiphertext ?? null, lastUsedAt: now },
        },
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw conflict('Un compte vient d’être créé avec cette adresse. Réessayez.');
    }
    throw error;
  }

  let organization;
  try {
    organization = await createOrganization({
      requireApplePurchase: input.billingProvider === 'apple',
      locale: input.locale,
      name: provisionalBusinessName(identity, user.email),
      ownerUserId: user.id,
      ownerName,
      email: identity.privateRelay ? null : identity.email,
      phone: null,
      setupPending: true,
    });
  } catch (error) {
    await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
    throw error;
  }

  await recordAudit({ action: 'auth.signup', userId: user.id, organizationId: organization.id, ip: input.ip, metadata: { provider: identity.provider } });
  await trackEvent('signup', { organizationId: organization.id, userId: user.id });
  return { user: { id: user.id, email: user.email, locale: user.locale }, organizationId: organization.id, outcome: 'created' };
}

/** Nom d'attente lisible, remplacé dès l'onboarding. Jamais une adresse relayée. */
export function provisionalBusinessName(identity: Pick<VerifiedIdentity, 'firstName' | 'lastName' | 'privateRelay'>, email: string): string {
  const person = [identity.firstName, identity.lastName].filter(Boolean).join(' ').trim();
  if (person) return `Atelier de ${person}`;
  if (!identity.privateRelay) {
    const local = email.split('@')[0]?.replace(/[._-]+/g, ' ').trim();
    if (local) return `Atelier de ${local.charAt(0).toUpperCase()}${local.slice(1)}`;
  }
  return 'Mon atelier';
}

export interface CompleteOnboardingInput {
  companyName: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  trade?: string;
}

const TRADES = new Set(['PLOMBIER', 'ELECTRICIEN', 'CHAUFFAGISTE', 'CLIMATICIEN', 'PEINTRE', 'COUVREUR', 'MENUISIER', 'MACON', 'PAYSAGISTE', 'RENOVATION', 'NETTOYAGE', 'DEPANNAGE', 'AUTRE']);

/** Nomme l'entreprise créée à la volée et lève le drapeau d'onboarding. Propriétaire seulement. */
export async function completeIdentityOnboarding(userId: string, organizationId: string, input: CompleteOnboardingInput) {
  const name = input.companyName.trim();
  if (name.length < 2) throw new AppError('VALIDATION', "Nom de l'entreprise requis.");
  const trade = input.trade && TRADES.has(input.trade) ? (input.trade as never) : undefined;
  await prisma.$transaction(async (tx) => {
    const membership = await tx.organizationMember.findFirst({ where: { organizationId, userId, deletedAt: null }, select: { role: true } });
    const organization = await tx.organization.findUnique({ where: { id: organizationId }, select: { setupPending: true, deletedAt: true } });
    if (!membership || !organization || organization.deletedAt) throw forbidden();
    if (membership.role !== 'OWNER' || !organization.setupPending) throw conflict('Cette entreprise est déjà configurée.');
    const firstName = input.firstName?.trim() || undefined;
    const lastName = input.lastName?.trim() || undefined;
    const user = await tx.user.update({ where: { id: userId }, data: { ...(firstName !== undefined ? { firstName } : {}), ...(lastName !== undefined ? { lastName } : {}) } });
    const ownerName = [user.firstName, user.lastName].filter(Boolean).join(' ') || null;
    await tx.organization.update({ where: { id: organizationId }, data: { name, setupPending: false } });
    await tx.businessProfile.update({
      where: { organizationId },
      data: { legalName: name, ownerName, phone: input.phone?.trim() || null, ...(trade ? { trade } : {}) },
    });
  });
  await recordAudit({ action: 'organization.onboarded', userId, organizationId, metadata: { source: 'identity' } });
}
