import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText, PressableScale } from '@/ui/components';
import { colors, radius, sizing, spacing } from '@/ui/theme';

export interface SearchTriggerProps {
  onPress: () => void;
}

/**
 * Looks like the search field it opens, so the transition into the search
 * screen reads as the same object growing rather than a new screen appearing.
 */
export const SearchTrigger = ({ onPress }: SearchTriggerProps) => (
  <PressableScale
    accessibilityRole="search"
    accessibilityLabel="Search for a destination"
    onPress={onPress}
    style={styles.trigger}
  >
    <Ionicons name="search" size={19} color={colors.textSecondary} />
    <AppText variant="body" tone="tertiary" style={styles.label}>
      Where to?
    </AppText>
    <View style={styles.badge}>
      <Ionicons name="arrow-forward" size={16} color={colors.onAccent} />
    </View>
  </PressableScale>
);

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: sizing.controlHeight,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceHighlight,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  label: {
    flex: 1,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
});
