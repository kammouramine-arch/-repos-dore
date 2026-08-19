import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import { Button, Card, Row, Screen, Text } from '@/components/ui';
import { useAiUsage, useSubscription } from '@/hooks/useProfile';
import { useEntitlement } from '@/hooks/useEntitlement';
import { FREE_LIMITS } from '@/config/subscription';
import { brand } from '@/config/brand';

export default function SubscriptionSettings() {
  const theme = useTheme();
  const router = useRouter();
  const subscription = useSubscription();
  const usage = useAiUsage();
  const entitlement = useEntitlement();

  return (
    <Screen>
      <View style={{ gap: theme.spacing.lg }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
          <Feather name="chevron-left" size={24} color={theme.colors.text} />
        </Pressable>
        <Text variant="title1">Subscription</Text>

        <Card>
          <Text variant="overline" color="tertiary">
            CURRENT PLAN
          </Text>
          <Text variant="title2" style={{ marginTop: 6 }}>
            {entitlement.isPro ? `${brand.name} Pro` : 'Free'}
          </Text>
          {subscription.data?.current_period_end ? (
            <Text variant="footnote" color="secondary" style={{ marginTop: 4 }}>
              Renews {new Date(subscription.data.current_period_end).toLocaleDateString()}
            </Text>
          ) : null}
        </Card>

        <Card padded={false} style={{ paddingHorizontal: theme.spacing.base }}>
          <Row
            icon="message-circle"
            label="Conversations today"
            value={
              entitlement.isPro
                ? 'Unlimited'
                : `${usage.data ?? 0} of ${FREE_LIMITS.aiMessagesPerDay}`
            }
          />
          <Row
            icon="target"
            label="Active goals"
            value={entitlement.isPro ? 'Unlimited' : `Up to ${FREE_LIMITS.activeGoals}`}
          />
          <Row
            icon="repeat"
            label="Habits"
            value={entitlement.isPro ? 'Unlimited' : `Up to ${FREE_LIMITS.habits}`}
            last
          />
        </Card>

        {!entitlement.isPro ? (
          <Button label="See what Pro adds" full onPress={() => router.push('/paywall')} />
        ) : null}
      </View>
    </Screen>
  );
}
