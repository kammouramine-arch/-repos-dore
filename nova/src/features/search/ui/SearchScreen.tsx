import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import type { Place } from '@/core/domain/entities/place';
import { usePlanDestination } from '@/features/trip/hooks/usePlanDestination';
import { useTripStore } from '@/features/trip/state/tripStore';
import {
  Divider,
  EmptyState,
  ListRow,
  Screen,
  ScreenHeader,
  SectionHeader,
} from '@/ui/components';
import { spacing } from '@/ui/theme';
import { usePlaceSearch } from '../hooks/usePlaceSearch';
import { PLACE_ICONS } from '../placeIcons';
import { SearchField } from './SearchField';

/**
 * Destination search. With no query it shows recent trips, which is what a
 * driver wants nine times out of ten.
 */
export const SearchScreen = () => {
  const navigation = useNavigation();
  const [query, setQuery] = useState('');
  const { results, status, error } = usePlaceSearch(query);
  const recents = useTripStore((state) => state.recents);
  const planDestination = usePlanDestination();

  const showRecents = status === 'idle';
  const places: Place[] = showRecents ? recents.map((entry) => entry.place) : results;

  const emptyState = () => {
    if (status === 'error') {
      return <EmptyState icon="cloud-offline-outline" title="Search unavailable" message={error ?? undefined} />;
    }
    if (status === 'ready') {
      return (
        <EmptyState
          icon="compass-outline"
          title="Nothing found"
          message="Try a different spelling, or add the town or city."
        />
      );
    }
    if (showRecents) {
      return (
        <EmptyState
          icon="time-outline"
          title="No recent trips"
          message="Places you navigate to will show up here."
        />
      );
    }
    return null;
  };

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <ScreenHeader title="Where to?" onBack={() => navigation.goBack()} />
        <SearchField
          value={query}
          onChangeText={setQuery}
          busy={status === 'searching'}
          autoFocus
        />
      </View>

      <FlatList
        data={places}
        keyExtractor={(place) => place.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          showRecents && places.length > 0 ? <SectionHeader title="Recent" /> : null
        }
        ItemSeparatorComponent={() => <Divider inset={spacing.md + 38 + spacing.sm} />}
        ListEmptyComponent={emptyState}
        renderItem={({ item }) => (
          <ListRow
            title={item.name}
            subtitle={item.address}
            icon={PLACE_ICONS[item.category]}
            iconTone={showRecents ? 'neutral' : 'accent'}
            onPress={() => void planDestination(item)}
          />
        )}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  list: {
    paddingBottom: spacing.xxl,
  },
});
