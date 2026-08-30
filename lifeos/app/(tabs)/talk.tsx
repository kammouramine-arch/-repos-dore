import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
 * starts the same assistant in a specific working mode; ?conversation=<id> reopens a
 * conversation chosen from history, and ?new=1 starts a fresh one.
 */
export default function Talk() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    mode?: string;
    prompt?: string;
    agent?: string;
    conversation?: string;
    new?: string;
  }>();
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
    conversationId: params.conversation,
  });

  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    setDismissed(false);
  }, [allowance.allowed]);

  const startNew = useCallback(() => {
    // Both are needed: the params must go or the hook reloads the old thread on the
    // next render, and `startNew` marks the intent so the reload does not fall back
    // to the most recent conversation instead.
    router.setParams({ conversation: undefined, new: undefined, prompt: undefined });
    void conversation.startNew();
  }, [conversation, router]);

  // Arriving with ?new=1 (from the history screen) starts a conversation rather than
  // resuming one. The ref makes it a one-shot, so a re-render does not wipe the
  // conversation the user has since begun typing into.
  const consumedNewSignal = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!params.new || consumedNewSignal.current === params.new) return;
    consumedNewSignal.current = params.new;
    void conversation.startNew();
  }, [conversation, params.new]);

  // A limit reported by the server always wins over the local pre-check.
  const limitError =
    conversation.error &&
    (conversation.error.code === 'quota_exceeded' || conversation.error.code === 'not_entitled')
      ? conversation.error
      : null;
  const blocked = !allowance.allowed || Boolean(limitError);
  const quota = entitlements.quota('ai_requests');

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ConversationView
        messages={conversation.messages}
        thinking={conversation.thinking}
        error={limitError ? null : conversation.error}
        onSend={conversation.send}
        onResolve={conversation.resolve}
        onRetry={blocked ? undefined : conversation.retry}
        suggestions={
          conversation.messages.length === 0
            ? ["I don't know what to do", 'Plan my day', 'I want to change something']
            : conversation.suggestions
        }
        disabled={blocked}
        placeholder={blocked ? 'Your AI allowance is used up' : 'Tell me what is going on…'}
        topBar={
          <View
            style={{
              paddingTop: insets.top + theme.spacing.xs,
              paddingHorizontal: theme.spacing.lg,
              paddingBottom: theme.spacing.md,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: theme.spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
              backgroundColor: theme.colors.background,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, flex: 1 }}>
              <AIOrb size={28} state={conversation.thinking ? 'thinking' : 'idle'} />
              <View style={{ flex: 1 }}>
                <Text variant="title3" numberOfLines={1}>
                  {MODE_TITLES[mode] ?? brand.aiName}
                </Text>
                <Text variant="caption" color="tertiary" numberOfLines={1}>
                  {entitlements.plan.name}
                  {quota.fairUse ? '' : ` · ${quota.remaining} left this period`}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg }}>
              <Pressable
                onPress={() => router.push('/chat/history')}
                accessibilityRole="button"
                accessibilityLabel="Your conversations"
                hitSlop={10}
              >
                <Feather name="clock" size={19} color={theme.colors.textSecondary} />
              </Pressable>
              <Pressable
                onPress={startNew}
                accessibilityRole="button"
                accessibilityLabel="Start a new conversation"
                hitSlop={10}
              >
                <Feather name="edit" size={19} color={theme.colors.textSecondary} />
              </Pressable>
            </View>
          </View>
        }
        header={
          <View style={{ gap: theme.spacing.base, paddingBottom: theme.spacing.md }}>
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
                    : !allowance.allowed
                      ? allowance.upgradeTo?.name
                      : null
                }
                resetsAt={entitlements.resetsAt}
                onDismiss={() => setDismissed(true)}
              />
            ) : null}

            {conversation.messages.length === 0 && !conversation.loading ? (
              <View style={{ gap: theme.spacing.sm, paddingTop: theme.spacing.xl }}>
                <Text variant="title2">Where are you right now?</Text>
                <Text variant="body" color="secondary">
                  Tell me what happened, what changed, or what you are stuck on. I will work
                  out what it means for your plan.
                </Text>
              </View>
            ) : null}
          </View>
        }
      />
    </View>
  );
}
