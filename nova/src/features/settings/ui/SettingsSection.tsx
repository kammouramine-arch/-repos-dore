import { Children, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, Divider, SectionHeader } from '@/ui/components';
import { spacing } from '@/ui/theme';

export interface SettingsSectionProps {
  title: string;
  children: ReactNode;
}

/** A titled group of rows, hairline-separated — the platform's own grammar. */
export const SettingsSection = ({ title, children }: SettingsSectionProps) => (
  <View style={styles.section}>
    <SectionHeader title={title} />

    <Card padded={false}>
      {Children.toArray(children).map((child, index) => (
        <View key={index}>
          {index > 0 ? <Divider inset={spacing.md} /> : null}
          {child}
        </View>
      ))}
    </Card>
  </View>
);

const styles = StyleSheet.create({
  section: {
    gap: spacing.xxs,
  },
});
