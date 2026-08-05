import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, gradients, spacing } from '@/ui/theme';

export interface ScreenProps {
  children: ReactNode;
  /** Adds the night gradient used by splash, onboarding and the auth flow. */
  backdrop?: 'flat' | 'night';
  edges?: readonly Edge[];
  padded?: boolean;
  style?: ViewStyle;
}

/** Page shell: background, safe-area insets and the standard horizontal gutter. */
export const Screen = ({
  children,
  backdrop = 'flat',
  edges = ['top', 'bottom'],
  padded = true,
  style,
}: ScreenProps) => (
  <View style={styles.root}>
    {backdrop === 'night' ? (
      <LinearGradient
        colors={gradients.night}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    ) : null}

    <SafeAreaView
      edges={edges}
      style={[styles.safeArea, padded ? styles.padded : null, style]}
    >
      {children}
    </SafeAreaView>
  </View>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: spacing.lg,
  },
});
