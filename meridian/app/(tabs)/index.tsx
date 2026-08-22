import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import {
  AIOrb,
  Banner,
  Button,
  Card,
  EmptyState,
  ProgressRing,
  Screen,
  SectionHeader,
  Skeleton,
  Text,
} from '@/components/ui';
import { TaskRow } from '@/components/TaskRow';
import { EventRow } from '@/components/EventRow';
import { HabitRow } from '@/components/HabitRow';
import { TaskSheet } from '@/components/TaskSheet';
import {
  useDailyPlan,
  useEventsForDate,
  useTaskActions,
  useTasksForDate,
} from '@/hooks/usePlanner';
import { useHabitActions, useHabitLogs, useHabits } from '@/hooks/useHabits';
import { useInsights } from '@/hooks/useInsights';
import { InsightCard } from '@/components/InsightCard';
import { usePreferences, useProfile } from '@/hooks/useProfile';
import { useConnectivity } from '@/state/ConnectivityProvider';
import { dayCompletion, dayLoad, localHeadline, orderDay, pickFocus } from '@/utils/planning';
import { greeting, todayISO } from '@/utils/date';
import type { Task } from '@/types/database';

/** Home — the command centre. Everything here answers "what matters right now?". */
export default function Home() {
  const theme = useTheme();
  const router = useRouter();
  const today = todayISO();

  const profile = useProfile();
  const preferences = usePreferences();
  const tasks = useTasksForDate(today);
  const events = useEventsForDate(today);
  const plan = useDailyPlan(today);
  const habits = useHabits();
  const habitLogs = useHabitLogs(7);
  const actions = useTaskActions(today);
  const habitActions = useHabitActions();
  const { insights, headline: topInsight } = useInsights();
  const { online, pending, sync, syncing } = useConnectivity();

  const [expanded, setExpanded] = useState(false);
  const [sheetTask, setSheetTask] = useState<Task | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const list = tasks.data ?? [];
  const eventList = events.data ?? [];
  const ordered = useMemo(() => orderDay(list, today), [list, today]);
  const focus = useMemo(() => pickFocus(list, today), [list, today]);
  const load = useMemo(
    () => dayLoad(list, eventList, preferences.data ?? null),
    [list, eventList, preferences.data],
  );
  const completion = useMemo(() => dayCompletion(list), [list]);

  const headline =
    plan.data?.headline ?? localHeadline(list, eventList, load);
  const firstName = profile.data?.full_name?.split(' ')[0];
  const loading = tasks.isLoading && !tasks.data;

  const visible = expanded ? ordered : focus;

  return (
    <Screen
      refreshing={tasks.isRefetching}
      onRefresh={() => {
        void tasks.refetch();
        void events.refetch();
        void plan.refetch();
      }}
      bottomInset={40}
    >
      <View style={{ gap: theme.spacing.xl }}>
        {/* ---------------------------------------------------------- header */}
        <View style={{ gap: theme.spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="title1">
              {greeting()}
              {firstName ? `, ${firstName}` : ''}
            </Text>
            <Pressable
              onPress={() => router.push('/settings')}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              hitSlop={10}
            >
              <Feather name="settings" size={20} color={theme.colors.textTertiary} />
            </Pressable>
          </View>
          <Text variant="body" color="secondary">
            {headline}
          </Text>
        </View>

        {!online ? (
          <Banner
            tone="warning"
            title="Offline"
            body={
              pending > 0
                ? `${pending} change${pending === 1 ? '' : 's'} will sync when you reconnect.`
                : 'You can still see today and tick things off.'
            }
          />
        ) : pending > 0 ? (
          <Banner
            tone="info"
            title={`${pending} change${pending === 1 ? '' : 's'} waiting to sync`}
            actionLabel={syncing ? 'Syncing…' : 'Sync now'}
            onAction={() => void sync()}
          />
        ) : null}

        {/* ----------------------------------------------------------- today */}
        <View>
          <SectionHeader
            title="Today"
            action={list.length > focus.length ? (expanded ? 'Show less' : 'See all') : undefined}
            onAction={() => setExpanded((v) => !v)}
          />

          <Card>
            <View style={{ flexDirection: 'row', gap: theme.spacing.lg, alignItems: 'center' }}>
              <ProgressRing progress={completion} size={64} caption="Today" />
              <View style={{ flex: 1, gap: 4 }}>
                <Text variant="bodyStrong">
                  {list.filter((t) => t.status === 'done').length} of {list.length} done
                </Text>
                <Text variant="footnote" color="secondary">
                  {load.overloaded
                    ? `About ${Math.round(load.excess / 60)}h more than you usually finish.`
                    : `${Math.round(load.committed / 60)}h planned of about ${Math.round(load.capacity / 60)}h.`}
                </Text>
              </View>
            </View>

            {loading ? (
              <View style={{ gap: 10, marginTop: theme.spacing.base }}>
                <Skeleton height={16} width="70%" />
                <Skeleton height={16} width="55%" />
                <Skeleton height={16} width="62%" />
              </View>
            ) : list.length === 0 && eventList.length === 0 ? (
              <EmptyState
                icon="sun"
                title="Your day is clear."
                body="Tell your planner what matters and it will shape the day with you."
                actionLabel="Plan my day"
                onAction={() => router.push('/(tabs)/talk?mode=plan_day')}
              />
            ) : (
              <View style={{ marginTop: theme.spacing.sm }}>
                {eventList.map((event) => (
                  <EventRow key={event.id} event={event} />
                ))}
                {visible.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={(done) => actions.complete.mutate({ id: task.id, done })}
                    onPress={() => {
                      setSheetTask(task);
                      setSheetOpen(true);
                    }}
                  />
                ))}
                {!expanded && list.length > visible.length ? (
                  <Pressable onPress={() => setExpanded(true)} style={{ paddingTop: 8 }}>
                    <Text variant="footnote" color="accent">
                      {list.length - visible.length} more today
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            )}
          </Card>
        </View>

        {/* ------------------------------------------------------------ talk */}
        <Card tone="accent" elevated={false}>
          <View style={{ flexDirection: 'row', gap: theme.spacing.base, alignItems: 'center' }}>
            <AIOrb size={40} state="idle" />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="title3">Talk to your planner</Text>
              <Text variant="footnote" color="secondary">
                Anything from “plan my day” to “I don&apos;t know what to do”.
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.base }}>
            <Button label="Talk" icon="message-circle" onPress={() => router.push('/(tabs)/talk')} />
            <Button
              label="Plan my day"
              variant="secondary"
              onPress={() => router.push('/(tabs)/talk?mode=plan_day')}
            />
          </View>
        </Card>

        {/* ---------------------------------------------------------- habits */}
        {(habits.data?.length ?? 0) > 0 ? (
          <View>
            <SectionHeader title="Habits" action="All" onAction={() => router.push('/habits')} />
            <Card>
              {(habits.data ?? []).slice(0, 4).map((habit) => (
                <HabitRow
                  key={habit.id}
                  habit={habit}
                  logs={habitLogs.data ?? []}
                  today={today}
                  onToggle={(done) =>
                    done
                      ? habitActions.log.mutate({ habitId: habit.id, date: today })
                      : habitActions.unlog.mutate({ habitId: habit.id, date: today })
                  }
                  onPress={() => router.push('/habits')}
                />
              ))}
            </Card>
          </View>
        ) : null}

        {/* --------------------------------------------------------- noticed */}
        {insights.length > 0 ? (
          <View>
            <SectionHeader
              title="Noticed"
              action={insights.length > 1 ? 'All' : undefined}
              onAction={() => router.push('/analysis')}
            />
            <View style={{ gap: theme.spacing.md }}>
              {(topInsight ? [topInsight] : []).map((insight) => (
                <InsightCard key={insight.fingerprint} insight={insight} />
              ))}
            </View>
          </View>
        ) : null}

        {/* --------------------------------------------------- quick actions */}
        <View>
          <SectionHeader title="Quick actions" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            <QuickAction icon="plus" label="Add task" onPress={() => { setSheetTask(null); setSheetOpen(true); }} />
            <QuickAction icon="target" label="Add goal" onPress={() => router.push('/(tabs)/goals?new=1')} />
            <QuickAction icon="calendar" label="Add event" onPress={() => router.push('/(tabs)/plan?new=event')} />
            <QuickAction icon="moon" label="Daily reset" onPress={() => router.push('/daily-reset')} />
            <QuickAction icon="sunrise" label="Briefing" onPress={() => router.push('/briefing')} />
            <QuickAction icon="refresh-cw" label="Life reset" onPress={() => router.push('/life-reset')} />
            <QuickAction icon="calendar" label="Weekly review" onPress={() => router.push('/weekly-review')} />
            <QuickAction icon="zap" label="Agents" onPress={() => router.push('/agents')} />
          </View>
        </View>
      </View>

      <TaskSheet
        visible={sheetOpen}
        task={sheetTask}
        defaultDate={today}
        onClose={() => setSheetOpen(false)}
        saving={actions.create.isPending || actions.update.isPending}
        error={
          actions.create.error?.message ?? actions.update.error?.message ?? null
        }
        onSave={async (patch) => {
          if (sheetTask) await actions.update.mutateAsync({ id: sheetTask.id, patch });
          else await actions.create.mutateAsync(patch);
          setSheetOpen(false);
        }}
        onDelete={
          sheetTask
            ? async () => {
                await actions.remove.mutateAsync(sheetTask.id);
                setSheetOpen(false);
              }
            : undefined
        }
      />
    </Screen>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 11,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Feather name={icon} size={14} color={theme.colors.textSecondary} />
      <Text variant="subhead">{label}</Text>
    </Pressable>
  );
}
