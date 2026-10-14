import { useRoute, useNavigation } from "@react-navigation/native";
import type { RootStackScreenProps } from "@/app/navigation/types";
import { useServices } from "@/app/runtime/AppRuntime";
import { Alert, FlatList, StyleSheet, View } from "react-native";

import { useCallback, useEffect, useRef, useState } from "react";

import { useTripStore } from "@/app/stores/hooks";
import type { Place } from "@/core/domain/entities/place";
import type { PlaceSuggestion } from '@/core/domain/ports/placesProvider';
import { usePlanDestination } from "@/features/trip/hooks/usePlanDestination";
import {
  AppText,
  Button,
  Divider,
  EmptyState,
  ListRow,
  Screen,
  ScreenHeader,
  SectionHeader,
} from "@/ui/components";
import { spacing } from "@/ui/theme";
import { usePlaceSearch } from "../hooks/usePlaceSearch";
import { PLACE_ICONS } from "../placeIcons";
import { SearchField } from "./SearchField";

/**
 * Destination search. With no query it shows recent trips, which is what a
 * driver wants nine times out of ten.
 */
export const SearchScreen = () => {
  const navigation = useNavigation();
  const { savedPlacesRepository, placesProvider } = useServices();
  const route = useRoute<RootStackScreenProps<"Search">["route"]>();
  const saveSlot = route.params?.saveSlot;
  const [query, setQuery] = useState(route.params?.initialQuery ?? "");
  const [submitted, setSubmitted] = useState(route.params?.initialQuery ?? "");
  const selectionGeneration = useRef(0);
  const supersedeSelection = useCallback(() => { selectionGeneration.current++; }, []);
  useEffect(() => { supersedeSelection(); return supersedeSelection; }, [query, supersedeSelection]);
  const { results, status, error } = usePlaceSearch(placesProvider.supportsTypeahead ? query : submitted, submitted === query);
  const submit = () => setSubmitted(query.trim());
  const choose = async (item: Place | PlaceSuggestion) => {
    const generation = ++selectionGeneration.current;
    let place: Place | null;
    try { place = 'coordinates' in item ? item : await placesProvider.resolveSuggestion?.(item) ?? null; }
    catch { if (generation === selectionGeneration.current) Alert.alert('Address unavailable', 'Please select a current suggestion and try again.'); return; }
    if (generation !== selectionGeneration.current) return;
    if (!place) { Alert.alert('Exact address unavailable', 'The provider could not confirm this destination or house number. Refine the address; Avyro will not silently choose the street centre.'); return; }
    if (!saveSlot) {
      await planDestination(place);
      return;
    }
    try {
      await savedPlacesRepository.set(saveSlot, place);
      navigation.goBack();
    } catch {
      Alert.alert("Could not save address", "Please try again.");
    }
  };
  const recents = useTripStore((state) => state.recents);
  const planDestination = usePlanDestination();

  const showRecents = status === "idle";
  const places: (Place | PlaceSuggestion)[] = showRecents
    ? recents.map((entry) => entry.place)
    : results;

  const emptyState = () => {
    if (status === "error") {
      return (
        <EmptyState
          icon="cloud-offline-outline"
          title="Search unavailable"
          message={error ?? undefined}
        />
      );
    }
    if (status === "ready") {
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
        <ScreenHeader
          title={
            saveSlot
              ? `Save ${saveSlot === "home" ? "Home" : "Work"}`
              : "Where to?"
          }
          onBack={() => navigation.goBack()}
        />
        <SearchField
          value={query}
          onChangeText={(value) => {
            setQuery(value);
            setSubmitted("");
          }}
          onSubmit={submit}
          busy={status === "searching"}
          autoFocus
        />
        <Button
          label="Search address"
          onPress={submit}
          disabled={query.trim().length < 2}
        />
        <AppText variant="footnote" tone="tertiary">
          {placesProvider.attribution ?? 'OpenStreetMap contributors · Address results may be incomplete'}
        </AppText>
      </View>

      <FlatList
        data={places}
        keyExtractor={(place) => place.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          showRecents && places.length > 0 ? (
            <SectionHeader title="Recent" />
          ) : null
        }
        ItemSeparatorComponent={() => (
          <Divider inset={spacing.md + 38 + spacing.sm} />
        )}
        ListEmptyComponent={emptyState}
        renderItem={({ item, index }) => (
          <ListRow
            testID={`place-result-${index}`}
            title={item.name}
            subtitle={item.address}
            icon={PLACE_ICONS[item.category]}
            iconTone={showRecents ? "neutral" : "accent"}
            onPress={() => void choose(item)}
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
