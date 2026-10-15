import { useNavigation } from '@react-navigation/native';
import { useServices } from '@/app/runtime/AppRuntime';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useEffect, useState } from 'react';
import * as Speech from 'expo-speech';

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
import { VoiceDiagnosticsPanel } from './VoiceDiagnosticsPanel';
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
  const { roadDataProvider } = useServices();
  const navigation = useNavigation();
  const session = useAuthStore((state) => state.session);
  const signOut = useAuthStore((state) => state.signOut);
  const { preferences, update } = usePreferencesStore();
  const voice = useConversationStore((state) => state.voice);
  // TEMPORARY — see core/conversation/voiceDebug.ts. Remove with the rest.
  const diagnostics = useConversationStore((state) => state.diagnostics);
  const clearVoiceDebug = useConversationStore((state) => state.clearVoiceDebug);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [voices, setVoices] = useState<Speech.Voice[]>([]);
  const [showVoices, setShowVoices] = useState(false);
  useEffect(() => { void Speech.getAvailableVoicesAsync().then(items => setVoices(items.filter(v => /^(fr|en)(-|$)/.test(v.language)))).catch(() => {}); }, []);

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
        {!session ? <SettingsSection title="Optional account"><ListRow title="Sign in or create an account" subtitle="The map, saved places and voice work without an account" icon="person-outline" onPress={() => navigation.navigate('Login')} /></SettingsSection> : null}

        <SettingsSection title="Driver & routes">
          <ToggleRow title="France · Permis probatoire" subtitle="Applies reduced maxima only when France and the legal road category are known. Lower posted limits always win. Motorway category data is currently unavailable, so automatic adjustment there is unavailable." subtitleLines={0} value={preferences.probationaryFrance} onChange={probationaryFrance => void update({ probationaryFrance })} />
          <ChoiceRow title="Vehicle" subtitle="Motorcycle routing is a provider beta; restriction coverage varies. Passenger-car speed data is hidden in motorcycle mode." options={[{ value: 'car' as const, label: 'Car' }, { value: 'motorcycle' as const, label: 'Motorcycle' }]} value={preferences.vehicleType} onChange={vehicleType => void update({ vehicleType })} />
          <ToggleRow title="Avoid tolls" subtitle="Applied to the next route calculation; the provider may require unavoidable sections" value={preferences.avoidTolls} onChange={avoidTolls => void update({ avoidTolls })} />
          <ToggleRow title="Avoid motorways" subtitle="Applied to the next route calculation" value={preferences.avoidMotorways} onChange={avoidMotorways => void update({ avoidMotorways })} />
          {preferences.vehicleType === 'motorcycle' ? <ToggleRow title="Rain touch protection" subtitle="Adds a manual lock button while navigating. Hold Unlock for 3 seconds to release; backgrounding also unlocks. Voice remains available." value={preferences.rainProtection} onChange={rainProtection => void update({ rainProtection })} /> : null}
        </SettingsSection>
        <SettingsSection title="Voice & guidance">
          <ToggleRow
            title="Voice guidance"
            subtitle="Spoken instructions before every maneuver"
            value={preferences.voiceGuidance}
            onChange={(value) => void update({ voiceGuidance: value })}
          />
          <ToggleRow
            title="Voice commands"
            subtitle={`Hands-free “${displayWakePhrase()}” while meepmeep is open`}
            value={preferences.voiceCommands}
            onChange={(value) => void update({ voiceCommands: value })}
          />
          <ChoiceRow title="Voice language" options={[{ value: 'bilingual' as const, label: 'FR + EN' }, { value: 'fr-FR' as const, label: 'Français' }, { value: 'en-US' as const, label: 'English' }]} value={preferences.voiceLanguage} onChange={value => void update({ voiceLanguage: value })} />
          <ListRow title="Offline wake detector" subtitle="Dedicated on-device keyword spotting. Hands-free works only while the app is open. Tap the microphone if unavailable." />
          <ListRow title="Spoken voice" subtitle={voices.find(v => v.identifier === preferences.preferredVoice)?.name ?? 'Automatic enhanced voice, when installed'} onPress={() => setShowVoices(!showVoices)} />
          {showVoices ? <View><ListRow title="Automatic" onPress={() => { void update({ preferredVoice: null }); setShowVoices(false); }} />{voices.map(voice => <ListRow key={voice.identifier} title={voice.name} subtitle={`${voice.language} · ${voice.quality}`} onPress={() => { void update({ preferredVoice: voice.identifier }); setShowVoices(false); }} />)}</View> : null}
          <ToggleRow title="Cloud command assistant" subtitleLines={0} subtitle="Optionally send one spoken command to meepmeep’s Cloudflare AI service when on-device command matching cannot understand it. Ambient listening stays on your iPhone." value={preferences.cloudAssistant} onChange={value => void update({ cloudAssistant: value })} />
          <ToggleRow title="AI speech recognition" subtitleLines={0} subtitle="Send only the short command you speak after wake-up to Cloudflare’s Whisper model. English/French auto-detection, free testing cap, offline fallback. Ambient audio is never uploaded." value={preferences.cloudSpeech} onChange={value => void update({ cloudSpeech: value })} />
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
            subtitle="Stay awake during navigation or hands-free listening"
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
          {roadDataProvider.isConfigured() ? <ToggleRow
            title="Road information"
            subtitle="Share recent GPS fixes with meepmeep’s Cloudflare service and TomTom to check mapped speed limits. Road signs take priority."
            value={preferences.roadInformation}
            onChange={(value) => void update({ roadInformation: value })}
          /> : <ListRow title="Road information" subtitle="Licensed road data is not connected yet" />}
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

        {/* TEMPORARY — remove with the rest of the voice diagnostics. */}
        {preferences.voiceCommands ? (
          <SettingsSection title="Voice diagnostics">
            <ListRow title="Troubleshoot voice" subtitle="Check listening status if the microphone does not respond" onPress={() => setShowDiagnostics(!showDiagnostics)} />
            {showDiagnostics ? <VoiceDiagnosticsPanel entries={diagnostics} onClear={clearVoiceDebug} /> : null}
          </SettingsSection>
        ) : null}

        <SettingsSection title="About">
          <ListRow title="Version" trailing={<AppText variant="callout" tone="tertiary">{APP_INFO.version}</AppText>} />
          <ListRow
            title="What meepmeep is"
            subtitle={APP_INFO.mission}
            icon="sparkles-outline"
            iconTone="accent"
          />
        </SettingsSection>

        {session ? <Button label="Sign out" variant="danger" onPress={() => void signOut()} /> : null}
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
