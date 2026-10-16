import { t, useUiLanguage } from '@/ui/i18n';
import { useConversationStore } from '@/app/stores/hooks';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  formatVoiceDebug,
  formatVoiceDebugTime,
  type VoiceDebugEntry,
} from '@/core/conversation/voiceDebug';
import { summariseLatency } from '@/core/conversation/voiceLatency';
import { AppText, Button } from '@/ui/components';
import { colors, radius, spacing } from '@/ui/theme';

export interface VoiceDiagnosticsPanelProps {
  entries: readonly VoiceDebugEntry[];
  onClear: () => void;
}

/**
 * TEMPORARY — the voice pipeline trace, on the phone.
 *
 * A tester on Windows cannot attach Console.app or Xcode to an iPhone, so a
 * log they cannot read is no diagnostic at all. This shows the same records
 * that go to the device log, newest last, so a TestFlight run can be
 * screenshotted and read.
 *
 * Remove with the rest of the diagnostics.
 */
export const VoiceDiagnosticsPanel = ({
  entries,
  onClear,
}: VoiceDiagnosticsPanelProps) => { useUiLanguage();
  const voice = useConversationStore(state => state.voice);
  const openedAt = entries.findLastIndex(entry => entry.event === 'voice_opened');
  const stableAt = entries.findLastIndex(entry => entry.event === 'voice_stable');
  const ready = voice.ready && voice.status === 'listening';
  const latency = summariseLatency(entries);
  const ms = (value: number | null) => (value == null ? '—' : `${(value / 1000).toFixed(1)} s`);
  return ((
  <View style={styles.panel}>
    <AppText variant="footnote" testID="native-wake-status">{ready ? 'Native microphone active' : `Voice state: ${voice.status}`}</AppText>
    {ready && openedAt >= 0 && stableAt > openedAt ? <AppText variant="footnote" testID="native-wake-stable">Native wake stable for 30 seconds</AppText> : null}
    {latency.last ? (
      <AppText variant="footnote" testID="voice-latency">
        {`Last turn · mic ${ms(latency.last.toMicrophoneMs)} · understood ${ms(latency.last.understandingMs)} · reply starts ${ms(latency.last.responseMs)} after you finish (median of ${latency.turns}: ${ms(latency.median.responseMs)})`}
      </AppText>
    ) : null}
    <AppText variant="footnote" tone="tertiary">
      {t("Temporary voice pipeline trace. Clear it, reproduce the problem, then read from the top.")}</AppText>

    <View style={styles.console}>
      {entries.length === 0 ? (
        <AppText variant="footnote" tone="tertiary">
          {t("Nothing recorded yet.")}</AppText>
      ) : (
        <ScrollView style={styles.scroll} nestedScrollEnabled>
          {entries.map((entry, index) => (
            <AppText
              key={`${entry.at}-${index}`}
              variant="caption"
              tone={entry.event.startsWith('ERROR') ? 'danger' : 'secondary'}
              style={styles.line}
            >
              {formatVoiceDebugTime(entry.at)}  {formatVoiceDebug(entry)}
            </AppText>
          ))}
        </ScrollView>
      )}
    </View>

    <Button
      label={`Clear trace (${entries.length})`}
      variant="secondary"
      size="medium"
      onPress={onClear}
    />
  </View>
)); };

const styles = StyleSheet.create({
  panel: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  console: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  scroll: {
    // Tall enough to show a whole wake-to-reply cycle without swallowing the
    // rest of the screen.
    maxHeight: 260,
  },
  line: {
    fontVariant: ['tabular-nums'],
    marginBottom: 2,
  },
});
