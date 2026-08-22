import React, { useState } from 'react';
import { Alert, Linking, Pressable, Share, View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import { Banner, Button, Card, Row, Screen, SectionHeader, Text } from '@/components/ui';
import { usePreferences, useUpdatePreferences } from '@/hooks/useProfile';
import { deleteAccount, exportData } from '@/services/auth';
import { setAnalyticsEnabled } from '@/services/analytics';
import { brand, brandLink } from '@/config/brand';

export default function Privacy() {
  const theme = useTheme();
  const router = useRouter();
  const preferences = usePreferences();
  const update = useUpdatePreferences();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Screen>
      <View style={{ gap: theme.spacing.lg }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
          <Feather name="chevron-left" size={24} color={theme.colors.text} />
        </Pressable>
        <Text variant="title1">Privacy & data</Text>

        {error ? <Banner tone="danger" title="That did not work" body={error} /> : null}

        <Card tone="alt" elevated={false}>
          <Text variant="subhead">What we hold</Text>
          <Text variant="footnote" color="secondary" style={{ marginTop: 8 }}>
            Your plans, goals, habits, reflections and conversations, stored in your own
            account. Row level security means no other user can read them. Conversations
            are sent to the model provider to generate replies; they are not used to train
            anyone&apos;s model, and analytics never includes what you wrote.
          </Text>
        </Card>

        <View>
          <SectionHeader title="Controls" />
          <Card padded={false} style={{ paddingHorizontal: theme.spacing.base }}>
            <Row
              icon="bar-chart-2"
              label="Product analytics"
              toggle={preferences.data?.analytics_enabled ?? true}
              onToggle={(analytics_enabled) => {
                setAnalyticsEnabled(analytics_enabled);
                update.mutate({ analytics_enabled });
              }}
            />
            <Row icon="database" label="AI memory" onPress={() => router.push('/settings/memory')} last />
          </Card>
        </View>

        <Button
          label="Export my data"
          variant="secondary"
          full
          loading={busy}
          onPress={async () => {
            setBusy(true);
            setError(null);
            try {
              const data = await exportData();
              const json = JSON.stringify(data, null, 2);
              await Share.share({
                title: `${brand.name} data export`,
                message: json.length > 300_000 ? json.slice(0, 300_000) : json,
              });
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Export failed.');
            } finally {
              setBusy(false);
            }
          }}
        />

        {brandLink('privacyUrl') ? (
          <Button
            label="Privacy policy"
            variant="ghost"
            full
            onPress={() => Linking.openURL(brandLink('privacyUrl') as string)}
          />
        ) : null}

        <Button
          label="Delete my account"
          variant="danger"
          full
          onPress={() =>
            Alert.alert(
              'Delete your account?',
              'Everything — plans, goals, habits, conversations — is permanently deleted. This cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete permanently',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteAccount();
                      router.replace('/');
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'Could not delete the account.');
                    }
                  },
                },
              ],
            )
          }
        />
      </View>
    </Screen>
  );
}
