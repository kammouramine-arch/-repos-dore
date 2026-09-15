import * as React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LogoMark } from './logo';
import { useMobileLocale } from '@/lib/i18n';
import { colors, radius, spacing } from '@/theme';

/**
 * Kit visuel de l'authentification.
 *
 * Un seul système pour l'entrée, l'e-mail, le code et l'onboarding : fond
 * blanc, composition centrée, typographie ferme, bleu DEVISERA réservé aux
 * actions et au monogramme. Les entrées sont animées par Reanimated sur le
 * fil natif, courtes et sans rebond ; le réglage iOS « Réduire les
 * animations » est respecté par défaut.
 */
export const AUTH_CONTROL_HEIGHT = 56;
const ENTER_DURATION = 420;
const ENTER_STEP = 55;
const enterEasing = Easing.out(Easing.cubic);

/** Apparition douce, décalée selon `index` (0, 1, 2…). */
export function Entrance({ index = 0, children, style, distance = 14 }: { index?: number; children: React.ReactNode; style?: StyleProp<ViewStyle>; distance?: number }) {
  // Valeurs partagées plutôt qu'une animation de disposition : l'entrée se
  // joue une fois au montage et n'est jamais rejouée ni perturbée quand un
  // frère (message d'erreur, état de chargement) apparaît ou disparaît.
  const progress = useSharedValue(0);
  React.useEffect(() => {
    progress.set(withDelay(60 + index * ENTER_STEP, withTiming(1, { duration: ENTER_DURATION, easing: enterEasing })));
    // Une seule entrée par montage : l'index ne change pas pendant la vie du composant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const animated = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ translateY: (1 - progress.get()) * distance }],
  }));
  return <Animated.View style={[animated, style]}>{children}</Animated.View>;
}

/** Fondu simple, pour un message qui apparaît après coup. */
/**
 * Fondu d'apparition pour un élément monté après coup (message, état).
 * Piloté par une valeur partagée plutôt qu'une animation de disposition :
 * l'insertion ne touche jamais les frères déjà en place.
 */
export function Appear({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const opacity = useSharedValue(0);
  const shift = useSharedValue(6);
  React.useEffect(() => {
    opacity.set(withTiming(1, { duration: 220, easing: enterEasing }));
    shift.set(withTiming(0, { duration: 220, easing: enterEasing }));
  }, [opacity, shift]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.get(), transform: [{ translateY: shift.get() }] }));
  return <Animated.View style={[animated, style]}>{children}</Animated.View>;
}

/**
 * Pression : réduction de 2 % avec un ressort ferme, retour haptique léger,
 * et un garde contre le double appui. L'action part immédiatement.
 */
export function PressableScale({ onPress, disabled, style, children, haptic = 'light', pressedScale = 0.98, ...props }: Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  haptic?: 'light' | 'medium' | 'selection' | 'none';
  pressedScale?: number;
}) {
  const scale = useSharedValue(1);
  const last = React.useRef(0);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[animated, style]}>
      <Pressable
        disabled={disabled}
        onPressIn={() => { scale.set(withSpring(pressedScale, { damping: 22, stiffness: 420, mass: 0.6 })); }}
        onPressOut={() => { scale.set(withSpring(1, { damping: 22, stiffness: 420, mass: 0.6 })); }}
        onPress={(event) => {
          const now = Date.now();
          if (now - last.current < 600) return;
          last.current = now;
          if (haptic === 'light') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
          else if (haptic === 'medium') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
          else if (haptic === 'selection') void Haptics.selectionAsync().catch(() => undefined);
          onPress?.(event);
        }}
        {...props}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

/** Monogramme posé sur une pastille blanche avec une lumière bleue très douce. */
export function BrandMark({ size = 72 }: { size?: number }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          position: 'absolute',
          width: size * 1.9,
          height: size * 1.9,
          borderRadius: size,
          backgroundColor: colors.accentSoft,
          opacity: 0.7,
        }}
      />
      <View
        style={[
          { width: size + 16, height: size + 16, borderRadius: (size + 16) * 0.3, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
          Platform.select({ ios: { shadowColor: '#2F52E8', shadowOpacity: 0.28, shadowRadius: 22, shadowOffset: { width: 0, height: 10 } }, android: { elevation: 6 }, default: {} }),
        ]}
      >
        <LogoMark size={size} stroke={Math.max(1.8, size * 0.06)} />
      </View>
    </View>
  );
}

/**
 * Écran d'authentification : fond blanc, retour discret, contenu défilable
 * quand le clavier ou un petit iPhone le demandent, pied posé au-dessus de
 * l'indicateur d'accueil.
 */
export function AuthScreen({
  back = false,
  onBack,
  children,
  footer,
  contentStyle,
  scroll = true,
  keyboardOffset = 0,
}: {
  back?: boolean;
  onBack?: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  scroll?: boolean;
  keyboardOffset?: number;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const locale = useMobileLocale();
  const { width } = useWindowDimensions();
  const horizontal = width >= 430 ? spacing['2xl'] + 4 : spacing['2xl'];
  useFocusEffect(
    React.useCallback(() => {
      setStatusBarStyle('dark');
      return undefined;
    }, []),
  );
  const goBack = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/(auth)' as never)));
  const body = (
    <>
      <View style={{ paddingTop: insets.top + spacing.sm, paddingHorizontal: horizontal - spacing.sm, height: insets.top + spacing.sm + 44, justifyContent: 'center' }}>
        {back ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={locale === 'en' ? 'Back' : 'Retour'}
            hitSlop={10}
            onPress={goBack}
            style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? colors.surface2 : colors.surface })}
          >
            <Ionicons name="chevron-back" size={22} color={colors.ink} />
          </Pressable>
        ) : null}
      </View>
      <View style={[{ flexGrow: 1, paddingHorizontal: horizontal }, contentStyle]}>{children}</View>
      {footer ? <View style={{ paddingHorizontal: horizontal, paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.sm, paddingTop: spacing.md }}>{footer}</View> : null}
    </>
  );
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={keyboardOffset}>
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            showsVerticalScrollIndicator={false}
            contentInsetAdjustmentBehavior="never"
            contentContainerStyle={{ flexGrow: 1 }}
            bounces={false}
          >
            {body}
          </ScrollView>
        ) : body}
      </KeyboardAvoidingView>
    </View>
  );
}

/** Titre d'écran et sous-titre, alignés à gauche ou centrés. */
export function AuthHeading({ title, subtitle, align = 'left', index = 0, kicker }: { title: string; subtitle?: string; align?: 'left' | 'center'; index?: number; kicker?: string }) {
  const { width } = useWindowDimensions();
  const compact = width <= 375;
  return (
    <View style={{ gap: spacing.sm, alignItems: align === 'center' ? 'center' : 'flex-start' }}>
      {kicker ? (
        <Entrance index={index}>
          <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 1.1, color: colors.accent, textTransform: 'uppercase', textAlign: align }}>{kicker}</Text>
        </Entrance>
      ) : null}
      <Entrance index={index + (kicker ? 1 : 0)}>
        <Text accessibilityRole="header" style={{ fontSize: compact ? 27 : 30, lineHeight: compact ? 33 : 36, fontWeight: '700', letterSpacing: -0.9, color: colors.ink, textAlign: align }}>{title}</Text>
      </Entrance>
      {subtitle ? (
        <Entrance index={index + (kicker ? 2 : 1)}>
          <Text style={{ fontSize: 16, lineHeight: 23, color: colors.muted, textAlign: align, maxWidth: 340 }}>{subtitle}</Text>
        </Entrance>
      ) : null}
    </View>
  );
}

const nativeOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null;

/** Champ rempli, sans contour au repos, liseré bleu au focus. */
export function AuthField({ label, hint, help, error, style, inputRef, ...props }: TextInputProps & { label: string; hint?: string; help?: string; error?: string | null; style?: StyleProp<TextStyle>; inputRef?: React.RefObject<TextInput | null> }) {
  const [focused, setFocused] = React.useState(false);
  return (
    <View style={{ gap: 7 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
        <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.inkSoft, flexShrink: 0 }}>{label}</Text>
        {hint ? <Text numberOfLines={1} style={{ fontSize: 12.5, color: colors.subtle, flexShrink: 1 }}>{hint}</Text> : null}
      </View>
      <TextInput
        ref={inputRef}
        accessibilityLabel={label}
        placeholderTextColor={colors.subtle}
        onFocus={(event) => { setFocused(true); props.onFocus?.(event); }}
        onBlur={(event) => { setFocused(false); props.onBlur?.(event); }}
        style={[
          {
            height: AUTH_CONTROL_HEIGHT,
            borderRadius: radius.md + 2,
            backgroundColor: focused ? colors.canvas : colors.surface,
            borderWidth: 1.5,
            borderColor: error ? colors.danger : focused ? colors.accent : 'transparent',
            paddingHorizontal: spacing.lg,
            fontSize: 16.5,
            color: colors.ink,
          },
          nativeOutline,
          style,
        ]}
        {...props}
      />
      {error ? <Text style={{ fontSize: 13, color: colors.danger }}>{error}</Text> : null}
      {help && !error ? <Text style={{ fontSize: 12.5, lineHeight: 17, color: colors.subtle }}>{help}</Text> : null}
    </View>
  );
}

/** Action principale : bleu DEVISERA plein, 56 pt, chargement intégré. */
export function PrimaryAction({ title, onPress, loading, disabled, tone = 'accent', icon }: { title: string; onPress: () => void; loading?: boolean; disabled?: boolean; tone?: 'accent' | 'soft' | 'outline'; icon?: keyof typeof Ionicons.glyphMap }) {
  const palette = {
    accent: { bg: colors.accent, fg: colors.white, border: colors.accent },
    soft: { bg: colors.accentSoft, fg: colors.accentHover, border: colors.accentSoft },
    outline: { bg: colors.canvas, fg: colors.ink, border: colors.lineStrong },
  }[tone];
  const inactive = disabled || loading;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(inactive), busy: Boolean(loading) }}
      disabled={inactive}
      onPress={onPress}
      haptic={tone === 'accent' ? 'medium' : 'light'}
      style={[
        Platform.select({ ios: tone === 'accent' ? { shadowColor: '#2F52E8', shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } } : {}, default: {} }),
      ]}
    >
      <View
        style={{
          height: AUTH_CONTROL_HEIGHT,
          borderRadius: radius.md + 2,
          backgroundColor: palette.bg,
          borderWidth: tone === 'outline' ? 1 : 0,
          borderColor: palette.border,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 10,
          opacity: disabled && !loading ? 0.5 : 1,
        }}
      >
        {loading ? <ActivityIndicator size="small" color={palette.fg} /> : icon ? <Ionicons name={icon} size={19} color={palette.fg} /> : null}
        <Text numberOfLines={1} style={{ color: palette.fg, fontSize: 17, fontWeight: '600', letterSpacing: -0.2, includeFontPadding: false }}>{title}</Text>
      </View>
    </PressableScale>
  );
}

/** Lien textuel : « Déjà un compte ? Se connecter ». */
export function TextAction({ prefix, label, onPress, disabled, align = 'center' }: { prefix?: string; label: string; onPress: () => void; disabled?: boolean; align?: 'center' | 'left' }) {
  return (
    <Pressable accessibilityRole="link" disabled={disabled} onPress={onPress} hitSlop={6} style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', alignItems: align === 'center' ? 'center' : 'flex-start', opacity: pressed ? 0.6 : disabled ? 0.5 : 1 })}>
      <Text style={{ fontSize: 15, color: colors.muted, textAlign: align }}>
        {prefix ? `${prefix} ` : ''}
        <Text style={{ color: colors.accent, fontWeight: '600' }}>{label}</Text>
      </Text>
    </Pressable>
  );
}

export function OrDivider({ label }: { label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 2 }}>
      <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.lineStrong }} />
      <Text style={{ fontSize: 13, color: colors.subtle, fontWeight: '500' }}>{label}</Text>
      <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.lineStrong }} />
    </View>
  );
}

/** Message d'état : erreur, information ou succès, sans jargon. */
export function Notice({ tone = 'danger', title, description, onDismiss }: { tone?: 'danger' | 'info' | 'success'; title: string; description?: string; onDismiss?: () => void }) {
  const palette = {
    danger: { bg: colors.dangerSoft, fg: colors.danger, icon: 'alert-circle' as const },
    info: { bg: colors.accentSoft, fg: colors.accentHover, icon: 'information-circle' as const },
    success: { bg: colors.successSoft, fg: colors.success, icon: 'checkmark-circle' as const },
  }[tone];
  return (
    <Appear>
      <View accessibilityRole="alert" style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', backgroundColor: palette.bg, borderRadius: radius.md, padding: spacing.md, paddingRight: onDismiss ? spacing.sm : spacing.md }}>
        <Ionicons name={palette.icon} size={19} color={palette.fg} style={{ marginTop: 1 }} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: palette.fg, fontSize: 14.5, fontWeight: '600', lineHeight: 20 }}>{title}</Text>
          {description ? <Text style={{ color: palette.fg, fontSize: 13.5, lineHeight: 19, opacity: 0.9 }}>{description}</Text> : null}
        </View>
        {onDismiss ? (
          <Pressable accessibilityRole="button" accessibilityLabel="OK" hitSlop={8} onPress={onDismiss} style={{ padding: 2 }}>
            <Ionicons name="close" size={18} color={palette.fg} />
          </Pressable>
        ) : null}
      </View>
    </Appear>
  );
}

/** Progression d'un parcours en quelques étapes : « Étape 2 sur 2 » et une barre fine. */
export function StepProgress({ step, total, label }: { step: number; total: number; label: string }) {
  const width = useSharedValue(0);
  React.useEffect(() => {
    width.set(withTiming(step / total, { duration: 520, easing: enterEasing }));
  }, [step, total, width]);
  const bar = useAnimatedStyle(() => ({ width: `${Math.round(width.value * 100)}%` }));
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.muted, letterSpacing: 0.2 }}>{label}</Text>
      <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.surface2, overflow: 'hidden' }}>
        <Animated.View style={[{ height: 4, borderRadius: 2, backgroundColor: colors.accent }, bar]} />
      </View>
    </View>
  );
}

/**
 * Code à six chiffres : six cases lisibles, un seul champ réel derrière pour
 * garder le remplissage automatique iOS depuis Messages/Mail.
 */
export function CodeInput({ value, onChange, length = 6, editable = true, error = false, autoFocus = false }: { value: string; onChange: (value: string) => void; length?: number; editable?: boolean; error?: boolean; autoFocus?: boolean }) {
  const ref = React.useRef<TextInput>(null);
  const [focused, setFocused] = React.useState(false);
  const digits = value.split('');
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Code" onPress={() => ref.current?.focus()} disabled={!editable}>
      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'space-between' }}>
        {Array.from({ length }).map((_, index) => {
          const active = focused && index === Math.min(value.length, length - 1);
          const filled = index < value.length;
          return (
            <View
              key={index}
              style={{
                flex: 1,
                height: 60,
                borderRadius: radius.md,
                backgroundColor: filled || active ? colors.canvas : colors.surface,
                borderWidth: 1.5,
                borderColor: error ? colors.danger : active ? colors.accent : filled ? colors.lineStrong : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 24, fontWeight: '700', color: colors.ink, letterSpacing: -0.5, fontVariant: ['tabular-nums'] }}>{digits[index] ?? ''}</Text>
              {active && !filled ? <View style={{ position: 'absolute', width: 2, height: 24, borderRadius: 1, backgroundColor: colors.accent }} /> : null}
            </View>
          );
        })}
      </View>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(next) => onChange(next.normalize('NFKC').replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={length}
        editable={editable}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        caretHidden
        style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
      />
    </Pressable>
  );
}
