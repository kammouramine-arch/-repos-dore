import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Logo } from './logo';
import { Muted, Title } from './ui';
import { colors, spacing } from '@/theme';

/** The blue region grows with its text; never position white text over an
 * unrelated percentage-height background. All content remains scrollable. */
export function AuthSurface({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.accentDeep }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'} showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ backgroundColor: colors.accentDeep, paddingHorizontal: spacing.xl, paddingTop: spacing['3xl'], paddingBottom: 60, gap: spacing.lg, overflow: 'hidden' }}>
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 118, backgroundColor: colors.accent, opacity: 0.14 }} />
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 78, backgroundColor: colors.accentBright, opacity: 0.09 }} />
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 42, backgroundColor: colors.white, opacity: 0.05 }} />
          <Logo size={40} tone="white" />
          <View style={{ gap: spacing.sm }}>
            <Title style={{ color: colors.white, fontSize: 29, lineHeight: 36 }}>{title}</Title>
            <Muted style={{ color: '#E0E4FF', lineHeight: 22 }}>{subtitle}</Muted>
          </View>
        </View>
        <View style={{ flex: 1, marginTop: -28, borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: colors.surface, padding: spacing.xl, paddingBottom: spacing['3xl'], gap: spacing.xl }}>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
