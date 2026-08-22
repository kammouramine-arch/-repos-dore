import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import { Banner, Card, Screen, SectionHeader, Text } from '@/components/ui';
import { features } from '@/config/features';

const INTEGRATIONS = [
  { key: 'appleCalendar', name: 'Apple Calendar', detail: 'Two-way sync with your device calendar' },
  { key: 'googleCalendar', name: 'Google Calendar', detail: 'Import events and write back changes' },
  { key: 'outlookCalendar', name: 'Outlook', detail: 'Work calendar and meetings' },
  { key: 'appleHealth', name: 'Apple Health', detail: 'Activity and sleep for health goals' },
  { key: 'googleHealthConnect', name: 'Health Connect', detail: 'Android activity and sleep' },
] as const;

/**
 * Integrations are listed with their real state. Nothing here pretends to be connected:
 * the data model already carries a `provider` on every event so these can land later.
 */
export default function Integrations() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <Screen>
      <View style={{ gap: theme.spacing.lg }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
          <Feather name="chevron-left" size={24} color={theme.colors.text} />
        </Pressable>
        <Text variant="title1">Integrations</Text>

        <Banner
          tone="info"
          title="None of these are connected yet"
          body="Your calendar inside this app is real and fully usable. External calendars are not connected, so nothing here will silently change your other tools."
        />

        <View>
          <SectionHeader title="Planned" />
          <Card>
            {INTEGRATIONS.map((integration, index, all) => {
              const enabled = features[integration.key];
              return (
                <View
                  key={integration.key}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingVertical: 13,
                    borderBottomWidth: index === all.length - 1 ? 0 : 1,
                    borderBottomColor: theme.colors.border,
                  }}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="body">{integration.name}</Text>
                    <Text variant="footnote" color="tertiary">
                      {integration.detail}
                    </Text>
                  </View>
                  <Text variant="caption" color={enabled ? 'success' : 'tertiary'}>
                    {enabled ? 'Connected' : 'Not connected'}
                  </Text>
                </View>
              );
            })}
          </Card>
        </View>
      </View>
    </Screen>
  );
}
