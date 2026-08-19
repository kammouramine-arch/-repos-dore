import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import { AIOrb, Banner, Button, Card, Screen, Text } from '@/components/ui';
import { ConversationView } from '@/components/ConversationView';
import { useConversation } from '@/hooks/useConversation';
import { useEntitlement } from '@/hooks/useEntitlement';
import { track } from '@/services/analytics';

/**
 * Life Reset. A deeper conversation than planning: what is wrong, what they want
 * instead, what is non-negotiable — and then a plan rebuilt around that.
 */
export default function LifeReset() {
  const theme = useTheme();
  const router = useRouter();
  const entitlement = useEntitlement();
  const [started, setStarted] = useState(false);
  const conversation = useConversation({ kind: 'life_reset', mode: 'life_reset' });

  if (!entitlement.can('life_reset')) {
    return (
      <Screen>
        <View style={{ gap: theme.spacing.lg, paddingTop: theme.spacing.xl }}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
            <Feather name="x" size={22} color={theme.colors.textTertiary} />
          </Pressable>
          <Text variant="display">Life Reset</Text>
          <Banner
            tone="info"
            title="Part of Pro"
            body="Life Reset rebuilds your goals, habits, weekly structure and first actions in one conversation."
          />
          <Button label="See Pro" full onPress={() => router.replace('/paywall')} />
        </View>
      </Screen>
    );
  }

  if (!started && conversation.messages.length === 0) {
    return (
      <Screen>
        <View style={{ gap: theme.spacing.xl, paddingTop: theme.spacing.xl }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AIOrb size={44} state="idle" />
            <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
              <Feather name="x" size={22} color={theme.colors.textTertiary} />
            </Pressable>
          </View>

          <View style={{ gap: theme.spacing.md }}>
            <Text variant="overline" color="accent">
              LIFE RESET
            </Text>
            <Text variant="display">Start from where you actually are.</Text>
            <Text variant="body" color="secondary">
              This is the longer conversation. We go through what is not working, what you
              want instead, what you cannot change, and what you have already tried. Then I
              rebuild the plan around that — areas, goals, habits, your week, and the first
              things to do.
            </Text>
          </View>

          <Card tone="alt" elevated={false}>
            <Text variant="subhead">Expect to spend ten minutes</Text>
            <Text variant="footnote" color="secondary" style={{ marginTop: 6 }}>
              And expect me to push back. A reset that changes eight things at once
              changes none of them.
            </Text>
          </Card>

          <Button
            label="Begin"
            full
            size="lg"
            onPress={() => {
              track('life_reset_started');
              setStarted(true);
            }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ConversationView
        messages={conversation.messages}
        thinking={conversation.thinking}
        error={conversation.error}
        onSend={conversation.send}
        onResolve={conversation.resolve}
        suggestions={
          conversation.messages.length === 0
            ? ['Everything feels scattered', 'I want to change direction', 'I keep starting over']
            : conversation.suggestions
        }
        placeholder="What is not working?"
        header={
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: theme.spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
              <AIOrb size={30} state={conversation.thinking ? 'thinking' : 'idle'} />
              <Text variant="title3">Life Reset</Text>
            </View>
            <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
              <Feather name="x" size={22} color={theme.colors.textTertiary} />
            </Pressable>
          </View>
        }
      />
    </View>
  );
}
