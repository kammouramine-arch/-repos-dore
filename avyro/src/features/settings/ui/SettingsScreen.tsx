import { useNavigation } from '@react-navigation/native';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  useAuthStore,
  useConversationStore,
  usePreferencesStore,
} from '@/app/stores/hooks';
import { APP_INFO } from '@/config';
import { displayWakePhrase } from '@/core/conversation/wakePhrase';
import type { DistanceUnit, MapStyle } from '@/core/domain/entities/preferences';
import {
  AppText,
  Button,
  ListRow,
  Screen,
  ScreenHeader,
  ToggleRow,
} from '@/ui/components';
import { spacing } from '@/ui/theme';
import { AccountCard } from './AccountCard';
import { ChoiceRow } from './ChoiceRow';
import { SettingsSection } from './SettingsSection';
import { VoiceStatusNote } from './VoiceStatusNote';

const UNIT_OPTIONS = [
  { value: 'metric' as DistanceUnit, label: 'Kilometres' },
  { value: 'imperial' as DistanceUnit, label: 'Miles' },
];

const MAP_OPTIONS = [
  { value: 'standard' as MapStyle, label: 'Standard' },
  { value: 'satellite' as MapStyle, label: 'Satellite' },
];

export const SettingsScreen = () => {
  const navigation = useNavigation();
  const session = useAuthStore((state) => state.session);
  const signOut = useAuthStore((state) => state.signOut);
  const { preferences, update } = usePreferencesStore();
  const voice = useConversationStore((state) => state.voice);

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <ScreenHeader title="Settings" onBack={() => navigation.goBack()} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AccountCard user={session?.user ?? null} />

        <SettingsSection title="Guidance">
          <ToggleRow
            title="Voice guidance"
            subtitle="Spoken instructions before every maneuver"
            value={preferences.voiceGuidance}
            onChange={(value) => void update({ voiceGuidance: value })}
          />
          <ToggleRow
            title="Voice commands"
            subtitle={`Listen for “${displayWakePhrase()}” while driving`}
            value={preferences.voiceCommands}
            onChange={(value) => void update({ voiceCommands: value })}
          />
          {/*
            Guarded here rather than inside the note: a child that renders null
            still counts as a row, and `SettingsSection` would draw a divider
            above the nothing it produced.
          */}
          {preferences.voiceCommands && voice.message ? (
            <VoiceStatusNote status={voice.status} message={voice.message} />
          ) : null}
          <ToggleRow
            title="Haptics"
            subtitle="A pulse as each turn comes up"
            value={preferences.hapticFeedback}
            onChange={(value) => void update({ hapticFeedback: value })}
          />
          <ToggleRow
            title="Keep screen on"
            subtitle="Stay awake while a trip is running"
            value={preferences.keepScreenAwake}
            onChange={(value) => void update({ keepScreenAwake: value })}
          />
          <ChoiceRow
            title="Distances"
            options={UNIT_OPTIONS}
            value={preferences.distanceUnit}
            onChange={(value) => void update({ distanceUnit: value })}
          />
        </SettingsSection>

        <SettingsSection title="Map">
          <ChoiceRow
            title="Style"
            options={MAP_OPTIONS}
            value={preferences.mapStyle}
            onChange={(value) => void update({ mapStyle: value })}
          />
          <ToggleRow
            title="Live traffic"
            subtitle="Colour roads by current conditions"
            value={preferences.showTraffic}
            onChange={(value) => void update({ showTraffic: value })}
          />
        </SettingsSection>

        <SettingsSection title="About">
          <ListRow title="Version" trailing={<AppText variant="callout" tone="tertiary">{APP_INFO.version}</AppText>} />
          <ListRow
            title="What Avyro is"
            subtitle={APP_INFO.mission}
            icon="sparkles-outline"
            iconTone="accent"
          />
        </SettingsSection>

        <Button label="Sign out" variant="danger" onPress={() => void signOut()} />
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.md,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
});
