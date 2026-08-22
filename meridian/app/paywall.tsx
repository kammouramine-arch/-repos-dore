import React, { useMemo, useState } from 'react';
import { Dimensions, Linking, Platform, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import { AIOrb, Banner, Button, Card, Screen, SectionHeader, Segmented, Text } from '@/components/ui';
import { useEntitlements } from '@/hooks/useEntitlements';
import {
  MANAGE_SUBSCRIPTION_URL,
  METER_LABELS,
  describeQuota,
  formatPrice,
  yearlySaving,
  type Meter,
  type Plan,
} from '@/config/subscription';
import {
  PurchasesUnavailableError,
  purchase,
  purchasesAvailable,
  restorePurchases,
} from '@/services/purchases';
import { track } from '@/services/analytics';
import { AppError } from '@/lib/errors';
import { friendlyDate } from '@/utils/date';

type Period = 'monthly' | 'yearly';

const COMPARED: Meter[] = [
  'ai_requests',
  'planning_requests',
  'voice_seconds',
  'life_resets',
  'memory_items',
];

/**
 * Plans, side by side.
 *
 * Written in capability, not counters: what the AI can do with you at each level. The
 * numbers are there for anyone who wants them, and never dressed up as "unlimited"
 * when a cap exists.
 */
export default function Paywall() {
  const theme = useTheme();
  const router = useRouter();
  const { catalogue, tier, plan: currentPlan, isTrial, accessUntil, refetch } = useEntitlements();
  const [period, setPeriod] = useState<Period>('yearly');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  React.useEffect(() => {
    track('paywall_viewed');
  }, []);

  const plans = useMemo(
    () => catalogue.order.map((t) => catalogue.plans[t]).filter((p): p is Plan => Boolean(p?.available)),
    [catalogue],
  );

  const width = Dimensions.get('window').width;
  const cardWidth = Math.min(300, width - 88);

  const buy = async (target: Plan) => {
    const price = target.pricing[period];
    if (!price) return;

    setError(null);
    setNotice(null);
    setBusy(price.productId);
    try {
      const verified = await purchase(price.productId);
      track('subscription_started', { tier: verified.tier, period });
      refetch();
      setNotice(`You are on ${target.name}. Everything is unlocked.`);
    } catch (e) {
      setError(
        e instanceof PurchasesUnavailableError || e instanceof AppError
          ? e.message
          : 'That purchase could not be completed.',
      );
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    setError(null);
    setNotice(null);
    setBusy('restore');
    try {
      const found = await restorePurchases();
      refetch();
      setNotice(
        found
          ? `Restored your ${found.tier} subscription.`
          : 'No previous purchase was found on this store account.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not restore purchases.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen>
      <View style={{ gap: theme.spacing.xl }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <AIOrb size={34} state="idle" />
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Feather name="x" size={22} color={theme.colors.textTertiary} />
          </Pressable>
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="overline" color="accent">
            PLANS
          </Text>
          <Text variant="display">Choose how much AI you want.</Text>
          <Text variant="body" color="secondary">
            Every plan keeps your goals, habits, projects and plans. What changes is how
            much thinking the AI does with you, and how far ahead it can plan.
          </Text>
        </View>

        {error ? (
          <Banner tone="danger" title="Not completed" body={error} onDismiss={() => setError(null)} />
        ) : null}
        {notice ? <Banner tone="success" title={notice} onDismiss={() => setNotice(null)} /> : null}

        {isTrial && accessUntil ? (
          <Banner
            tone="info"
            title={`You are trialling ${currentPlan.name}`}
            body={`Your trial runs until ${friendlyDate(accessUntil.slice(0, 10))}.`}
          />
        ) : null}

        <Segmented
          value={period}
          onChange={setPeriod}
          options={[
            { value: 'monthly', label: 'Monthly' },
            { value: 'yearly', label: 'Yearly' },
          ]}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={cardWidth + theme.spacing.md}
          decelerationRate="fast"
          contentContainerStyle={{ gap: theme.spacing.md, paddingRight: theme.spacing.lg }}
        >
          {plans.map((item) => (
            <PlanCard
              key={item.tier}
              plan={item}
              period={period}
              width={cardWidth}
              current={item.tier === tier}
              busy={busy === item.pricing[period]?.productId}
              onSelect={() => buy(item)}
            />
          ))}
        </ScrollView>

        {!purchasesAvailable() ? (
          <Banner
            tone="info"
            title="Purchases are not enabled in this build"
            body="The billing library and store products are configured at release time. Everything else — plans, entitlements, limits, verification and restore — is already wired. See docs/BILLING.md."
          />
        ) : null}

        <View>
          <SectionHeader title="What you get" caption="Allowances are per month" />
          <Card>
            {COMPARED.map((meter, index) => (
              <View
                key={meter}
                style={{
                  paddingVertical: theme.spacing.md,
                  borderBottomWidth: index === COMPARED.length - 1 ? 0 : 1,
                  borderBottomColor: theme.colors.border,
                  gap: 8,
                }}
              >
                <Text variant="subhead">{METER_LABELS[meter].label}</Text>
                <View style={{ gap: 4 }}>
                  {plans.map((item) => (
                    <View
                      key={item.tier}
                      style={{ flexDirection: 'row', justifyContent: 'space-between' }}
                    >
                      <Text variant="footnote" color="tertiary">
                        {item.name}
                      </Text>
                      <Text variant="footnote" color={item.quotas[meter] > 0 ? 'secondary' : 'tertiary'}>
                        {describeQuota(item, meter)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </Card>
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <Button
            label="Restore purchases"
            variant="secondary"
            full
            loading={busy === 'restore'}
            onPress={restore}
          />
          {tier !== 'free' ? (
            <Button
              label="Manage subscription"
              variant="ghost"
              full
              onPress={() =>
                Linking.openURL(
                  Platform.OS === 'ios' ? MANAGE_SUBSCRIPTION_URL.ios : MANAGE_SUBSCRIPTION_URL.android,
                )
              }
            />
          ) : null}
        </View>

        <Text variant="caption" color="tertiary" align="center">
          Prices are charged through your app store account and renew automatically until
          cancelled. Cancel any time in your store settings. High limits are subject to
          fair use so the service stays fast for everyone.
        </Text>
      </View>
    </Screen>
  );
}

function PlanCard({
  plan,
  period,
  width,
  current,
  busy,
  onSelect,
}: {
  plan: Plan;
  period: Period;
  width: number;
  current: boolean;
  busy: boolean;
  onSelect: () => void;
}) {
  const theme = useTheme();
  const price = plan.pricing[period];
  const saving = period === 'yearly' ? yearlySaving(plan) : null;
  const free = plan.tier === 'free';

  return (
    <View
      style={{
        width,
        borderRadius: theme.radius.lg,
        borderWidth: plan.recommended ? 2 : 1,
        borderColor: plan.recommended ? theme.colors.accent : theme.colors.border,
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.lg,
        gap: theme.spacing.base,
        ...theme.elevation.card,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="title2">{plan.name}</Text>
        {current ? (
          <Text variant="caption" color="accent">
            YOUR PLAN
          </Text>
        ) : plan.recommended ? (
          <Text variant="caption" color="accent">
            MOST CHOSEN
          </Text>
        ) : null}
      </View>

      <Text variant="bodyStrong" color="accent">
        {plan.tagline}
      </Text>

      <View style={{ gap: 2 }}>
        <Text variant="title1">{free ? 'Free' : formatPrice(price)}</Text>
        <Text variant="footnote" color="tertiary">
          {free
            ? 'no card needed'
            : `${period === 'monthly' ? 'per month' : 'per year'}${saving ? ` · save ${saving}%` : ''}`}
        </Text>
      </View>

      <Text variant="callout" color="secondary">
        {plan.summary}
      </Text>

      <View style={{ gap: 8 }}>
        {plan.highlights.map((line) => (
          <View key={line} style={{ flexDirection: 'row', gap: 8 }}>
            <Feather name="check" size={14} color={theme.colors.success} style={{ marginTop: 3 }} />
            <Text variant="footnote" color="secondary" style={{ flex: 1 }}>
              {line}
            </Text>
          </View>
        ))}
      </View>

      {!free ? (
        <View style={{ gap: 6 }}>
          <Button
            label={
              current
                ? 'Current plan'
                : plan.trialDays > 0
                  ? `Try ${plan.trialDays} days free`
                  : `Choose ${plan.name}`
            }
            full
            disabled={current}
            loading={busy}
            onPress={onSelect}
          />
          {plan.trialDays > 0 && !current ? (
            <Text variant="caption" color="tertiary" align="center">
              Then {formatPrice(price)} {period === 'monthly' ? 'a month' : 'a year'}. Cancel any time.
            </Text>
          ) : null}
        </View>
      ) : (
        <Text variant="caption" color="tertiary" align="center">
          {current ? 'You are here' : 'Always available'}
        </Text>
      )}
    </View>
  );
}
