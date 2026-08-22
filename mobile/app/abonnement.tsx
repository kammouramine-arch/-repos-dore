import * as React from 'react';
import { Alert, Pressable, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import {
  DevisiaApiError,
  PLANS,
  PLAN_ORDER,
  TRIAL_DAYS,
  accessStateFor,
  formatCents,
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
  Muted,
  Screen,
  Skeleton,
  Title,
} from '@/components/ui';
import { useToast } from '@/components/toast';
import { useQuery } from '@/lib/query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, spacing } from '@/theme';

const STATUS_LABELS: Record<string, string> = {
  trialing: 'Essai en cours',
  active: 'Actif',
  past_due: 'Paiement en attente',
  canceled: 'Résilié',
  incomplete: 'Incomplet',
};

/** Abonnement : conversion, changement de formule et résiliation. */
export default function AbonnementScreen() {
  const { toast } = useToast();
  const { refresh } = useAuth();
  const query = useQuery<BillingOverviewDTO>(() => api.billing.overview());
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
          title: `Formule ${PLANS[plan].name}`,
          description: result.effectiveAt
            ? `Effective le ${new Date(result.effectiveAt).toLocaleDateString('fr-FR')}.`
            : 'Appliquée immédiatement.',
        });
      } else {
        const { url } = await api.billing.checkout(plan);
        await WebBrowser.openBrowserAsync(url);
      }
      await query.reload();
      await refresh();
    } catch (cause) {
      Alert.alert(
        'Action impossible',
        cause instanceof DevisiaApiError ? cause.message : 'Réessayez dans un instant.',
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
        'Portail indisponible',
        cause instanceof DevisiaApiError ? cause.message : 'Réessayez dans un instant.',
      );
    } finally {
      setPending(null);
    }
  }

  function confirmCancel() {
    Alert.alert(
      'Résilier votre abonnement ?',
      'Votre accès reste ouvert jusqu’à la fin de la période déjà payée. Vos données sont conservées.',
      [
        { text: 'Garder mon abonnement', style: 'cancel' },
        {
          text: 'Résilier',
          style: 'destructive',
          onPress: async () => {
            setPending('cancel');
            try {
              const result = await api.billing.cancel(false);
              toast({
                title: 'Résiliation programmée',
                description: result.endsAt
                  ? `Accès conservé jusqu’au ${new Date(result.endsAt).toLocaleDateString('fr-FR')}.`
                  : undefined,
              });
              await query.reload();
              await refresh();
            } catch (cause) {
              Alert.alert(
                'Résiliation impossible',
                cause instanceof DevisiaApiError ? cause.message : 'Réessayez dans un instant.',
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
        <Banner tone="danger" title={query.error ?? 'Abonnement indisponible.'} />
        <Button title="Réessayer" variant="secondary" onPress={() => void query.reload()} />
      </Screen>
    );
  }

  const currentPlan = data.subscription.plan;

  return (
    <Screen>
      <View style={{ gap: 4 }}>
        <Title>Votre abonnement</Title>
        <Muted>
          {access?.inTrial
            ? trialMessage(access.trialDaysLeft)
            : `Formule ${PLANS[currentPlan].name} · ${STATUS_LABELS[data.subscription.status]}`}
        </Muted>
      </View>

      {access?.trialExpired ? (
        <Banner
          tone="warning"
          title="Votre essai DEVISIA est terminé."
          description="Continuez à gagner du temps et à récupérer vos devis en attente."
        />
      ) : null}

      {data.subscription.cancelAtPeriodEnd ? (
        <Banner
          tone="info"
          title="Résiliation programmée"
          description={
            data.subscription.currentPeriodEnd
              ? `Votre accès reste ouvert jusqu’au ${new Date(data.subscription.currentPeriodEnd).toLocaleDateString('fr-FR')}.`
              : undefined
          }
          action={
            <Button
              title="Reprendre mon abonnement"
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

      <Card style={{ gap: spacing.md }}>
        <Caption>Consommation du mois</Caption>
        {[
          { label: 'Générations IA', ...data.usage.aiGenerations },
          { label: 'Relances envoyées', ...data.usage.followUps },
          { label: 'Devis envoyés', ...data.usage.quotesSent },
        ].map((quota) => (
          <View key={quota.label} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Muted>{quota.label}</Muted>
              <Body style={{ fontSize: 13 }}>
                {quota.used}
                {quota.limit == null ? ' · illimité' : ` / ${quota.limit}`}
              </Body>
            </View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surface2, overflow: 'hidden' }}>
              <View
                style={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: colors.accent,
                  width: `${quota.limit == null ? 6 : Math.min(100, (quota.used / quota.limit) * 100)}%`,
                }}
              />
            </View>
          </View>
        ))}
      </Card>

      <View style={{ gap: spacing.md }}>
        {PLAN_ORDER.map((planId) => {
          const plan = PLANS[planId];
          const isCurrent = planId === currentPlan && data.subscription.status !== 'trialing';
          const direction = planChange(currentPlan, planId);

          return (
            <Card
              key={planId}
              style={{
                gap: spacing.sm,
                borderColor: plan.recommended ? colors.accent : colors.line,
                borderWidth: plan.recommended ? 1.5 : 1,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Heading>{plan.name}</Heading>
                {isCurrent ? <Badge label="Formule actuelle" tone="accent" /> : null}
                {!isCurrent && plan.recommended ? <Badge label="Recommandé" tone="success" /> : null}
              </View>

              <Body style={{ fontSize: 24, fontWeight: '700', letterSpacing: -0.7 }}>
                {formatCents(plan.monthlyPriceCents, { compact: true })}
                <Body style={{ fontSize: 13, color: colors.muted, fontWeight: '400' }}> / mois HT</Body>
              </Body>

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
                      ? `Choisir ${plan.name}`
                      : direction === 'downgrade'
                        ? `Passer en ${plan.name} à l’échéance`
                        : `Passer en ${plan.name}`
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

      {!data.billingReady ? (
        <Banner
          tone="info"
          title="Paiement bientôt disponible"
          description="La souscription s’ouvrira dès que la facturation sera activée sur cette instance."
        />
      ) : null}

      {data.canManage && data.subscription.status !== 'trialing' ? (
        <View style={{ gap: spacing.md }}>
          <Button title="Gérer ma facturation" variant="secondary" loading={pending === 'portal'} onPress={() => void openPortal()} />
          {!data.subscription.cancelAtPeriodEnd ? (
            <Pressable accessibilityRole="button" onPress={confirmCancel} style={{ alignItems: 'center', padding: spacing.md }}>
              <Muted style={{ color: colors.danger }}>Résilier mon abonnement</Muted>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <Muted style={{ textAlign: 'center', fontSize: 12 }}>
        {TRIAL_DAYS} jours d’essai gratuit · Sans engagement · Résiliable à tout moment
      </Muted>
    </Screen>
  );
}
