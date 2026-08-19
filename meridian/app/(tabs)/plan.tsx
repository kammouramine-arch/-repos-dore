import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import {
  Banner,
  Button,
  Card,
  EmptyState,
  ProgressBar,
  Screen,
  SectionHeader,
  Segmented,
  Skeleton,
  Text,
} from '@/components/ui';
import { TaskRow } from '@/components/TaskRow';
import { EventRow } from '@/components/EventRow';
import { TaskSheet } from '@/components/TaskSheet';
import { EventSheet } from '@/components/EventSheet';
import { useTaskActions, useUnscheduledTasks, useWeek } from '@/hooks/usePlanner';
import { usePreferences } from '@/hooks/useProfile';
import { useEntitlement } from '@/hooks/useEntitlement';
import { createEvent } from '@/services/events';
import { dayLoad, orderDay, plannedMinutes, suggestMoves } from '@/utils/planning';
import { addDays, friendlyDate, toISODate, todayISO, weekRange, weekStartISO } from '@/utils/date';
import type { CalendarEvent, Task } from '@/types/database';
import { useQueryClient } from '@tanstack/react-query';

type PlanView = 'day' | 'week' | 'month';

/** The planner: a day view, a week view with overload detection, and a month overview. */
export default function Plan() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ new?: string }>();
  const queryClient = useQueryClient();
  const entitlement = useEntitlement();

  const [view, setView] = useState<PlanView>('day');
  const [anchor, setAnchor] = useState(todayISO());
  const [taskSheet, setTaskSheet] = useState<{ open: boolean; task: Task | null }>({
    open: false,
    task: null,
  });
  const [eventSheet, setEventSheet] = useState(params.new === 'event');
  const [eventError, setEventError] = useState<string | null>(null);
  const [savingEvent, setSavingEvent] = useState(false);

  const weekStart = weekStartISO(new Date(`${anchor}T00:00:00`));
  const week = useWeek(weekStart);
  const preferences = usePreferences();
  const backlog = useUnscheduledTasks();
  const actions = useTaskActions(anchor);

  const weekTasks = week.tasks.data ?? [];
  const weekEvents = week.events.data ?? [];
  const days = weekRange(new Date(`${weekStart}T00:00:00`)).days;

  const dayTasks = useMemo(
    () => orderDay(weekTasks.filter((t) => t.scheduled_date === anchor), anchor),
    [weekTasks, anchor],
  );
  const dayEvents = weekEvents.filter((e) => e.starts_at.slice(0, 10) === anchor);

  const capacity = preferences.data?.daily_capacity_minutes ?? 240;
  const weekCapacity = capacity * (preferences.data?.working_days?.length ?? 5);
  const weekCommitted = plannedMinutes(weekTasks.filter((t) => t.status === 'todo'));
  const weekOverloaded = weekCommitted > weekCapacity * 1.1;
  const moves = useMemo(
    () => suggestMoves(weekTasks, anchor, Math.max(0, weekCommitted - weekCapacity)),
    [weekTasks, anchor, weekCommitted, weekCapacity],
  );

  const saveEvent = async (input: Partial<CalendarEvent>) => {
    setSavingEvent(true);
    setEventError(null);
    try {
      await createEvent(input);
      await queryClient.invalidateQueries({ queryKey: ['events'] });
      await queryClient.invalidateQueries({ queryKey: ['events-week'] });
      setEventSheet(false);
    } catch (e) {
      setEventError(e instanceof Error ? e.message : 'Could not save that event.');
    } finally {
      setSavingEvent(false);
    }
  };

  return (
    <Screen
      refreshing={week.tasks.isRefetching}
      onRefresh={() => {
        void week.tasks.refetch();
        void week.events.refetch();
      }}
    >
      <View style={{ gap: theme.spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="title1">Plan</Text>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <IconButton icon="plus" label="Add task" onPress={() => setTaskSheet({ open: true, task: null })} />
            <IconButton icon="calendar" label="Add event" onPress={() => setEventSheet(true)} />
          </View>
        </View>

        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: 'day', label: 'Day' },
            { value: 'week', label: 'Week' },
            { value: 'month', label: 'Month' },
          ]}
        />

        {/* ------------------------------------------------------- day strip */}
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {days.map((d) => {
            const selected = d === anchor;
            const count = weekTasks.filter((t) => t.scheduled_date === d && t.status === 'todo').length;
            return (
              <Pressable
                key={d}
                onPress={() => {
                  setAnchor(d);
                  setView('day');
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={friendlyDate(d)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: 8,
                  borderRadius: theme.radius.sm,
                  backgroundColor: selected ? theme.colors.accent : theme.colors.surface,
                  borderWidth: 1,
                  borderColor: selected ? theme.colors.accent : theme.colors.border,
                  gap: 3,
                }}
              >
                <Text variant="caption" style={{ color: selected ? theme.colors.onAccent : theme.colors.textTertiary }}>
                  {new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { weekday: 'narrow' })}
                </Text>
                <Text variant="subhead" style={{ color: selected ? theme.colors.onAccent : theme.colors.text }}>
                  {d.slice(8)}
                </Text>
                <View
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: count
                      ? selected
                        ? theme.colors.onAccent
                        : theme.colors.accent
                      : 'transparent',
                  }}
                />
              </Pressable>
            );
          })}
        </View>

        {view === 'day' ? (
          <DayView
            date={anchor}
            tasks={dayTasks}
            events={dayEvents}
            loading={week.tasks.isLoading && !week.tasks.data}
            capacity={capacity}
            onToggle={(task, done) => actions.complete.mutate({ id: task.id, done })}
            onOpen={(task) => setTaskSheet({ open: true, task })}
            onAdd={() => setTaskSheet({ open: true, task: null })}
            onPlan={() => router.push('/(tabs)/talk?mode=plan_day')}
          />
        ) : view === 'week' ? (
          <WeekView
            days={days}
            tasks={weekTasks}
            events={weekEvents}
            overloaded={weekOverloaded}
            committedHours={Math.round(weekCommitted / 60)}
            capacityHours={Math.round(weekCapacity / 60)}
            moves={moves}
            plan={week.plan.data ?? null}
            canPlan={entitlement.can('weekly_ai_plan')}
            onSelectDay={(d) => {
              setAnchor(d);
              setView('day');
            }}
            onPlanWeek={() =>
              entitlement.can('weekly_ai_plan')
                ? router.push('/(tabs)/talk?mode=plan_week')
                : router.push('/paywall')
            }
            onMove={(task) => actions.reschedule.mutate({ id: task.id, to: toISODate(addDays(new Date(`${task.scheduled_date}T00:00:00`), 7)) })}
          />
        ) : (
          <MonthView anchor={anchor} tasks={weekTasks} onSelect={(d) => { setAnchor(d); setView('day'); }} />
        )}

        {/* --------------------------------------------------------- backlog */}
        {(backlog.data?.length ?? 0) > 0 ? (
          <View>
            <SectionHeader title="Not scheduled" caption="Things you captured but never placed" />
            <Card>
              {(backlog.data ?? []).slice(0, 6).map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={(done) => actions.complete.mutate({ id: task.id, done })}
                  onPress={() => setTaskSheet({ open: true, task })}
                />
              ))}
              <Button
                label="Ask for these to be scheduled"
                variant="ghost"
                size="sm"
                style={{ marginTop: 8 }}
                onPress={() => router.push('/(tabs)/talk?mode=plan_week')}
              />
            </Card>
          </View>
        ) : null}
      </View>

      <TaskSheet
        visible={taskSheet.open}
        task={taskSheet.task}
        defaultDate={anchor}
        onClose={() => setTaskSheet({ open: false, task: null })}
        saving={actions.create.isPending || actions.update.isPending}
        error={actions.create.error?.message ?? actions.update.error?.message ?? null}
        onSave={async (patch) => {
          if (taskSheet.task) await actions.update.mutateAsync({ id: taskSheet.task.id, patch });
          else await actions.create.mutateAsync(patch);
          setTaskSheet({ open: false, task: null });
        }}
        onDelete={
          taskSheet.task
            ? async () => {
                await actions.remove.mutateAsync(taskSheet.task!.id);
                setTaskSheet({ open: false, task: null });
              }
            : undefined
        }
      />

      <EventSheet
        visible={eventSheet}
        onClose={() => setEventSheet(false)}
        defaultDate={anchor}
        onSave={saveEvent}
        saving={savingEvent}
        error={eventError}
      />
    </Screen>
  );
}

function DayView({
  date,
  tasks,
  events,
  loading,
  capacity,
  onToggle,
  onOpen,
  onAdd,
  onPlan,
}: {
  date: string;
  tasks: Task[];
  events: CalendarEvent[];
  loading: boolean;
  capacity: number;
  onToggle: (task: Task, done: boolean) => void;
  onOpen: (task: Task) => void;
  onAdd: () => void;
  onPlan: () => void;
}) {
  const theme = useTheme();
  const load = dayLoad(tasks, events, { daily_capacity_minutes: capacity });

  if (loading) {
    return (
      <Card>
        <Skeleton height={16} width="60%" />
        <Skeleton height={16} width="45%" style={{ marginTop: 12 }} />
        <Skeleton height={16} width="70%" style={{ marginTop: 12 }} />
      </Card>
    );
  }

  return (
    <View style={{ gap: theme.spacing.md }}>
      <SectionHeader
        title={friendlyDate(date)}
        caption={`${Math.round(load.committed / 60)}h committed · about ${Math.round(load.capacity / 60)}h realistic`}
      />
      {load.overloaded ? (
        <Banner
          tone="warning"
          title="This day is heavier than usual"
          body={`Roughly ${Math.round(load.excess / 60)}h more than you normally finish. Ask your planner to move a couple of things.`}
          actionLabel="Rebalance the day"
          onAction={onPlan}
        />
      ) : null}

      <Card>
        {events.length === 0 && tasks.length === 0 ? (
          <EmptyState
            icon="sun"
            title="Nothing planned."
            body="Add something, or tell your planner what this day needs to hold."
            actionLabel="Add a task"
            onAction={onAdd}
          />
        ) : (
          <>
            {events.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onToggle={(done) => onToggle(task, done)}
                onPress={() => onOpen(task)}
              />
            ))}
          </>
        )}
      </Card>
    </View>
  );
}

function WeekView({
  days,
  tasks,
  events,
  overloaded,
  committedHours,
  capacityHours,
  moves,
  plan,
  canPlan,
  onSelectDay,
  onPlanWeek,
  onMove,
}: {
  days: string[];
  tasks: Task[];
  events: CalendarEvent[];
  overloaded: boolean;
  committedHours: number;
  capacityHours: number;
  moves: Task[];
  plan: { summary: string | null; priorities: { title: string }[]; risks: { title: string }[] } | null;
  canPlan: boolean;
  onSelectDay: (d: string) => void;
  onPlanWeek: () => void;
  onMove: (task: Task) => void;
}) {
  const theme = useTheme();
  const open = tasks.filter((t) => t.status === 'todo');
  const realistic = Math.max(1, Math.round((capacityHours / Math.max(committedHours, 1)) * open.length));

  return (
    <View style={{ gap: theme.spacing.md }}>
      <Card>
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="title3">Your week</Text>
          <Text variant="callout" color="secondary">
            {open.length} open task{open.length === 1 ? '' : 's'} and {events.length} commitment
            {events.length === 1 ? '' : 's'} — about {committedHours}h against {capacityHours}h of
            realistic time.
          </Text>
          <ProgressBar
            progress={Math.min(100, (committedHours / Math.max(capacityHours, 1)) * 100)}
            color={overloaded ? theme.colors.danger : theme.colors.accent}
          />
        </View>
      </Card>

      {overloaded ? (
        <Banner
          tone="warning"
          title="The week does not fit"
          body={`You have ${open.length} tasks scheduled, and realistically about ${realistic} of them will get done. Moving a few now beats dropping them later.`}
        />
      ) : null}

      {plan?.summary ? (
        <Card>
          <Text variant="overline" color="tertiary">
            THIS WEEK&apos;S PLAN
          </Text>
          <Text variant="body" style={{ marginTop: 8 }}>
            {plan.summary}
          </Text>
          {plan.priorities?.length ? (
            <View style={{ marginTop: 12, gap: 6 }}>
              {plan.priorities.map((p, i) => (
                <Text key={`${p.title}-${i}`} variant="callout" color="secondary">
                  {i + 1}. {p.title}
                </Text>
              ))}
            </View>
          ) : null}
        </Card>
      ) : (
        <Card tone="accent" elevated={false}>
          <Text variant="title3">No weekly plan yet</Text>
          <Text variant="footnote" color="secondary" style={{ marginTop: 4 }}>
            {canPlan
              ? 'Your planner can look at the whole week, spot conflicts and tell you what to move.'
              : 'Weekly planning is part of Pro.'}
          </Text>
          <Button
            label={canPlan ? 'Plan my week' : 'See Pro'}
            size="sm"
            style={{ marginTop: 12 }}
            onPress={onPlanWeek}
          />
        </Card>
      )}

      {moves.length > 0 && overloaded ? (
        <Card>
          <Text variant="overline" color="tertiary">
            EASIEST TO MOVE
          </Text>
          <View style={{ gap: 10, marginTop: 10 }}>
            {moves.slice(0, 4).map((task) => (
              <View key={task.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text variant="callout" style={{ flex: 1 }} numberOfLines={1}>
                  {task.title}
                </Text>
                <Button label="Next week" size="sm" variant="secondary" onPress={() => onMove(task)} />
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      <Card>
        {days.map((day) => {
          const dayTasks = tasks.filter((t) => t.scheduled_date === day);
          const dayEvents = events.filter((e) => e.starts_at.slice(0, 10) === day);
          return (
            <Pressable
              key={day}
              onPress={() => onSelectDay(day)}
              accessibilityRole="button"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 12,
                borderBottomWidth: day === days[days.length - 1] ? 0 : 1,
                borderBottomColor: theme.colors.border,
              }}
            >
              <Text variant="subhead" style={{ width: 62 }}>
                {friendlyDate(day)}
              </Text>
              <Text variant="callout" color="secondary" style={{ flex: 1 }} numberOfLines={1}>
                {dayTasks.length === 0 && dayEvents.length === 0
                  ? 'Clear'
                  : [
                      dayTasks.length ? `${dayTasks.length} task${dayTasks.length === 1 ? '' : 's'}` : null,
                      dayEvents.length ? `${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
              </Text>
              <Feather name="chevron-right" size={16} color={theme.colors.textTertiary} />
            </Pressable>
          );
        })}
      </Card>
    </View>
  );
}

function MonthView({
  anchor,
  tasks,
  onSelect,
}: {
  anchor: string;
  tasks: Task[];
  onSelect: (date: string) => void;
}) {
  const theme = useTheme();
  const base = new Date(`${anchor}T00:00:00`);
  const first = new Date(base.getFullYear(), base.getMonth(), 1);
  const daysInMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  const cells = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => toISODate(new Date(base.getFullYear(), base.getMonth(), i + 1))),
  ];
  const counts = new Map<string, number>();
  for (const task of tasks) {
    if (!task.scheduled_date) continue;
    counts.set(task.scheduled_date, (counts.get(task.scheduled_date) ?? 0) + 1);
  }

  return (
    <Card>
      <Text variant="title3" style={{ marginBottom: 12 }}>
        {first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((date, index) => (
          <Pressable
            key={date ?? `blank-${index}`}
            disabled={!date}
            onPress={() => date && onSelect(date)}
            accessibilityRole={date ? 'button' : undefined}
            accessibilityLabel={date ?? undefined}
            style={{
              width: `${100 / 7}%`,
              aspectRatio: 1,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
            }}
          >
            {date ? (
              <>
                <Text
                  variant="callout"
                  color={date === anchor ? 'accent' : 'primary'}
                  weight={date === anchor ? '700' : '400'}
                >
                  {Number(date.slice(8))}
                </Text>
                <View
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: counts.get(date) ? theme.colors.accent : 'transparent',
                  }}
                />
              </>
            ) : null}
          </Pressable>
        ))}
      </View>
      <Text variant="caption" color="tertiary" style={{ marginTop: 8 }}>
        Dots show days with something planned in the loaded range.
      </Text>
    </Card>
  );
}

function IconButton({
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
      hitSlop={8}
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      <Feather name={icon} size={16} color={theme.colors.textSecondary} />
    </Pressable>
  );
}
