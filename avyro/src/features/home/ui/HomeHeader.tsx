import { StyleSheet, View } from 'react-native';
import { useConversationStore, usePreferencesStore } from '@/app/stores/hooks';
import { AppText, AvyroMark, GlassPanel, IconButton, PressableScale } from '@/ui/components';
import { colors, radius, spacing } from '@/ui/theme';

/** A compact brand and an honest, persistent microphone status over the map. */
export const HomeHeader = ({ onSettingsPress }: { onSettingsPress(): void }) => {
  const preferences = usePreferencesStore(state => state.preferences);
  const update = usePreferencesStore(state => state.update);
  const voice = useConversationStore(state => state.voice);
  const active = preferences.voiceCommands && voice.status === 'listening' && voice.ready;
  const label = !preferences.voiceCommands ? 'Enable hands-free' : active ? preferences.cloudSpeech ? 'Hey Avyro · AI voice' : 'Hey Avyro · Ready' : voice.status === 'suspended' ? 'Voice in use' : voice.status === 'preparing' ? 'Starting microphone…' : 'Voice needs attention';
  return <View style={styles.root}>
    <View style={styles.row}>
      <GlassPanel style={styles.brand}><AvyroMark size={21} ring={false} /><AppText variant="subhead">avyro</AppText></GlassPanel>
      <IconButton name="options-outline" accessibilityLabel="Settings" onPress={onSettingsPress} />
    </View>
    <PressableScale onPress={() => !preferences.voiceCommands ? void update({ voiceCommands: true, voiceSetupSeen: true }) : active ? void update({ voiceCommands: false }) : onSettingsPress()} accessibilityRole="button" accessibilityLabel={active ? 'Pause hands-free listening' : label} style={styles.voice}>
      <View style={[styles.dot, { backgroundColor: active ? colors.success : colors.textTertiary }]} />
      <AppText variant="caption" tone={active ? 'accent' : 'secondary'}>{label}</AppText>
    </PressableScale>
  </View>;
};
const styles = StyleSheet.create({
  root: { gap: spacing.sm }, row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.pill },
  voice: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, backgroundColor: colors.surface },
  dot: { height: 7, width: 7, borderRadius: 4 },
});
