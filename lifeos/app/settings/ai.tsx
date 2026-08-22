import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import { Banner, Card, Row, Screen, SectionHeader, Text } from '@/components/ui';
import { OptionField } from '@/components/fields';
import { usePreferences, useUpdatePreferences } from '@/hooks/useProfile';
import { features } from '@/config/features';
import { brand } from '@/config/brand';

export default function AiSettings() {
  const theme = useTheme();
  const router = useRouter();
  const preferences = usePreferences();
  const update = useUpdatePreferences();
  const p = preferences.data;

  return (
    <Screen>
      <View style={{ gap: theme.spacing.lg }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
          <Feather name="chevron-left" size={24} color={theme.colors.text} />
        </Pressable>
        <Text variant="title1">Your planner</Text>

        <View>
          <SectionHeader title="Tone" />
          <Card>
            <OptionField
              label=""
              value={p?.ai_tone ?? 'direct'}
              options={[
                { value: 'warm' as const, label: 'Warm' },
                { value: 'direct' as const, label: 'Direct' },
                { value: 'coach' as const, label: 'Coach' },
              ]}
              onChange={(ai_tone) => update.mutate({ ai_tone })}
            />
            <Text variant="footnote" color="tertiary" style={{ marginTop: 10 }}>
              All three are honest with you. Coach pushes hardest on follow-through.
            </Text>
          </Card>
        </View>

        <View>
          <SectionHeader title="Memory & personalisation" />
          <Card padded={false} style={{ paddingHorizontal: theme.spacing.base }}>
            <Row
              icon="database"
              label="Remember things about me"
              toggle={p?.memory_enabled ?? true}
              onToggle={(memory_enabled) => update.mutate({ memory_enabled })}
            />
            <Row icon="list" label="What it remembers" onPress={() => router.push('/settings/memory')} />
            <Row
              icon="mic"
              label="Voice input"
              toggle={p?.voice_enabled ?? true}
              onToggle={(voice_enabled) => update.mutate({ voice_enabled })}
              last
            />
          </Card>
          {!features.voiceCapture ? (
            <Banner
              tone="info"
              title="Voice needs a transcription provider"
              body="See docs/AI.md to configure one; until then the microphone stays disabled."
            />
          ) : null}
        </View>

        <Card tone="alt" elevated={false}>
          <Text variant="subhead">What {brand.aiName} can and cannot do</Text>
          <Text variant="footnote" color="secondary" style={{ marginTop: 8 }}>
            It can create and change goals, tasks, habits, projects, events and plans in
            this app. Deleting things and restructuring a whole day or week always asks you
            first. It has no access to your email, files, external calendars, money, or
            anything outside this app.
          </Text>
        </Card>
      </View>
    </Screen>
  );
}
