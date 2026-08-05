import { StyleSheet, View } from 'react-native';

import { AppText, SegmentedControl, type SegmentedOption } from '@/ui/components';
import { spacing } from '@/ui/theme';

export interface ChoiceRowProps<T extends string> {
  title: string;
  subtitle?: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** A settings row whose control is a segmented picker rather than a switch. */
export const ChoiceRow = <T extends string>({
  title,
  subtitle,
  options,
  value,
  onChange,
}: ChoiceRowProps<T>) => (
  <View style={styles.row}>
    <View style={styles.labels}>
      <AppText variant="callout">{title}</AppText>
      {subtitle ? (
        <AppText variant="footnote" tone="tertiary">
          {subtitle}
        </AppText>
      ) : null}
    </View>

    <SegmentedControl options={options} value={value} onChange={onChange} />
  </View>
);

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  labels: {
    gap: 2,
  },
});
