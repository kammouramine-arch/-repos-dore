import { useState, type RefObject } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { colors, motion, radius, sizing, spacing, typography } from '@/ui/theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  icon?: IconName;
  /** Validation message shown under the field; also drives the error styling. */
  error?: string | null;
  /** Renders a reveal toggle and starts obscured. */
  secure?: boolean;
  inputRef?: RefObject<TextInput | null>;
}

export const TextField = ({
  label,
  icon,
  error,
  secure = false,
  inputRef,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) => {
  const [revealed, setRevealed] = useState(false);
  const [focused, setFocused] = useState(false);

  // Driven by React state rather than a shared value: the field changes at most
  // twice per interaction, so there is nothing to gain from bypassing render.
  const animatedBorder = useAnimatedStyle(() => {
    const duration = motion.fast;
    const border = error ? colors.danger : focused ? colors.accent : colors.border;

    return {
      borderColor: withTiming(border, { duration }),
      backgroundColor: withTiming(
        focused ? colors.surfaceElevated : colors.surface,
        { duration },
      ),
    };
  }, [focused, error]);

  return (
    <View style={styles.container}>
      <AppText variant="overline" tone="tertiary">
        {label}
      </AppText>

      <Animated.View style={[styles.field, animatedBorder]}>
        {icon ? (
          <Icon name={icon} size={18} color={colors.textTertiary} />
        ) : null}

        <TextInput
          {...rest}
          ref={inputRef}
          style={styles.input}
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.accent}
          secureTextEntry={secure && !revealed}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
        />

        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            hitSlop={12}
            onPress={() => setRevealed((value) => !value)}
          >
            <Icon
              name={revealed ? 'eye-off-outline' : 'eye-outline'}
              size={19}
              color={colors.textTertiary}
            />
          </Pressable>
        ) : null}
      </Animated.View>

      {error ? (
        <AppText variant="footnote" tone="danger">
          {error}
        </AppText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: sizing.fieldHeight,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.body.fontSize,
    letterSpacing: typography.body.letterSpacing,
    padding: 0,
  },
});
