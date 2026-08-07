import { Linking, StyleSheet, View } from 'react-native';

import type { VoiceSessionStatus } from '@/core/conversation/voiceSession';
import { AppText, Button, Icon } from '@/ui/components';
import { colors, spacing } from '@/ui/theme';

export interface VoiceStatusNoteProps {
  status: VoiceSessionStatus;
  message: string | null;
}

/**
 * Why voice commands are not listening.
 *
 * A switch that turns on and then does nothing is the worst version of this
 * feature — it is what shipped in Build 8. When the microphone cannot be
 * opened the driver is told, in one sentence, and given the way out.
 */
export const VoiceStatusNote = ({ status, message }: VoiceStatusNoteProps) => {
  if (!message) return null;

  // Refused for good is the only state the driver cannot fix from here: iOS
  // will not show the dialog again, so the system Settings app is the route.
  const blocked = status === 'blocked';
  const tone = status === 'failed' ? colors.warning : colors.danger;

  return (
    <View style={styles.note}>
      <View style={styles.line}>
        <Icon
          name={blocked ? 'lock-closed-outline' : 'alert-circle-outline'}
          size={17}
          color={tone}
          style={styles.icon}
        />
        <AppText variant="footnote" tone="secondary" style={styles.text}>
          {message}
        </AppText>
      </View>

      {blocked ? (
        <Button
          label="Open iOS Settings"
          variant="secondary"
          size="medium"
          onPress={() => void Linking.openSettings()}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  note: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  line: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  icon: {
    // Optical alignment with the first line of text rather than the block.
    marginTop: 1,
  },
  text: {
    flex: 1,
  },
});
