import { headers } from 'next/headers';
import { z } from 'zod';
import { ok, parseBody, route } from '@/server/api';
import { requireAuth, requirePermission, clientIpFrom } from '@/lib/auth/session';
import { teamOverview, inviteMember } from '@/server/services/teamService';

const roleSchema = z.enum(['ADMIN', 'MEMBER']);

export async function GET() {
  return route(async () => {
    const auth = await requirePermission('settings:read');
    const overview = await teamOverview(auth.organization.organizationId);
    return ok({
      plan: overview.plan,
      seats: overview.seats,
      usedSeats: overview.usedSeats,
      pendingSeats: overview.pendingSeats,
      members: overview.members.map((member) => ({ id: member.id, userId: member.user.id, email: member.user.email, firstName: member.user.firstName, lastName: member.user.lastName, locale: member.user.locale, role: member.role, createdAt: member.createdAt.toISOString() })),
      invitations: overview.invitations.map((invitation) => ({ id: invitation.id, email: invitation.email, role: invitation.role, status: invitation.status, expiresAt: invitation.expiresAt.toISOString(), createdAt: invitation.createdAt.toISOString() })),
    });
  });
}

export async function POST(request: Request) {
  return route(async () => {
    const auth = await requirePermission('member:invite');
    const body = await parseBody(request, z.object({ email: z.string().trim().email().max(254), role: roleSchema.default('MEMBER') }).strict());
    const invitation = await inviteMember(auth, body.email, body.role, clientIpFrom(await headers()));
    return ok({ invitation: { id: invitation.id, email: invitation.email, role: invitation.role, expiresAt: invitation.expiresAt.toISOString() } }, { status: 201 });
  });
}

export async function OPTIONS() {
  return route(async () => {
    await requireAuth();
    return ok({ allowed: true });
  });
}
