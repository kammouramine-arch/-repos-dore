import React from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import { Button, Card, Row, Screen, SectionHeader, Text } from '@/components/ui';
import { useProfile } from '@/hooks/useProfile';
import { useEntitlements } from '@/hooks/useEntitlements';
import { signOut } from '@/services/auth';
import { brand } from '@/config/brand';

export default function Settings() {
  const theme = useTheme();
  const router = useRouter();
  const profile = useProfile();
  const { plan, isTrial } = useEntitlements();

  return (
    <Screen>
      <View style={{ gap: theme.spacing.lg }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
          <Feather name="chevron-left" size={24} color={theme.colors.text} />
        </Pressable>

        <Text variant="title1">Settings</Text>

        <Card onPress={() => router.push('/settings/profile')} accessibilityLabel="Profile">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.base }}>
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 23,
                backgroundColor: theme.colors.accentSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text variant="title3" color="accent">
                {(profile.data?.full_name ?? '?').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{profile.data?.full_name ?? 'Your profile'}</Text>
              <Text variant="footnote" color="tertiary">
                {plan.tier === 'free' ? 'Free plan' : `${brand.name} ${plan.name}`}
                {isTrial ? ' · trial' : ''}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={theme.colors.textTertiary} />
          </View>
        </Card>

        <View>
          <SectionHeader title="Your planner" />
          <Card padded={false} style={{ paddingHorizontal: theme.spacing.base }}>
            <Row icon="cpu" label="AI preferences" onPress={() => router.push('/settings/ai')} />
            <Row icon="clock" label="Planning preferences" onPress={() => router.push('/settings/planning')} />
            <Row icon="database" label="AI memory" onPress={() => router.push('/settings/memory')} />
            <Row icon="bell" label="Notifications" onPress={() => router.push('/settings/notifications')} last />
          </Card>
        </View>

        <View>
          <SectionHeader title="App" />
          <Card padded={false} style={{ paddingHorizontal: theme.spacing.base }}>
            <Row icon="moon" label="Appearance" onPress={() => router.push('/settings/appearance')} />
            <Row icon="calendar" label="Calendar integrations" onPress={() => router.push('/settings/integrations')} />
            <Row
              icon="star"
              label="Your plan"
              value={plan.name}
              onPress={() => router.push('/settings/subscription')}
            />
            <Row icon="shield" label="Privacy & data" onPress={() => router.push('/settings/privacy')} />
            <Row icon="help-circle" label="Help" onPress={() => router.push('/settings/help')} last />
          </Card>
        </View>

        <Button
          label="Sign out"
          variant="secondary"
          full
          onPress={() =>
            Alert.alert('Sign out?', 'Your plan stays safe in your account.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Sign out',
                onPress: async () => {
                  await signOut();
                  router.replace('/');
                },
              },
            ])
          }
        />

        <Text variant="caption" color="tertiary" align="center">
          {brand.name} · version 1.0.0
        </Text>
      </View>
    </Screen>
  );
}
