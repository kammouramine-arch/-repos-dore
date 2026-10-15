import { t, useUiLanguage } from '@/ui/i18n';
import { StyleSheet, View } from 'react-native';
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';

import type { Place, RecentDestination } from '@/core/domain/entities/place';
import { PLACE_ICONS } from '@/features/search/placeIcons';
import { AppText, Divider, GlassPanel, ListRow, PressableScale, SectionHeader } from '@/ui/components';
import { colors, spacing } from '@/ui/theme';
import { SearchTrigger } from './SearchTrigger';
import { SavedPlacesDock } from './SavedPlacesDock';

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
}: HomeSheetProps) => {
  useUiLanguage();
  const [expanded, setExpanded] = useState(false);
  const navigation = useNavigation();
  return (
  <GlassPanel style={styles.sheet}>
    <PressableScale accessibilityRole="button" accessibilityLabel={expanded ? t('Collapse recent destinations') : t('Show recent destinations')} onPress={() => setExpanded(!expanded)}><View style={styles.grabber} /></PressableScale>

    <View style={styles.body}>
      <SearchTrigger onPress={onSearchPress} />
      {expanded ? <SavedPlacesDock onNavigate={onRecentPress} /> : null}
      <View style={styles.shortcuts}>
        {['Fuel', 'Food', 'Parking'].map(label => <PressableScale key={label} style={styles.shortcut} accessibilityRole="button" onPress={() => navigation.navigate('Nearby', { category: label === 'Fuel' ? 'fuel' : label === 'Food' ? 'restaurants' : 'parking' })}><AppText variant="subhead" tone="accent">{t(label)}</AppText></PressableScale>)}
      </View>

      {locationError ? (
        <ListRow
          title={t("Turn on location")}
          subtitle={locationError}
          icon="locate-outline"
          iconTone="danger"
          onPress={onEnableLocation}
        />
      ) : null}

      {recents.length > 0 && expanded ? (
        <View style={styles.recents}>
          <SectionHeader
            title={t("Recent")}
            actionLabel={t("Clear")}
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
      ) : recents.length > 0 ? (
        <PressableScale accessibilityRole="button" onPress={() => setExpanded(true)}><AppText variant="footnote" tone="secondary">{t("Recent destinations ·")} {recents.length}</AppText></PressableScale>
      ) : (
        <PressableScale onPress={() => setExpanded(!expanded)} accessibilityRole="button"><AppText variant="caption" tone="secondary">{t(expanded ? 'Hide saved places' : 'Home, Work & saved places')}</AppText></PressableScale>
      )}
    </View>
  </GlassPanel>
); };

const styles = StyleSheet.create({
  sheet: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  shortcuts: { flexDirection: 'row', gap: spacing.xs },
  shortcut: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: 14, backgroundColor: colors.surfaceElevated },
  grabber: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#C5D4D8',
  },
  body: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
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
