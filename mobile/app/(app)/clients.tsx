import * as React from 'react';
import { FlatList, Linking, Pressable, RefreshControl, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatCents, type CustomerDTO } from '@devisia/shared';
import { Body, Divider, EmptyState, Field, Ionicons, Muted, Skeleton, Title } from '@/components/ui';
import { useQuery } from '@/lib/query';
import { api } from '@/lib/api';
import { colors, spacing } from '@/theme';

/** Répertoire client : appeler en un geste depuis le chantier. */
export default function ClientsScreen() {
  const [search, setSearch] = React.useState('');
  const [debounced, setDebounced] = React.useState('');

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
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <Title>Clients</Title>
        <Field
          label="Rechercher"
          value={search}
          onChangeText={setSearch}
          placeholder="Nom, ville, téléphone…"
          autoCapitalize="none"
        />
      </View>

      {query.loading && !query.data ? (
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} height={64} />
          ))}
        </View>
      ) : (
        <FlatList
          data={query.data?.items ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing['4xl'] }}
          ItemSeparatorComponent={() => <Divider />}
          refreshControl={
            <RefreshControl refreshing={query.refreshing} onRefresh={() => void query.refresh()} tintColor={colors.accent} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title={debounced ? 'Aucun client trouvé.' : 'Aucun client pour le moment.'}
              description={debounced ? 'Essayez un autre nom ou une ville.' : undefined}
            />
          }
          renderItem={({ item }) => (
            <View style={{ paddingVertical: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Body style={{ fontWeight: '600' }} numberOfLines={1}>
                  {item.displayName}
                </Body>
                <Muted style={{ fontSize: 12 }} numberOfLines={1}>
                  {[item.city, item.email].filter(Boolean).join(' · ') || 'Aucune coordonnée'}
                </Muted>
                <Muted style={{ fontSize: 12 }}>
                  {item.acceptedCount}/{item.quoteCount} devis · {formatCents(item.revenueCents, { compact: true })}
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
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
