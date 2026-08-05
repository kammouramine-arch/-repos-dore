import { StyleSheet, View } from 'react-native';

import { AppText, GlassPanel, IconButton } from '@/ui/components';
import { radius, spacing } from '@/ui/theme';
import { initialsOf } from '@/utils/format';

export interface HomeTopBarProps {
  fullName: string;
  onSettingsPress: () => void;
}

const greetingFor = (hour: number): string => {
  if (hour < 5) return 'Still driving';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

/** Floating identity pill and the way into Settings. */
export const HomeTopBar = ({ fullName, onSettingsPress }: HomeTopBarProps) => {
  const firstName = fullName.trim().split(/\s+/)[0] ?? '';

  return (
    <View style={styles.row}>
      <GlassPanel style={styles.pill}>
        <View style={styles.avatar}>
          <AppText variant="caption">{initialsOf(fullName)}</AppText>
        </View>
        <View>
          <AppText variant="caption" tone="tertiary">
            {greetingFor(new Date().getHours())}
          </AppText>
          <AppText variant="subhead" numberOfLines={1}>
            {firstName}
          </AppText>
        </View>
      </GlassPanel>

      <IconButton
        name="options-outline"
        accessibilityLabel="Settings"
        onPress={onSettingsPress}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingRight: spacing.md,
    borderRadius: radius.pill,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(61, 123, 255, 0.22)',
  },
});
