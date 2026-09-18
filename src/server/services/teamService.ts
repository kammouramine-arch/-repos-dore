import 'server-only';
import type { MemberRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { appUrl } from '@/lib/env';
import { hashToken, generateToken } from '@/lib/auth/tokens';
import { AppError, conflict, forbidden, notFound, validation } from '@/lib/errors';
import { getEmailProvider, teamInvitationEmail } from '@/lib/email';
import { PLANS } from '@/lib/billing/plans';
import { assertCan, type Permission } from '@/lib/auth/permissions';
import type { AuthContext } from '@/lib/auth/session';
import { recordAudit } from './auditService';

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function roleLabel(role: MemberRole, locale: 'fr' | 'en') {
  if (locale === 'en') return role === 'ADMIN' ? 'administrator' : 'member';
  return role === 'ADMIN' ? 'administrateur' : 'membre';
}

function assertPermission(auth: AuthContext, permission: Permission) {
  assertCan(auth.organization.role, permission);
}

async function currentPlan(organizationId: string) {
  const subscription = await prisma.subscription.findUnique({ where: { organizationId }, select: { plan: true } });
  return subscription?.plan ?? 'ESSENTIEL';
}

async function ensureTeamAccess(organizationId: string) {
  const plan = await currentPlan(organizationId);
  if (!PLANS[plan].features.team) {
    throw new AppError('PLAN_LIMIT', `Les espaces d’équipe sont disponibles à partir de la formule Pro. Passez à une formule supérieure pour inviter un collaborateur.`);
  }
  return plan;
}

export async function teamOverview(organizationId: string) {
  const plan = await currentPlan(organizationId);
  await prisma.teamInvitation.updateMany({
    where: { organizationId, status: 'PENDING', expiresAt: { lte: new Date() } },
    data: { status: 'EXPIRED' },
  });
  const [members, invitations] = await Promise.all([
    prisma.organizationMember.findMany({ where: { organizationId, deletedAt: null }, include: { user: { select: { id: true, email: true, firstName: true, lastName: true, locale: true } } }, orderBy: { createdAt: 'asc' } }),
    prisma.teamInvitation.findMany({ where: { organizationId, status: 'PENDING' }, orderBy: { createdAt: 'desc' } }),
  ]);
  return {
    plan,
    seats: PLANS[plan].limits.seats,
    usedSeats: members.length,
    pendingSeats: invitations.length,
    members,
    invitations,
  };
}

async function ensureSeatAvailable(organizationId: string) {
  const plan = await ensureTeamAccess(organizationId);
  const limit = PLANS[plan].limits.seats;
  const [members, pending] = await Promise.all([
    prisma.organizationMember.count({ where: { organizationId, deletedAt: null } }),
    prisma.teamInvitation.count({ where: { organizationId, status: 'PENDING', expiresAt: { gt: new Date() } } }),
  ]);
  if (members + pending >= limit) {
    throw new AppError('PLAN_LIMIT', `Votre formule inclut ${limit} utilisateur${limit > 1 ? 's' : ''}. Libérez une place ou passez à la formule supérieure.`);
  }
  return plan;
}

async function ensureAcceptanceSeat(organizationId: string) {
  const plan = await ensureTeamAccess(organizationId);
  const activeMembers = await prisma.organizationMember.count({ where: { organizationId, deletedAt: null } });
  if (activeMembers >= PLANS[plan].limits.seats) {
    throw new AppError('PLAN_LIMIT', `Votre formule inclut ${PLANS[plan].limits.seats} utilisateur${PLANS[plan].limits.seats > 1 ? 's' : ''}. Passez à la formule supérieure pour accepter cette invitation.`);
  }
}

async function sendInvitationEmail(input: { email: string; organizationName: string; role: MemberRole; token: string; locale: 'fr' | 'en' }) {
  const provider = getEmailProvider();
  const sent = await provider.send({
    to: input.email,
    ...teamInvitationEmail({ organizationName: input.organizationName, roleLabel: roleLabel(input.role, input.locale), url: appUrl(`/invitation/${encodeURIComponent(input.token)}`), locale: input.locale }),
  });
  if (!sent.delivered) throw new AppError('PROVIDER_UNAVAILABLE', 'L’invitation n’a pas pu être envoyée. Vérifiez la configuration email puis réessayez.');
}

export async function inviteMember(auth: AuthContext, rawEmail: string, role: MemberRole, ip?: string | null) {
  assertPermission(auth, 'member:invite');
  if (auth.organization.role === 'ADMIN' && role !== 'MEMBER') throw forbidden('Un administrateur peut inviter uniquement un membre.');
  if (role === 'OWNER') throw validation('Le rôle propriétaire ne peut pas être attribué par invitation.');
  const email = normalizeEmail(rawEmail);
  if (!email || !email.includes('@')) throw validation('Saisissez une adresse email valide.');
  await ensureSeatAvailable(auth.organization.organizationId);
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, locale: true, memberships: { where: { organizationId: auth.organization.organizationId, deletedAt: null }, select: { id: true } } } });
  if (existing?.memberships.length) throw conflict('Cette personne est déjà membre de votre espace.');
  const pending = await prisma.teamInvitation.findFirst({ where: { organizationId: auth.organization.organizationId, email, status: 'PENDING', expiresAt: { gt: new Date() } } });
  if (pending) throw conflict('Une invitation est déjà en attente pour cette adresse.');

  const token = generateToken(32);
  const invitation = await prisma.teamInvitation.create({ data: { organizationId: auth.organization.organizationId, email, role, tokenHash: hashToken(token), invitedById: auth.user.id, expiresAt: new Date(Date.now() + INVITATION_TTL_MS) }, include: { organization: { select: { name: true } } } });
  try {
    await sendInvitationEmail({ email, organizationName: invitation.organization.name, role, token, locale: existing?.locale ?? 'fr' });
  } catch (error) {
    await prisma.teamInvitation.update({ where: { id: invitation.id }, data: { status: 'REVOKED' } }).catch(() => undefined);
    throw error;
  }
  await recordAudit({ action: 'member.invited', organizationId: auth.organization.organizationId, userId: auth.user.id, entityType: 'TeamInvitation', entityId: invitation.id, ip, metadata: { email, role } });
  return invitation;
}

async function getInvitation(id: string, organizationId: string) {
  const invitation = await prisma.teamInvitation.findFirst({ where: { id, organizationId }, include: { organization: { select: { name: true } } } });
  if (!invitation) throw notFound('Invitation introuvable.');
  return invitation;
}

export async function resendInvitation(auth: AuthContext, id: string, ip?: string | null) {
  assertPermission(auth, 'member:invite');
  const invitation = await getInvitation(id, auth.organization.organizationId);
  if (invitation.status !== 'PENDING') throw conflict('Cette invitation n’est plus active.');
  const token = generateToken(32);
  const previousTokenHash = invitation.tokenHash;
  const previousExpiresAt = invitation.expiresAt;
  const updated = await prisma.teamInvitation.update({ where: { id }, data: { tokenHash: hashToken(token), expiresAt: new Date(Date.now() + INVITATION_TTL_MS) }, include: { organization: { select: { name: true } } } });
  try {
    const user = await prisma.user.findUnique({ where: { email: updated.email }, select: { locale: true } });
    await sendInvitationEmail({ email: updated.email, organizationName: updated.organization.name, role: updated.role, token, locale: user?.locale ?? 'fr' });
  } catch (error) {
    await prisma.teamInvitation.update({ where: { id }, data: { tokenHash: previousTokenHash, expiresAt: previousExpiresAt } }).catch(() => undefined);
    throw error;
  }
  await recordAudit({ action: 'member.invited', organizationId: auth.organization.organizationId, userId: auth.user.id, entityType: 'TeamInvitation', entityId: id, ip, metadata: { email: updated.email, role: updated.role, resend: true } });
  return updated;
}

export async function cancelInvitation(auth: AuthContext, id: string, ip?: string | null) {
  assertPermission(auth, 'member:invite');
  const invitation = await getInvitation(id, auth.organization.organizationId);
  if (invitation.status !== 'PENDING') throw conflict('Cette invitation n’est plus active.');
  const updated = await prisma.teamInvitation.update({ where: { id }, data: { status: 'REVOKED' } });
  await recordAudit({ action: 'member.removed', organizationId: auth.organization.organizationId, userId: auth.user.id, entityType: 'TeamInvitation', entityId: id, ip, metadata: { email: invitation.email, cancelled: true } });
  return updated;
}

export async function changeMemberRole(auth: AuthContext, memberId: string, role: MemberRole, ip?: string | null) {
  assertPermission(auth, 'member:role');
  if (role === 'OWNER') throw validation('Le transfert de propriété doit être réalisé par une procédure dédiée.');
  const member = await prisma.organizationMember.findFirst({ where: { id: memberId, organizationId: auth.organization.organizationId, deletedAt: null }, include: { user: { select: { email: true } } } });
  if (!member) throw notFound('Membre introuvable.');
  if (member.role === 'OWNER') throw forbidden('Le propriétaire ne peut pas être rétrogradé ici.');
  const updated = await prisma.organizationMember.update({ where: { id: memberId }, data: { role } });
  await recordAudit({ action: 'member.role_changed', organizationId: auth.organization.organizationId, userId: auth.user.id, entityType: 'OrganizationMember', entityId: memberId, ip, metadata: { role, email: member.user.email } });
  return updated;
}

export async function removeMember(auth: AuthContext, memberId: string, ip?: string | null) {
  assertPermission(auth, 'member:remove');
  const member = await prisma.organizationMember.findFirst({ where: { id: memberId, organizationId: auth.organization.organizationId, deletedAt: null }, include: { user: { select: { email: true } } } });
  if (!member) throw notFound('Membre introuvable.');
  if (member.role === 'OWNER') throw forbidden('Le propriétaire ne peut pas être supprimé de son propre espace.');
  if (auth.organization.role === 'ADMIN' && member.role !== 'MEMBER') throw forbidden('Un administrateur peut supprimer uniquement un membre.');
  const updated = await prisma.organizationMember.update({ where: { id: memberId }, data: { deletedAt: new Date() } });
  await recordAudit({ action: 'member.removed', organizationId: auth.organization.organizationId, userId: auth.user.id, entityType: 'OrganizationMember', entityId: memberId, ip, metadata: { email: member.user.email } });
  return updated;
}

export async function invitationPreview(token: string) {
  const invitation = await prisma.teamInvitation.findUnique({ where: { tokenHash: hashToken(token) }, include: { organization: { select: { name: true } } } });
  if (!invitation || invitation.status !== 'PENDING' || invitation.expiresAt <= new Date()) throw validation('Cette invitation est invalide ou expirée.');
  return { id: invitation.id, organizationId: invitation.organizationId, email: invitation.email, role: invitation.role, organizationName: invitation.organization.name, expiresAt: invitation.expiresAt };
}

export async function acceptInvitation(auth: AuthContext, token: string, ip?: string | null) {
  const normalized = normalizeEmail(auth.user.email);
  const invitation = await prisma.teamInvitation.findUnique({ where: { tokenHash: hashToken(token) }, include: { organization: { select: { id: true, name: true } } } });
  if (!invitation || invitation.status === 'REVOKED' || invitation.expiresAt <= new Date()) throw validation('Cette invitation est invalide ou expirée.');
  if (invitation.status === 'ACCEPTED') throw conflict('Cette invitation a déjà été utilisée.');
  if (invitation.status !== 'PENDING') throw validation('Cette invitation est invalide ou expirée.');
  if (invitation.email !== normalized) throw forbidden('Cette invitation a été envoyée à une autre adresse email.');
  const existingMembership = await prisma.organizationMember.findUnique({ where: { organizationId_userId: { organizationId: invitation.organizationId, userId: auth.user.id } }, select: { deletedAt: true } });
  if (!existingMembership || existingMembership.deletedAt) await ensureAcceptanceSeat(invitation.organizationId);

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.organizationMember.findUnique({ where: { organizationId_userId: { organizationId: invitation.organizationId, userId: auth.user.id } } });
    if (existing?.deletedAt) {
      await tx.organizationMember.update({ where: { id: existing.id }, data: { deletedAt: null, role: invitation.role } });
    } else if (!existing) {
      await tx.organizationMember.create({ data: { organizationId: invitation.organizationId, userId: auth.user.id, role: invitation.role } });
    }
    return tx.teamInvitation.updateMany({ where: { id: invitation.id, status: 'PENDING' }, data: { status: 'ACCEPTED', acceptedAt: new Date() } });
  });
  if (result.count !== 1) throw conflict('Cette invitation a déjà été utilisée.');
  await recordAudit({ action: 'member.invited', organizationId: invitation.organizationId, userId: auth.user.id, entityType: 'TeamInvitation', entityId: invitation.id, ip, metadata: { accepted: true } });
  return { organizationId: invitation.organization.id, organizationName: invitation.organization.name, role: invitation.role };
}

export async function acceptInvitationForNewUser(userId: string, token: string) {
  const invitation = await prisma.teamInvitation.findUnique({ where: { tokenHash: hashToken(token) }, include: { organization: true } });
  if (!invitation || invitation.status === 'REVOKED' || invitation.expiresAt <= new Date()) throw validation('Cette invitation est invalide ou expirée.');
  if (invitation.status === 'ACCEPTED') throw conflict('Cette invitation a déjà été utilisée.');
  if (invitation.status !== 'PENDING') throw validation('Cette invitation est invalide ou expirée.');
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
  if (normalizeEmail(user.email) !== invitation.email) throw forbidden('Cette invitation a été envoyée à une autre adresse email.');
  await ensureAcceptanceSeat(invitation.organizationId);
  const result = await prisma.$transaction(async (tx) => {
    await tx.organizationMember.create({ data: { organizationId: invitation.organizationId, userId, role: invitation.role } });
    return tx.teamInvitation.updateMany({ where: { id: invitation.id, status: 'PENDING' }, data: { status: 'ACCEPTED', acceptedAt: new Date() } });
  });
  if (result.count !== 1) throw conflict('Cette invitation a déjà été utilisée.');
  return invitation.organization;
}
