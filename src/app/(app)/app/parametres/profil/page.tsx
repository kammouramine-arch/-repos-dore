import type { Metadata } from 'next';
import { Globe } from 'lucide-react';
import { requireAuth } from '@/lib/auth/page-session';
import { readAvatar } from '@/server/services/avatarService';
import { PageHeader } from '@/components/ui/page';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getTranslations } from '@/lib/i18n';
import { LocaleSwitcher } from '../locale-switcher';
import { AvatarForm, EmailForm, NameForm, PasswordCard } from './forms';

export const metadata: Metadata = { title: 'Mon profil' };

/**
 * Mon profil : identité, adresse de connexion, langue, photo, mot de passe.
 * Mêmes appels d'API que « Mon compte » sur iPhone.
 */
export default async function ProfilePage() {
  const auth = await requireAuth();
  const { locale, t } = await getTranslations();
  const avatar = await readAvatar(auth.user.id).catch(() => ({ image: null }));

  return (
    <div className="space-y-6">
      <PageHeader title={t.settings.profile} description={t.settings.profileHint} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>{t.settings.identity}</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <NameForm firstName={auth.user.firstName ?? ''} lastName={auth.user.lastName ?? ''} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.settings.loginEmail}</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <EmailForm email={auth.user.email} verified={auth.user.emailVerified} />
            </CardContent>
          </Card>

          <PasswordCard email={auth.user.email} />
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>{t.settings.photo}</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <AvatarForm initial={avatar.image} name={[auth.user.firstName, auth.user.lastName].filter(Boolean).join(' ') || auth.user.email} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-subtle" aria-hidden />
                {t.settings.language}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              <p className="text-[12.5px] text-muted">{t.settings.languageHint}</p>
              <LocaleSwitcher current={locale} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
