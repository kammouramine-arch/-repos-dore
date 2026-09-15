import type { Metadata } from 'next';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { requirePermission } from '@/lib/auth/page-session';
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '@/lib/auth/permissions';
import { PLANS } from '@/lib/billing/plans';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page';
import { Button } from '@/components/ui/button';
import { getTranslations } from '@/lib/i18n';
import { TeamControls } from './team-controls';
import { teamOverview } from '@/server/services/teamService';

export const metadata: Metadata = { title: 'Équipe' };

/** Équipe : membres, invitations, rôles. Verrouillée par la formule, jamais cachée. */
export default async function TeamPage() {
  const auth = await requirePermission('settings:read');
  const { t } = await getTranslations();
  const overview = await teamOverview(auth.organization.organizationId);
  const unlocked = PLANS[overview.plan].features.team;
  const members = overview.members.map((member) => ({ id: member.id, email: member.user.email, firstName: member.user.firstName, lastName: member.user.lastName, role: member.role, createdAt: member.createdAt.toISOString() }));
  const invitations = overview.invitations.map((invitation) => ({ id: invitation.id, email: invitation.email, role: invitation.role as 'ADMIN' | 'MEMBER', expiresAt: invitation.expiresAt.toISOString(), createdAt: invitation.createdAt.toISOString() }));

  return (
    <div className="space-y-6">
      <PageHeader title={t.settings.team} description="Partagez votre atelier DEVISERA avec les personnes qui font avancer vos chantiers." />

      {!unlocked ? (
        <Card className="border-accent-border bg-accent-soft/40">
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-canvas text-accent">
                <Lock className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-[14.5px] font-semibold text-ink">Les équipes commencent avec Pro</p>
                <p className="mt-1 max-w-lg text-[13px] leading-relaxed text-muted">
                  Passez à Pro pour inviter jusqu’à {PLANS.PRO.limits.seats} utilisateurs et partager vos devis, clients et quotas IA. Votre formule actuelle reste utilisable seul.
                </p>
              </div>
            </div>
            <Button asChild variant="secondary">
              <Link href="/app/parametres/abonnement">{t.dashboard.openSubscription}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <TeamControls plan={overview.plan} seats={overview.seats} usedSeats={overview.usedSeats} pendingSeats={overview.pendingSeats} members={members} invitations={invitations} currentRole={auth.organization.role} />

      <Card>
        <CardHeader>
          <CardTitle>Rôles</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 pt-1 sm:grid-cols-3">
          {(['OWNER', 'ADMIN', 'MEMBER'] as const).map((role) => (
            <div key={role} className="rounded-[12px] bg-surface px-4 py-3">
              <p className="text-[13.5px] font-semibold text-ink">{ROLE_LABELS[role]}</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{ROLE_DESCRIPTIONS[role]}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
