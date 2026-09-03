import { redirect } from 'next/navigation';
import { getAuthContext, switchOrganization } from '@/lib/auth/session';
import { ROLE_LABELS } from '@/lib/auth/permissions';
import { countUnread } from '@/server/services/notificationService';
import { prisma } from '@/lib/prisma';
import { SubscriptionBanner } from '@/components/app/subscription-banner';
import { AppShell, type ShellUser } from '@/components/app/shell';
import { LocaleHtml } from '@/components/app/locale-html';
import { getDictionary, getLocale } from '@/lib/i18n';
import { I18nProvider } from '@/lib/i18n/context';
import { signOutAction } from '../(auth)/actions';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuthContext();
  if (!auth) redirect('/connexion');

  const [unread, locale, subscription] = await Promise.all([
    countUnread(auth.organization.organizationId),
    getLocale(),
    prisma.subscription.findUnique({
      where: { organizationId: auth.organization.organizationId },
      select: {
        plan: true,
        status: true,
        trialEndsAt: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
      },
    }),
  ]);

  const dictionary = getDictionary(locale);

  const user: ShellUser = {
    name: [auth.user.firstName, auth.user.lastName].filter(Boolean).join(' ') || auth.user.email,
    email: auth.user.email,
    organizationName: auth.organization.organizationName,
    roleLabel: ROLE_LABELS[auth.organization.role],
    organizations: auth.memberships.map((membership) => ({
      id: membership.organizationId,
      name: membership.organizationName,
      current: membership.organizationId === auth.organization.organizationId,
    })),
  };

  async function handleSwitch(organizationId: string) {
    'use server';
    await switchOrganization(organizationId);
    redirect('/app');
  }

  return (
    <I18nProvider locale={locale} dictionary={dictionary}>
      <AppShell
      user={user}
      unreadCount={unread}
      onSignOut={signOutAction}
      onSwitchOrganization={handleSwitch}
    >
      <LocaleHtml locale={locale} />
      <SubscriptionBanner
        subscription={
          subscription
            ? {
                plan: subscription.plan,
                status: subscription.status,
                trialEndsAt: subscription.trialEndsAt?.toISOString() ?? null,
                currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
                cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
              }
            : null
        }
      />
      {children}
      </AppShell>
    </I18nProvider>
  );
}
