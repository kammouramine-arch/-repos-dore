import * as React from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as AppleAuthentication from 'expo-apple-authentication';
import Svg, { Path } from 'react-native-svg';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useMobileLocale } from '@/lib/i18n';
import { colors, radius, spacing } from '@/theme';
import { useTouchMotion } from './motion';
import Animated from 'react-native-reanimated';

const HEIGHT = 52;

/**
 * Boutons de connexion Apple, Google et e-mail.
 *
 * Apple : le bouton natif d'AuthenticationServices, seul traitement autorisé
 * par les règles Apple ; iOS le libelle dans la langue de l'application.
 * Google : le bouton clair officiel (fond blanc, bordure #747775, « G » en
 * couleurs, texte #1F1F1F). E-mail : le bouton DEVISERA.
 */
export function AppleContinueButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  if (Platform.OS !== 'ios') return null;
  return (
    <View style={{ opacity: disabled ? 0.55 : 1 }} pointerEvents={disabled ? 'none' : 'auto'}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={radius.md}
        style={{ height: HEIGHT, width: '100%' }}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
          onPress();
        }}
      />
    </View>
  );
}

function GoogleMark({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityElementsHidden>
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
  );
}

export function GoogleContinueButton({ onPress, disabled, loading }: { onPress: () => void; disabled?: boolean; loading?: boolean }) {
  const locale = useMobileLocale();
  const touch = useTouchMotion(0.98);
  return (
    <Animated.View style={{ transform: [{ scale: touch.scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={locale === 'en' ? 'Continue with Google' : 'Continuer avec Google'}
        accessibilityState={{ disabled: Boolean(disabled) || Boolean(loading), busy: Boolean(loading) }}
        disabled={disabled || loading}
        onPressIn={touch.pressIn}
        onPressOut={touch.pressOut}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
          onPress();
        }}
        style={({ pressed }) => ({
          height: HEIGHT,
          borderRadius: radius.md,
          backgroundColor: pressed ? '#F2F2F2' : '#FFFFFF',
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: '#747775',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          paddingHorizontal: spacing.lg,
          opacity: disabled ? 0.55 : 1,
        })}
      >
        {loading ? <ActivityIndicator size="small" color="#1F1F1F" /> : <GoogleMark />}
        <Text style={{ color: '#1F1F1F', fontSize: 16, fontWeight: '600', letterSpacing: -0.1, includeFontPadding: false }}>
          {locale === 'en' ? 'Continue with Google' : 'Continuer avec Google'}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function EmailContinueButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  const locale = useMobileLocale();
  const touch = useTouchMotion(0.98);
  return (
    <Animated.View style={{ transform: [{ scale: touch.scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: Boolean(disabled) }}
        disabled={disabled}
        onPressIn={touch.pressIn}
        onPressOut={touch.pressOut}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
          onPress();
        }}
        style={({ pressed }) => ({
          height: HEIGHT,
          borderRadius: radius.md,
          backgroundColor: pressed ? colors.accentHover : colors.accent,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          paddingHorizontal: spacing.lg,
          opacity: disabled ? 0.55 : 1,
        })}
      >
        <Ionicons name="mail-outline" size={19} color={colors.white} />
        <Text style={{ color: colors.white, fontSize: 16, fontWeight: '600', letterSpacing: -0.1, includeFontPadding: false }}>
          {locale === 'en' ? 'Continue with email' : 'Continuer avec l’adresse e-mail'}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
