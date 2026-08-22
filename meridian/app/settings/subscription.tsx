import React, { useState } from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import { Banner, Button, Card, Row, Screen, SectionHeader, Skeleton, Text } from '@/components/ui';
import { UsageMeter } from '@/components/UsageMeter';
import { useEntitlements } from '@/hooks/useEntitlements';
import { MANAGE_SUBSCRIPTION_URL, METERS, type Meter } from '@/config/subscription';
import { PurchasesUnavailableError, restorePurchases } from '@/services/purchases';
import { friendlyDate } from '@/utils/date';

const STATUS_COPY: Record<string, string> = {
  free: 'Free plan',
  trialing: 'Free trial',
  active: 'Active',
  grace_period: 'Payment issue — access continues',
  canceled: 'Cancelled — access until the end of the period',
  expired: 'Expired',
};

/** Agent runs only appear once a plan actually includes them. */
const ALWAYS: Meter[] = METERS.filter((m) => m !== 'agent_runs');

/**
 * Your plan: what you have, what you have used, and what changes if you move. Also the
 * place that states plainly what cancelling does — and does not — take away.
 */
export default function SubscriptionSettings() {
  const theme = useTheme();
  const router = useRouter();
  const {
    plan,
    tier,
    status,
    isTrial,
    accessUntil,
    quota,
    resetsAt,
    nextPlan,
    subscription,
    isLoading,
    refetch,
  } = useEntitlements();

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const quotas = [...ALWAYS, ...(quota('agent_runs').included ? (['agent_runs'] as Meter[]) : [])].map(
    quota,
  );
  const headline = quota('ai_requests');
  const upgrade = nextPlan();

  const restore = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const found = await restorePurchases();
      refetch();
      setNotice(found ? `Restored your ${found.tier} subscription.` : 'No previous purchase found.');
    } catch (e) {
      setError(
        e instanceof PurchasesUnavailableError || e instanceof Error
          ? e.message
          : 'Could not restore purchases.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={{ gap: theme.spacing.lg }}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Feather name="chevron-left" size={24} color={theme.colors.text} />
        </Pressable>

        <Text variant="title1">Your plan</Text>

        {notice ? <Banner tone="success" title={notice} onDismiss={() => setNotice(null)} /> : null}
        {error ? <Banner tone="danger" title="Not completed" body={error} onDismiss={() => setError(null)} /> : null}

        {status === 'grace_period' ? (
          <Banner
            tone="warning"
            title="There is a problem with your payment"
            body="Your access continues for now. Updating your payment method in the store settings will keep it."
            actionLabel="Open store settings"
            onAction={() =>
              Linking.openURL(
                Platform.OS === 'ios' ? MANAGE_SUBSCRIPTION_URL.ios : MANAGE_SUBSCRIPTION_URL.android,
              )
            }
          />
        ) : null}

        {/* ------------------------------------------------------ current -- */}
        <Card>
          <View style={{ gap: theme.spacing.sm }}>
            <Text variant="overline" color="tertiary">
              CURRENT PLAN
            </Text>
            {isLoading ? (
              <Skeleton height={26} width="50%" />
            ) : (
              <>
                <Text variant="title2">{plan.name}</Text>
                <Text variant="callout" color="accent">
                  {plan.tagline}
                </Text>
                <Text variant="footnote" color="secondary">
                  {STATUS_COPY[status] ?? status}
                  {accessUntil
                    ? ` · ${status === 'canceled' || isTrial ? 'until' : 'renews'} ${friendlyDate(accessUntil.slice(0, 10))}`
                    : ''}
                </Text>
                {subscription?.will_renew === false && status === 'active' ? (
                  <Text variant="footnote" color="tertiary">
                    Auto-renew is off. You keep everything until the period ends.
                  </Text>
                ) : null}
              </>
            )}
          </View>
        </Card>

        {/* -------------------------------------------------------- usage -- */}
        <View>
          <SectionHeader title="Usage" caption="This billing period" />
          {isLoading ? (
            <Card>
              <Skeleton height={10} />
              <Skeleton height={10} style={{ marginTop: 12 }} />
            </Card>
          ) : (
            <UsageMeter headline={headline} quotas={quotas} resetsAt={resetsAt} />
          )}
        </View>

        {/* ----------------------------------------------------- included -- */}
        <View>
          <SectionHeader title="Included" />
          <Card>
            <View style={{ gap: 10 }}>
              {plan.highlights.map((line) => (
                <View key={line} style={{ flexDirection: 'row', gap: 10 }}>
                  <Feather name="check" size={14} color={theme.colors.success} style={{ marginTop: 3 }} />
                  <Text variant="callout" color="secondary" style={{ flex: 1 }}>
                    {line}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        </View>

        {upgrade ? (
          <Card tone="accent" elevated={false}>
            <Text variant="title3">{upgrade.name}</Text>
            <Text variant="callout" color="accent" style={{ marginTop: 2 }}>
              {upgrade.tagline}
            </Text>
            <Text variant="footnote" color="secondary" style={{ marginTop: 8 }}>
              {upgrade.summary}
            </Text>
            <Button
              label={`See ${upgrade.name}`}
              size="sm"
              style={{ marginTop: 12 }}
              onPress={() => router.push('/paywall')}
            />
          </Card>
        ) : null}

        {/* ------------------------------------------------------ manage -- */}
        <Card padded={false} style={{ paddingHorizontal: theme.spacing.base }}>
          <Row icon="grid" label="Compare plans" onPress={() => router.push('/paywall')} />
          <Row
            icon="refresh-cw"
            label={busy ? 'Restoring…' : 'Restore purchases'}
            onPress={busy ? undefined : restore}
          />
          <Row
            icon="external-link"
            label="Manage subscription"
            onPress={() =>
              Linking.openURL(
                Platform.OS === 'ios' ? MANAGE_SUBSCRIPTION_URL.ios : MANAGE_SUBSCRIPTION_URL.android,
              )
            }
            last
          />
        </Card>

        <Card tone="alt" elevated={false}>
          <Text variant="subhead">If you cancel</Text>
          <Text variant="footnote" color="secondary" style={{ marginTop: 8 }}>
            You keep everything you have built — goals, tasks, habits, projects, your Life
            Map, your plans and your reflections all stay exactly as they are. When the
            paid period ends, the AI simply returns to the {tier === 'free' ? 'Free' : 'Free plan'}{' '}
            allowances. Resubscribing picks up where you left off.
          </Text>
        </Card>
      </View>
    </Screen>
  );
}
