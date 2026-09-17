import * as React from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useMobileLocale } from '@/lib/i18n';
import { activeScheme, colors, radius, spacing } from '@/theme';
import { AUTH_CONTROL_HEIGHT, PressableScale } from './auth-kit';

/**
 * Les trois façons de continuer.
 *
 * Apple : le bouton natif d'AuthenticationServices, seul traitement autorisé
 * par les règles Apple ; iOS le libelle dans la langue de l'application.
 * Pendant l'authentification, une pastille de même taille indique le
 * chargement, sans jamais imiter le bouton lui-même.
 * Google : le bouton officiel (fond blanc, bordure #747775, « G » en couleurs,
 * texte #1F1F1F ; et sa déclinaison sombre #131314 / #8E918F / #E3E3E3).
 * E-mail : action secondaire sur une surface bleue douce.
 *
 * ## Les deux marques ont leur version sombre, et elle est obligatoire
 *
 * Apple demande le bouton blanc sur fond sombre, Google sa déclinaison
 * sombre. Garder le bouton noir d'Apple sur une interface nuit n'est pas
 * seulement moins joli : c'est hors des règles des deux plateformes, et le
 * bouton disparaît dans le fond. Ils suivent donc le thème de DEVISERA.
 */
const HEIGHT = AUTH_CONTROL_HEIGHT;
const RADIUS = radius.md + 2;

export function AppleContinueButton({ onPress, disabled, loading }: { onPress: () => void; disabled?: boolean; loading?: boolean }) {
  const locale = useMobileLocale();
  const dark = activeScheme() === 'dark';
  const plate = dark ? '#FFFFFF' : '#000000';
  const mark = dark ? '#000000' : '#FFFFFF';
  if (Platform.OS !== 'ios') {
    // Aperçu web (captures de contrôle) : mêmes dimensions, jamais livré sur iPhone.
    if (Platform.OS !== 'web') return null;
    return (
      <PressableScale accessibilityRole="button" accessibilityState={{ disabled: Boolean(disabled) || Boolean(loading), busy: Boolean(loading) }} disabled={disabled || loading} onPress={onPress}>
        <View style={{ height: HEIGHT, borderRadius: RADIUS, backgroundColor: plate, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: disabled && !loading ? 0.55 : 1 }}>
          {loading ? <ActivityIndicator size="small" color={mark} /> : <Ionicons name="logo-apple" size={20} color={mark} style={{ marginTop: -2 }} />}
          <Text style={{ color: mark, fontSize: 17, fontWeight: '600', letterSpacing: -0.2 }}>{loading ? (locale === 'en' ? 'Signing in…' : 'Connexion…') : locale === 'en' ? 'Continue with Apple' : 'Continuer avec Apple'}</Text>
        </View>
      </PressableScale>
    );
  }
  if (loading) {
    return (
      <View accessibilityRole="button" accessibilityState={{ busy: true }} style={{ height: HEIGHT, borderRadius: RADIUS, backgroundColor: plate, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 }}>
        <ActivityIndicator size="small" color={mark} />
        <Text style={{ color: mark, fontSize: 17, fontWeight: '600', letterSpacing: -0.2 }}>{locale === 'en' ? 'Signing in…' : 'Connexion…'}</Text>
      </View>
    );
  }
  return (
    <View style={{ opacity: disabled ? 0.55 : 1 }} pointerEvents={disabled ? 'none' : 'auto'}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={dark
          ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
          : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={RADIUS}
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
  const label = loading ? (locale === 'en' ? 'Signing in…' : 'Connexion…') : locale === 'en' ? 'Continue with Google' : 'Continuer avec Google';
  // Les valeurs exactes des deux thèmes publiés par Google.
  const dark = activeScheme() === 'dark';
  const plate = dark ? '#131314' : '#FFFFFF';
  const stroke = dark ? '#8E918F' : '#747775';
  const label_ = dark ? '#E3E3E3' : '#1F1F1F';
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={locale === 'en' ? 'Continue with Google' : 'Continuer avec Google'}
      accessibilityState={{ disabled: Boolean(disabled) || Boolean(loading), busy: Boolean(loading) }}
      disabled={disabled || loading}
      onPress={onPress}
    >
      <View
        style={{
          height: HEIGHT,
          borderRadius: RADIUS,
          backgroundColor: plate,
          borderWidth: 1,
          borderColor: stroke,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          paddingHorizontal: spacing.lg,
          opacity: disabled && !loading ? 0.55 : 1,
        }}
      >
        {loading ? <ActivityIndicator size="small" color={label_} /> : <GoogleMark />}
        <Text style={{ color: label_, fontSize: 17, fontWeight: '600', letterSpacing: -0.2, includeFontPadding: false }}>{label}</Text>
      </View>
    </PressableScale>
  );
}

export function EmailContinueButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  const locale = useMobileLocale();
  return (
    <PressableScale accessibilityRole="button" accessibilityState={{ disabled: Boolean(disabled) }} disabled={disabled} onPress={onPress}>
      <View
        style={{
          height: HEIGHT,
          borderRadius: RADIUS,
          backgroundColor: colors.accentSoft,
          borderWidth: 1,
          borderColor: colors.accentBorder,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          paddingHorizontal: spacing.lg,
          opacity: disabled ? 0.55 : 1,
        }}
      >
        <Ionicons name="mail-outline" size={20} color={colors.accentHover} />
        <Text style={{ color: colors.accentHover, fontSize: 17, fontWeight: '600', letterSpacing: -0.2, includeFontPadding: false }}>
          {locale === 'en' ? 'Continue with email' : 'Continuer avec l’adresse e-mail'}
        </Text>
      </View>
    </PressableScale>
  );
}
