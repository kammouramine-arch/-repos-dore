import * as React from 'react';
import { Alert, Linking, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PLANS, accessStateFor, trialMessage } from '@devisia/shared';
import { Body, Button, Card, Divider, Ionicons, Muted, Screen, Title } from '@/components/ui';
import { TrialBanner } from '@/components/trial-banner';
import { useAuth } from '@/lib/auth';
import { API_URL } from '@/lib/api';
import { colors, spacing } from '@/theme';

export default function PlusScreen() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const access = accessStateFor(session?.subscription ?? null);

  const links: { icon: keyof typeof Ionicons.glyphMap; label: string; hint: string; action: () => void }[] = [
    {
      icon: 'card-outline',
      label: 'Abonnement',
      hint: session?.subscription ? PLANS[session.subscription.plan].name : 'Formule',
      action: () => router.push('/abonnement'),
    },
    {
      icon: 'book-outline',
      label: 'Catalogue de prix',
      hint: 'Se gère depuis le web',
      action: () => void Linking.openURL(`${API_URL}/app/catalogue`),
    },
    {
      icon: 'settings-outline',
      label: 'Paramètres de l’entreprise',
      hint: 'Logo, TVA, conditions',
      action: () => void Linking.openURL(`${API_URL}/app/parametres/entreprise`),
    },
    {
      icon: 'bar-chart-outline',
      label: 'Analytique',
      hint: 'Performance sur 90 jours',
      action: () => void Linking.openURL(`${API_URL}/app/analytique`),
    },
  ];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.surface }}>
      <Screen>
        <View style={{ gap: 4 }}>
          <Title>{session?.organization.name}</Title>
          <Muted>{session?.user.email}</Muted>
          {access.inTrial ? <Muted>{trialMessage(access.trialDaysLeft)}</Muted> : null}
        </View>

        <TrialBanner subscription={session?.subscription ?? null} />

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {links.map((link, index) => (
            <View key={link.label}>
              {index > 0 ? <Divider /> : null}
              <Pressable
                accessibilityRole="button"
                onPress={link.action}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: spacing.lg,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Ionicons name={link.icon} size={20} color={colors.inkSoft} />
                <View style={{ flex: 1 }}>
                  <Body style={{ fontWeight: '600' }}>{link.label}</Body>
                  <Muted style={{ fontSize: 12 }}>{link.hint}</Muted>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
              </Pressable>
            </View>
          ))}
        </Card>

        <Button
          title="Se déconnecter"
          variant="secondary"
          icon="log-out-outline"
          onPress={() =>
            Alert.alert('Se déconnecter ?', 'Vous devrez saisir votre mot de passe à la prochaine ouverture.', [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Se déconnecter', style: 'destructive', onPress: () => void signOut() },
            ])
          }
        />

        <Muted style={{ textAlign: 'center', fontSize: 12 }}>DEVISIA · version 1.0.0</Muted>
      </Screen>
    </SafeAreaView>
  );
}
