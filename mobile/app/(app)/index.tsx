import * as React from 'react';
import { Pressable, RefreshControl, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatCents, type DashboardDTO } from '@devisia/shared';
import {
  Body,
  Button,
  Caption,
  Card,
  Divider,
  EmptyState,
  Heading,
  Muted,
  Screen,
  Skeleton,
  Title,
} from '@/components/ui';
import { TrialBanner } from '@/components/trial-banner';
import { useAuth } from '@/lib/auth';
import { useQuery } from '@/lib/query';
import { api } from '@/lib/api';
import { colors, radius, spacing } from '@/theme';

/** Accueil : ce que l'artisan doit savoir en trois secondes. */
export default function AccueilScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const query = useQuery<DashboardDTO>(() => api.dashboard(30));

  // Les montants changent pendant que l'utilisateur travaille : on recharge au retour.
  useFocusEffect(
    React.useCallback(() => {
      void query.refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const data = query.data;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.surface }}>
      <Screen
        refreshControl={
          <RefreshControl refreshing={query.refreshing} onRefresh={() => void query.refresh()} tintColor={colors.accent} />
        }
      >
        <View style={{ gap: 4 }}>
          <Title>Bonjour {data?.greetingName ?? session?.user.firstName ?? ''}.</Title>
          <Muted>Voici où en est votre activité.</Muted>
        </View>

        <TrialBanner subscription={session?.subscription ?? null} />

        {query.loading && !data ? (
          <View style={{ gap: spacing.md }}>
            <Skeleton height={120} />
            <Skeleton height={150} />
            <Skeleton height={90} />
          </View>
        ) : null}

        {data ? (
          <>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Metric
                label="CA gagné"
                value={formatCents(data.revenueWonCents, { compact: true })}
                tone="ink"
              />
              <Metric
                label="Taux d’acceptation"
                value={`${data.acceptanceRate} %`}
                hint={`${data.quotesAccepted}/${data.quotesSent} devis`}
                tone="ink"
              />
            </View>

            {/* Le cœur commercial de DEVISIA. */}
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/(app)/devis?statut=ENVOYE')}
              style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
            >
              <View
                style={{
                  backgroundColor: colors.accentSoft,
                  borderColor: colors.accentBorder,
                  borderWidth: 1,
                  borderRadius: radius.lg,
                  padding: spacing.lg,
                  gap: spacing.sm,
                }}
              >
                <Caption style={{ color: colors.accentHover }}>Chiffre d’affaires à récupérer</Caption>
                <Body style={{ fontSize: 34, lineHeight: 38, fontWeight: '700', color: colors.accentHover, letterSpacing: -1 }}>
                  {formatCents(data.toRecover.totalCents, { compact: true })}
                </Body>
                <Muted style={{ color: colors.inkSoft }}>
                  {data.toRecover.quoteCount === 0
                    ? 'Aucun devis en attente de réponse.'
                    : `${data.toRecover.quoteCount} devis en attente · ${data.toRecover.customerCount} client${
                        data.toRecover.customerCount > 1 ? 's' : ''
                      } sans réponse.`}
                </Muted>

                {data.toRecover.quotes.slice(0, 3).map((quote) => (
                  <View
                    key={quote.id}
                    style={{
                      backgroundColor: colors.canvas,
                      borderRadius: radius.md,
                      padding: spacing.md,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: spacing.md,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Body style={{ fontWeight: '600' }} numberOfLines={1}>
                        {quote.customerName}
                      </Body>
                      <Muted style={{ fontSize: 12 }}>
                        {quote.number} · {quote.daysWaiting} j sans réponse
                      </Muted>
                    </View>
                    <Body style={{ fontWeight: '700' }}>{formatCents(quote.totalCents, { compact: true })}</Body>
                  </View>
                ))}

                {data.toRecover.quoteCount > 0 ? (
                  <Button
                    title="Relancer maintenant"
                    icon="send"
                    onPress={() => router.push('/(app)/devis?statut=ENVOYE')}
                    style={{ marginTop: spacing.xs }}
                    haptic
                  />
                ) : null}
              </View>
            </Pressable>

            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Metric label="Devis envoyés" value={String(data.quotesSent)} tone="ink" />
              <Metric label="Nouveaux prospects" value={String(data.newLeads)} tone="ink" />
            </View>

            <Card style={{ gap: spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Heading>Activité récente</Heading>
                <Pressable onPress={() => router.push('/(app)/devis')} accessibilityRole="button">
                  <Body style={{ color: colors.accent, fontWeight: '600', fontSize: 13 }}>Tout voir</Body>
                </Pressable>
              </View>

              {data.recentActivity.length === 0 ? (
                <Muted>Aucune activité pour le moment.</Muted>
              ) : (
                data.recentActivity.slice(0, 5).map((event, index) => (
                  <View key={event.id} style={{ gap: spacing.md }}>
                    {index > 0 ? <Divider /> : null}
                    <Pressable
                      onPress={() => router.push(`/devis/${event.quoteId}`)}
                      style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}
                    >
                      <View style={{ flex: 1 }}>
                        <Body numberOfLines={1}>{ACTIVITY_LABELS[event.type] ?? event.type}</Body>
                        <Muted style={{ fontSize: 12 }} numberOfLines={1}>
                          {event.quoteNumber} · {event.quoteTitle}
                        </Muted>
                      </View>
                      <Body style={{ fontWeight: '600' }}>
                        {formatCents(event.totalCents, { compact: true })}
                      </Body>
                    </Pressable>
                  </View>
                ))
              )}
            </Card>
          </>
        ) : null}

        {!query.loading && !data && query.error ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="Données indisponibles"
            description={query.error}
            action={<Button title="Réessayer" variant="secondary" onPress={() => void query.reload()} />}
          />
        ) : null}
      </Screen>
    </SafeAreaView>
  );
}

const ACTIVITY_LABELS: Record<string, string> = {
  CREE: 'Devis créé',
  MODIFIE: 'Devis modifié',
  ENVOYE: 'Devis envoyé',
  CONSULTE: 'Consulté par le client',
  ACCEPTE: 'Accepté par le client',
  REFUSE: 'Refusé par le client',
  MODIFICATION_DEMANDEE: 'Modification demandée',
  RELANCE: 'Relance envoyée',
  PDF_TELECHARGE: 'PDF téléchargé',
};

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'ink' | 'accent';
}) {
  return (
    <Card style={{ flex: 1, gap: 6, padding: spacing.md }}>
      <Caption>{label}</Caption>
      <Body style={{ fontSize: 24, lineHeight: 28, fontWeight: '700', letterSpacing: -0.7, color: colors.ink }}>
        {value}
      </Body>
      {hint ? <Muted style={{ fontSize: 12 }}>{hint}</Muted> : null}
    </Card>
  );
}
