import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import { AIOrb, Text } from '@/components/ui';
import { ConversationView } from '@/components/ConversationView';
import { useConversation } from '@/hooks/useConversation';
import { useWeek } from '@/hooks/usePlanner';
import { track } from '@/services/analytics';
import { addDays, toISODate, weekStartISO } from '@/utils/date';

/**
 * The weekly review: look back honestly, then set up the week ahead. It ends with a
 * stored reflection and a weekly plan, so the next week starts from something real.
 */
export default function WeeklyReview() {
  const theme = useTheme();
  const router = useRouter();

  const lastWeek = weekStartISO(addDays(new Date(), -7));
  const week = useWeek(lastWeek);
  const conversation = useConversation({ kind: 'weekly_review', mode: 'weekly_review' });

  const tasks = week.tasks.data ?? [];
  const done = tasks.filter((t) => t.status === 'done').length;

  React.useEffect(() => {
    if (
      conversation.messages.some((m) =>
        (m.actions ?? []).some((a) => a.tool === 'create_reflection' && a.status === 'succeeded'),
      )
    ) {
      track('weekly_review_completed');
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
            ? ['Review my week', 'It was a bad week', 'Set up next week']
            : conversation.suggestions
        }
        placeholder="How was the week, really?"
        header={
          <View style={{ gap: theme.spacing.base, paddingBottom: theme.spacing.lg }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AIOrb size={30} state={conversation.thinking ? 'thinking' : 'idle'} />
              <Pressable
                onPress={() => router.back()}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Feather name="x" size={22} color={theme.colors.textTertiary} />
              </Pressable>
            </View>

            {conversation.messages.length === 0 ? (
              <View style={{ gap: theme.spacing.sm, paddingTop: theme.spacing.md }}>
                <Text variant="overline" color="accent">
                  WEEKLY REVIEW
                </Text>
                <Text variant="display">How did the week go?</Text>
                <Text variant="body" color="secondary">
                  {tasks.length === 0
                    ? 'Nothing was scheduled last week. Tell me what happened anyway — it still shapes the next one.'
                    : `You finished ${done} of ${tasks.length} planned items between ${lastWeek} and ${toISODate(addDays(new Date(`${lastWeek}T00:00:00`), 6))}. Say it in your own words and I will set up the week ahead.`}
                </Text>
                <Text variant="footnote" color="tertiary">
                  Fifteen minutes here is worth more than an hour of replanning on Wednesday.
                </Text>
              </View>
            ) : null}
          </View>
        }
      />
    </View>
  );
}
