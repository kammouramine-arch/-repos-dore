import * as React from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { AiConsentCopy } from '@devisia/shared';
import { Body, Button, Caption, Heading, Muted } from './ui';
import { useReducedMotion } from './motion';
import { colors, radius, shadows, spacing } from '@/theme';

/**
 * Feuille de consentement avant le premier envoi au fournisseur d'IA.
 *
 * Elle dit, avant toute requête, ce qui part, vers quelle société et pourquoi.
 * Rien n'est pré-coché, rien n'est implicite : seule la pression sur
 * « Autoriser et continuer » vaut accord. « Pas maintenant » ferme sans rien
 * envoyer et laisse le reste de l'application utilisable.
 */
export function AiConsentSheet({
  visible,
  copy,
  busy,
  error,
  en,
  onAllow,
  onDecline,
}: {
  visible: boolean;
  copy: AiConsentCopy;
  busy: boolean;
  error: string | null;
  en: boolean;
  onAllow: () => void;
  onDecline: () => void;
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

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={busy ? undefined : onDecline} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(11,18,32,0.42)', opacity: progress }}>
          <Pressable accessibilityRole="button" accessibilityLabel={copy.decline} disabled={busy} onPress={onDecline} style={{ flex: 1 }} />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          testID="ai-consent-sheet"
          style={[
            {
              backgroundColor: colors.canvas,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              padding: spacing.xl,
              paddingBottom: spacing['2xl'],
              gap: spacing.lg,
              maxHeight: '88%',
              opacity: progress,
              transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
            },
            shadows.floating as object,
          ]}
        >
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="sparkles-outline" size={24} color={colors.accent} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Caption upper style={{ color: colors.accent }}>{copy.kicker}</Caption>
              <Heading style={{ fontSize: 22, lineHeight: 28 }}>{copy.title}</Heading>
            </View>
          </View>
          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: spacing.md }} showsVerticalScrollIndicator={false} bounces={false}>
            <Body>{copy.intro}</Body>
            <View style={{ gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg }}>
              <Caption upper style={{ color: colors.muted }}>{en ? 'What is sent' : 'Ce qui est transmis'}</Caption>
              {copy.sent.map((line) => (
                <View key={line} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
                  <Ionicons name="arrow-forward-circle-outline" size={18} color={colors.accent} style={{ marginTop: 2 }} />
                  <Body style={{ flex: 1 }}>{line}</Body>
                </View>
              ))}
            </View>
            <Body>{copy.purpose}</Body>
            <Muted>{copy.withdraw}</Muted>
            {error ? <Body style={{ color: colors.danger }}>{error}</Body> : null}
          </ScrollView>
          <View style={{ gap: spacing.sm }}>
            <Button title={copy.allow} haptic loading={busy} disabled={busy} onPress={onAllow} accessibilityHint={en ? 'Records your permission, then continues' : 'Enregistre votre autorisation, puis continue'} />
            <Button title={copy.decline} variant="secondary" disabled={busy} onPress={onDecline} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
