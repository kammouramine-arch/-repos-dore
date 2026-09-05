import * as React from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { QUOTE_STATUS_LABELS, formatCents, type QuoteSummaryDTO } from '@devisia/shared';
import { Badge, Body, Button, EmptyState, Ionicons, Muted, PageHeader, PressableCard, Skeleton } from '@/components/ui';
import { useQuery } from '@/lib/query';
import { api } from '@/lib/api';
import { colors, radius, spacing } from '@/theme';

const FILTERS = [
  { value: '', label: 'Tous' },
  { value: 'BROUILLON', label: 'Brouillons' },
  { value: 'ENVOYE', label: 'Envoyés' },
  { value: 'CONSULTE', label: 'Consultés' },
] as const;

const TONES: Record<string, 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info'> = {
  BROUILLON: 'neutral',
  ENVOYE: 'info',
  CONSULTE: 'accent',
  ACCEPTE: 'accent',
  REFUSE: 'accent',
  MODIFICATION_DEMANDEE: 'accent',
  EXPIRE: 'neutral',
  ANNULE: 'neutral',
};

export default function DevisScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ statut?: string }>();
  const [filter, setFilter] = React.useState<string>(params.statut ?? '');

  const query = useQuery<{ total: number; items: QuoteSummaryDTO[] }>(
    () => api.quotes.list({ statut: filter || undefined, take: 100 }),
    [filter],
    `quotes:${filter}`,
  );

  useFocusEffect(
    React.useCallback(() => {
      void query.refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter]),
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md, gap: spacing.lg }}>
        <PageHeader
          eyebrow="Documents"
          title="Vos devis"
          subtitle={query.data ? `${query.data.total} devis · prêts à suivre et à envoyer` : 'Retrouvez chaque chantier en un geste.'}
        />
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={(item) => item.value || 'tous'}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm }}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: filter === item.value }}
              onPress={() => {
                void Haptics.selectionAsync();
                setFilter(item.value);
              }}
              style={{
                paddingHorizontal: spacing.lg,
                paddingVertical: 9,
                borderRadius: radius.full,
                backgroundColor: filter === item.value ? colors.accent : colors.canvas,
                borderWidth: 1,
                borderColor: filter === item.value ? colors.accent : colors.line,
              }}
            >
              <Body
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: filter === item.value ? colors.white : colors.muted,
                }}
              >
                {item.label}
              </Body>
            </Pressable>
          )}
        />
      </View>

      {query.loading && !query.data ? (
        <View style={{ paddingHorizontal: spacing.xl, gap: spacing.md }}>
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} height={72} />
          ))}
        </View>
      ) : (
        <FlatList
          data={query.data?.items ?? []}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing['5xl'], gap: spacing.md }}
          refreshControl={
            <RefreshControl refreshing={query.refreshing} onRefresh={() => void query.refresh({ force: true })} tintColor={colors.accent} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="document-text-outline"
              title={filter ? 'Aucun devis dans ce statut.' : 'Vous n’avez encore aucun devis.'}
              description={filter ? undefined : 'Votre premier devis est à moins d’une minute.'}
              action={
                filter ? undefined : (
                  <Button title="Créer mon premier devis" onPress={() => router.push('/devis/nouveau')} />
                )
              }
            />
          }
          renderItem={({ item }) => (
            <PressableCard
              accessibilityLabel={`Ouvrir le devis ${item.number}`}
              onPress={() => router.push(`/devis/${item.id}`)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: colors.accentSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="document-text-outline" size={20} color={colors.accent} />
              </View>
              <View style={{ flex: 1, gap: 5 }}>
                <Body style={{ fontWeight: '600' }} numberOfLines={1}>
                  {item.customerName}
                </Body>
                <Muted numberOfLines={1}>{item.title}</Muted>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Muted style={{ fontSize: 12 }}>{item.number}</Muted>
                  <Badge label={QUOTE_STATUS_LABELS[item.status]} tone={TONES[item.status] ?? 'neutral'} />
                </View>
              </View>
              <View style={{ alignItems: 'flex-end', gap: spacing.sm }}>
                <Body style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                  {formatCents(item.totalCents, { compact: true })}
                </Body>
                <Ionicons name="chevron-forward" size={16} color={colors.subtle} />
              </View>
            </PressableCard>
          )}
        />
      )}
    </SafeAreaView>
  );
}
