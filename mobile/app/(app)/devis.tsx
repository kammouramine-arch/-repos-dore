import * as React from 'react';
import { FlatList, Platform, RefreshControl, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { QUOTE_STATUS_LABELS, formatCents, type QuoteStatusId, type QuoteSummaryDTO } from '@devisia/shared';
import { AnimatedCount, Badge, Body, Button, EmptyState, HeaderAction, Ionicons, Muted, PageHeader, PressableCard, SearchField, Skeleton, Banner } from '@/components/ui';
import { useQuery } from '@/lib/query';
import { api } from '@/lib/api';
import { Enter } from '@/components/motion';
import { colors, spacing, typography } from '@/theme';
import { copy, localizeText, mobileLocale } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { FilterChip } from '@/components/filter-chip';

/**
 * Devis : l'archive et le suivi de tous les documents.
 *
 * L'accueil montre les derniers devis ; ici, l'artisan retrouve tout :
 * recherche par client, objet ou numéro, filtre par statut, montant, date.
 * Les statuts sont ceux que DEVISERA sait réellement : brouillon, envoyé,
 * consulté, expiré, annulé — jamais un « accepté » que le produit ne
 * collecte pas.
 */
type Filter = 'all' | 'BROUILLON' | 'ENVOYE' | 'CONSULTE' | 'closed';
const FILTERS: { id: Filter; label: string; statuses: QuoteStatusId[] | null }[] = [
  { id: 'all', label: 'Tous', statuses: null },
  { id: 'BROUILLON', label: 'Brouillons', statuses: ['BROUILLON'] },
  { id: 'ENVOYE', label: 'Envoyés', statuses: ['ENVOYE'] },
  { id: 'CONSULTE', label: 'Consultés', statuses: ['CONSULTE', 'ACCEPTE', 'REFUSE', 'MODIFICATION_DEMANDEE'] },
  { id: 'closed', label: 'Clos', statuses: ['EXPIRE', 'ANNULE'] },
];

const TONES: Record<string, 'neutral' | 'accent' | 'success' | 'warning' | 'info'> = {
  BROUILLON: 'neutral', ENVOYE: 'info', CONSULTE: 'accent', ACCEPTE: 'accent', REFUSE: 'accent', MODIFICATION_DEMANDEE: 'accent', EXPIRE: 'neutral', ANNULE: 'neutral',
};

function normalize(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export default function DevisScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const locale = mobileLocale(session);
  const en = locale === 'en';
  const params = useLocalSearchParams<{ statut?: string }>();
  const [filter, setFilter] = React.useState<Filter>(FILTERS.some((f) => f.id === params.statut) ? (params.statut as Filter) : 'all');
  const [search, setSearch] = React.useState('');

  const query = useQuery<{ total: number; items: QuoteSummaryDTO[] }>(() => api.quotes.list({ take: 100 }), [], 'quotes:all');
  useFocusEffect(
    React.useCallback(() => {
      void query.refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const items = React.useMemo(() => query.data?.items ?? [], [query.data]);
  const counts = React.useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.id, f.statuses ? items.filter((q) => f.statuses!.includes(q.status)).length : items.length])) as Record<Filter, number>, [items]);
  const visible = React.useMemo(() => {
    const active = FILTERS.find((f) => f.id === filter)!;
    const needle = normalize(search.trim());
    return items.filter((q) => (!active.statuses || active.statuses.includes(q.status))
      && (!needle || normalize(`${q.customerName} ${q.title} ${q.number}`).includes(needle)));
  }, [filter, items, search]);
  const total = query.data?.total ?? items.length;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md, gap: spacing.lg }}>
        <Enter distance={8}>
          <PageHeader
            eyebrow={en ? 'Documents' : 'Documents'}
            icon="document-text"
            title={en ? 'Your quotes' : 'Vos devis'}
            subtitle={query.data ? (
              <Muted accessibilityLabel={en ? `${total} quote${total === 1 ? '' : 's'}` : `${total} devis`}>
                <AnimatedCount value={total} style={{ ...typography.small, color: colors.ink, fontWeight: '600' }} />
                {en ? ` quote${total === 1 ? '' : 's'} · drafts, sent and viewed` : ` devis · brouillons, envoyés et consultés`}
              </Muted>
            ) : (en ? 'Every job, one tap away.' : 'Retrouvez chaque chantier en un geste.')}
            action={<HeaderAction icon="add" label={en ? 'New quote' : 'Nouveau devis'} onPress={() => router.push('/devis/nouveau')} />}
          />
        </Enter>
        <Enter delay={70} distance={8}>
          <SearchField value={search} onChangeText={setSearch} placeholder={en ? 'Client, subject, number…' : 'Client, objet, numéro…'} />
        </Enter>
        {items.length > 0 ? (
          <Enter delay={120} distance={8}>
            <FlatList
              horizontal
              data={FILTERS}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.sm }}
              renderItem={({ item }) => <FilterChip label={localizeText(locale, item.label)} count={counts[item.id]} active={filter === item.id} onPress={() => setFilter(item.id)} />}
            />
          </Enter>
        ) : null}
      </View>

      {query.error ? (
        <View style={{ paddingHorizontal: spacing.xl, gap: spacing.sm }}>
          <Banner tone="danger" title={query.error} />
          <Button title={copy(locale, 'retry')} variant="secondary" icon="refresh" onPress={() => void query.reload()} />
        </View>
      ) : null}

      {query.loading && !query.data ? (
        <View style={{ paddingHorizontal: spacing.xl, gap: spacing.md }}>
          {[0, 1, 2, 3].map((index) => <Skeleton key={index} height={76} />)}
        </View>
      ) : (
        <FlatList
          key={filter}
          data={visible}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={8}
          windowSize={7}
          updateCellsBatchingPeriod={16}
          removeClippedSubviews={Platform.OS === 'android'}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          scrollEventThrottle={16}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingTop: spacing.xs, paddingBottom: spacing['5xl'] * 2, gap: spacing.md }}
          refreshControl={<RefreshControl refreshing={query.refreshing} onRefresh={() => void query.refresh({ force: true })} tintColor={colors.accent} />}
          ListEmptyComponent={
            items.length === 0 ? (
              <EmptyState
                icon="document-text-outline"
                title={en ? 'No quotes yet.' : 'Vous n’avez encore aucun devis.'}
                description={en ? 'Your first quote is less than a minute away.' : 'Votre premier devis est à moins d’une minute.'}
                action={<Button title={en ? 'Create my first quote' : 'Créer mon premier devis'} icon="sparkles" haptic onPress={() => router.push('/devis/nouveau')} />}
              />
            ) : (
              <EmptyState
                icon="funnel-outline"
                title={en ? 'No quote matches.' : 'Aucun devis ne correspond.'}
                description={en ? 'Try another name or status.' : 'Essayez un autre nom ou un autre statut.'}
                action={<Button title={en ? 'Show everything' : 'Tout afficher'} variant="secondary" onPress={() => { setFilter('all'); setSearch(''); }} />}
              />
            )
          }
          renderItem={({ item, index }) => {
            const when = new Date(item.sentAt ?? item.createdAt).toLocaleDateString(en ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'short' });
            return (
              <Enter delay={Math.min(index, 7) * 40} distance={8}>
                <PressableCard
                  haptic
                  accessibilityLabel={en ? `Open quote ${item.number}` : `Ouvrir le devis ${item.number}`}
                  onPress={() => router.push(`/devis/${item.id}`)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="document-text-outline" size={20} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Body style={{ fontWeight: '600' }} numberOfLines={1}>{item.customerName}</Body>
                    <Muted numberOfLines={1}>{item.title}</Muted>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      <Badge label={localizeText(locale, QUOTE_STATUS_LABELS[item.status])} tone={TONES[item.status] ?? 'neutral'} />
                      <Muted style={{ fontSize: 12 }}>{item.sentAt ? (en ? `Sent ${when}` : `Envoyé le ${when}`) : when} · {item.number}</Muted>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: spacing.sm }}>
                    <Body style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>{formatCents(item.totalCents, { compact: true })}</Body>
                    <Ionicons name="chevron-forward" size={16} color={colors.subtle} />
                  </View>
                </PressableCard>
              </Enter>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
