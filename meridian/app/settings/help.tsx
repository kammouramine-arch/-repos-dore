import React from 'react';
import { Linking, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import { Card, Row, Screen, SectionHeader, Text } from '@/components/ui';
import { brand } from '@/config/brand';

const EXAMPLES = [
  '“Plan my day.”',
  '“My whole day changed — I have three hours instead of eight.”',
  '“I want to save €10,000 by June.”',
  '“I don\'t know what to focus on.”',
  '“Move my gym session to tomorrow.”',
  '“I got nothing done today.”',
  '“I want to completely change my life in the next 90 days.”',
];

export default function Help() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <Screen>
      <View style={{ gap: theme.spacing.lg }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
          <Feather name="chevron-left" size={24} color={theme.colors.text} />
        </Pressable>
        <Text variant="title1">Help</Text>

        <View>
          <SectionHeader title="Things you can just say" />
          <Card>
            <View style={{ gap: 10 }}>
              {EXAMPLES.map((example) => (
                <Text key={example} variant="body" color="secondary">
                  {example}
                </Text>
              ))}
            </View>
          </Card>
        </View>

        <View>
          <SectionHeader title="Good to know" />
          <Card>
            <Text variant="body">
              {brand.aiName} only claims something is done when it actually happened — each
              action shows as a receipt under its message. Deleting things and
              restructuring a whole day or week always asks you first.
            </Text>
          </Card>
        </View>

        <Card padded={false} style={{ paddingHorizontal: theme.spacing.base }}>
          <Row icon="mail" label="Contact support" onPress={() => Linking.openURL(`mailto:${brand.supportEmail}`)} />
          <Row icon="shield" label="Privacy policy" onPress={() => Linking.openURL(brand.privacyUrl)} />
          <Row icon="file-text" label="Terms" onPress={() => Linking.openURL(brand.termsUrl)} last />
        </Card>
      </View>
    </Screen>
  );
}
