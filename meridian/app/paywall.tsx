import React, { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import { AIOrb, Banner, Button, Card, Screen, Text } from '@/components/ui';
import { PLANS, PRO_FEATURES, type PlanId } from '@/config/subscription';
import { features } from '@/config/features';
import { brand } from '@/config/brand';
import { useSubscription } from '@/hooks/useProfile';
import { track } from '@/services/analytics';

/**
 * Pro. The free app stays a working planner — Pro buys depth: unlimited conversation,
 * weekly and 90-day planning, replanning, memory, voice.
 *
 * Purchases are not wired to the stores in this build. Rather than showing a button
 * that does nothing, the state is stated plainly (see docs/BILLING.md).
 */
export default function Paywall() {
  const theme = useTheme();
  const router = useRouter();
  const subscription = useSubscription();
  const [plan, setPlan] = useState<PlanId>('annual');

  React.useEffect(() => {
    track('paywall_viewed');
  }, []);

  const isPro = subscription.data?.tier === 'pro';

  return (
    <Screen>
      <View style={{ gap: theme.spacing.xl }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <AIOrb size={34} state="idle" />
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
            <Feather name="x" size={22} color={theme.colors.textTertiary} />
          </Pressable>
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="overline" color="accent">
            {brand.name.toUpperCase()} PRO
          </Text>
          <Text variant="display">
            {isPro ? 'You are on Pro.' : 'The more you talk, the better the plan gets.'}
          </Text>
          <Text variant="body" color="secondary">
            Pro removes the daily conversation limit and unlocks the planning that needs
            real context: your week, your 90 days, and rebuilding both when life moves.
          </Text>
        </View>

        <Card>
          <View style={{ gap: theme.spacing.base }}>
            {PRO_FEATURES.map((feature) => (
              <View key={feature.key} style={{ flexDirection: 'row', gap: 12 }}>
                <Feather name="check" size={16} color={theme.colors.success} style={{ marginTop: 3 }} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{feature.title}</Text>
                  <Text variant="footnote" color="secondary">
                    {feature.detail}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Card>

        {!isPro ? (
          <>
            <View style={{ gap: theme.spacing.sm }}>
              {PLANS.map((option) => {
                const selected = option.id === plan;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => setPlan(option.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${option.label}, ${option.price} ${option.period}`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      padding: theme.spacing.base,
                      borderRadius: theme.radius.md,
                      borderWidth: 2,
                      borderColor: selected ? theme.colors.accent : theme.colors.border,
                      backgroundColor: selected ? theme.colors.accentSoft : theme.colors.surface,
                    }}
                  >
                    <Feather
                      name={selected ? 'check-circle' : 'circle'}
                      size={18}
                      color={selected ? theme.colors.accent : theme.colors.borderStrong}
                    />
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyStrong">{option.label}</Text>
                      <Text variant="footnote" color="secondary">
                        {option.price} {option.period}
                      </Text>
                    </View>
                    {option.note ? (
                      <Text variant="caption" color="accent">
                        {option.note}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            {features.inAppPurchases ? (
              <Button label="Start Pro" full size="lg" onPress={() => track('subscription_started')} />
            ) : (
              <Banner
                tone="info"
                title="Purchases are not enabled in this build"
                body="Store products and the purchase library are configured at release time. Until then, Pro can be switched on for an account directly in the database — see docs/BILLING.md."
              />
            )}
          </>
        ) : (
          <Button label="Manage subscription" variant="secondary" full onPress={() => Linking.openURL(brand.termsUrl)} />
        )}

        <Text variant="caption" color="tertiary" align="center">
          Subscriptions renew automatically until cancelled. Cancel any time in your store
          account settings.
        </Text>
      </View>
    </Screen>
  );
}
