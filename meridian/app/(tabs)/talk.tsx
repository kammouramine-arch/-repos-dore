import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import { AIOrb, Banner, Text } from '@/components/ui';
import { ConversationView } from '@/components/ConversationView';
import { useConversation } from '@/hooks/useConversation';
import { useEntitlement } from '@/hooks/useEntitlement';
import type { AiMode } from '@/services/ai';
import { brand } from '@/config/brand';

const MODE_TITLES: Record<string, string> = {
  chat: 'Talk',
  plan_day: 'Plan my day',
  plan_week: 'Plan my week',
  ninety_day: '90-day plan',
};

/**
 * The main conversation. Opening it with ?mode=plan_day (or plan_week, ninety_day)
 * starts the same assistant in a specific working mode.
 */
export default function Talk() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode = (params.mode ?? 'chat') as AiMode;
  const entitlement = useEntitlement();

  const autoStart =
    mode === 'plan_day'
      ? 'Plan my day.'
      : mode === 'plan_week'
        ? 'Plan my week.'
        : mode === 'ninety_day'
          ? 'Build my 90-day plan.'
          : undefined;

  const conversation = useConversation({
    kind: mode === 'chat' ? 'general' : 'planning',
    mode,
    autoStart,
  });

  const [showLimit, setShowLimit] = useState(false);
  useEffect(() => {
    setShowLimit(!entitlement.canSendMessage);
  }, [entitlement.canSendMessage]);

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
            ? ["I don't know what to do", 'Plan my day', 'I want to change something']
            : conversation.suggestions
        }
        disabled={!entitlement.canSendMessage}
        placeholder={
          entitlement.canSendMessage ? 'Tell me what is going on…' : 'Daily limit reached'
        }
        header={
          <View style={{ gap: theme.spacing.base, paddingBottom: theme.spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                <AIOrb size={30} state={conversation.thinking ? 'thinking' : 'idle'} />
                <View>
                  <Text variant="title3">{MODE_TITLES[mode] ?? brand.aiName}</Text>
                  {!entitlement.isPro ? (
                    <Text variant="caption" color="tertiary">
                      {entitlement.remainingMessages} message
                      {entitlement.remainingMessages === 1 ? '' : 's'} left today
                    </Text>
                  ) : null}
                </View>
              </View>
              <Pressable
                onPress={() => void conversation.startNew()}
                accessibilityRole="button"
                accessibilityLabel="Start a new conversation"
                hitSlop={10}
              >
                <Feather name="edit" size={18} color={theme.colors.textTertiary} />
              </Pressable>
            </View>

            {showLimit ? (
              <Banner
                tone="warning"
                title="You have used today's conversations"
                body="Pro removes the daily limit and unlocks weekly and 90-day planning."
                actionLabel="See Pro"
                onAction={() => router.push('/paywall')}
                onDismiss={() => setShowLimit(false)}
              />
            ) : null}

            {conversation.messages.length === 0 && !conversation.loading ? (
              <View style={{ gap: theme.spacing.sm, paddingTop: theme.spacing.lg }}>
                <Text variant="title2">Where are you right now?</Text>
                <Text variant="body" color="secondary">
                  Tell me what happened, what changed, or what you are stuck on. I will
                  work out what it means for your plan.
                </Text>
              </View>
            ) : null}
          </View>
        }
      />
    </View>
  );
}
