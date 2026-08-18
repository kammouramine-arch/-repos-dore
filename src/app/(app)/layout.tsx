import { redirect } from 'next/navigation';
import { getAuthContext, switchOrganization } from '@/lib/auth/session';
import { ROLE_LABELS } from '@/lib/auth/permissions';
import { countUnread } from '@/server/services/notificationService';
import { AppShell, type ShellUser } from '@/components/app/shell';
import { LocaleHtml } from '@/components/app/locale-html';
import { getLocale } from '@/lib/i18n';
import { signOutAction } from '../(auth)/actions';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuthContext();
  if (!auth) redirect('/connexion');

  const [unread, locale] = await Promise.all([
    countUnread(auth.organization.organizationId),
    getLocale(),
  ]);

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
    <AppShell
      user={user}
      unreadCount={unread}
      onSignOut={signOutAction}
      onSwitchOrganization={handleSwitch}
    >
      <LocaleHtml locale={locale} />
      {children}
    </AppShell>
  );
}
