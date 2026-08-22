import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useTheme, useThemePreference } from '@/theme';
import { Card, Screen, Text } from '@/components/ui';
import { OptionField } from '@/components/fields';

export default function Appearance() {
  const theme = useTheme();
  const router = useRouter();
  const { preference, setPreference } = useThemePreference();

  return (
    <Screen>
      <View style={{ gap: theme.spacing.lg }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
          <Feather name="chevron-left" size={24} color={theme.colors.text} />
        </Pressable>
        <Text variant="title1">Appearance</Text>

        <Card>
          <OptionField
            label="Theme"
            value={preference}
            options={[
              { value: 'system' as const, label: 'System' },
              { value: 'light' as const, label: 'Light' },
              { value: 'dark' as const, label: 'Dark' },
            ]}
            onChange={setPreference}
          />
        </Card>

        <Card tone="alt" elevated={false}>
          <Text variant="subhead">Reduced motion</Text>
          <Text variant="footnote" color="secondary" style={{ marginTop: 6 }}>
            {theme.reduceMotion
              ? 'Your device asks for reduced motion, so animations are switched off here.'
              : 'Following your device setting. Turn on Reduce Motion in accessibility settings and animations stop.'}
          </Text>
        </Card>
      </View>
    </Screen>
  );
}
