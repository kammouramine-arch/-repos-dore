import * as React from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PLANS, accessStateFor, trialMessage } from '@devisia/shared';
import { Body, Button, Caption, Card, Heading, Ionicons, ListRow, Muted, PageHeader, Screen, SectionHeader } from '@/components/ui';
import { TrialBanner } from '@/components/trial-banner';
import { useAuth } from '@/lib/auth';
import { copy, mobileLocale } from '@/lib/i18n';
import { colors, spacing } from '@/theme';

/**
 * Écran « Plus ».
 *
 * Trois entrées y renvoyaient vers le navigateur, avec la mention « Sur le web
 * · connexion demandée » — c'est-à-dire : sortez de l'application, puis
 * ressaisissez votre mot de passe pour consulter vos propres prix. Tout est
 * désormais natif, et l'artisan reste dans DEVISERA.
 */
interface Entry {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint: string;
  href: '/abonnement' | '/catalogue' | '/entreprise' | '/analytique' | '/presentation' | '/compte';
}

export default function PlusScreen() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const locale = mobileLocale(session);
  const access = accessStateFor(session?.subscription ?? null);

  const entries: Entry[] = [
    { icon: 'person-outline', label: copy(locale, 'account'), hint: locale === 'en' ? 'Name, email and verification' : 'Nom, email et vérification', href: '/compte' },
    { icon: 'sparkles-outline', label: copy(locale, 'discover'), hint: locale === 'en' ? 'Overview and plans' : 'Présentation et formules', href: '/presentation' },
    {
      icon: 'card-outline',
      label: copy(locale, 'subscription'),
      hint: session?.subscription ? PLANS[session.subscription.plan].name : (locale === 'en' ? 'Plan and billing' : 'Formule et facturation'),
      href: '/abonnement',
    },
    {
      icon: 'book-outline',
      label: copy(locale, 'pricing'),
      hint: locale === 'en' ? 'Your services and prices' : 'Vos prestations et vos tarifs',
      href: '/catalogue',
    },
    {
      icon: 'business-outline',
      label: copy(locale, 'business'),
      hint: locale === 'en' ? 'Identity, tax and quote details' : 'Identité, TVA, mentions du devis',
      href: '/entreprise',
    },
    {
      icon: 'bar-chart-outline',
      label: copy(locale, 'analytics'),
      hint: locale === 'en' ? 'Revenue and quote tracking' : 'Chiffre d’affaires et suivi des devis',
      href: '/analytique',
    },
  ];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.surface }}>
      <Screen>
        <PageHeader
          eyebrow={copy(locale, 'space')}
          title={session?.user.firstName ? (locale === 'en' ? `Hello ${session.user.firstName}` : `Bonjour ${session.user.firstName}`) : (locale === 'en' ? 'Your workspace' : 'Votre atelier')}
          subtitle={session?.organization.name ?? session?.user.email}
          action={
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                backgroundColor: colors.accentDeep,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Body style={{ color: colors.white, fontWeight: '700', fontSize: 18, lineHeight: 24 }}>
                {(session?.organization.name ?? 'D').trim().charAt(0).toUpperCase()}
              </Body>
            </View>
          }
        />
        {access.inTrial ? <Muted>{trialMessage(access.trialDaysLeft)}</Muted> : null}

        <TrialBanner subscription={session?.subscription ?? null} />

        <Card style={{ gap: spacing.md, backgroundColor: colors.accentDeep, borderColor: colors.accentDeep, padding: spacing.xl }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}>
              <Body style={{ color: colors.white, fontWeight: '700', fontSize: 20, lineHeight: 26 }}>
                {(session?.organization.name ?? session?.user.email ?? 'D').trim().charAt(0).toUpperCase()}
              </Body>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Heading style={{ color: colors.white }}>{session?.organization.name ?? (locale === 'en' ? 'Your business' : 'Votre entreprise')}</Heading>
              <Muted style={{ color: '#DDE5FF' }}>{session?.user.email}</Muted>
            </View>
            <Ionicons name="checkmark-circle" size={22} color={colors.accentBright} />
          </View>
          <Muted style={{ color: '#DDE5FF', lineHeight: 20 }}>
            {locale === 'en' ? 'Your DEVISERA workspace brings together your personal details, business and quoting tools.' : 'Votre espace DEVISERA rassemble vos informations personnelles, votre entreprise et vos outils de devis.'}
          </Muted>
          <Button title={copy(locale, 'manageProfile')} variant="secondary" onPress={() => router.push('/compte')} style={{ backgroundColor: colors.canvas, borderColor: colors.canvas }} />
        </Card>

        <SectionHeader title={locale === 'en' ? 'Account and business' : 'Compte et entreprise'} />
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {entries.map((entry, index) => (
            <ListRow
              key={entry.label}
              icon={entry.icon}
              title={entry.label}
              subtitle={entry.hint}
              last={index === entries.length - 1}
              onPress={() => router.push(entry.href)}
            />
          ))}
        </Card>

        <SectionHeader title={locale === 'en' ? 'DEVISERA tools' : 'Outils DEVISERA'} />

        <Button
          title={copy(locale, 'signOut')}
          variant="secondary"
          icon="log-out-outline"
          onPress={() =>
            Alert.alert(
              locale === 'en' ? 'Sign out?' : 'Se déconnecter ?',
              locale === 'en' ? 'You will need your password next time.' : 'Vous devrez saisir votre mot de passe à la prochaine ouverture.',
              [
                { text: locale === 'en' ? 'Cancel' : 'Annuler', style: 'cancel' },
                { text: copy(locale, 'signOut'), style: 'destructive', onPress: () => void signOut() },
              ],
            )
          }
        />

        <Caption style={{ color: colors.subtle, textAlign: 'center' }}>
          DEVISERA · version 1.0.0
        </Caption>
        <View style={{ height: spacing.xl }} />
      </Screen>
    </SafeAreaView>
  );
}
