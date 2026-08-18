import 'server-only';
import { cookies, headers } from 'next/headers';
import type { MemberRole } from '@prisma/client';
import { prisma } from '../prisma';
import { appUrl, env } from '../env';
import { generateToken, hashToken, hashIp } from './tokens';
import { unauthenticated, forbidden } from '../errors';
import { assertCan, type Permission } from './permissions';

export const SESSION_COOKIE = 'devisia_session';
export const ORG_COOKIE = 'devisia_org';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 jours

/**
 * L'indicateur `secure` suit le protocole réel de l'application plutôt que
 * NODE_ENV : un déploiement interne en HTTP ou un environnement de test ne doit
 * pas perdre sa session, et toute URL https reste protégée.
 */
const secureCookies = () => appUrl().startsWith('https://');
const SESSION_REFRESH_MS = 1000 * 60 * 60; // rafraîchit lastSeenAt au maximum une fois par heure

export interface SessionUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  locale: 'fr' | 'en';
  emailVerified: boolean;
  isPlatformAdmin: boolean;
}

export interface SessionMembership {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: MemberRole;
}

export interface AuthContext {
  user: SessionUser;
  organization: SessionMembership;
  memberships: SessionMembership[];
  sessionId: string;
}

/** Crée une session serveur et pose le cookie httpOnly correspondant. */
export async function createSession(userId: string): Promise<string> {
  const token = generateToken(48);
  const headerList = await headers();
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      userAgent: headerList.get('user-agent')?.slice(0, 255) ?? null,
      ipAddress: hashIp(clientIpFrom(headerList)),
    },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  });
  return token;
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session
      .updateMany({ where: { tokenHash: hashToken(token) }, data: { revokedAt: new Date() } })
      .catch(() => undefined);
  }
  store.delete(SESSION_COOKIE);
  store.delete(ORG_COOKIE);
}

/** Contexte d'authentification, ou null si non connecté. Ne lève jamais. */
export async function getAuthContext(): Promise<AuthContext | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        include: {
          memberships: {
            where: { deletedAt: null },
            include: { organization: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      },
    },
  });

  if (!session || session.revokedAt || session.expiresAt <= new Date()) return null;
  if (session.user.deletedAt) return null;

  if (Date.now() - session.lastSeenAt.getTime() > SESSION_REFRESH_MS) {
    await prisma.session
      .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
      .catch(() => undefined);
  }

  const memberships: SessionMembership[] = session.user.memberships
    .filter((m) => !m.organization.deletedAt)
    .map((m) => ({
      organizationId: m.organizationId,
      organizationName: m.organization.name,
      organizationSlug: m.organization.slug,
      role: m.role,
    }));

  if (memberships.length === 0) return null;

  const preferredId = store.get(ORG_COOKIE)?.value;
  const organization = memberships.find((m) => m.organizationId === preferredId) ?? memberships[0]!;

  return {
    sessionId: session.id,
    user: {
      id: session.user.id,
      email: session.user.email,
      firstName: session.user.firstName,
      lastName: session.user.lastName,
      locale: session.user.locale,
      emailVerified: session.user.emailVerifiedAt != null,
      isPlatformAdmin: session.user.isPlatformAdmin,
    },
    organization,
    memberships,
  };
}

/** Contexte obligatoire — lève une AppError 401 si absent. */
export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) throw unauthenticated();
  return ctx;
}

/** Contexte + vérification de permission dans l'organisation active. */
export async function requirePermission(permission: Permission): Promise<AuthContext> {
  const ctx = await requireAuth();
  assertCan(ctx.organization.role, permission);
  return ctx;
}

export async function requirePlatformAdmin(): Promise<AuthContext> {
  const ctx = await requireAuth();
  if (!ctx.user.isPlatformAdmin) throw forbidden('Espace réservé à l’équipe DEVISIA.');
  return ctx;
}

export async function switchOrganization(organizationId: string): Promise<void> {
  const ctx = await requireAuth();
  const target = ctx.memberships.find((m) => m.organizationId === organizationId);
  if (!target) throw forbidden("Vous n'appartenez pas à cette organisation.");
  const store = await cookies();
  store.set(ORG_COOKIE, organizationId, {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
}

export function clientIpFrom(headerList: Headers): string | null {
  const forwarded = headerList.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? null;
  return headerList.get('x-real-ip');
}

/** Adresse IP de la requête courante (via en-têtes du proxy). */
export async function currentIp(): Promise<string | null> {
  return clientIpFrom(await headers());
}

export function sessionTtlMs() {
  return SESSION_TTL_MS;
}

export function authSecret() {
  return env().AUTH_SECRET;
}
