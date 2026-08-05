import { StyleSheet, View } from 'react-native';

import type { Place, RecentDestination } from '@/core/domain/entities/place';
import { PLACE_ICONS } from '@/features/search/placeIcons';
import { AppText, Divider, GlassPanel, ListRow, SectionHeader } from '@/ui/components';
import { spacing } from '@/ui/theme';
import { SearchTrigger } from './SearchTrigger';

export interface HomeSheetProps {
  recents: readonly RecentDestination[];
  locationError: string | null;
  onSearchPress: () => void;
  onRecentPress: (place: Place) => void;
  onEnableLocation: () => void;
  onClearRecents: () => void;
}

/** How many recent trips fit on the home screen without crowding the map. */
const VISIBLE_RECENTS = 3;

export const HomeSheet = ({
  recents,
  locationError,
  onSearchPress,
  onRecentPress,
  onEnableLocation,
  onClearRecents,
}: HomeSheetProps) => (
  <GlassPanel style={styles.sheet}>
    <View style={styles.grabber} />

    <View style={styles.body}>
      <SearchTrigger onPress={onSearchPress} />

      {locationError ? (
        <ListRow
          title="Turn on location"
          subtitle={locationError}
          icon="locate-outline"
          iconTone="danger"
          onPress={onEnableLocation}
        />
      ) : null}

      {recents.length > 0 ? (
        <View style={styles.recents}>
          <SectionHeader
            title="Recent"
            actionLabel="Clear"
            onActionPress={onClearRecents}
          />

          {recents.slice(0, VISIBLE_RECENTS).map((entry, index) => (
            <View key={entry.place.id}>
              {index > 0 ? <Divider inset={spacing.md + 38 + spacing.sm} /> : null}
              <ListRow
                title={entry.place.name}
                subtitle={entry.place.address}
                icon={PLACE_ICONS[entry.place.category]}
                onPress={() => onRecentPress(entry.place)}
              />
            </View>
          ))}
        </View>
      ) : (
        <AppText variant="footnote" tone="tertiary" style={styles.hint}>
          Search for anywhere you need to be. Avyro keeps your recent trips here.
        </AppText>
      )}
    </View>
  </GlassPanel>
);

const styles = StyleSheet.create({
  sheet: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
  grabber: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  body: {
    gap: spacing.sm,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  recents: {
    marginHorizontal: -spacing.md,
  },
  hint: {
    paddingHorizontal: spacing.xxs,
    paddingBottom: spacing.xxs,
  },
});
