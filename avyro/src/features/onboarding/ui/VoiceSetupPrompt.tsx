import { Modal, StyleSheet, View } from 'react-native';
import { usePreferencesStore } from '@/app/stores/hooks';
import { AppText, AvyroMark, Button, GlassPanel } from '@/ui/components';
import { colors, spacing } from '@/ui/theme';

/** One invitation over the map. Declining never blocks navigation. */
export const VoiceSetupPrompt = () => {
  const { preferences, update } = usePreferencesStore();
  return <Modal transparent animationType="slide" visible={!preferences.voiceSetupSeen} onRequestClose={() => void update({ voiceSetupSeen: true })}>
    <View style={styles.backdrop}>
      <GlassPanel style={styles.card}>
        <AvyroMark size={64} ring={false} />
        <AppText variant="title1">Your voice. Your way.</AppText>
        <AppText variant="body" tone="secondary">Say “Hey Avyro” to get directions in French or English, without tapping the microphone.</AppText>
        <View style={styles.example}>
          <AppText variant="subhead">“Hey Avyro, emmène-moi à la maison.”</AppText>
          <AppText variant="footnote" tone="secondary">“Hey Avyro, take me home.”</AppText>
        </View>
        <AppText variant="footnote" tone="secondary">On-device listening while Avyro is open. Your iPhone will ask for microphone access. You can switch this off at any time.</AppText>
        <Button label="Enable hands-free" onPress={() => void update({ voiceCommands: true, voiceSetupSeen: true, voiceDetection: 'system', voiceLanguage: 'bilingual' })} />
        <Button label="Explore the map first" variant="ghost" onPress={() => void update({ voiceSetupSeen: true })} />
      </GlassPanel>
    </View>
  </Modal>;
};
const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', padding: spacing.md, paddingBottom: spacing.xl, backgroundColor: colors.scrim },
  card: { padding: spacing.lg, gap: spacing.md },
  example: { padding: spacing.md, borderRadius: 18, gap: spacing.xs, backgroundColor: colors.accentMuted },
});
