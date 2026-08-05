import { StyleSheet, View } from 'react-native';

import { colors } from '@/ui/theme';

export interface DividerProps {
  /** Left inset, used to align with the text of a list row. */
  inset?: number;
}

export const Divider = ({ inset = 0 }: DividerProps) => (
  <View style={[styles.divider, { marginLeft: inset }]} />
);

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});
