import * as React from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PLANS, accessStateFor, trialMessage } from '@devisia/shared';
import { Body, Button, Caption, Card, Heading, Ionicons, ListRow, Muted, PageHeader, Screen, SectionHeader } from '@/components/ui';
import { TrialBanner } from '@/components/trial-banner';
import { useAuth } from '@/lib/auth';
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
  const access = accessStateFor(session?.subscription ?? null);

  const entries: Entry[] = [
    { icon: 'person-outline', label: 'Mon compte', hint: 'Nom, email et vérification', href: '/compte' },
    { icon: 'sparkles-outline', label: 'Découvrir DEVISERA', hint: 'Présentation et formules', href: '/presentation' },
    {
      icon: 'card-outline',
      label: 'Abonnement',
      hint: session?.subscription ? PLANS[session.subscription.plan].name : 'Formule et facturation',
      href: '/abonnement',
    },
    {
      icon: 'book-outline',
      label: 'Catalogue de prix',
      hint: 'Vos prestations et vos tarifs',
      href: '/catalogue',
    },
    {
      icon: 'business-outline',
      label: 'Mon entreprise',
      hint: 'Identité, TVA, mentions du devis',
      href: '/entreprise',
    },
    {
      icon: 'bar-chart-outline',
      label: 'Activité',
      hint: 'Chiffre d’affaires et suivi des devis',
      href: '/analytique',
    },
  ];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.surface }}>
      <Screen>
        <PageHeader
          eyebrow="Mon espace"
          title={session?.user.firstName ? `Bonjour ${session.user.firstName}` : 'Votre atelier'}
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
              <Heading style={{ color: colors.white }}>{session?.organization.name ?? 'Votre entreprise'}</Heading>
              <Muted style={{ color: '#DDE5FF' }}>{session?.user.email}</Muted>
            </View>
            <Ionicons name="checkmark-circle" size={22} color={colors.accentBright} />
          </View>
          <Muted style={{ color: '#DDE5FF', lineHeight: 20 }}>
            Votre espace DEVISERA rassemble vos informations personnelles, votre entreprise et vos outils de devis.
          </Muted>
          <Button title="Gérer mon profil" variant="secondary" onPress={() => router.push('/compte')} style={{ backgroundColor: colors.canvas, borderColor: colors.canvas }} />
        </Card>

        <SectionHeader title="Compte et entreprise" />
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

        <SectionHeader title="Outils DEVISERA" />

        <Button
          title="Se déconnecter"
          variant="secondary"
          icon="log-out-outline"
          onPress={() =>
            Alert.alert(
              'Se déconnecter ?',
              'Vous devrez saisir votre mot de passe à la prochaine ouverture.',
              [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Se déconnecter', style: 'destructive', onPress: () => void signOut() },
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
