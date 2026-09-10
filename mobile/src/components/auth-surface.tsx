import * as React from 'react';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { Logo } from './logo';
import { Muted, Title } from './ui';
import { colors, spacing } from '@/theme';
import { PremiumGradient } from './premium-gradient';
import { GRADIENT_SPAN } from '@/theme/gradient';

/**
 * Surface d'authentification.
 *
 * L'ancienne posait un bandeau bleu de hauteur fixe suivi d'un panneau blanc
 * remonté par une marge négative : sur iPhone, le titre blanc tombait dans la
 * partie déjà pâle du fondu et disparaissait, une couture bleu nuit restait
 * visible sur le bord droit, et un aplat bleu nuit s'étalait sous le
 * formulaire dès que le clavier réduisait le contenu. Ici le dégradé est le
 * fond de l'écran entier, calé sous la barre d'état ; le titre se tient dans
 * le tiers bleu saturé, et le formulaire repose sur le fondu.
 */
export function AuthSurface({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  useFocusEffect(
    React.useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, []),
  );
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: Math.round(height * GRADIENT_SPAN.auth) }}>
        <PremiumGradient />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={{
            paddingTop: insets.top + spacing['2xl'],
            paddingBottom: insets.bottom + spacing['3xl'],
            paddingHorizontal: spacing.xl,
            gap: spacing.xl,
          }}
        >
          <Logo size={40} tone="inverse" />
          <View style={{ gap: spacing.sm, paddingBottom: spacing.sm }}>
            <Title style={{ color: colors.white, fontSize: 30, lineHeight: 36 }}>{title}</Title>
            <Muted style={{ color: 'rgba(255,255,255,0.86)', lineHeight: 22, fontSize: 15 }}>{subtitle}</Muted>
          </View>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
