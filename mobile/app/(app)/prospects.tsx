import * as React from 'react';
import { Alert, Animated, FlatList, Platform, Pressable, RefreshControl, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { LEAD_STATUS_LABELS, formatCents, type LeadDTO, type LeadStatusId } from '@devisia/shared';
import { AnimatedCount, Badge, Body, Banner, Button, EmptyState, Ionicons, Muted, PageHeader, PressableCard, Skeleton } from '@/components/ui';
import { Enter, useTouchMotion } from '@/components/motion';
import { useToast } from '@/components/toast';
import { useQuery } from '@/lib/query';
import { api } from '@/lib/api';
import { colors, radius, spacing, typography } from '@/theme';
import { copy, localizeText, mobileLocale } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';

const TONES: Record<string, 'neutral' | 'accent' | 'success' | 'warning' | 'info'> = {
  NOUVEAU: 'accent',
  CONTACTE: 'info',
  QUALIFIE: 'info',
  DEVIS_ENVOYE: 'neutral',
  RELANCE: 'warning',
  GAGNE: 'success',
  PERDU: 'neutral',
};

/**
 * Filtres de l'activité.
 *
 * Quatre regards sur le même pipeline : tout, ce qui vient d'arriver, ce qui
 * attend une action, ce qui est gagné. Les compteurs sont calculés sur la
 * liste complète, jamais sur la liste filtrée, pour que l'artisan voie d'un
 * coup d'œil où se trouve le travail.
 */
type Filter = 'all' | 'new' | 'follow' | 'won';
const FILTERS: { id: Filter; label: string; statuses: LeadStatusId[] | null }[] = [
  { id: 'all', label: 'Tous', statuses: null },
  { id: 'new', label: 'Nouveaux', statuses: ['NOUVEAU'] },
  { id: 'follow', label: 'À suivre', statuses: ['CONTACTE', 'QUALIFIE', 'DEVIS_ENVOYE', 'RELANCE'] },
  { id: 'won', label: 'Gagnés', statuses: ['GAGNE'] },
];

type Group = 'today' | 'week' | 'earlier';
const GROUP_LABELS: Record<Group, string> = { today: 'Aujourd’hui', week: 'Cette semaine', earlier: 'Plus tôt' };
function groupOf(iso: string, now: number): Group {
  const age = now - new Date(iso).getTime();
  if (age < 24 * 3_600_000) return 'today';
  if (age < 7 * 24 * 3_600_000) return 'week';
  return 'earlier';
}
type Row = { kind: 'header'; id: string; group: Group; count: number } | { kind: 'lead'; id: string; lead: LeadDTO; position: number };

/** Pipeline commercial : répondre vite est ce qui fait gagner le chantier. */
export default function ProspectsScreen() {
  const router = useRouter();
  const { toast } = useToast();
  const { session } = useAuth();
  const locale = mobileLocale(session);
  const en = locale === 'en';
  // L'instant de chargement voyage avec les données : un regroupement qui
  // bouge pendant qu'on lit n'aide personne, et Date.now() n'a pas sa place
  // dans le rendu.
  const query = useQuery<{ items: LeadDTO[]; at: number }>(async () => ({ items: await api.leads.list(), at: Date.now() }), [], 'leads:activity');
  const [filter, setFilter] = React.useState<Filter>('all');
  const now = query.data?.at ?? 0;

  useFocusEffect(
    React.useCallback(() => {
      void query.refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const leads = React.useMemo(() => query.data?.items ?? [], [query.data]);
  const counts = React.useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.id, f.statuses ? leads.filter((l) => f.statuses!.includes(l.status)).length : leads.length])) as Record<Filter, number>, [leads]);
  const rows = React.useMemo<Row[]>(() => {
    const active = FILTERS.find((f) => f.id === filter)!;
    const visible = leads.filter((l) => !active.statuses || active.statuses.includes(l.status));
    const buckets: Record<Group, LeadDTO[]> = { today: [], week: [], earlier: [] };
    for (const lead of visible) buckets[groupOf(lead.lastActivityAt ?? lead.createdAt, now)].push(lead);
    const out: Row[] = [];
    let position = 0;
    for (const group of ['today', 'week', 'earlier'] as Group[]) {
      if (!buckets[group].length) continue;
      out.push({ kind: 'header', id: `h:${group}`, group, count: buckets[group].length });
      for (const lead of buckets[group]) out.push({ kind: 'lead', id: lead.id, lead, position: position++ });
    }
    return out;
  }, [filter, leads, now]);

  async function convert(lead: LeadDTO) {
    try {
      await api.leads.convert(lead.id);
      toast({ title: en ? 'Lead converted' : 'Prospect converti', description: en ? 'Client and job created.' : 'Client et chantier créés.' });
      await query.reload();
    } catch {
      toast({ title: en ? 'Conversion failed' : 'Conversion impossible', tone: 'error' });
    }
  }

  const total = leads.length;
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md, gap: spacing.lg }}>
        <Enter distance={8}>
          <PageHeader
            eyebrow={copy(locale, 'activity')}
            title="Vos prospects"
            subtitle={query.data ? (
              <Muted accessibilityLabel={total ? `${total} ${en ? `request${total > 1 ? 's' : ''} to turn into jobs` : `demande${total > 1 ? 's' : ''} à transformer en chantier`}` : (en ? 'New quote requests arrive here.' : 'Les nouvelles demandes de devis arrivent ici.')}>
                {total ? (
                  <>
                    <AnimatedCount value={total} style={{ ...typography.small, color: colors.ink, fontWeight: '600' }} />
                    {en ? ` request${total > 1 ? 's' : ''} to turn into jobs.` : ` demande${total > 1 ? 's' : ''} à transformer en chantier.`}
                  </>
                ) : (en ? 'New quote requests arrive here.' : 'Les nouvelles demandes de devis arrivent ici.')}
              </Muted>
            ) : (en ? 'Requests, follow-ups, wins.' : 'Demandes, relances, chantiers gagnés.')}
          />
        </Enter>
        {total > 0 ? (
          <Enter delay={80} distance={8}>
            <View style={{ flexDirection: 'row', gap: spacing.sm }} accessibilityRole="tablist">
              {FILTERS.map((f) => (
                <FilterChip key={f.id} label={localizeText(locale, f.label)} count={counts[f.id]} active={filter === f.id} onPress={() => setFilter(f.id)} />
              ))}
            </View>
          </Enter>
        ) : null}
      </View>

      {query.error ? (
        <View style={{ paddingHorizontal: spacing.xl, gap: spacing.sm }}>
          <Banner tone="danger" title={query.error} />
          <Button title={en ? 'Retry' : 'Réessayer'} variant="secondary" icon="refresh" onPress={() => void query.reload()} />
        </View>
      ) : null}

      {query.loading && !query.data ? (
        <View style={{ paddingHorizontal: spacing.xl, gap: spacing.md }}>
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} height={78} />
          ))}
        </View>
      ) : (
        <FlatList
          // Changer de filtre rejoue l'entrée de la liste : la sélection se voit.
          key={filter}
          data={rows}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={8}
          windowSize={7}
          updateCellsBatchingPeriod={16}
          removeClippedSubviews={Platform.OS === 'android'}
          keyboardDismissMode="on-drag"
          scrollEventThrottle={16}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingTop: spacing.xs, paddingBottom: spacing['5xl'] * 2, gap: spacing.sm }}
          refreshControl={
            <RefreshControl refreshing={query.refreshing} onRefresh={() => void query.refresh({ force: true })} tintColor={colors.accent} />
          }
          ListEmptyComponent={
            total > 0 ? (
              <EmptyState
                icon="funnel-outline"
                title={en ? 'Nothing in this view.' : 'Rien dans cette vue.'}
                description={en ? 'Your other requests are one tap away.' : 'Vos autres demandes sont à un geste.'}
                action={<Button title={en ? 'Show everything' : 'Tout afficher'} variant="secondary" onPress={() => setFilter('all')} />}
              />
            ) : (
              <EmptyState
                icon="chatbubbles-outline"
                title="Aucun prospect pour le moment."
                description="Les demandes reçues depuis votre formulaire public arrivent directement ici. En attendant, un devis se prépare en une minute."
                action={<Button title="Créer un devis" icon="sparkles" haptic onPress={() => router.push('/devis/nouveau')} />}
              />
            )
          }
          renderItem={({ item }) =>
            item.kind === 'header' ? (
              <Enter distance={6} style={{ paddingTop: spacing.md, paddingBottom: spacing.xs, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent }} />
                <Muted style={[typography.caption, { color: colors.subtle, textTransform: 'uppercase' }]}>{localizeText(locale, GROUP_LABELS[item.group])}</Muted>
                <Muted style={[typography.caption, { color: colors.subtle }]}>· {item.count}</Muted>
              </Enter>
            ) : (
              <Enter delay={Math.min(item.position, 7) * 45} distance={10}>
                <View style={{ flexDirection: 'row', gap: spacing.md }}>
                  {/* Fil de la chronologie : un trait discret relie les demandes d'un même moment. */}
                  <View style={{ width: 8, alignItems: 'center' }}>
                    <View style={{ flex: 1, width: 2, borderRadius: 1, backgroundColor: colors.line }} />
                  </View>
                  <PressableCard
                    haptic
                    accessibilityLabel={`Ouvrir la demande de ${item.lead.contactName}`}
                    onPress={() =>
                      Alert.alert(item.lead.contactName, item.lead.description ?? item.lead.title, [
                        { text: en ? 'Close' : 'Fermer', style: 'cancel' },
                        ...(item.lead.customerId
                          ? [{ text: en ? 'Create a quote' : 'Créer un devis', onPress: () => router.push('/devis/nouveau') }]
                          : [{ text: en ? 'Convert to client' : 'Convertir en client', onPress: () => void convert(item.lead) }]),
                      ])
                    }
                    style={{ flex: 1, gap: spacing.sm }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
                        <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="sparkles-outline" size={16} color={colors.accent} />
                        </View>
                        <Body style={{ fontWeight: '600', flex: 1 }} numberOfLines={1}>
                          {item.lead.contactName}
                        </Body>
                      </View>
                      {item.lead.estimatedCents ? (
                        <Body style={{ fontWeight: '600' }}>{formatCents(item.lead.estimatedCents, { compact: true })}</Body>
                      ) : null}
                    </View>
                    <Muted numberOfLines={2}>{item.lead.title}</Muted>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      <Badge label={LEAD_STATUS_LABELS[item.lead.status]} tone={TONES[item.lead.status] ?? 'neutral'} />
                      {item.lead.phone ? <Muted style={{ fontSize: 12 }}>{item.lead.phone}</Muted> : null}
                    </View>
                  </PressableCard>
                </View>
              </Enter>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

/** Pastille de filtre : libellé et compteur, bleu plein quand active. */
function FilterChip({ label, count, active, onPress }: { label: string; count: number; active: boolean; onPress: () => void }) {
  const touch = useTouchMotion(0.95);
  return (
    <Animated.View style={{ transform: [{ scale: touch.scale }] }}>
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        accessibilityLabel={`${label}, ${count}`}
        hitSlop={4}
        onPressIn={touch.pressIn}
        onPressOut={touch.pressOut}
        onPress={() => {
          touch.pressOut();
          void Haptics.selectionAsync().catch(() => undefined);
          onPress();
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          minHeight: 36,
          paddingHorizontal: spacing.md,
          borderRadius: radius.full,
          backgroundColor: active ? colors.accent : colors.canvas,
          borderWidth: 1,
          borderColor: active ? colors.accent : colors.line,
        }}
      >
        <Muted style={[typography.small, { color: active ? colors.white : colors.inkSoft, fontWeight: '600' }]}>{label}</Muted>
        <AnimatedCount value={count} style={{ ...typography.caption, color: active ? 'rgba(255,255,255,0.85)' : colors.subtle, letterSpacing: 0 }} />
      </Pressable>
    </Animated.View>
  );
}
