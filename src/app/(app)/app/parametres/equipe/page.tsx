import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requirePermission } from '@/lib/auth/page-session';
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '@/lib/auth/permissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TeamControls } from './team-controls';
import { teamOverview } from '@/server/services/teamService';

export const metadata: Metadata = { title: 'Équipe' };

export default async function TeamPage() {
  const auth = await requirePermission('settings:read');
  const overview = await teamOverview(auth.organization.organizationId);
  const members = overview.members.map((member) => ({ id: member.id, email: member.user.email, firstName: member.user.firstName, lastName: member.user.lastName, role: member.role, createdAt: member.createdAt.toISOString() }));
  const invitations = overview.invitations.map((invitation) => ({ id: invitation.id, email: invitation.email, role: invitation.role as 'ADMIN' | 'MEMBER', expiresAt: invitation.expiresAt.toISOString(), createdAt: invitation.createdAt.toISOString() }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/app/parametres"
        className="inline-flex items-center gap-1.5 text-[13.5px] text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Paramètres
      </Link>

      <header>
        <h1 className="text-[22px] font-semibold tracking-[-0.025em] text-ink sm:text-[26px]">Équipe</h1>
        <p className="mt-1.5 text-[14px] text-muted">Partagez votre espace DEVISERA avec les personnes qui font avancer vos chantiers.</p>
      </header>
      <TeamControls plan={overview.plan} seats={overview.seats} usedSeats={overview.usedSeats} pendingSeats={overview.pendingSeats} members={members} invitations={invitations} currentRole={auth.organization.role} />

      <Card>
        <CardHeader>
          <CardTitle>Rôles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-1">
          {(['OWNER', 'ADMIN', 'MEMBER'] as const).map((role) => (
            <div key={role}>
              <p className="text-[13.5px] font-medium text-ink">{ROLE_LABELS[role]}</p>
              <p className="text-[13px] leading-relaxed text-muted">{ROLE_DESCRIPTIONS[role]}</p>
            </div>
          ))}
        </CardContent>
      </Card>

    </div>
  );
}
