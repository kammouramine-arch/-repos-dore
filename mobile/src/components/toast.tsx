import * as React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows, spacing } from '@/theme';

type Tone = 'success' | 'error' | 'info';

interface ToastContextValue {
  toast: (input: { title: string; description?: string; tone?: Tone }) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

const ICONS: Record<Tone, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
};

const TONE_COLORS: Record<Tone, string> = {
  success: colors.success,
  error: colors.danger,
  info: colors.accent,
};

/** Notifications éphémères, avec retour haptique cohérent avec le ton. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = React.useState<{ title: string; description?: string; tone: Tone } | null>(
    null,
  );
  const translate = React.useMemo(() => new Animated.Value(-120), []);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = React.useCallback(() => {
    Animated.timing(translate, { toValue: -120, duration: 180, useNativeDriver: true }).start(() =>
      setCurrent(null),
    );
  }, [translate]);

  const toast = React.useCallback<ToastContextValue['toast']>(
    ({ title, description, tone = 'success' }) => {
      if (timer.current) clearTimeout(timer.current);
      setCurrent({ title, description, tone });

      void Haptics.notificationAsync(
        tone === 'error'
          ? Haptics.NotificationFeedbackType.Error
          : tone === 'info'
            ? Haptics.NotificationFeedbackType.Warning
            : Haptics.NotificationFeedbackType.Success,
      );

      Animated.spring(translate, { toValue: 0, useNativeDriver: true, damping: 18 }).start();
      timer.current = setTimeout(hide, tone === 'error' ? 5000 : 3200);
    },
    [hide, translate],
  );

  const value = React.useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {current ? (
        <Animated.View
          accessibilityLiveRegion="polite"
          style={[
            {
              position: 'absolute',
              top: insets.top + spacing.sm,
              left: spacing.lg,
              right: spacing.lg,
              backgroundColor: colors.canvas,
              borderRadius: radius.md,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: colors.line,
              padding: spacing.md,
              flexDirection: 'row',
              gap: spacing.md,
              transform: [{ translateY: translate }],
            },
            shadows.floating as object,
          ]}
        >
          <Ionicons name={ICONS[current.tone]} size={20} color={TONE_COLORS[current.tone]} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink }}>{current.title}</Text>
            {current.description ? (
              <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
                {current.description}
              </Text>
            ) : null}
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error('useToast doit être utilisé dans un ToastProvider.');
  return context;
}
