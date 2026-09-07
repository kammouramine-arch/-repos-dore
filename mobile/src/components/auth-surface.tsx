import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Logo } from './logo';
import { Muted, Title } from './ui';
import { colors, spacing } from '@/theme';
import { PremiumGradient } from './premium-gradient';

/** The blue region grows with its text; never position white text over an
 * unrelated percentage-height background. All content remains scrollable. */
export function AuthSurface({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.accentDeep }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'} showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        <PremiumGradient dark style={{ flex: 0, paddingHorizontal: spacing.xl, paddingTop: spacing['3xl'], paddingBottom: 60, gap: spacing.lg }}>
          <Logo size={40} tone="white" />
          <View style={{ gap: spacing.sm }}>
            <Title style={{ color: colors.white, fontSize: 29, lineHeight: 36 }}>{title}</Title>
            <Muted style={{ color: '#E0E4FF', lineHeight: 22 }}>{subtitle}</Muted>
          </View>
        </PremiumGradient>
        <View style={{ flex: 1, marginTop: -28, borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: colors.surface, padding: spacing.xl, paddingBottom: spacing['3xl'], gap: spacing.xl }}>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
