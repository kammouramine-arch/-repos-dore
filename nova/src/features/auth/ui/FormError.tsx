import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { AppText } from '@/ui/components';
import { colors, radius, spacing } from '@/ui/theme';
import { Icon } from '@/ui/components/Icon';

export interface FormErrorProps {
  message: string | null;
}

/** Form-level failure — the ones that come back from the service, not the field. */
export const FormError = ({ message }: FormErrorProps) => {
  if (!message) return null;

  return (
    <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)}>
      <View style={styles.banner}>
        <Icon name="alert-circle" size={18} color={colors.danger} />
        <AppText variant="footnote" tone="danger" style={styles.text}>
          {message}
        </AppText>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.dangerMuted,
  },
  text: {
    flex: 1,
  },
});
