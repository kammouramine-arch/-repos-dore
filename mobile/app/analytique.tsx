import * as React from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DevisiaApiError, type DashboardDTO } from '@devisia/shared';
import {
  Amount,
  Badge,
  Body,
  Caption,
  Card,
  ChoiceRow,
  Divider,
  EmptyState,
  ErrorState,
  LoadingState,
  Muted,
  SectionHeader,
} from '@/components/ui';
import { api } from '@/lib/api';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * Activité de l'entreprise, native.
 *
 * Un tableau de bord de bureau transposé sur un téléphone devient illisible.
 * On ne montre donc que ce qui appelle une décision : ce qui est gagné, ce qui
 * est encore en jeu, et ce qui attend une réponse. Aucun chiffre n'est
 * inventé : sans activité, on l'écrit.
 */
type Period = '30' | '90' | '365';

const PERIODS: { value: Period; label: string }[] = [
  { value: '30', label: '30 jours' },
  { value: '90', label: '90 jours' },
  { value: '365', label: '12 mois' },
];

function Metric({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Caption style={{ color: colors.subtle }}>{label.toUpperCase()}</Caption>
      {children}
      {hint ? <Caption style={{ color: colors.subtle, letterSpacing: 0 }}>{hint}</Caption> : null}
    </View>
  );
}

export default function AnalytiqueScreen() {
  const [period, setPeriod] = React.useState<Period>('90');
  const [data, setData] = React.useState<DashboardDTO | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  const load = React.useCallback(async (days: Period) => {
    setError(null);
    try {
      setData(await api.dashboard(Number(days)));
    } catch (cause) {
      setError(
        cause instanceof DevisiaApiError ? cause.message : 'Votre activité n’a pas pu être chargée.',
      );
    }
  }, []);

  React.useEffect(() => {
    // Chargement initial et rechargement au changement de période : poser
    // l'état est précisément le rôle de cet effet.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(period);
  }, [period, load]);

  if (error && !data) {
    return (
      <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.surface }}>
        <ErrorState description={error} onRetry={() => void load(period)} />
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.surface }}>
        <LoadingState label="Calcul de votre activité…" />
      </SafeAreaView>
    );
  }

  const noActivity = data.quotesSent === 0 && data.revenueWonCents === 0;

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing['4xl'] }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load(period).finally(() => setRefreshing(false));
            }}
            tintColor={colors.accent}
          />
        }
      >
        <ChoiceRow options={PERIODS} value={period} onChange={setPeriod} />

        {noActivity ? (
          <EmptyState
            icon="bar-chart-outline"
            title="Vos chiffres arrivent"
            description="Dès votre premier devis envoyé, vous verrez ici ce que vous avez gagné, ce qui est en attente, et ce qu’il reste à relancer."
          />
        ) : (
          <>
            <Card style={{ gap: spacing.lg }}>
              <SectionHeader title="Chiffre d’affaires" />
              <View style={{ flexDirection: 'row', gap: spacing.lg }}>
                <Metric label="Gagné" hint="devis acceptés">
                  <Amount cents={data.revenueWonCents} size="metric" />
                </Metric>
                <Metric label="En jeu" hint="devis en attente">
                  <Amount cents={data.revenuePotentialCents} size="metric" tone="muted" />
                </Metric>
              </View>
            </Card>

            <Card style={{ gap: spacing.lg }}>
              <SectionHeader title="Devis" />
              <View style={{ flexDirection: 'row', gap: spacing.lg }}>
                <Metric label="Envoyés">
                  <Body style={[typography.metric, { color: colors.ink }]}>{data.quotesSent}</Body>
                </Metric>
                <Metric label="Acceptés">
                  <Body style={[typography.metric, { color: colors.success }]}>
                    {data.quotesAccepted}
                  </Body>
                </Metric>
                <Metric label="Taux">
                  <Body style={[typography.metric, { color: colors.ink }]}>
                    {Math.round(data.acceptanceRate)} %
                  </Body>
                </Metric>
              </View>
              <Divider />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Muted>Devis moyen</Muted>
                <Amount cents={data.averageQuoteCents} tone="muted" />
              </View>
            </Card>

            {data.toRecover.quoteCount > 0 ? (
              <Card style={{ gap: spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <SectionHeader title="À récupérer" />
                  <View style={{ flex: 1 }} />
                  <Badge label={`${data.toRecover.quoteCount}`} tone="warning" />
                </View>
                <Amount cents={data.toRecover.totalCents} size="metric" tone="accent" />
                <Muted>
                  {data.toRecover.quoteCount} devis sans réponse, chez{' '}
                  {data.toRecover.customerCount} client
                  {data.toRecover.customerCount > 1 ? 's' : ''}.
                </Muted>
              </Card>
            ) : null}

            {data.recentActivity.length > 0 ? (
              <Card style={{ gap: spacing.md }}>
                <SectionHeader title="Activité récente" />
                {data.recentActivity.slice(0, 6).map((event, index) => (
                  <View key={event.id} style={{ gap: spacing.md }}>
                    {index > 0 ? <Divider /> : null}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                      <View
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: radius.full,
                          backgroundColor: colors.surface2,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Caption style={{ color: colors.muted, letterSpacing: 0 }}>
                          {event.quoteNumber.slice(-3)}
                        </Caption>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Body numberOfLines={1} style={{ fontWeight: '600' }}>
                          {event.quoteTitle}
                        </Body>
                        <Muted style={{ fontSize: 13 }}>{event.quoteNumber}</Muted>
                      </View>
                      <Amount cents={event.totalCents} tone="muted" />
                    </View>
                  </View>
                ))}
              </Card>
            ) : null}
          </>
        )}

        <Caption style={{ color: colors.subtle, textAlign: 'center' }}>
          Calculé sur vos devis réels, sur {PERIODS.find((p) => p.value === period)?.label}.
        </Caption>
      </ScrollView>
    </SafeAreaView>
  );
}
