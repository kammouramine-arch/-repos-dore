import * as React from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import { PendingPlanNotice, PlanChangeSheet } from '@/components/plan-change-sheet';
import { Card, Heading, Screen } from '@/components/ui';
import { colors, spacing, useThemeScheme } from '@/theme';

/**
 * Banc de capture des états d'abonnement.
 *
 * La feuille de rétrogradation et l'affichage « Pro actif · Essentiel à
 * partir du … » n'existent que sur iPhone avec un abonnement Apple réel :
 * impossible à photographier sur le web sans ce banc. Il n'est rendu que si
 * l'export a été lancé avec `EXPO_PUBLIC_CAPTURE_HARNESS=1` ; partout
 * ailleurs (TestFlight, App Store, web public) la route redirige vers
 * l'accueil sans rien afficher.
 */
const HARNESS = process.env.EXPO_PUBLIC_CAPTURE_HARNESS === '1';

export default function ApercuAbonnement() {
  // Re-rendu à chaque bascule d'apparence, sans démontage : la navigation
  // et la position de défilement survivent au changement de thème.
  useThemeScheme();
  const [open, setOpen] = React.useState(true);
  // Échéance fixée à l'ouverture : pas de Date.now() dans le rendu.
  const [periodEnd] = React.useState(() => new Date(Date.now() + 18 * 86_400_000).toISOString());
  if (!HARNESS) return <Redirect href="/" />;
  const date = new Date(periodEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <Screen>
      <View style={{ paddingTop: spacing['2xl'] }}>
        <Card style={{ backgroundColor: colors.accentDeep, gap: spacing.md }}>
          <Heading style={{ color: colors.white }}>Pro · Actif</Heading>
          <PendingPlanNotice current="PRO" pending="ESSENTIEL" date={date} en={false} />
        </Card>
      </View>
      <PlanChangeSheet visible={open} from="PRO" to="ESSENTIEL" periodEnd={periodEnd} en={false} onConfirm={() => setOpen(false)} onCancel={() => setOpen(false)} />
    </Screen>
  );
}
