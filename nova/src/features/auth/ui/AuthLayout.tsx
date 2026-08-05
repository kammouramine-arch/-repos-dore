import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { AppText, NovaMark, PressableScale, Screen } from '@/ui/components';
import { spacing } from '@/ui/theme';

export interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footerPrompt: string;
  footerAction: string;
  onFooterPress: () => void;
}

/**
 * Shared shell for sign-in and sign-up: the mark, the heading pair, the form,
 * and the link across to the other screen. Both screens are the same object
 * with different contents.
 */
export const AuthLayout = ({
  title,
  subtitle,
  children,
  footerPrompt,
  footerAction,
  onFooterPress,
}: AuthLayoutProps) => (
  <Screen backdrop="night">
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <NovaMark size={56} ring={false} />
          <View style={styles.headings}>
            <AppText variant="title1">{title}</AppText>
            <AppText variant="body" tone="secondary">
              {subtitle}
            </AppText>
          </View>
        </View>

        <View style={styles.form}>{children}</View>

        <View style={styles.footer}>
          <AppText variant="subhead" tone="tertiary">
            {footerPrompt}
          </AppText>
          <PressableScale accessibilityRole="button" onPress={onFooterPress} hitSlop={10}>
            <AppText variant="subhead" tone="accent">
              {footerAction}
            </AppText>
          </PressableScale>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </Screen>
);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: spacing.xxl,
    paddingVertical: spacing.xxl,
  },
  header: {
    gap: spacing.lg,
  },
  headings: {
    gap: spacing.xxs,
  },
  form: {
    gap: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xxs,
  },
});
