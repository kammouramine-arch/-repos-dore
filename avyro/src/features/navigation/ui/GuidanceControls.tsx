import { StyleSheet, View } from 'react-native';

import { VoiceButton } from '@/features/conversation/ui/VoiceButton';
import { IconButton } from '@/ui/components';
import { spacing } from '@/ui/theme';

export interface GuidanceControlsProps {
  /** False while the driver has panned away from their own position. */
  following: boolean;
  onRecenter: () => void;
  /** True when the whole route is fitted on screen instead of the follow cam. */
  overview: boolean;
  onToggleOverview: () => void;
  muted: boolean;
  onToggleMute: () => void;
}

/**
 * The controls a driver can safely hit at speed.
 *
 * A single vertical column on one side of the map: predictable positions,
 * full-size targets, and nothing that moves. Recenter is the exception — it
 * only exists when it has something to do, because a button that recentres
 * what is already centred teaches drivers to ignore the column.
 */
export const GuidanceControls = ({
  following,
  onRecenter,
  overview,
  onToggleOverview,
  muted,
  onToggleMute,
}: GuidanceControlsProps) => (
  <View style={styles.column}>
    <VoiceButton />

    <IconButton
      name={muted ? 'volume-mute' : 'volume-medium'}
      accessibilityLabel={muted ? 'Unmute spoken guidance' : 'Mute spoken guidance'}
      active={muted}
      onPress={onToggleMute}
    />

    <IconButton
      name={overview ? 'navigate' : 'map-outline'}
      accessibilityLabel={overview ? 'Back to driving view' : 'See the whole route'}
      active={overview}
      onPress={onToggleOverview}
    />

    {!following && !overview ? (
      <IconButton
        name="locate"
        accessibilityLabel="Recentre on my position"
        onPress={onRecenter}
      />
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  column: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
});
