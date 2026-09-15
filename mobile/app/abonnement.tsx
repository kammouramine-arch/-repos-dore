import * as React from 'react';
import { Alert, Platform, Pressable, View } from 'react-native';
import { ApplePaywall } from '@/components/apple-paywall';
import * as WebBrowser from 'expo-web-browser';
import {
  DevisiaApiError,
  PLANS,
  PLAN_ORDER,
  TRIAL_DAYS,
  accessStateFor,
  planChange,
  trialMessage,
  type BillingOverviewDTO,
  type PlanId,
} from '@devisia/shared';
import {
  Badge,
  Banner,
  Body,
  Button,
  Caption,
  Card,
  Divider,
  Heading,
  Ionicons,
  PageHeader,
  Price,
  Muted,
  Screen,
  Skeleton,
} from '@/components/ui';
import { useToast } from '@/components/toast';
import { useQuery } from '@/lib/query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, spacing } from '@/theme';
import { useMobileLocale } from '@/lib/i18n';

const STATUS_LABELS: Record<string, string> = {
  trialing: 'Essai en cours',
  active: 'Actif',
  past_due: 'Paiement en attente',
  canceled: 'Résilié',
  incomplete: 'Incomplet',
};
const STATUS_LABELS_EN: Record<string, string> = {
  trialing: 'Trial active', active: 'Active', past_due: 'Payment past due', canceled: 'Cancelled', incomplete: 'Incomplete',
};

/** Abonnement : conversion, changement de formule et résiliation. */
export default function AbonnementScreen() {
  return Platform.OS === 'ios' ? <ApplePaywall /> : <WebAbonnementScreen />;
}

function WebAbonnementScreen() {
  const locale = useMobileLocale();
  const en = locale === 'en';
  const { toast } = useToast();
  const { refresh } = useAuth();
  const query = useQuery<BillingOverviewDTO>(() => api.billing.overview(), [], 'billing');
  const [pending, setPending] = React.useState<PlanId | 'portal' | 'cancel' | null>(null);

  const data = query.data;
  const access = data ? accessStateFor(data.subscription) : null;

  async function subscribe(plan: PlanId) {
    if (!data) return;
    setPending(plan);
    try {
      // Un abonnement déjà actif change de formule ; sinon on ouvre le paiement.
      if (data.subscription.status === 'active' || data.subscription.status === 'past_due') {
        const result = await api.billing.changePlan(plan);
        toast({
          title: `${en ? 'Plan' : 'Formule'} ${PLANS[plan].name}`,
          description: result.effectiveAt
            ? `${en ? 'Effective' : 'Effective le'} ${new Date(result.effectiveAt).toLocaleDateString(en ? 'en-GB' : 'fr-FR')}.`
            : (en ? 'Applied immediately.' : 'Appliquée immédiatement.'),
        });
      } else {
        const { url } = await api.billing.checkout(plan);
        await WebBrowser.openBrowserAsync(url);
      }
      await query.reload();
      await refresh();
    } catch (cause) {
      Alert.alert(
        en ? 'Action failed' : 'Action impossible',
        cause instanceof DevisiaApiError ? cause.message : (en ? 'Try again in a moment.' : 'Réessayez dans un instant.'),
      );
    } finally {
      setPending(null);
    }
  }

  async function openPortal() {
    setPending('portal');
    try {
      const { url } = await api.billing.portal();
      await WebBrowser.openBrowserAsync(url);
      await query.reload();
    } catch (cause) {
      Alert.alert(
        en ? 'Billing portal unavailable' : 'Portail indisponible',
        cause instanceof DevisiaApiError ? cause.message : (en ? 'Try again in a moment.' : 'Réessayez dans un instant.'),
      );
    } finally {
      setPending(null);
    }
  }

  function confirmCancel() {
    Alert.alert(
      en ? 'Cancel your subscription?' : 'Résilier votre abonnement ?',
      en ? 'Your access stays open until the end of the paid period. Your data is kept.' : 'Votre accès reste ouvert jusqu’à la fin de la période déjà payée. Vos données sont conservées.',
      [
        { text: en ? 'Keep my subscription' : 'Garder mon abonnement', style: 'cancel' },
        {
          text: en ? 'Cancel' : 'Résilier',
          style: 'destructive',
          onPress: async () => {
            setPending('cancel');
            try {
              const result = await api.billing.cancel(false);
              toast({
                title: en ? 'Cancellation scheduled' : 'Résiliation programmée',
                description: result.endsAt
                  ? `${en ? 'Access kept until' : 'Accès conservé jusqu’au'} ${new Date(result.endsAt).toLocaleDateString(en ? 'en-GB' : 'fr-FR')}.`
                  : undefined,
              });
              await query.reload();
              await refresh();
            } catch (cause) {
              Alert.alert(
                en ? 'Cancellation failed' : 'Résiliation impossible',
                cause instanceof DevisiaApiError ? cause.message : (en ? 'Try again in a moment.' : 'Réessayez dans un instant.'),
              );
            } finally {
              setPending(null);
            }
          },
        },
      ],
    );
  }

  if (query.loading && !data) {
    return (
      <Screen>
        <Skeleton height={120} />
        <Skeleton height={200} />
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen>
        <Banner tone="danger" title={query.error ?? (en ? 'Subscription unavailable.' : 'Abonnement indisponible.')} />
        <Button title="Réessayer" variant="secondary" onPress={() => void query.reload()} />
      </Screen>
    );
  }

  const currentPlan = data.subscription.plan;

  return (
    <Screen>
      <PageHeader
        eyebrow="DEVISERA"
        title="Votre abonnement"
          subtitle={
          access?.inTrial
            ? (en ? `${access.trialDaysLeft} day${access.trialDaysLeft === 1 ? '' : 's'} left in your trial` : trialMessage(access.trialDaysLeft))
            : `${en ? 'Plan' : 'Formule'} ${PLANS[currentPlan].name} · ${(en ? STATUS_LABELS_EN : STATUS_LABELS)[data.subscription.status] ?? data.subscription.status}`
        }
      />

      {access?.trialExpired ? (
        <Banner
          tone="warning"
          title={en ? 'Your DEVISERA trial has ended.' : 'Votre essai DEVISERA est terminé.'}
          description={en ? 'Keep saving time and recovering your pending quotes.' : 'Continuez à gagner du temps et à récupérer vos devis en attente.'}
        />
      ) : null}

      {data.subscription.cancelAtPeriodEnd ? (
        <Banner
          tone="info"
          title={en ? 'Cancellation scheduled' : 'Résiliation programmée'}
          description={
            data.subscription.currentPeriodEnd
              ? `${en ? 'Your access stays open until' : 'Votre accès reste ouvert jusqu’au'} ${new Date(data.subscription.currentPeriodEnd).toLocaleDateString(en ? 'en-GB' : 'fr-FR')}.`
              : undefined
          }
          action={
            <Button
              title={en ? 'Resume my subscription' : 'Reprendre mon abonnement'}
              variant="secondary"
              onPress={async () => {
                await api.billing.resume().catch(() => undefined);
                await query.reload();
                await refresh();
              }}
            />
          }
        />
      ) : null}

      <Card style={{ gap: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="pulse-outline" size={17} color={colors.accent} />
          </View>
          <View>
            <Heading style={{ fontSize: 16 }}>{en ? 'Your usage' : 'Votre utilisation'}</Heading>
            <Caption>{en ? 'This month' : 'Ce mois-ci'}</Caption>
          </View>
        </View>
        {[
          { label: en ? 'AI generations' : 'Générations IA', ...data.usage.aiGenerations },
          { label: en ? 'Audio transcriptions' : 'Transcriptions audio', ...data.usage.aiTranscriptions },
          { label: en ? 'AI photo analyses' : 'Analyses photo IA', ...data.usage.aiImageAnalyses },
          { label: en ? 'Follow-ups sent' : 'Relances envoyées', ...data.usage.followUps },
          { label: en ? 'Quotes sent' : 'Devis envoyés', ...data.usage.quotesSent },
        ].map((quota) => (
          <View key={quota.label} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Muted>{quota.label}</Muted>
              <Body style={{ fontSize: 13 }}>
                {quota.used}
                {quota.limit == null ? (en ? ' · unlimited' : ' · illimité') : ` / ${quota.limit}`}
              </Body>
            </View>
            {quota.limit == null ? null : (
              <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surface2, overflow: 'hidden' }}>
                <View
                  style={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: colors.accent,
                    width: `${Math.min(100, (quota.used / quota.limit) * 100)}%`,
                  }}
                />
              </View>
            )}
          </View>
        ))}
      </Card>

      {!data.billingReady ? (
        /* Le message parle du compte de l'artisan, pas de la configuration du
           serveur : « cette instance » ne veut rien dire pour lui. */
        <Banner
          tone="info"
          title={en ? 'You will not be charged yet' : 'Rien ne vous sera prélevé pour l’instant'}
          description={en ? 'Enjoy your trial. We will remind you before it ends, then you can choose your plan.' : 'Profitez de votre essai. Nous vous préviendrons avant qu’il se termine, et vous choisirez alors votre formule.'}
        />
      ) : null}

      <View style={{ gap: spacing.md }}>
        {PLAN_ORDER.map((planId) => {
          const plan = PLANS[planId];
          const isCurrent = planId === currentPlan && data.subscription.status !== 'trialing';
          const direction = planChange(currentPlan, planId);

          return (
            <Card
              key={planId}
              style={{
                gap: spacing.md,
                borderColor: plan.recommended ? colors.accent : colors.line,
                borderWidth: plan.recommended ? 1.5 : 1,
                backgroundColor: plan.recommended ? colors.accentSoft : colors.canvas,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Heading>{plan.name}</Heading>
                {isCurrent ? <Badge label={en ? 'Current plan' : 'Formule actuelle'} tone="accent" /> : null}
                {!isCurrent && plan.recommended ? <Badge label={en ? 'Recommended' : 'Recommandé'} tone="success" /> : null}
              </View>

              <Price cents={plan.monthlyPriceCents} suffix={en ? '/ month excl. VAT' : '/ mois HT'} />

              <Divider />

              {plan.highlights.slice(0, 4).map((highlight) => (
                <View key={highlight} style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
                  <Ionicons name="checkmark" size={16} color={colors.accent} style={{ marginTop: 2 }} />
                  <Muted style={{ flex: 1 }}>{highlight}</Muted>
                </View>
              ))}

              {!isCurrent && data.canManage ? (
                <Button
                  title={
                    data.subscription.status === 'trialing'
                      ? `${en ? 'Choose' : 'Choisir'} ${plan.name}`
                      : direction === 'downgrade'
                        ? `${en ? 'Switch to' : 'Passer en'} ${plan.name}${en ? ' at renewal' : ' à l’échéance'}`
                        : `${en ? 'Switch to' : 'Passer en'} ${plan.name}`
                  }
                  variant={plan.recommended ? 'primary' : 'secondary'}
                  loading={pending === planId}
                  disabled={!data.billingReady}
                  onPress={() => void subscribe(planId)}
                  style={{ marginTop: spacing.sm }}
                  haptic
                />
              ) : null}
            </Card>
          );
        })}
      </View>

      {data.canManage && data.subscription.status !== 'trialing' ? (
        <View style={{ gap: spacing.md }}>
          <Button title={en ? 'Manage billing' : 'Gérer ma facturation'} variant="secondary" loading={pending === 'portal'} onPress={() => void openPortal()} />
          {!data.subscription.cancelAtPeriodEnd ? (
            <Pressable accessibilityRole="button" onPress={confirmCancel} style={{ alignItems: 'center', padding: spacing.md }}>
              <Muted style={{ color: colors.danger }}>{en ? 'Cancel my subscription' : 'Résilier mon abonnement'}</Muted>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <Muted style={{ textAlign: 'center', fontSize: 12 }}>
        {en ? `${TRIAL_DAYS} free trial days · No commitment · Cancel anytime` : `${TRIAL_DAYS} jours d’essai gratuit · Sans engagement · Résiliable à tout moment`}
      </Muted>
    </Screen>
  );
}
