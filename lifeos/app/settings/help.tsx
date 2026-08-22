import React from 'react';
import { Linking, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import { Card, Row, Screen, SectionHeader, Text } from '@/components/ui';
import { brand, brandLink, supportAddress } from '@/config/brand';

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

        {/* Each row appears only when it actually leads somewhere. */}
        <Card padded={false} style={{ paddingHorizontal: theme.spacing.base }}>
          {supportAddress() ? (
            <Row
              icon="mail"
              label="Contact support"
              onPress={() => Linking.openURL(`mailto:${supportAddress()}`)}
            />
          ) : null}
          {brandLink('privacyUrl') ? (
            <Row
              icon="shield"
              label="Privacy policy"
              onPress={() => Linking.openURL(brandLink('privacyUrl') as string)}
            />
          ) : null}
          {brandLink('termsUrl') ? (
            <Row
              icon="file-text"
              label="Terms"
              onPress={() => Linking.openURL(brandLink('termsUrl') as string)}
              last
            />
          ) : null}
          <Row icon="info" label={`${brand.name} · version 1.0.0`} last />
        </Card>
      </View>
    </Screen>
  );
}
