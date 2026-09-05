import * as React from 'react';
import { FlatList, Linking, Pressable, RefreshControl, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatCents, type CustomerDTO } from '@devisia/shared';
import { Body, Button, Card, EmptyState, Ionicons, Muted, PageHeader, SearchField, Skeleton } from '@/components/ui';
import { ClientSheet } from '@/components/client-sheet';
import { useQuery } from '@/lib/query';
import { api } from '@/lib/api';
import { colors, spacing } from '@/theme';

/**
 * Répertoire client.
 *
 * L'écran savait chercher et appeler, mais pas créer : arrivé ici depuis
 * « Ajoutez un client », l'artisan tombait sur une liste vide sans aucune
 * action. La fiche s'ouvre maintenant d'ici comme depuis un devis, par le même
 * formulaire.
 */
export default function ClientsScreen() {
  const [search, setSearch] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  const [creating, setCreating] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 260);
    return () => clearTimeout(timer);
  }, [search]);

  const query = useQuery<{ total: number; items: CustomerDTO[] }>(
    () => api.customers.list(debounced || undefined),
    [debounced],
  );

  useFocusEffect(
    React.useCallback(() => {
      void query.refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debounced]),
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md, gap: spacing.lg }}>
        <PageHeader
          eyebrow="Répertoire"
          title="Vos clients"
          subtitle={query.data ? `${query.data.total} client${query.data.total > 1 ? 's' : ''} dans votre atelier` : 'Coordonnées, devis et chiffre d’affaires.'}
        />
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Nom, ville, téléphone…"
        />
      </View>

      {query.loading && !query.data ? (
        <View style={{ paddingHorizontal: spacing.xl, gap: spacing.md }}>
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} height={64} />
          ))}
        </View>
      ) : (
        <FlatList
          data={query.data?.items ?? []}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: 120, gap: spacing.md }}
          refreshControl={
            <RefreshControl refreshing={query.refreshing} onRefresh={() => void query.refresh({ force: true })} tintColor={colors.accent} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title={debounced ? 'Aucun client trouvé.' : 'Aucun client pour le moment.'}
              description={
                debounced
                  ? 'Essayez un autre nom ou une ville.'
                  : 'Vos clients arrivent aussi tout seuls : chaque devis crée la fiche correspondante.'
              }
              action={
                <Button
                  title="Nouveau client"
                  icon="person-add-outline"
                  haptic
                  onPress={() => setCreating(true)}
                />
              }
            />
          }
          renderItem={({ item }) => (
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: colors.surface2,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Body style={{ fontWeight: '700', color: colors.inkSoft }}>
                  {item.displayName.trim().charAt(0).toUpperCase() || 'C'}
                </Body>
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Body style={{ fontWeight: '600' }} numberOfLines={1}>
                  {item.displayName}
                </Body>
                <Muted style={{ fontSize: 12 }} numberOfLines={1}>
                  {[item.city, item.email].filter(Boolean).join(' · ') || 'Aucune coordonnée'}
                </Muted>
                <Muted style={{ fontSize: 12 }}>
                  {item.quoteCount} devis · {formatCents(item.revenueCents, { compact: true })} devisés
                </Muted>
              </View>

              {item.phone ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Appeler ${item.displayName}`}
                  onPress={() => void Linking.openURL(`tel:${item.phone}`)}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: colors.accentSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="call" size={19} color={colors.accent} />
                </Pressable>
              ) : null}
            </Card>
          )}
        />
      )}

      {/* L'état vide porte déjà son action : on n'affiche la barre du bas que
          lorsqu'il y a une liste au-dessus d'elle. */}
      {(query.data?.items.length ?? 0) > 0 ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: spacing.lg,
            paddingBottom: spacing['2xl'],
            backgroundColor: colors.canvas,
            borderTopWidth: 1,
            borderTopColor: colors.line,
          }}
        >
          <Button
            title="Nouveau client"
            icon="person-add-outline"
            haptic
            onPress={() => setCreating(true)}
          />
        </View>
      ) : null}

      <ClientSheet
        visible={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          void query.reload();
        }}
      />
    </SafeAreaView>
  );
}
