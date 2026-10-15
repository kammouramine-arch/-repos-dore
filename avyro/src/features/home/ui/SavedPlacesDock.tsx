import { t, useUiLanguage } from '@/ui/i18n';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useServices } from '@/app/runtime/AppRuntime';
import type { SavedPlaceSlot } from '@/core/domain/entities/conversation';
import type { Place } from '@/core/domain/entities/place';
import { AppText, PressableScale } from '@/ui/components';
import { Icon } from '@/ui/components/Icon';
import { colors, spacing } from '@/ui/theme';

export const SavedPlacesDock = ({ onNavigate }: { onNavigate(place: Place): void }) => {
  useUiLanguage();
  const { savedPlacesRepository } = useServices();
  const navigation = useNavigation();
  const [saved, setSaved] = useState<Partial<Record<SavedPlaceSlot, Place>>>({});
  useFocusEffect(useCallback(() => {
    let active = true;
    void Promise.all([savedPlacesRepository.get('home'), savedPlacesRepository.get('work')]).then(([home, work]) => {
      if (active) setSaved({ home: home ?? undefined, work: work ?? undefined });
    }).catch(() => { if (active) Alert.alert(t('Saved places unavailable'), t('Please try again.')); });
    return () => { active = false; };
  }, [savedPlacesRepository]));
  return <View style={styles.row}>{(['home', 'work'] as const).map(slot => <PressableScale key={slot}
    accessibilityRole="button" accessibilityLabel={saved[slot] ? `Navigate to ${slot}` : `Save ${slot} address`} accessibilityHint={t("Hold to edit this address")}
    onPress={() => { const place = saved[slot]; if (place) onNavigate(place); else navigation.navigate('Search', { saveSlot: slot }); }}
    onLongPress={() => navigation.navigate('Search', { saveSlot: slot })} style={styles.tile}>
      <Icon name={slot === 'home' ? 'home-outline' : 'briefcase-outline'} size={21} color={colors.accent} />
      <View style={styles.copy}><AppText variant="subhead">{slot === 'home' ? t('Home') : t('Work')}</AppText><AppText variant="caption" tone="secondary" numberOfLines={1}>{saved[slot]?.name ?? t('Add address')}</AppText></View>
      <Icon name={saved[slot] ? 'arrow-forward' : 'add'} size={16} color={colors.textSecondary} />
  </PressableScale>)}</View>;
};
const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: spacing.sm }, tile: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: 18, padding: spacing.sm, backgroundColor: colors.surfaceElevated }, copy: { flex: 1, gap: 2 } });
