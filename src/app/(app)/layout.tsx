import { redirect } from 'next/navigation';
import { getAuthContext, switchOrganization } from '@/lib/auth/session';
import { ROLE_LABELS } from '@/lib/auth/permissions';
import { countUnread } from '@/server/services/notificationService';
import { revenueToRecover } from '@/server/services/followUpService';
import { readAvatar } from '@/server/services/avatarService';
import { prisma } from '@/lib/prisma';
import { PLANS, accessStateFor, type SubscriptionSnapshot } from '@devisia/shared';
import { SubscriptionBanner } from '@/components/app/subscription-banner';
import { AppShell, type NavCounts, type ShellUser } from '@/components/app/shell';
import { LocaleHtml } from '@/components/app/locale-html';
import { getDictionary, getLocale, type Dictionary } from '@/lib/i18n';
import { I18nProvider } from '@/lib/i18n/context';
import { signOutAction } from '../(auth)/actions';

export const dynamic = 'force-dynamic';

/** « essai · 2 j », « actif », « à régulariser » : l'état de la formule en un mot. */
function planStateLabel(snapshot: SubscriptionSnapshot | null, t: Dictionary): string {
  if (!snapshot) return t.common.noPlan;
  const access = accessStateFor(snapshot);
  if (access.paymentIssue) return t.common.toRegularize;
  if (access.inTrial) return `${t.common.trial} · ${access.trialDaysLeft} j`;
  if (snapshot.status === 'active') return t.common.active;
  if (snapshot.status === 'canceled') return t.common.canceled;
  if (snapshot.status === 'incomplete') return t.common.incomplete;
  return t.common.trial;
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuthContext();
  if (!auth) redirect('/connexion');
  // A valid session does not prove mailbox ownership. Keep browser sessions
  // behind the same verification gate as mobile instead of rendering the
  // workspace and relying on client-side hiding.
  if (!auth.user.emailVerified) redirect('/verification?pending=1');

  const organizationId = auth.organization.organizationId;
  const [unread, locale, subscription, toRecover, newLeads, avatar] = await Promise.all([
    countUnread(organizationId),
    getLocale(),
    prisma.subscription.findUnique({
      where: { organizationId },
      select: {
        plan: true,
        status: true,
        trialEndsAt: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        appleProductId: true,
        stripeSubscriptionId: true,
      },
    }),
    revenueToRecover(organizationId),
    prisma.lead.count({ where: { organizationId, deletedAt: null, status: 'NOUVEAU' } }),
    readAvatar(auth.user.id).catch(() => null),
  ]);

  const dictionary = getDictionary(locale);
  const snapshot: SubscriptionSnapshot | null = subscription
    ? {
        provider: subscription.appleProductId ? 'apple' : subscription.stripeSubscriptionId ? 'stripe' : 'trial',
        plan: subscription.plan,
        status: subscription.status,
        trialEndsAt: subscription.trialEndsAt?.toISOString() ?? null,
        currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      }
    : null;
  const plan = subscription?.plan ?? 'ESSENTIEL';

  const user: ShellUser = {
    name: [auth.user.firstName, auth.user.lastName].filter(Boolean).join(' ') || auth.user.email,
    email: auth.user.email,
    organizationName: auth.organization.organizationName,
    roleLabel: ROLE_LABELS[auth.organization.role],
    plan,
    planState: planStateLabel(snapshot, dictionary),
    teamUnlocked: PLANS[plan].features.team,
    avatarUrl: avatar?.image ?? null,
    organizations: auth.memberships.map((membership) => ({
      id: membership.organizationId,
      name: membership.organizationName,
      current: membership.organizationId === organizationId,
    })),
  };

  const counts: NavCounts = { followUps: toRecover.quoteCount, leads: newLeads };

  async function handleSwitch(organizationId: string) {
    'use server';
    await switchOrganization(organizationId);
    redirect('/app');
  }

  return (
    <I18nProvider locale={locale} dictionary={dictionary}>
      <AppShell
        user={user}
        counts={counts}
        unreadCount={unread}
        onSignOut={signOutAction}
        onSwitchOrganization={handleSwitch}
      >
        <LocaleHtml locale={locale} />
        <SubscriptionBanner subscription={snapshot} />
        {children}
      </AppShell>
    </I18nProvider>
  );
}
