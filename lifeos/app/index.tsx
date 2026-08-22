import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useTheme } from '@/theme';
import { useAuth } from '@/state/AuthProvider';
import { useProfile } from '@/hooks/useProfile';
import { Banner, Screen, Text } from '@/components/ui';
import { missingConfigMessage } from '@/config/env';
import { brand } from '@/config/brand';

/**
 * Entry gate: unauthenticated users land on the welcome screen, new accounts go to the
 * life interview, everyone else goes home.
 */
export default function Index() {
  const theme = useTheme();
  const { session, initialising, configured } = useAuth();
  const profile = useProfile();

  if (!configured) {
    return (
      <Screen>
        <View style={{ gap: theme.spacing.lg, paddingTop: theme.spacing.xxl }}>
          <Text variant="title1">{brand.name}</Text>
          <Banner tone="warning" title="Configuration needed" body={missingConfigMessage} />
        </View>
      </Screen>
    );
  }

  if (initialising || (session && profile.isLoading && !profile.data)) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/welcome" />;
  if (profile.data && !profile.data.onboarding_completed) {
    return <Redirect href="/(onboarding)/interview" />;
  }
  return <Redirect href="/(tabs)" />;
}
