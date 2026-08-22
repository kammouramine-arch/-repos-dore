import * as React from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type TextInputProps,
  type TextProps,
  type ViewProps,
  type ViewStyle,
  type RefreshControlProps,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows, spacing, typography } from '@/theme';

/**
 * Composants de base DEVISIA mobile.
 * Même vocabulaire visuel que le web : un seul accent, des surfaces neutres,
 * des rayons discrets et aucun ornement gratuit.
 */

export function Title({ style, ...props }: TextProps) {
  return <Text style={[typography.title, { color: colors.ink }, style]} {...props} />;
}

export function Heading({ style, ...props }: TextProps) {
  return <Text style={[typography.heading, { color: colors.ink }, style]} {...props} />;
}

export function Body({ style, ...props }: TextProps) {
  return <Text style={[typography.body, { color: colors.inkSoft }, style]} {...props} />;
}

export function Muted({ style, ...props }: TextProps) {
  return <Text style={[typography.small, { color: colors.muted }, style]} {...props} />;
}

export function Caption({ style, ...props }: TextProps) {
  return (
    <Text
      style={[typography.caption, { color: colors.subtle, textTransform: 'uppercase' }, style]}
      {...props}
    />
  );
}

export function Card({ style, ...props }: ViewProps) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.canvas,
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.line,
          padding: spacing.lg,
        },
        shadows.card as ViewStyle,
        style,
      ]}
      {...props}
    />
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'md' | 'lg';

const BUTTON_COLORS: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.accent, fg: colors.white, border: colors.accent },
  secondary: { bg: colors.canvas, fg: colors.ink, border: colors.lineStrong },
  ghost: { bg: 'transparent', fg: colors.inkSoft, border: 'transparent' },
  danger: { bg: colors.danger, fg: colors.white, border: colors.danger },
};

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
  /** Retour haptique — réservé aux actions engageantes. */
  haptic?: boolean;
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  style,
  haptic = false,
  disabled,
  onPress,
  ...props
}: ButtonProps) {
  const palette = BUTTON_COLORS[variant];
  const height = size === 'lg' ? 54 : 46;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={(event) => {
        if (haptic) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress?.(event);
      }}
      style={({ pressed }) => [
        {
          height,
          borderRadius: radius.md,
          backgroundColor: palette.bg,
          borderWidth: variant === 'secondary' ? StyleSheet.hairlineWidth : 0,
          borderColor: palette.border,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: spacing.sm,
          paddingHorizontal: spacing.xl,
          opacity: disabled || loading ? 0.55 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
        style,
      ]}
      {...props}
    >
      {loading ? <ActivityIndicator color={palette.fg} size="small" /> : null}
      {!loading && icon ? <Ionicons name={icon} size={18} color={palette.fg} /> : null}
      <Text
        style={{
          color: palette.fg,
          fontSize: size === 'lg' ? 16 : 15,
          fontWeight: '600',
          letterSpacing: -0.1,
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export interface FieldProps extends TextInputProps {
  label: string;
  hint?: string;
  error?: string | null;
}

export function Field({ label, hint, error, style, ...props }: FieldProps) {
  const [focused, setFocused] = React.useState(false);

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text style={[typography.small, { color: colors.inkSoft, fontWeight: '600' }]}>{label}</Text>
        {hint ? <Text style={[typography.small, { color: colors.subtle }]}>{hint}</Text> : null}
      </View>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.subtle}
        onFocus={(event) => {
          setFocused(true);
          props.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          props.onBlur?.(event);
        }}
        style={[
          {
            minHeight: 48,
            borderRadius: radius.md,
            borderWidth: StyleSheet.hairlineWidth * 2,
            borderColor: error ? colors.danger : focused ? colors.accent : colors.lineStrong,
            backgroundColor: colors.canvas,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
            fontSize: 16,
            color: colors.ink,
          },
          style,
        ]}
        {...props}
      />
      {error ? <Text style={[typography.small, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

const BADGE_TONES: Record<BadgeTone, { bg: string; fg: string }> = {
  neutral: { bg: colors.surface2, fg: colors.muted },
  accent: { bg: colors.accentSoft, fg: colors.accentHover },
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  info: { bg: colors.infoSoft, fg: colors.info },
};

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const palette = BADGE_TONES[tone];
  return (
    <View
      style={{
        backgroundColor: palette.bg,
        borderRadius: radius.full,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ color: palette.fg, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

export function Divider({ style }: { style?: ViewStyle }) {
  return (
    <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: colors.line }, style]} />
  );
}

/** Squelette de chargement : jamais de spinner plein écran sur une liste. */
export function Skeleton({ height = 16, width = '100%', style }: { height?: number; width?: number | string; style?: ViewStyle }) {
  const opacity = React.useMemo(() => new Animated.Value(0.5), []);

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { height, width: width as ViewStyle['width'], borderRadius: radius.sm, backgroundColor: colors.surface2, opacity },
        style,
      ]}
    />
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing['4xl'], paddingHorizontal: spacing.xl, gap: spacing.md }}>
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: radius.lg,
          backgroundColor: colors.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.line,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={22} color={colors.subtle} />
      </View>
      <Heading style={{ textAlign: 'center' }}>{title}</Heading>
      {description ? (
        <Muted style={{ textAlign: 'center', maxWidth: 300 }}>{description}</Muted>
      ) : null}
      {action ? <View style={{ marginTop: spacing.sm }}>{action}</View> : null}
    </View>
  );
}

export function Banner({
  tone = 'info',
  title,
  description,
  action,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success';
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  const palette = {
    info: { bg: colors.accentSoft, fg: colors.accentHover, border: colors.accentBorder },
    warning: { bg: colors.warningSoft, fg: colors.warning, border: colors.warning },
    danger: { bg: colors.dangerSoft, fg: colors.danger, border: colors.danger },
    success: { bg: colors.successSoft, fg: colors.success, border: colors.success },
  }[tone];

  return (
    <View
      style={{
        backgroundColor: palette.bg,
        borderRadius: radius.md,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: palette.border,
        padding: spacing.md,
        gap: 6,
      }}
    >
      <Text style={{ color: palette.fg, fontSize: 14, fontWeight: '600' }}>{title}</Text>
      {description ? (
        <Text style={{ color: palette.fg, fontSize: 13, lineHeight: 18, opacity: 0.9 }}>
          {description}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: spacing.xs }}>{action}</View> : null}
    </View>
  );
}

export function Screen({
  children,
  scroll = true,
  refreshControl,
  contentStyle,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  contentStyle?: ViewStyle;
}) {
  const content = (
    <View style={[{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing['4xl'] }, contentStyle]}>
      {children}
    </View>
  );

  if (!scroll) {
    return <View style={{ flex: 1, backgroundColor: colors.surface }}>{content}</View>;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
    >
      {content}
    </ScrollView>
  );
}

export { Ionicons };
