import * as React from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { QUOTE_STATUS_LABELS, formatCents, type QuoteSummaryDTO } from '@devisia/shared';
import { Badge, Body, Button, Divider, EmptyState, Muted, Skeleton, Title } from '@/components/ui';
import { useQuery } from '@/lib/query';
import { api } from '@/lib/api';
import { colors, radius, spacing } from '@/theme';

const FILTERS = [
  { value: '', label: 'Tous' },
  { value: 'BROUILLON', label: 'Brouillons' },
  { value: 'ENVOYE', label: 'Envoyés' },
  { value: 'CONSULTE', label: 'Consultés' },
  { value: 'ACCEPTE', label: 'Acceptés' },
] as const;

const TONES: Record<string, 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info'> = {
  BROUILLON: 'neutral',
  ENVOYE: 'info',
  CONSULTE: 'accent',
  ACCEPTE: 'success',
  REFUSE: 'danger',
  MODIFICATION_DEMANDEE: 'warning',
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
  );

  useFocusEffect(
    React.useCallback(() => {
      void query.refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter]),
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <Title>Devis</Title>
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
              onPress={() => setFilter(item.value)}
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: 8,
                borderRadius: radius.sm,
                backgroundColor: filter === item.value ? colors.ink : colors.canvas,
                borderWidth: 1,
                borderColor: filter === item.value ? colors.ink : colors.line,
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
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} height={72} />
          ))}
        </View>
      ) : (
        <FlatList
          data={query.data?.items ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing['4xl'] }}
          refreshControl={
            <RefreshControl refreshing={query.refreshing} onRefresh={() => void query.refresh()} tintColor={colors.accent} />
          }
          ItemSeparatorComponent={() => <Divider />}
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
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/devis/${item.id}`)}
              style={({ pressed }) => ({
                paddingVertical: spacing.md,
                opacity: pressed ? 0.7 : 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
              })}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <Body style={{ fontWeight: '600' }} numberOfLines={1}>
                  {item.customerName}
                </Body>
                <Muted numberOfLines={1}>{item.title}</Muted>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Muted style={{ fontSize: 12 }}>{item.number}</Muted>
                  <Badge label={QUOTE_STATUS_LABELS[item.status]} tone={TONES[item.status] ?? 'neutral'} />
                </View>
              </View>
              <Body style={{ fontWeight: '700' }}>{formatCents(item.totalCents, { compact: true })}</Body>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}
