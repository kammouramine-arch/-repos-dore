import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { AIOrb, Button, Screen, Text } from '@/components/ui';
import { brand } from '@/config/brand';

/**
 * Onboarding intro. Three screens' worth of message in one, because the point is to
 * get them talking, not reading.
 */
export default function Welcome() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <Screen scroll={false} contentStyle={{ justifyContent: 'space-between' }}>
      <View style={{ paddingTop: theme.spacing.xxl, gap: theme.spacing.xl }}>
        <AIOrb size={54} state="idle" />
        <View style={{ gap: theme.spacing.md }}>
          <Text variant="display">Your life is complicated.</Text>
          <Text variant="display" color="secondary">
            Your planner shouldn&apos;t be.
          </Text>
        </View>
        <View style={{ gap: theme.spacing.sm, maxWidth: 320 }}>
          <Text variant="body" color="secondary">
            Talk to {brand.aiName}. Tell it what matters. It builds the plan — goals,
            habits, your week, today — and changes it when life does.
          </Text>
        </View>
      </View>

      <View style={{ gap: theme.spacing.md, paddingBottom: theme.spacing.lg }}>
        <Button
          label="Start my life plan"
          full
          size="lg"
          onPress={() => router.push('/(auth)/sign-up')}
        />
        <Button
          label="I already have an account"
          variant="ghost"
          full
          onPress={() => router.push('/(auth)/sign-in')}
        />
        <Text variant="caption" color="tertiary" align="center">
          Your plans and conversations are private to your account.
        </Text>
      </View>
    </Screen>
  );
}
