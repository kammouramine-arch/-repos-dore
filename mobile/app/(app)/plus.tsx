import * as React from 'react';
import Constants from 'expo-constants';
import { Alert, Linking, Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { PLANS, accessStateFor } from '@devisia/shared';
import { Button, Caption, Screen } from '@/components/ui';
import { IdentityHeader, SettingsGroup, SettingsRow, StatusChip } from '@/components/settings';
import { BrandBackdrop, BrandHeader, useBrandScroll, useBrandSurface } from '@/components/brand-backdrop';
import { TrialBanner } from '@/components/trial-banner';
import { LanguageSelector } from '@/components/language-selector';
import { Stagger } from '@/components/motion';
import { ProfileAvatar } from '@/components/profile-avatar';
import { useAuth } from '@/lib/auth';
import { API_URL } from '@/lib/api';
import { openReviewPage } from '@/lib/review';
import { copy, useMobileLocale } from '@/lib/i18n';
import { cachedAppleProducts } from '@/lib/apple-purchases';
import { googleSignInAvailable } from '@/lib/social-auth';
import { useTabBarSpace } from '@/components/glass-tab-bar';
import { useAppearance } from '@/lib/appearance';
import { BRAND_HEADER_SOLID } from '@/theme/gradient';
import { colors, spacing } from '@/theme';

export const SUPPORT_EMAIL = 'contact@devisera.fr';

/**
 * « Mon compte » : ce qui relève du compte, et rien d'autre.
 *
 * L'écran portait à la fois les réglages personnels et les fonctions du
 * produit — reçus, export comptable, marque. Ce mélange était la vraie
 * raison pour laquelle personne ne les trouvait : on ne cherche pas le scan
 * de justificatifs entre la langue de l'application et la suppression du
 * compte. Les fonctions sont parties dans l'onglet Outils ; ici restent le
 * profil, l'entreprise, l'abonnement, la langue, l'assistance et le légal.
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
  const locale = useMobileLocale();
  const en = locale === 'en';
  const surface = useBrandSurface('settings');
  const tabBarSpace = useTabBarSpace();
  const brandScroll = useBrandScroll();

  /*
   * Hauteur du bandeau, déduite de l'en-tête mesuré.
   *
   * L'en-tête doit tenir dans la part où le bleu porte encore du texte blanc
   * (`BRAND_HEADER_SOLID`). Le reste du bandeau est le fondu, et le contenu
   * suivant commence une fois ce fondu terminé — donc en encre sur la surface
   * claire, jamais dans l'entre-deux pâle où tout disparaît.
   */
  const [headerHeight, setHeaderHeight] = React.useState<number | null>(null);
  const headerBottom = headerHeight == null ? null : surface.paddingTop + headerHeight;
  const bandHeight = headerBottom == null
    ? surface.gradientHeight
    : Math.round(headerBottom / BRAND_HEADER_SOLID);
  /** Ce qui reste de fondu sous l'en-tête, à laisser vide. */
  const fadeBelowHeader = headerBottom == null ? 0 : Math.max(0, Math.round(bandHeight - headerBottom - spacing.xl));
  const access = accessStateFor(session?.subscription ?? null);
  const subscription = session?.subscription ?? null;
  const { choice: appearance } = useAppearance();
  const appearanceLabel = appearance === 'system'
    ? (en ? 'Automatic' : 'Automatique')
    : appearance === 'dark'
      ? (en ? 'Dark' : 'Sombre')
      : (en ? 'Light' : 'Clair');

  const fullName = [session?.user.firstName, session?.user.lastName].filter(Boolean).join(' ').trim();
  const business = session?.organization.name ?? '';
  const name = fullName || business || (en ? 'Your workspace' : 'Votre atelier');
  const initial = (fullName || business || session?.user.email || 'D').trim().charAt(0).toUpperCase();

  // « Pro · Essentiel le 11/09 » seulement quand Apple a signé la préférence.
  const pendingLabel = subscription?.pendingPlan && subscription.pendingPlan !== subscription.plan
    ? ` · ${PLANS[subscription.pendingPlan].name}${subscription.pendingAt ? ` ${en ? 'on' : 'le'} ${new Date(subscription.pendingAt).toLocaleDateString(en ? 'en-GB' : 'fr-FR', { day: '2-digit', month: '2-digit' })}` : ''}`
    : '';
  const planLabel = subscription
    ? `${PLANS[subscription.plan].name}${pendingLabel || (access.inTrial ? ` · ${en ? 'trial' : 'essai'}` : subscription.status === 'active' ? '' : subscription.status === 'incomplete' ? ` · ${en ? 'to activate' : 'à activer'}` : '')}`
    : (en ? 'No plan yet' : 'Aucune formule');

  /*
   * « DEVISERA · 1.0.2 · 17d5e81 » : la provenance exacte du binaire.
   *
   * Chaque morceau n'apparaît que s'il existe réellement. L'ancienne version
   * écrivait « (?) » quand le numéro de build n'était pas lisible et
   * « [object Object] » quand `extra` portait autre chose qu'une chaîne :
   * deux façons de montrer à l'utilisateur qu'on n'a pas su lire sa propre
   * application. Mieux vaut ne rien dire que dire ça.
   */
  const buildNumber = Constants.nativeBuildVersion;
  const commit = typeof Constants.expoConfig?.extra?.commit === 'string' ? Constants.expoConfig.extra.commit : null;
  const buildLabel = [
    `DEVISERA · ${Constants.expoConfig?.version ?? '1.0.0'}`,
    buildNumber ? `build ${buildNumber}` : null,
    commit,
    Constants.expoConfig?.extra?.buildProfile === 'testflight-diagnostics' ? 'diagnostics' : null,
  ].filter(Boolean).join(' · ');
  /**
   * Ouvre un message au support, provenance comprise.
   *
   * Le pied du message porte la version, le build, le commit — et l'état réel
   * du catalogue Apple. C'est la seule façon de connaître la métadonnée
   * StoreKit d'un appareil donné : elle n'existe que là, aucun serveur ne peut
   * la lire à distance. Quand un prix surprend, la réponse est dans ces trois
   * lignes plutôt que dans une série de questions.
   *
   * Invisible tant qu'on n'écrit pas au support : rien de tout cela n'est
   * affiché dans l'interface.
   */
  const contact = () => {
    const catalogue = cachedAppleProducts();
    const storeLines = catalogue
      ? catalogue.products
          .map((product) => `${product.id} · ${product.displayPrice ?? '—'} · ${product.currency ?? '—'}`)
          .join('\n')
      : en ? 'Apple catalogue not loaded' : 'Catalogue Apple non chargé';
    const provenance = [
      buildLabel,
      `${en ? 'storefront' : 'vitrine'}: ${catalogue?.storefront ?? '—'}`,
      // Présence des connexions tierces dans **ce binaire** : c'est la moitié
      // de la réponse quand un bouton manque, l'autre étant sur le serveur
      // (voir le bloc `signIn` de /api/health).
      `sign-in: apple=${Platform.OS === 'ios' ? 'natif' : 'n/a'} google=${googleSignInAvailable() ? 'configuré' : 'absent'}`,
      storeLines,
      `${session?.user.locale ?? locale}${session ? ` · ${session.user.id}` : ''}`,
    ].join('\n');
    const subject = encodeURIComponent('DEVISERA');
    const body = encodeURIComponent(`${en ? 'Hello' : 'Bonjour'},\n\n\n\n—\n${provenance}`);
    void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`).catch(() => undefined);
  };
  const openPage = (path: string) => void WebBrowser.openBrowserAsync(`${API_URL}${path}`).catch(() => Linking.openURL(`${API_URL}${path}`));

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <BrandBackdrop height={bandHeight} bottom={colors.surface} header scrollY={brandScroll.scrollY} />
      <Screen transparent contentStyle={{ paddingTop: surface.paddingTop, paddingBottom: tabBarSpace }} onScroll={brandScroll.onScroll}>
        <BrandHeader scrollY={brandScroll.scrollY} height={bandHeight} onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}>
        <IdentityHeader
          centered
          greeting={en ? 'Welcome to your workshop' : 'Bienvenue dans votre atelier'}
          initial={initial}
          avatar={<ProfileAvatar key={session?.user.id} initial={initial} en={en} size={88} />}
          name={name}
          subtitle={fullName ? business || session?.user.email : session?.user.email}
          chips={
            <>
              <StatusChip onLight icon="card-outline" label={planLabel} />
              <StatusChip onLight icon={session?.user.emailVerified ? 'checkmark-circle' : 'alert-circle'} label={copy(locale, session?.user.emailVerified ? 'verifiedEmail' : 'unverifiedEmail')} />
            </>
          }
        />
        </BrandHeader>
        {/* Le fondu du bandeau reste vide : aucun texte ne s'y perd. */}
        {fadeBelowHeader > 0 ? <View pointerEvents="none" style={{ height: fadeBelowHeader }} /> : null}

        <TrialBanner subscription={subscription} />

        <Stagger step={45} initial={30} distance={8}>
        <SettingsGroup title={en ? 'Account' : 'Compte'}>
          <SettingsRow icon="person-outline" title={copy(locale, 'personalInfo')} subtitle={en ? 'Name, email and language' : 'Nom, email et langue'} onPress={() => router.push('/compte')} />
          <SettingsRow icon="business-outline" title={copy(locale, 'business')} subtitle={en ? 'Identity, tax and quote details' : 'Identité, TVA, mentions du devis'} onPress={() => router.push('/entreprise')} />
        </SettingsGroup>

        {/*
          Ce qui règle l'application elle-même : sa langue, son apparence, ce
          dont elle prévient. Trois choses de même nature, donc un seul groupe —
          elles ne sont ni des réglages d'entreprise ni des questions de
          facturation.
        */}
        <SettingsGroup title={en ? 'The app' : 'L’application'}>
          <View style={{ padding: spacing.md }}>
            <LanguageSelector compact />
          </View>
          <SettingsRow
            icon="contrast-outline"
            title={en ? 'Appearance' : 'Apparence'}
            subtitle={appearanceLabel}
            onPress={() => router.push('/apparence')}
          />
          <SettingsRow
            icon="notifications-outline"
            title="Notifications"
            subtitle={en ? 'Choose what you are told about' : 'Choisissez ce dont vous êtes prévenu'}
            onPress={() => router.push('/notifications')}
          />
        </SettingsGroup>

        <SettingsGroup title={en ? 'Your DEVISERA subscription' : 'Votre abonnement DEVISERA'}>
          <SettingsRow icon="card-outline" title={copy(locale, 'manageSubscription')} subtitle={en ? 'Plan, trial and renewal' : 'Formule, essai et renouvellement'} value={subscription ? PLANS[subscription.plan].name : null} onPress={() => router.push('/abonnement')} />
          <SettingsRow icon="receipt-outline" title={copy(locale, 'invoices')} subtitle={en ? 'History and receipts' : 'Historique et reçus'} onPress={() => router.push('/paiements')} />
        </SettingsGroup>

        <SettingsGroup title={copy(locale, 'assistance')}>
          <SettingsRow icon="mail-outline" title={copy(locale, 'contact')} subtitle={SUPPORT_EMAIL} onPress={contact} />
          <SettingsRow icon="star-outline" title={copy(locale, 'rate')} subtitle={en ? 'Two minutes that really help us' : 'Deux minutes qui nous aident vraiment'} onPress={() => void openReviewPage()} />
        </SettingsGroup>

        {/*
          La confidentialité, sans vitrine technique.

          L'écran affichait « Intelligence artificielle · Autorisée » en clair,
          au même rang que l'abonnement. C'est une information d'implémentation
          promue au rang de fonction : l'artisan n'a pas acheté un accès à un
          modèle, il a acheté des devis qui s'écrivent tout seuls.
          
          L'autorisation ne disparaît pas pour autant — elle reste due, et
          reste retirable. Elle est nommée par ce qu'elle fait et rangée avec
          les autres informations sur les données. Le détail complet, y compris
          le nom du destinataire, est sur l'écran qui s'ouvre.
        */}
        <SettingsGroup title={copy(locale, 'legal')}>
          <SettingsRow
            icon="lock-closed-outline"
            title={en ? 'Use of your data' : 'Utilisation de vos données'}
            subtitle={en ? 'What DEVISERA sends to prepare your quotes' : 'Ce que DEVISERA transmet pour préparer vos devis'}
            onPress={() => router.push('/confidentialite-ia')}
          />
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
        <Caption style={{ color: colors.subtle, textAlign: 'center' }}>{buildLabel}</Caption>
        <View style={{ height: spacing.xl }} />
      </Screen>
    </View>
  );
}
