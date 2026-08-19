import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import { AIOrb, Text } from '@/components/ui';
import { ConversationView } from '@/components/ConversationView';
import { useConversation } from '@/hooks/useConversation';
import { useTasksForDate } from '@/hooks/usePlanner';
import { track } from '@/services/analytics';
import { todayISO } from '@/utils/date';

/**
 * The end-of-day reset. The user talks about the day; the assistant records the
 * reflection, ticks off what was done, and reshapes tomorrow instead of piling on.
 */
export default function DailyReset() {
  const theme = useTheme();
  const router = useRouter();
  const tasks = useTasksForDate(todayISO());
  const conversation = useConversation({ kind: 'daily_reset', mode: 'daily_reset' });

  const done = (tasks.data ?? []).filter((t) => t.status === 'done').length;
  const open = (tasks.data ?? []).filter((t) => t.status === 'todo').length;

  React.useEffect(() => {
    if (conversation.messages.some((m) => (m.actions ?? []).some((a) => a.tool === 'create_reflection' && a.status === 'succeeded'))) {
      track('daily_reset_completed');
    }
  }, [conversation.messages]);

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
            ? ['Good day, got most of it done', 'I got nothing done', 'Busier than expected']
            : conversation.suggestions
        }
        placeholder="How did today actually go?"
        header={
          <View style={{ gap: theme.spacing.base, paddingBottom: theme.spacing.lg }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AIOrb size={30} state={conversation.thinking ? 'thinking' : 'idle'} />
              <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
                <Feather name="x" size={22} color={theme.colors.textTertiary} />
              </Pressable>
            </View>

            {conversation.messages.length === 0 ? (
              <View style={{ gap: theme.spacing.sm, paddingTop: theme.spacing.md }}>
                <Text variant="overline" color="accent">
                  DAILY RESET
                </Text>
                <Text variant="display">How did today go?</Text>
                <Text variant="body" color="secondary">
                  {done + open === 0
                    ? 'Nothing was planned today. Tell me what happened anyway — it shapes tomorrow.'
                    : `You finished ${done} of ${done + open}. Say it in your own words — I will sort out what it means for tomorrow.`}
                </Text>
                <Text variant="footnote" color="tertiary">
                  A day that did not go to plan is information about the plan.
                </Text>
              </View>
            ) : null}
          </View>
        }
      />
    </View>
  );
}
