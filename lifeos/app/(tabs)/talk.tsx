import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import { AIOrb, Text } from '@/components/ui';
import { LimitReached } from '@/components/LimitReached';
import { ConversationView } from '@/components/ConversationView';
import { useConversation } from '@/hooks/useConversation';
import { useEntitlements } from '@/hooks/useEntitlements';
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
  const params = useLocalSearchParams<{ mode?: string; prompt?: string; agent?: string }>();
  const mode = (params.mode ?? 'chat') as AiMode;
  const entitlements = useEntitlements();

  const operation =
    mode === 'plan_day' || mode === 'plan_week' || mode === 'ninety_day' ? mode : 'chat';
  // Checked against the same catalogue the server enforces, so the composer can warn
  // before a request is spent rather than after it is refused.
  const allowance = entitlements.canRun(operation);

  // An insight, a shortcut or a deep link can hand the assistant its first sentence.
  const autoStart =
    params.prompt ||
    (mode === 'plan_day'
      ? 'Plan my day.'
      : mode === 'plan_week'
        ? 'Plan my week.'
        : mode === 'ninety_day'
          ? 'Build my 90-day plan.'
          : undefined);

  const conversation = useConversation({
    kind: mode === 'chat' ? 'general' : 'planning',
    mode,
    autoStart,
  });

  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    setDismissed(false);
  }, [allowance.allowed]);

  // A limit reported by the server always wins over the local pre-check.
  const limitError =
    conversation.error && (conversation.error.code === 'quota_exceeded' || conversation.error.code === 'not_entitled')
      ? conversation.error
      : null;
  const blocked = !allowance.allowed || Boolean(limitError);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ConversationView
        messages={conversation.messages}
        thinking={conversation.thinking}
        error={limitError ? null : conversation.error}
        onSend={conversation.send}
        onResolve={conversation.resolve}
        suggestions={
          conversation.messages.length === 0
            ? ["I don't know what to do", 'Plan my day', 'I want to change something']
            : conversation.suggestions
        }
        disabled={blocked}
        placeholder={blocked ? 'Your AI allowance is used up' : 'Tell me what is going on…'}
        header={
          <View style={{ gap: theme.spacing.base, paddingBottom: theme.spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                <AIOrb size={30} state={conversation.thinking ? 'thinking' : 'idle'} />
                <View>
                  <Text variant="title3">{MODE_TITLES[mode] ?? brand.aiName}</Text>
                  <Text variant="caption" color="tertiary">
                    {entitlements.plan.name}
                    {entitlements.quota('ai_requests').fairUse
                      ? ''
                      : ` · ${entitlements.quota('ai_requests').remaining} left this period`}
                  </Text>
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

            {blocked && !dismissed ? (
              <LimitReached
                kind={
                  limitError?.code === 'not_entitled' ||
                  (!allowance.allowed && allowance.reason === 'not_entitled')
                    ? 'not_entitled'
                    : 'quota_exceeded'
                }
                message={limitError?.message}
                upgradeName={
                  limitError && 'upgradeName' in limitError
                    ? (limitError as { upgradeName?: string | null }).upgradeName
                    : (!allowance.allowed ? allowance.upgradeTo?.name : null)
                }
                resetsAt={entitlements.resetsAt}
                onDismiss={() => setDismissed(true)}
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
