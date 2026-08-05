import { StyleSheet, View } from 'react-native';

import { APP_INFO } from '@/config';
import { spacing } from '@/ui/theme';
import { AppText } from './AppText';
import { NovaMark } from './NovaMark';

export interface LogoProps {
  size?: number;
  showTagline?: boolean;
}

/** The full lockup: mark, wordmark, and optionally the positioning line. */
export const Logo = ({ size = 76, showTagline = false }: LogoProps) => (
  <View style={styles.container}>
    <NovaMark size={size} />

    <View style={styles.text}>
      <AppText variant="title1" style={styles.wordmark}>
        {APP_INFO.name.toUpperCase()}
      </AppText>
      {showTagline ? (
        <AppText variant="footnote" tone="tertiary" align="center">
          {APP_INFO.tagline}
        </AppText>
      ) : null}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.md,
  },
  text: {
    alignItems: 'center',
    gap: spacing.xxs,
  },
  wordmark: {
    letterSpacing: 8,
    // Optical centring: the tracking adds trailing space after the last letter.
    marginLeft: 8,
  },
});
