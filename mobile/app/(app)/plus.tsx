import * as React from 'react';
import { Alert, Linking, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { PLANS, accessStateFor } from '@devisia/shared';
import { Button, Caption, Screen } from '@/components/ui';
import { IdentityHeader, SettingsGroup, SettingsRow, StatusChip } from '@/components/settings';
import { BrandBackdrop, useBrandSurface } from '@/components/brand-backdrop';
import { TrialBanner } from '@/components/trial-banner';
import { Stagger } from '@/components/motion';
import { ProfileAvatar } from '@/components/profile-avatar';
import { useAuth } from '@/lib/auth';
import { API_URL } from '@/lib/api';
import { openReviewPage } from '@/lib/review';
import { copy, mobileLocale } from '@/lib/i18n';
import { colors, spacing } from '@/theme';

export const SUPPORT_EMAIL = 'contact@devisera.fr';

/**
 * « Mon espace » : le centre de contrôle de l'artisan.
 *
 * L'écran précédent renvoyait tout ce qui compte — abonnement, paiements,
 * avis, contact, suppression du compte — au fond de « Mon compte », derrière
 * des formulaires. Ici, chaque zone est visible d'un coup d'œil, groupée par
 * intention : compte, abonnement, outils, assistance, légal, puis la zone
 * sensible. Les lignes portent l'action ; l'identité tient sur la surface de
 * marque, comme l'accueil.
 */
export default function PlusScreen() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const locale = mobileLocale(session);
  const en = locale === 'en';
  const surface = useBrandSurface('settings');
  const access = accessStateFor(session?.subscription ?? null);
  const subscription = session?.subscription ?? null;

  const fullName = [session?.user.firstName, session?.user.lastName].filter(Boolean).join(' ').trim();
  const business = session?.organization.name ?? '';
  const name = fullName || business || (en ? 'Your workspace' : 'Votre atelier');
  const initial = (fullName || business || session?.user.email || 'D').trim().charAt(0).toUpperCase();

  const planLabel = subscription
    ? `${PLANS[subscription.plan].name}${access.inTrial ? ` · ${en ? 'trial' : 'essai'}` : subscription.status === 'active' ? '' : subscription.status === 'incomplete' ? ` · ${en ? 'to activate' : 'à activer'}` : ''}`
    : (en ? 'No plan yet' : 'Aucune formule');

  const contact = () => {
    const subject = encodeURIComponent('DEVISERA');
    const body = encodeURIComponent(`${en ? 'Hello' : 'Bonjour'},\n\n\n\n—\nDEVISERA 1.0.0 · ${session?.user.locale ?? locale}${session ? ` · ${session.user.id}` : ''}`);
    void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`).catch(() => undefined);
  };
  const openPage = (path: string) => void WebBrowser.openBrowserAsync(`${API_URL}${path}`).catch(() => Linking.openURL(`${API_URL}${path}`));

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <BrandBackdrop height={surface.gradientHeight} />
      <Screen transparent contentStyle={{ paddingTop: surface.paddingTop }}>
        <IdentityHeader
          initial={initial}
          avatar={<ProfileAvatar key={session?.user.id} initial={initial} en={en} />}
          name={name}
          subtitle={fullName ? business || session?.user.email : session?.user.email}
          chips={
            <>
              <StatusChip onLight icon="card-outline" label={planLabel} />
              <StatusChip onLight icon={session?.user.emailVerified ? 'checkmark-circle' : 'alert-circle'} label={copy(locale, session?.user.emailVerified ? 'verifiedEmail' : 'unverifiedEmail')} />
            </>
          }
        />

        <TrialBanner subscription={subscription} />

        <Stagger step={45} initial={30} distance={8}>
        <SettingsGroup onBrand title={en ? 'Account' : 'Compte'}>
          <SettingsRow icon="person-outline" title={copy(locale, 'personalInfo')} subtitle={en ? 'Name, email and language' : 'Nom, email et langue'} onPress={() => router.push('/compte')} />
          <SettingsRow icon="business-outline" title={copy(locale, 'business')} subtitle={en ? 'Identity, tax and quote details' : 'Identité, TVA, mentions du devis'} onPress={() => router.push('/entreprise')} />
        </SettingsGroup>

        <SettingsGroup title={en ? 'Subscription & payments' : 'Abonnement et paiements'}>
          <SettingsRow icon="card-outline" title={copy(locale, 'manageSubscription')} subtitle={en ? 'Plan, trial and renewal' : 'Formule, essai et renouvellement'} value={subscription ? PLANS[subscription.plan].name : null} onPress={() => router.push('/abonnement')} />
          <SettingsRow icon="receipt-outline" title={copy(locale, 'invoices')} subtitle={en ? 'History and receipts' : 'Historique et reçus'} onPress={() => router.push('/paiements')} />
        </SettingsGroup>

        <SettingsGroup title={copy(locale, 'tools')}>
          <SettingsRow icon="book-outline" title={copy(locale, 'pricing')} subtitle={en ? 'Your services and prices' : 'Vos prestations et vos tarifs'} onPress={() => router.push('/catalogue')} />
          <SettingsRow icon="bar-chart-outline" title={copy(locale, 'analytics')} subtitle={en ? 'Revenue and quote tracking' : 'Chiffre d’affaires et suivi des devis'} onPress={() => router.push('/analytique')} />
          <SettingsRow icon="sparkles-outline" title={copy(locale, 'discover')} subtitle={en ? 'Overview and plans' : 'Présentation et formules'} onPress={() => router.push('/presentation')} />
        </SettingsGroup>

        <SettingsGroup title={copy(locale, 'assistance')}>
          <SettingsRow icon="mail-outline" title={copy(locale, 'contact')} subtitle={SUPPORT_EMAIL} onPress={contact} />
          <SettingsRow icon="star-outline" title={copy(locale, 'rate')} subtitle={en ? 'Two minutes that really help us' : 'Deux minutes qui nous aident vraiment'} onPress={() => void openReviewPage()} />
        </SettingsGroup>

        <SettingsGroup title={copy(locale, 'legal')}>
          <SettingsRow icon="shield-checkmark-outline" title={copy(locale, 'privacy')} onPress={() => openPage('/confidentialite')} />
          <SettingsRow icon="document-text-outline" title={copy(locale, 'terms')} onPress={() => openPage('/conditions')} />
          <SettingsRow icon="information-circle-outline" title={en ? 'Legal notices' : 'Mentions légales'} onPress={() => openPage('/mentions-legales')} />
        </SettingsGroup>

        <SettingsGroup title={copy(locale, 'dangerZone')} footer={en ? 'Deleting your account is permanent. Business records may be kept where the law or another team member requires it.' : 'La suppression est définitive. Les données commerciales peuvent être conservées lorsqu’une obligation légale ou un autre membre de l’entreprise l’exige.'}>
          <SettingsRow icon="trash-outline" title={copy(locale, 'deleteAccount')} destructive onPress={() => router.push('/suppression')} />
        </SettingsGroup>

        <Button
          title={copy(locale, 'signOut')}
          variant="secondary"
          icon="log-out-outline"
          onPress={() =>
            Alert.alert(
              en ? 'Sign out?' : 'Se déconnecter ?',
              en ? 'You will need your password next time.' : 'Vous devrez saisir votre mot de passe à la prochaine ouverture.',
              [
                { text: en ? 'Cancel' : 'Annuler', style: 'cancel' },
                { text: copy(locale, 'signOut'), style: 'destructive', onPress: () => void signOut() },
              ],
            )
          }
        />

        </Stagger>
        <Caption style={{ color: colors.subtle, textAlign: 'center' }}>DEVISERA · version 1.0.0</Caption>
        <View style={{ height: spacing.xl }} />
      </Screen>
    </View>
  );
}
