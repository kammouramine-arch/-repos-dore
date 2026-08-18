import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requirePermission } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '@/lib/auth/permissions';
import { PLANS } from '@/lib/billing/plans';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/feedback';
import { formatDate } from '@/lib/i18n';
import { initials } from '@/lib/utils';

export const metadata: Metadata = { title: 'Équipe' };

export default async function TeamPage() {
  const auth = await requirePermission('settings:read');
  const organizationId = auth.organization.organizationId;

  const [members, invitations, subscription] = await Promise.all([
    prisma.organizationMember.findMany({
      where: { organizationId, deletedAt: null },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.teamInvitation.findMany({
      where: { organizationId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.subscription.findUnique({ where: { organizationId } }),
  ]);

  const plan = subscription?.plan ?? 'ESSENTIEL';
  const seats = PLANS[plan].limits.seats;

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
        <p className="mt-1.5 text-[14px] text-muted">
          {members.length} membre{members.length > 1 ? 's' : ''} sur {seats} inclus dans la formule{' '}
          {PLANS[plan].name}.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Membres</CardTitle>
        </CardHeader>
        <CardContent className="pt-1">
          <ul className="divide-y divide-line">
            {members.map((member) => (
              <li key={member.id} className="flex items-center justify-between gap-4 py-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[12.5px] font-semibold text-accent">
                    {initials(member.user.firstName, member.user.lastName) ||
                      initials(member.user.email)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-ink">
                      {[member.user.firstName, member.user.lastName].filter(Boolean).join(' ') ||
                        member.user.email}
                    </p>
                    <p className="truncate text-[12.5px] text-muted">{member.user.email}</p>
                  </div>
                </div>
                <Badge tone={member.role === 'OWNER' ? 'accent' : 'outline'}>
                  {ROLE_LABELS[member.role]}
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {invitations.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Invitations en attente</CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <ul className="divide-y divide-line">
              {invitations.map((invitation) => (
                <li key={invitation.id} className="flex items-center justify-between gap-4 py-3">
                  <span className="text-[13.5px] text-ink">{invitation.email}</span>
                  <span className="text-[12.5px] text-subtle">
                    expire le {formatDate(invitation.expiresAt)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

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

      {!PLANS[plan].features.team ? (
        <Alert tone="info">
          La formule {PLANS[plan].name} est prévue pour un utilisateur. Passez en formule Pro ou
          Entreprise pour inviter votre équipe.
        </Alert>
      ) : null}
    </div>
  );
}
