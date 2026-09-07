import * as React from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type TextInputProps,
  type TextProps,
  type StyleProp,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
  type RefreshControlProps,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Ionicons from '@expo/vector-icons/Ionicons';
import { formatCents } from '@devisia/shared';
import { useReducedMotion, useTouchMotion } from '@/components/motion';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { localizeNode, localizeText, useMobileLocale } from '@/lib/i18n';

/**
 * Composants de base DEVISERA mobile.
 * Même vocabulaire visuel que le web : un seul accent, des surfaces neutres,
 * des rayons discrets et aucun ornement gratuit.
 */

export function Title({ style, ...props }: TextProps) {
  const locale = useMobileLocale();
  return <Text style={[typography.title, { color: colors.ink }, style]} {...props}>{localizeNode(locale, props.children)}</Text>;
}

export function Heading({ style, ...props }: TextProps) {
  const locale = useMobileLocale();
  return <Text style={[typography.heading, { color: colors.ink }, style]} {...props}>{localizeNode(locale, props.children)}</Text>;
}

/**
 * Applique une échelle typographique sans rogner le texte.
 *
 * Chaque style de base fixe un `lineHeight`. Quand un appelant agrandit la
 * police sans y toucher — `<Body style={{ fontSize: 24 }}>` — la glyphe déborde
 * de sa boîte et se retrouve coupée en haut et en bas : c'est ce qu'on voyait
 * sur les prix d'abonnement d'un vrai iPhone. Le même piège guette la mise à
 * l'échelle d'accessibilité, car `lineHeight` ne suit pas la taille demandée
 * par le système.
 *
 * On retire donc l'interligne fixe dès que la taille est surchargée à la
 * hausse : les métriques naturelles de la police prennent le relais, et elles,
 * elles s'adaptent.
 */
function sansRognage(base: { fontSize: number; lineHeight: number }, style: StyleProp<TextStyle>) {
  const aplati = StyleSheet.flatten(style) as TextStyle | undefined;
  const demandee = aplati?.fontSize;
  if (typeof demandee !== 'number' || demandee <= base.fontSize) return [base, style];
  if (typeof aplati?.lineHeight === 'number') return [base, style];
  return [base, { lineHeight: undefined }, style];
}

export function Body({ style, ...props }: TextProps) {
  const locale = useMobileLocale();
  return (
    <Text
      style={[{ color: colors.inkSoft }, sansRognage(typography.body, style), style]}
      {...props}
    >{localizeNode(locale, props.children)}</Text>
  );
}

export function Muted({ style, ...props }: TextProps) {
  const locale = useMobileLocale();
  return (
    <Text
      style={[{ color: colors.muted }, sansRognage(typography.small, style), style]}
      {...props}
    >{localizeNode(locale, props.children)}</Text>
  );
}

export function Caption({
  upper = false,
  style,
  ...props
}: TextProps & { /** Majuscules : réservé aux étiquettes courtes, jamais aux phrases. */ upper?: boolean }) {
  const locale = useMobileLocale();
  return (
    <Text
      style={[
        typography.caption,
        { color: colors.subtle },
        upper ? { textTransform: 'uppercase' } : { letterSpacing: 0, fontWeight: '400' as const },
        style,
      ]}
      {...props}
    >{localizeNode(locale, props.children)}</Text>
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
          padding: 18,
        },
        shadows.card as ViewStyle,
        style,
      ]}
      {...props}
    />
  );
}

/** Carte interactive avec une vraie compression tactile, pas un simple fondu. */
export function PressableCard({
  children,
  onPress,
  style,
  accessibilityLabel,
  accessibilityRole = 'button',
  accessibilityState,
  disabled = false,
  haptic = false,
}: {
  children: React.ReactNode;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel: string;
  accessibilityRole?: PressableProps['accessibilityRole'];
  accessibilityState?: PressableProps['accessibilityState'];
  disabled?: boolean;
  /** Feedback réservé aux cartes qui déclenchent une navigation ou une action. */
  haptic?: boolean;
}) {
  const locale = useMobileLocale();
  const touch = useTouchMotion(0.982);
  const lastPressAt = React.useRef(0);

  return (
    <Animated.View style={{ transform: [{ scale: touch.scale }] }}>
      <Pressable
        accessibilityRole={accessibilityRole}
        accessibilityLabel={localizeText(locale, accessibilityLabel)}
        accessibilityState={{ ...accessibilityState, disabled }}
        disabled={disabled}
        onPress={() => {
          touch.pressOut();
          // Navigation can take a frame on a real device. Ignore an accidental
          // second tap in that hand-off window instead of pushing two routes.
          const now = Date.now();
          if (now - lastPressAt.current < 500) return;
          lastPressAt.current = now;
          if (haptic) void Haptics.selectionAsync().catch(() => undefined);
          onPress();
        }}
        onPressIn={touch.pressIn}
        onPressOut={touch.pressOut}
        style={({ pressed }) => [
          {
            backgroundColor: colors.canvas,
            borderRadius: radius.lg,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.line,
            padding: 18,
            opacity: pressed ? 0.96 : 1,
          },
          shadows.card as ViewStyle,
          style,
        ]}
      >
        {children}
      </Pressable>
    </Animated.View>
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
  onPressIn,
  onPressOut,
  ...props
}: ButtonProps) {
  const locale = useMobileLocale();
  const palette = BUTTON_COLORS[variant];
  const height = size === 'lg' ? 56 : 48;
  const touch = useTouchMotion(0.975);

  /*
   * Un envoi de devis, une suppression, un achat ne doivent jamais partir
   * deux fois parce qu'un pouce a tremblé. L'état `loading` protège quand
   * l'appelant le gère ; ce garde protège même quand il l'oublie, et ne coûte
   * rien à l'usage normal.
   */
  const dernierAppui = React.useRef(0);

  return (
    <Animated.View style={[style, { transform: [{ scale: touch.scale }] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: Boolean(disabled) || loading, busy: loading }}
        disabled={disabled || loading}
        hitSlop={6}
        onPressIn={(event) => {
          touch.pressIn();
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          touch.pressOut();
          onPressOut?.(event);
        }}
        onPress={(event) => {
          touch.pressOut();
          const maintenant = Date.now();
          if (maintenant - dernierAppui.current < 600) return;
          dernierAppui.current = maintenant;
          if (haptic) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
          onPress?.(event);
        }}
        style={({ pressed }) => ({
          height,
          width: '100%',
          borderRadius: radius.md,
          backgroundColor: palette.bg,
          borderWidth: variant === 'secondary' ? StyleSheet.hairlineWidth : 0,
          borderColor: palette.border,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: spacing.sm,
          paddingHorizontal: spacing.xl,
          opacity: disabled || loading ? 0.55 : pressed ? 0.9 : 1,
        })}
        {...props}
      >
        {loading ? <ActivityIndicator color={palette.fg} size="small" /> : null}
        {!loading && icon ? <Ionicons name={icon} size={19} color={palette.fg} /> : null}
        <Text
          style={{
            color: palette.fg,
            fontSize: size === 'lg' ? 16 : 15,
            fontWeight: '600',
            letterSpacing: -0.15,
          }}
        >
          {localizeText(locale, title)}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export interface FieldProps extends TextInputProps {
  label: string;
  hint?: string;
  error?: string | null;
}

/*
 * Le champ dessine déjà son propre état de focus (bordure accentuée). Sur le
 * web, le navigateur en ajoute un second, noir, qui casse la maquette ; on le
 * neutralise sans rien retirer à l'indication visuelle.
 */
const sansContourNatif =
  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null;

export function Field({ label, hint, error, style, ...props }: FieldProps) {
  const locale = useMobileLocale();
  const [focused, setFocused] = React.useState(false);

  return (
    <View style={{ gap: 6 }}>
      <View style={{ gap: 4 }}>
        <Text style={[typography.small, { color: colors.inkSoft, fontWeight: '600' }]}>{localizeText(locale, label)}</Text>
        {hint ? <Text style={[typography.small, { color: colors.muted, flexShrink: 1 }]}>{localizeText(locale, hint)}</Text> : null}
      </View>
      <TextInput
        accessibilityLabel={localizeText(locale, label)}
        placeholder={props.placeholder ? localizeText(locale, props.placeholder) : props.placeholder}
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
            minHeight: 52,
            borderRadius: radius.md,
            borderWidth: StyleSheet.hairlineWidth * 2,
            borderColor: error ? colors.danger : focused ? colors.accent : colors.lineStrong,
            backgroundColor: focused ? colors.canvas : '#FCFCFD',
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            fontSize: 16,
            color: colors.ink,
          },
          sansContourNatif,
          style,
        ]}
        {...props}
      />
      {error ? <Text style={[typography.small, { color: colors.danger }]}>{localizeText(locale, error)}</Text> : null}
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
  const locale = useMobileLocale();
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
      <Text style={{ color: palette.fg, fontSize: 12, fontWeight: '600' }}>{localizeText(locale, label)}</Text>
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
  const reduced = useReducedMotion();

  React.useEffect(() => {
    if (reduced) {
      opacity.stopAnimation();
      opacity.setValue(0.65);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduced]);

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
  const locale = useMobileLocale();
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
      <Heading style={{ textAlign: 'center' }}>{localizeText(locale, title)}</Heading>
      {description ? (
        <Muted style={{ textAlign: 'center', maxWidth: 300 }}>{localizeText(locale, description)}</Muted>
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
  onDismiss,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success';
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Croix de fermeture : un avertissement traité ne doit pas rester à l'écran. */
  onDismiss?: () => void;
}) {
  const locale = useMobileLocale();
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
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
        <Text style={{ flex: 1, color: palette.fg, fontSize: 14, fontWeight: '600' }}>{localizeText(locale, title)}</Text>
        {onDismiss ? (
          <Pressable accessibilityRole="button" accessibilityLabel={locale === 'en' ? 'Close' : 'Fermer'} onPress={onDismiss} hitSlop={10}>
            <Ionicons name="close" size={16} color={palette.fg} />
          </Pressable>
        ) : null}
      </View>
      {description ? (
        <Text style={{ color: palette.fg, fontSize: 13, lineHeight: 18, opacity: 0.9 }}>
          {localizeText(locale, description)}
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
    <View
      style={[{ padding: spacing.xl, gap: spacing.xl, paddingBottom: spacing['5xl'] }, contentStyle]}
    >
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
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      alwaysBounceVertical
      decelerationRate="fast"
      overScrollMode="never"
      refreshControl={refreshControl}
    >
      {content}
    </ScrollView>
  );
}

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  action,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  action?: React.ReactNode;
}) {
  const locale = useMobileLocale();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg }}>
      <View style={{ flex: 1, gap: 5 }}>
        {eyebrow ? <Caption upper style={{ color: colors.accent }}>{localizeText(locale, eyebrow)}</Caption> : null}
        <Title>{localizeText(locale, title)}</Title>
        {subtitle ? <Muted>{localizeText(locale, subtitle)}</Muted> : null}
      </View>
      {action ? <View style={{ paddingTop: eyebrow ? 14 : 0 }}>{action}</View> : null}
    </View>
  );
}

export { Ionicons };

/* ==========================================================================
 * Composants ajoutés lors de la reprise produit.
 *
 * Chacun existe parce qu'un écran le réinventait avec des valeurs codées en
 * dur : c'est ce qui rendait l'application inégale d'un écran à l'autre.
 * ========================================================================== */

/** Bouton à icône seule, avec une cible tactile conforme même si l'icône est petite. */
export function IconButton({
  icon,
  label,
  onPress,
  tone = 'neutral',
  size = 20,
  disabled,
  haptic = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  /** Lu par VoiceOver : une icône seule n'est jamais explicite. */
  label: string;
  onPress: () => void;
  tone?: 'neutral' | 'accent' | 'danger';
  size?: number;
  disabled?: boolean;
  haptic?: boolean;
}) {
  const locale = useMobileLocale();
  const touch = useTouchMotion(0.92);
  const color =
    tone === 'accent' ? colors.accent : tone === 'danger' ? colors.danger : colors.muted;
  return (
    <Animated.View style={{ transform: [{ scale: touch.scale }] }}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={localizeText(locale, label)}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPressIn={touch.pressIn}
      onPressOut={touch.pressOut}
      onPress={() => {
        touch.pressOut();
        if (haptic) void Haptics.selectionAsync().catch(() => undefined);
        onPress();
      }}
      hitSlop={8}
      style={({ pressed }) => ({
        minWidth: 44,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.md,
        opacity: disabled ? 0.35 : pressed ? 0.55 : 1,
      })}
    >
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
    </Animated.View>
  );
}

/** Champ de recherche : le clavier se ferme à la validation, l'effacement est immédiat. */
export function SearchField({
  value,
  onChangeText,
  placeholder,
  autoFocus,
  onSubmit,
}: {
  value: string;
  onChangeText: (next: string) => void;
  placeholder: string;
  autoFocus?: boolean;
  onSubmit?: () => void;
}) {
  const locale = useMobileLocale();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.canvas,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.line,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        minHeight: 46,
      }}
    >
      <Ionicons name="search" size={17} color={colors.subtle} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={localizeText(locale, placeholder)}
        placeholderTextColor={colors.subtle}
        accessibilityLabel={localizeText(locale, placeholder)}
        autoFocus={autoFocus}
        autoCorrect={false}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        clearButtonMode="never"
        style={[
          typography.body,
          { flex: 1, color: colors.ink, paddingVertical: 10 },
          sansContourNatif,
        ]}
      />
      {value.length > 0 ? (
        <IconButton icon="close-circle" label={localizeText(locale, 'Effacer la recherche')} size={18} onPress={() => onChangeText('')} />
      ) : null}
    </View>
  );
}

/** Intitulé de section, avec action facultative alignée à droite. */
export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: { label: string; onPress: () => void };
}) {
  const locale = useMobileLocale();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.md,
      }}
    >
      <Text style={[typography.caption, { color: colors.subtle, textTransform: 'uppercase' }]}>
        {localizeText(locale, title)}
      </Text>
      {action ? (
        <Pressable accessibilityRole="button" onPress={action.onPress} hitSlop={8}>
          <Text style={[typography.small, { color: colors.accent, fontWeight: '600' }]}>
            {localizeText(locale, action.label)}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Ligne de liste tactile : un titre, un sous-titre, une valeur, un chevron. */
export function ListRow({
  title,
  subtitle,
  value,
  icon,
  onPress,
  destructive,
  last,
  haptic = true,
}: {
  title: string;
  subtitle?: string | null;
  value?: string | null;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  destructive?: boolean;
  last?: boolean;
  haptic?: boolean;
}) {
  const locale = useMobileLocale();
  const touch = useTouchMotion(0.992);
  const lastPressAt = React.useRef(0);
  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        minHeight: 56,
        borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: colors.line,
      }}
    >
      {icon ? (
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: destructive ? colors.dangerSoft : colors.surface2,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={18} color={destructive ? colors.danger : colors.inkSoft} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          numberOfLines={1}
          style={[typography.body, { fontWeight: '600', color: destructive ? colors.danger : colors.ink }]}
        >
          {localizeText(locale, title)}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={[typography.small, { color: colors.muted }]}>
            {localizeText(locale, subtitle)}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text style={[typography.body, { color: colors.muted, fontVariant: ['tabular-nums'] }]}>
          {value}
        </Text>
      ) : null}
      {onPress ? <Ionicons name="chevron-forward" size={17} color={colors.subtle} /> : null}
    </View>
  );

  if (!onPress) return content;
  return (
    <Animated.View style={{ transform: [{ scale: touch.scale }] }}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={localizeText(locale, title)}
      onPressIn={touch.pressIn}
      onPressOut={touch.pressOut}
      onPress={() => {
        touch.pressOut();
        const now = Date.now();
        if (now - lastPressAt.current < 500) return;
        lastPressAt.current = now;
        if (haptic) void Haptics.selectionAsync().catch(() => undefined);
        onPress();
      }}
      style={({ pressed }) => ({ backgroundColor: pressed ? colors.surface2 : 'transparent' })}
    >
      {content}
    </Pressable>
    </Animated.View>
  );
}

/** État de chargement nommé : l'utilisateur sait ce que l'application attend. */
export function LoadingState({ label }: { label: string }) {
  const locale = useMobileLocale();
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: spacing['4xl'], gap: spacing.md }}>
      <ActivityIndicator color={colors.accent} />
      <Text style={[typography.small, { color: colors.muted }]}>{localizeText(locale, label)}</Text>
    </View>
  );
}

/** Échec de chargement : toujours accompagné d'une reprise possible. */
export function ErrorState({
  title = 'Chargement impossible',
  description,
  onRetry,
}: {
  title?: string;
  description: string;
  onRetry: () => void;
}) {
  const locale = useMobileLocale();
  return (
    /* Centré dans la hauteur disponible : collé en haut, l'écran d'erreur
       ressemblait à un contenu qui n'a pas fini de charger. */
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing['3xl'],
        gap: spacing.md,
      }}
    >
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: radius.full,
          backgroundColor: colors.dangerSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="cloud-offline-outline" size={22} color={colors.danger} />
      </View>
      <Text style={[typography.heading, { color: colors.ink, textAlign: 'center' }]}>{localizeText(locale, title)}</Text>
      <Text style={[typography.small, { color: colors.muted, textAlign: 'center', paddingHorizontal: spacing.xl }]}>
        {localizeText(locale, description)}
      </Text>
      <Button title={localizeText(locale, 'Réessayer')} variant="secondary" icon="refresh" onPress={onRetry} />
    </View>
  );
}

/** Progression d'un parcours en étapes. */
export function ProgressDots({ total, current }: { total: number; current: number }) {
  const locale = useMobileLocale();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={localizeText(locale, `Étape ${current + 1} sur ${total}`)}
      style={{ flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' }}
    >
      {Array.from({ length: total }, (_, index) => (
        <View
          key={index}
          style={{
            height: 6,
            width: index === current ? 22 : 6,
            borderRadius: radius.full,
            backgroundColor: index === current ? colors.accent : colors.lineStrong,
          }}
        />
      ))}
    </View>
  );
}

/** Choix parmi quelques options courtes, sans ouvrir de sélecteur. */
export function ChoiceRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (next: T) => void;
}) {
  const locale = useMobileLocale();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => {
              void Haptics.selectionAsync();
              onChange(option.value);
            }}
            style={({ pressed }) => ({
              paddingVertical: 10,
              paddingHorizontal: spacing.lg,
              minHeight: 44,
              justifyContent: 'center',
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: selected ? colors.accent : colors.line,
              backgroundColor: selected ? colors.accentSoft : colors.canvas,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text
              style={[
                typography.body,
                { fontWeight: '600', color: selected ? colors.accent : colors.inkSoft },
              ]}
            >
              {localizeText(locale, option.label)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Montant aligné, en chiffres à chasse fixe pour que les colonnes se lisent. */
export function Amount({
  cents,
  size = 'body',
  tone = 'ink',
}: {
  cents: number;
  size?: 'body' | 'metric';
  tone?: 'ink' | 'muted' | 'accent';
}) {
  const color = tone === 'muted' ? colors.muted : tone === 'accent' ? colors.accent : colors.ink;
  return (
    <Text style={[typography[size === 'metric' ? 'metric' : 'body'], { color, fontVariant: ['tabular-nums'] }]}>
      {formatCents(cents)}
    </Text>
  );
}

/**
 * Champ de texte qui grandit avec son contenu.
 *
 * Un objet de devis ou un libellé de ligne dépasse souvent la largeur d'un
 * iPhone. Sur une seule ligne le texte était rogné ; en multiligne à hauteur
 * fixe, il l'était verticalement. La hauteur suit donc le contenu.
 */
export function GrowingInput({
  style,
  minHeight = 24,
  ...props
}: React.ComponentProps<typeof TextInput> & { minHeight?: number }) {
  const [height, setHeight] = React.useState(minHeight);
  return (
    <TextInput
      {...props}
      multiline
      scrollEnabled={false}
      onContentSizeChange={(event) => setHeight(event.nativeEvent.contentSize.height)}
      style={[style, sansContourNatif, { height: Math.max(minHeight, height) }]}
    />
  );
}

/**
 * Prix d'abonnement.
 *
 * Deux pièges évités ici. D'abord l'interligne : un montant en 26 points dans
 * une boîte prévue pour 15 se fait couper — c'est ce qu'on voyait sur iPhone.
 * Ensuite l'imbrication : un `Text` de taille différente dans un autre `Text`
 * fait retomber toute la ligne sur l'interligne du parent. Le montant et son
 * suffixe sont donc deux éléments frères, alignés sur leur ligne de base.
 */
export function Price({
  cents,
  suffix,
  size = 30,
}: {
  cents: number;
  suffix?: string;
  size?: number;
}) {
  const locale = useMobileLocale();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' }}>
      <Text
        style={{
          fontSize: size,
          fontWeight: '700',
          letterSpacing: -0.7,
          color: colors.ink,
          fontVariant: ['tabular-nums'],
        }}
      >
        {formatCents(cents, { compact: true })}
      </Text>
      {suffix ? (
        <Text style={{ fontSize: 13, fontWeight: '400', color: colors.muted, marginLeft: 4 }}>
          {localizeText(locale, suffix)}
        </Text>
      ) : null}
    </View>
  );
}
