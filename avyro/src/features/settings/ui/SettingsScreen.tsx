import { t, useUiLanguage } from '@/ui/i18n';
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
  useUiLanguage();
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
        <ScreenHeader title={t("Settings")} onBack={() => navigation.goBack()} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AccountCard user={session?.user ?? null} />
        {!session ? <SettingsSection title={t("Optional account")}><ListRow title={t("Sign in or create an account")} subtitle={t("The map, saved places and voice work without an account")} icon="person-outline" onPress={() => navigation.navigate('Login')} /></SettingsSection> : null}

        <SettingsSection title={t("Appearance & language")}>
          <ChoiceRow title={t("Driving perspective")} options={[{value:'flat' as const,label:'2D'},{value:'perspective' as const,label:'3D'}]} value={preferences.mapPerspective} onChange={mapPerspective => void update({mapPerspective})} />
          <ChoiceRow title={t("Appearance")} options={[{value:'system' as const,label:t("System")},{value:'light' as const,label:t("Light")},{value:'dark' as const,label:t("Dark")}]} value={preferences.appearance} onChange={appearance => void update({appearance})} />
          <ChoiceRow title={t("Interface language")} subtitle={t("Interface and speech languages are independent. Untranslated text falls back to English.")} options={[{value:'system' as const,label:t("System")},{value:'en' as const,label:'English'},{value:'fr' as const,label:'Français'}]} value={preferences.interfaceLanguage} onChange={interfaceLanguage => void update({interfaceLanguage})} />
        </SettingsSection>
        <SettingsSection title={t("Driver & routes")}>
          <ToggleRow title={t("France · Permis probatoire")} subtitle={t("Applies reduced maxima only when France and the legal road category are known. Lower posted limits always win. Motorway category data is currently unavailable, so automatic adjustment there is unavailable.")} subtitleLines={0} value={preferences.probationaryFrance} onChange={probationaryFrance => void update({ probationaryFrance })} />
          <ChoiceRow title={t("Vehicle")} subtitle={t("Motorcycle routing is a provider beta; restriction coverage varies. Passenger-car speed data is hidden in motorcycle mode.")} options={[{ value: 'car' as const, label: t("Car") }, { value: 'motorcycle' as const, label: t("Motorcycle") }]} value={preferences.vehicleType} onChange={vehicleType => void update({ vehicleType })} />
          <ToggleRow title={t("Avoid tolls")} subtitle={t("Applied to the next route calculation; the provider may require unavoidable sections")} value={preferences.avoidTolls} onChange={avoidTolls => void update({ avoidTolls })} />
          <ToggleRow title={t("Avoid motorways")} subtitle={t("Applied to the next route calculation")} value={preferences.avoidMotorways} onChange={avoidMotorways => void update({ avoidMotorways })} />
          {preferences.vehicleType === 'motorcycle' ? <ToggleRow title={t("Rain touch protection")} subtitle={t("Adds a manual lock button while navigating. Hold Unlock for 3 seconds to release; backgrounding also unlocks. Voice remains available.")} value={preferences.rainProtection} onChange={rainProtection => void update({ rainProtection })} /> : null}
        </SettingsSection>
        <SettingsSection title={t("Voice & guidance")}>
          <ToggleRow
            title={t("Voice guidance")}
            subtitle={t("Spoken instructions before every maneuver")}
            value={preferences.voiceGuidance}
            onChange={(value) => void update({ voiceGuidance: value })}
          />
          <ToggleRow
            title={t("Voice commands")}
            subtitle={`Hands-free “${displayWakePhrase()}” while meepmeep is open`}
            value={preferences.voiceCommands}
            onChange={(value) => void update({ voiceCommands: value })}
          />
          <ChoiceRow title={t("Voice language")} options={[{ value: 'bilingual' as const, label: 'FR + EN' }, { value: 'fr-FR' as const, label: 'Français' }, { value: 'en-US' as const, label: 'English' }]} value={preferences.voiceLanguage} onChange={value => void update({ voiceLanguage: value })} />
          <ListRow title={t("Offline wake detector")} subtitle={t("Dedicated on-device keyword spotting. Hands-free works only while the app is open. Tap the microphone if unavailable.")} />
          <ListRow title={t("Spoken voice")} subtitle={voices.find(v => v.identifier === preferences.preferredVoice)?.name ?? 'Automatic enhanced voice, when installed'} onPress={() => setShowVoices(!showVoices)} />
          {showVoices ? <View><ListRow title={t("Automatic")} onPress={() => { void update({ preferredVoice: null }); setShowVoices(false); }} />{voices.map(voice => <ListRow key={voice.identifier} title={voice.name} subtitle={`${voice.language} · ${voice.quality}`} onPress={() => { void update({ preferredVoice: voice.identifier }); setShowVoices(false); }} />)}</View> : null}
          <ToggleRow title={t("Cloud command assistant")} subtitleLines={0} subtitle={t("Optionally send one spoken command to meepmeep’s Cloudflare AI service when on-device command matching cannot understand it. Ambient listening stays on your iPhone.")} value={preferences.cloudAssistant} onChange={value => void update({ cloudAssistant: value })} />
          <ToggleRow title={t("AI speech recognition")} subtitleLines={0} subtitle={t("Send only the short command you speak after wake-up to Cloudflare’s Whisper model. English/French auto-detection, free testing cap, offline fallback. Ambient audio is never uploaded.")} value={preferences.cloudSpeech} onChange={value => void update({ cloudSpeech: value })} />
          {/*
            Guarded here rather than inside the note: a child that renders null
            still counts as a row, and `SettingsSection` would draw a divider
            above the nothing it produced.
          */}
          {preferences.voiceCommands && voice.message ? (
            <VoiceStatusNote status={voice.status} message={voice.message} />
          ) : null}
          <ToggleRow
            title={t("Haptics")}
            subtitle={t("A pulse as each turn comes up")}
            value={preferences.hapticFeedback}
            onChange={(value) => void update({ hapticFeedback: value })}
          />
          <ToggleRow
            title={t("Keep screen on")}
            subtitle={t("Stay awake during navigation or hands-free listening")}
            value={preferences.keepScreenAwake}
            onChange={(value) => void update({ keepScreenAwake: value })}
          />
          <ChoiceRow
            title={t("Distances")}
            options={UNIT_OPTIONS}
            value={preferences.distanceUnit}
            onChange={(value) => void update({ distanceUnit: value })}
          />
        </SettingsSection>

        <SettingsSection title={t("Map")}>
          {roadDataProvider.isConfigured() ? <ToggleRow
            title={t("Road information")}
            subtitle={t("Share recent GPS fixes with meepmeep’s Cloudflare service and TomTom to check mapped speed limits. Road signs take priority.")}
            value={preferences.roadInformation}
            onChange={(value) => void update({ roadInformation: value })}
          /> : <ListRow title={t("Road information")} subtitle={t("Licensed road data is not connected yet")} />}
          <ChoiceRow
            title={t("Style")}
            options={MAP_OPTIONS}
            value={preferences.mapStyle}
            onChange={(value) => void update({ mapStyle: value })}
          />
          <ToggleRow
            title={t("Live traffic")}
            subtitle={t("Colour roads by current conditions")}
            value={preferences.showTraffic}
            onChange={(value) => void update({ showTraffic: value })}
          />
        </SettingsSection>

        {/* TEMPORARY — remove with the rest of the voice diagnostics. */}
        {preferences.voiceCommands ? (
          <SettingsSection title={t("Voice diagnostics")}>
            <ListRow title={t("Troubleshoot voice")} subtitle={t("Check listening status if the microphone does not respond")} onPress={() => setShowDiagnostics(!showDiagnostics)} />
            {showDiagnostics ? <VoiceDiagnosticsPanel entries={diagnostics} onClear={clearVoiceDebug} /> : null}
          </SettingsSection>
        ) : null}

        <SettingsSection title={t("About")}>
          <ListRow title={t("Version")} trailing={<AppText variant="callout" tone="tertiary">{APP_INFO.version}</AppText>} />
          <ListRow
            title={t("What meepmeep is")}
            subtitle={APP_INFO.mission}
            icon="sparkles-outline"
            iconTone="accent"
          />
        </SettingsSection>

        {session ? <Button label={t("Sign out")} variant="danger" onPress={() => void signOut()} /> : null}
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
