import { Modal, StyleSheet, View } from 'react-native';
import { usePreferencesStore } from '@/app/stores/hooks';
import { AppText, AvyroMark, Button, GlassPanel } from '@/ui/components';
import { colors, spacing } from '@/ui/theme';

/** One invitation over the map. Declining never blocks navigation. */
export const VoiceSetupPrompt = () => {
  const { preferences, update } = usePreferencesStore();
  return <Modal transparent animationType="slide" visible={!preferences.voiceSetupSeen || !preferences.assistantSetupSeen} onRequestClose={() => void update({ voiceSetupSeen: true, assistantSetupSeen: true })}>
    <View style={styles.backdrop}>
      <GlassPanel style={styles.card}>
        <AvyroMark size={64} ring={false} />
        <AppText variant="title1">Your voice. Your way.</AppText>
        <AppText variant="body" tone="secondary">Say “Hey meepmeep” to get directions in French or English, without tapping the microphone.</AppText>
        <View style={styles.example}>
          <AppText variant="subhead">“Hey meepmeep, emmène-moi à la maison.”</AppText>
          <AppText variant="footnote" tone="secondary">“Hey meepmeep, take me home.”</AppText>
        </View>
        <AppText variant="footnote" tone="secondary">Your companion is ready: short commands go to Cloudflare AI for speech and interpretation; your chosen route and a short GPS trace go to TomTom for driving directions and mapped road information. Ambient wake listening stays on this iPhone, while meepmeep is open. Free test limits apply. You can turn each feature off in Settings.</AppText>
        <Button label="Continue with hands-free AI" onPress={() => void update({ voiceCommands: true, voiceSetupSeen: true, assistantSetupSeen: true, cloudSpeech: true, cloudAssistant: true, roadInformation: true, voiceDetection: 'system', voiceLanguage: 'bilingual' })} />
        <Button label="Continue without hands-free" variant="ghost" onPress={() => void update({ voiceSetupSeen: true, assistantSetupSeen: true, voiceCommands: false, cloudSpeech: true, cloudAssistant: true, roadInformation: true })} />
        <Button label="Use offline features only" variant="ghost" onPress={() => void update({ voiceSetupSeen: true, assistantSetupSeen: true, voiceCommands: false, cloudSpeech: false, cloudAssistant: false, roadInformation: false })} />
      </GlassPanel>
    </View>
  </Modal>;
};
const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', padding: spacing.md, paddingBottom: spacing.xl, backgroundColor: colors.scrim },
  card: { padding: spacing.lg, gap: spacing.md },
  example: { padding: spacing.md, borderRadius: 18, gap: spacing.xs, backgroundColor: colors.accentMuted },
});
