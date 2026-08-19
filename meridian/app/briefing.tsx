import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import { AIOrb, Banner, Button, Card, Screen, Text } from '@/components/ui';
import { TaskRow } from '@/components/TaskRow';
import { EventRow } from '@/components/EventRow';
import { generateMorningBrief } from '@/services/ai';
import { useDailyPlan, useEventsForDate, useTaskActions, useTasksForDate } from '@/hooks/usePlanner';
import { AppError } from '@/lib/errors';
import { greeting, todayISO } from '@/utils/date';
import { pickFocus } from '@/utils/planning';

/**
 * The morning briefing. It is generated on the server and stored on today's plan, so
 * what you read here is the same text the rest of the app works from.
 */
export default function Briefing() {
  const theme = useTheme();
  const router = useRouter();
  const today = todayISO();
  const plan = useDailyPlan(today);
  const tasks = useTasksForDate(today);
  const events = useEventsForDate(today);
  const actions = useTaskActions(today);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      await generateMorningBrief();
      await plan.refetch();
    } catch (e) {
      setError(e instanceof AppError ? e.message : 'Could not generate a briefing.');
    } finally {
      setGenerating(false);
    }
  };

  // Generate once if today has no plan yet — otherwise show what already exists.
  useEffect(() => {
    if (!plan.isLoading && !plan.data && !generating && !error) void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.isLoading, plan.data]);

  const focus = pickFocus(tasks.data ?? [], today);

  return (
    <Screen>
      <View style={{ gap: theme.spacing.xl }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <AIOrb size={30} state={generating ? 'thinking' : 'idle'} />
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
            <Feather name="x" size={22} color={theme.colors.textTertiary} />
          </Pressable>
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="overline" color="accent">
            {greeting().toUpperCase()}
          </Text>
          <Text variant="display">Your day, in seconds.</Text>
        </View>

        {error ? (
          <Banner tone="danger" title="No briefing right now" body={error} actionLabel="Try again" onAction={generate} />
        ) : null}

        <Card>
          {generating && !plan.data ? (
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <ActivityIndicator color={theme.colors.accent} />
              <Text variant="callout" color="secondary">
                Reading your day…
              </Text>
            </View>
          ) : plan.data?.summary ? (
            <Text variant="body">{plan.data.summary}</Text>
          ) : plan.data?.headline ? (
            <Text variant="body">{plan.data.headline}</Text>
          ) : (
            <Text variant="body" color="secondary">
              No briefing yet for today.
            </Text>
          )}
        </Card>

        {(events.data?.length ?? 0) > 0 ? (
          <Card>
            <Text variant="overline" color="tertiary">
              FIXED TODAY
            </Text>
            {(events.data ?? []).map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </Card>
        ) : null}

        {focus.length > 0 ? (
          <Card>
            <Text variant="overline" color="tertiary">
              WHAT MATTERS
            </Text>
            {focus.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onToggle={(done) => actions.complete.mutate({ id: task.id, done })}
              />
            ))}
          </Card>
        ) : null}

        <View style={{ gap: theme.spacing.sm }}>
          <Button label="Regenerate briefing" variant="secondary" full loading={generating} onPress={generate} />
          <Button label="Adjust my day" full onPress={() => router.replace('/(tabs)/talk?mode=plan_day')} />
        </View>
      </View>
    </Screen>
  );
}
