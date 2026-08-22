import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import { Banner, Button, Field, Screen, Text } from '@/components/ui';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useAuth } from '@/state/AuthProvider';

export default function ProfileSettings() {
  const theme = useTheme();
  const router = useRouter();
  const profile = useProfile();
  const update = useUpdateProfile();
  const { session } = useAuth();
  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile.data?.full_name) setName(profile.data.full_name);
  }, [profile.data?.full_name]);

  return (
    <Screen>
      <View style={{ gap: theme.spacing.lg }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
          <Feather name="chevron-left" size={24} color={theme.colors.text} />
        </Pressable>
        <Text variant="title1">Profile</Text>

        {saved ? <Banner tone="success" title="Saved" onDismiss={() => setSaved(false)} /> : null}

        <Field label="Name" value={name} onChangeText={setName} placeholder="Your name" />
        <Field
          label="Email"
          value={session?.user?.email ?? ''}
          editable={false}
          hint="Contact support to change the email on your account."
        />
        <Field
          label="Time zone"
          value={Intl.DateTimeFormat().resolvedOptions().timeZone}
          editable={false}
          hint="Taken from your device — your plan follows your local day."
        />

        <Button
          label="Save"
          full
          loading={update.isPending}
          onPress={async () => {
            await update.mutateAsync({
              full_name: name.trim() || null,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            });
            setSaved(true);
          }}
        />
      </View>
    </Screen>
  );
}
