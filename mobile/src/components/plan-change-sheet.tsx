import * as React from 'react';
import { Animated, Easing, Modal, Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { PlanId } from '@devisia/shared';
import { PLANS } from '@devisia/shared';
import { Body, Button, Caption, Heading, Muted } from './ui';
import { useReducedMotion } from './motion';
import { colors, radius, shadows, spacing } from '@/theme';

/**
 * Confirmation avant une rétrogradation Apple.
 *
 * Apple ne dit rien de clair au moment où un abonné Pro touche Essentiel :
 * sa feuille système parle d'un changement « au prochain renouvellement »
 * dans un vocabulaire qui ressemble à une perte immédiate. Cette feuille
 * DEVISERA dit, avant d'ouvrir Apple, ce qui va réellement se passer : la
 * formule actuelle reste active jusqu'à la fin de la période, la nouvelle
 * commence au renouvellement, rien n'est perdu aujourd'hui.
 */
export function PlanChangeSheet({
  visible,
  from,
  to,
  periodEnd,
  en,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  from: PlanId;
  to: PlanId;
  periodEnd: string | null;
  en: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const reduced = useReducedMotion();
  const [progress] = React.useState(() => new Animated.Value(0));
  React.useEffect(() => {
    if (!visible) { progress.setValue(0); return undefined; }
    if (reduced) { progress.setValue(1); return undefined; }
    const animation = Animated.timing(progress, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [progress, reduced, visible]);
  const date = periodEnd ? new Date(periodEnd).toLocaleDateString(en ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  const current = PLANS[from].name;
  const next = PLANS[to].name;
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(11,18,32,0.42)', opacity: progress }}>
          <Pressable accessibilityRole="button" accessibilityLabel={en ? 'Cancel' : 'Annuler'} onPress={onCancel} style={{ flex: 1 }} />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          style={[
            {
              backgroundColor: colors.canvas,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              padding: spacing.xl,
              paddingBottom: spacing['2xl'],
              gap: spacing.lg,
              opacity: progress,
              transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
            },
            shadows.floating as object,
          ]}
        >
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="swap-vertical" size={24} color={colors.accent} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Caption upper style={{ color: colors.accent }}>{en ? 'Plan change' : 'Changement de formule'}</Caption>
              <Heading style={{ fontSize: 22, lineHeight: 28 }}>{en ? `Switch to ${next}?` : `Passer à ${next} ?`}</Heading>
            </View>
          </View>
          <View style={{ gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg }}>
            <Line icon="shield-checkmark-outline" text={en ? `${current} stays active until the end of your current period${date ? ` (${date})` : ''}.` : `${current} reste actif jusqu’à la fin de votre période en cours${date ? ` (${date})` : ''}.`} />
            <Line icon="calendar-outline" text={en ? `${next} starts at your next renewal. Apple will confirm the date and price.` : `${next} commence au prochain renouvellement. Apple confirme la date et le prix.`} />
            <Line icon="checkmark-circle-outline" text={en ? 'Nothing is lost today: your quotes, clients and features remain as they are.' : 'Rien n’est perdu aujourd’hui : vos devis, vos clients et vos fonctions restent tels quels.'} />
          </View>
          <Muted>{en ? 'You can change your mind in your Apple subscriptions before the renewal.' : 'Vous pourrez changer d’avis dans vos abonnements Apple avant le renouvellement.'}</Muted>
          <View style={{ gap: spacing.sm }}>
            <Button title={en ? 'Continue' : 'Continuer'} haptic onPress={onConfirm} accessibilityHint={en ? 'Opens the Apple confirmation' : 'Ouvre la confirmation Apple'} />
            <Button title={en ? 'Cancel' : 'Annuler'} variant="secondary" onPress={onCancel} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function Line({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
      <Ionicons name={icon} size={18} color={colors.accent} style={{ marginTop: 2 }} />
      <Body style={{ flex: 1 }}>{text}</Body>
    </View>
  );
}

/** « Pro actif · Essentiel à partir du 12 octobre » : l'état enregistré par Apple, jamais un droit anticipé. */
export function PendingPlanNotice({ current, pending, date, en }: { current: PlanId; pending: PlanId; date: string | null; en: boolean }) {
  return (
    <View
      accessibilityRole="text"
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}
    >
      <Ionicons name="swap-vertical" size={16} color={colors.white} />
      <Body style={{ color: colors.white, flex: 1 }}>
        {en ? `${PLANS[current].name} active · ${PLANS[pending].name} from ${date ?? 'the next renewal'}` : `${PLANS[current].name} actif · ${PLANS[pending].name} à partir du ${date ?? 'prochain renouvellement'}`}
      </Body>
    </View>
  );
}
