import { ScrollView, StyleSheet, View } from 'react-native';

import {
  formatVoiceDebug,
  formatVoiceDebugTime,
  type VoiceDebugEntry,
} from '@/core/conversation/voiceDebug';
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
}: VoiceDiagnosticsPanelProps) => (
  <View style={styles.panel}>
    <AppText variant="footnote" tone="tertiary">
      Temporary voice pipeline trace. Clear it, reproduce the problem, then read
      from the top.
    </AppText>

    <View style={styles.console}>
      {entries.length === 0 ? (
        <AppText variant="footnote" tone="tertiary">
          Nothing recorded yet.
        </AppText>
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
);

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
