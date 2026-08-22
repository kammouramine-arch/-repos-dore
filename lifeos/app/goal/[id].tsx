import React, { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import {
  Banner,
  Button,
  Card,
  EmptyState,
  Field,
  ProgressBar,
  Screen,
  SectionHeader,
  Skeleton,
  Text,
} from '@/components/ui';
import { GoalSheet } from '@/components/GoalSheet';
import { TaskRow } from '@/components/TaskRow';
import { useGoal, useGoalActions, useGoalMilestones, useGoalTasks } from '@/hooks/useGoals';
import { useAreas } from '@/hooks/useLife';
import { useTaskActions } from '@/hooks/usePlanner';
import { friendlyDate, relativeDays } from '@/utils/date';

/** One goal: its strategy, milestones, linked work and progress. */
export default function GoalDetail() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const goal = useGoal(id);
  const milestones = useGoalMilestones(id);
  const tasks = useGoalTasks(id);
  const areas = useAreas();
  const actions = useGoalActions();
  const taskActions = useTaskActions();

  const [editing, setEditing] = useState(false);
  const [newMilestone, setNewMilestone] = useState('');
  // Read the clock once per mount so rendering stays pure.
  const [startedAt] = useState(() => Date.now());

  if (goal.isLoading && !goal.data) {
    return (
      <Screen>
        <Skeleton height={26} width="70%" />
        <Skeleton height={10} width="100%" style={{ marginTop: 18 }} />
        <Skeleton height={14} width="60%" style={{ marginTop: 24 }} />
      </Screen>
    );
  }

  if (!goal.data) {
    return (
      <Screen>
        <EmptyState
          icon="alert-circle"
          title="That goal is gone."
          body="It may have been deleted from another device."
          actionLabel="Back to goals"
          onAction={() => router.replace('/(tabs)/goals')}
        />
      </Screen>
    );
  }

  const data = goal.data;
  const strategy = Array.isArray(data.strategy) ? data.strategy : [];
  // A deadline inside a month with little progress is worth saying out loud.
  const behindPace =
    Boolean(data.target_date) &&
    data.progress < 40 &&
    new Date(data.target_date as string).getTime() < startedAt + 30 * 86_400_000;

  return (
    <Screen>
      <View style={{ gap: theme.spacing.xl }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
            <Feather name="chevron-left" size={24} color={theme.colors.text} />
          </Pressable>
          <Pressable onPress={() => setEditing(true)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Edit goal">
            <Feather name="edit-2" size={18} color={theme.colors.textSecondary} />
          </Pressable>
        </View>

        <View style={{ gap: theme.spacing.md }}>
          <Text variant="display">{data.title}</Text>
          <View style={{ flexDirection: 'row', gap: theme.spacing.base, alignItems: 'center' }}>
            <Text variant="title2" color="accent">
              {data.progress}%
            </Text>
            <Text variant="footnote" color="tertiary">
              {data.target_date ? `Target ${friendlyDate(data.target_date)} · ${relativeDays(data.target_date)}` : 'No target date'}
            </Text>
          </View>
          <ProgressBar progress={data.progress} />
          {data.why ? (
            <Card tone="alt" elevated={false}>
              <Text variant="overline" color="tertiary">
                WHY
              </Text>
              <Text variant="body" style={{ marginTop: 6 }}>
                {data.why}
              </Text>
            </Card>
          ) : null}
        </View>

        {behindPace ? (
          <Banner
            tone="warning"
            title="The pace and the date disagree"
            body="At the current rate this will not land by your target. Your planner can recalculate it."
            actionLabel="Recalculate"
            onAction={() => router.push('/(tabs)/talk')}
          />
        ) : null}

        {/* -------------------------------------------------------- strategy */}
        <View>
          <SectionHeader title="Strategy" />
          {strategy.length === 0 ? (
            <Card tone="accent" elevated={false}>
              <Text variant="body">No strategy yet.</Text>
              <Text variant="footnote" color="secondary" style={{ marginTop: 4 }}>
                Ask your planner to break this into a sequence that actually gets you there.
              </Text>
              <Button
                label="Build the strategy"
                size="sm"
                style={{ marginTop: 12 }}
                onPress={() => router.push('/(tabs)/talk')}
              />
            </Card>
          ) : (
            <Card>
              {strategy.map((step, index) => (
                <View
                  key={`${step.title}-${index}`}
                  style={{ flexDirection: 'row', gap: 12, paddingVertical: 10 }}
                >
                  <Text variant="subhead" color="tertiary" style={{ width: 18 }}>
                    {index + 1}
                  </Text>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="body">{step.title}</Text>
                    {step.detail ? (
                      <Text variant="footnote" color="secondary">
                        {step.detail}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </Card>
          )}
        </View>

        {/* ------------------------------------------------------ milestones */}
        <View>
          <SectionHeader title="Milestones" />
          <Card>
            {(milestones.data ?? []).map((milestone) => (
              <Pressable
                key={milestone.id}
                onPress={() =>
                  actions.toggleMilestone.mutate({ id: milestone.id, done: !milestone.is_done })
                }
                accessibilityRole="checkbox"
                accessibilityState={{ checked: milestone.is_done }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 }}
              >
                <Feather
                  name={milestone.is_done ? 'check-circle' : 'circle'}
                  size={18}
                  color={milestone.is_done ? theme.colors.success : theme.colors.borderStrong}
                />
                <Text
                  variant="body"
                  style={{ flex: 1, textDecorationLine: milestone.is_done ? 'line-through' : 'none' }}
                  color={milestone.is_done ? 'tertiary' : 'primary'}
                >
                  {milestone.title}
                </Text>
                {milestone.due_date ? (
                  <Text variant="caption" color="tertiary">
                    {friendlyDate(milestone.due_date)}
                  </Text>
                ) : null}
              </Pressable>
            ))}

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}>
                <Field
                  value={newMilestone}
                  onChangeText={setNewMilestone}
                  placeholder="Add a milestone"
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    if (newMilestone.trim().length < 2) return;
                    actions.addMilestone.mutate({ goal_id: id, title: newMilestone.trim() });
                    setNewMilestone('');
                  }}
                />
              </View>
              <Button
                label="Add"
                size="sm"
                onPress={() => {
                  if (newMilestone.trim().length < 2) return;
                  actions.addMilestone.mutate({ goal_id: id, title: newMilestone.trim() });
                  setNewMilestone('');
                }}
              />
            </View>
          </Card>
        </View>

        {/* ----------------------------------------------------------- tasks */}
        <View>
          <SectionHeader title="Work on this goal" />
          <Card>
            {(tasks.data?.length ?? 0) === 0 ? (
              <EmptyState
                icon="check-square"
                title="No tasks yet."
                body="Ask for the next concrete step and it will land on your day."
                actionLabel="Ask"
                onAction={() => router.push('/(tabs)/talk')}
              />
            ) : (
              (tasks.data ?? []).map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  showDate
                  dateLabel={task.scheduled_date ? friendlyDate(task.scheduled_date) : 'Unscheduled'}
                  onToggle={(done) => taskActions.complete.mutate({ id: task.id, done })}
                />
              ))
            )}
          </Card>
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <Button
            label={data.status === 'completed' ? 'Reopen goal' : 'Mark as achieved'}
            variant="secondary"
            full
            onPress={() =>
              actions.update.mutate({
                id,
                patch: { status: data.status === 'completed' ? 'active' : 'completed' },
              })
            }
          />
          <Button
            label="Delete goal"
            variant="danger"
            full
            onPress={() =>
              Alert.alert('Delete this goal?', 'Its milestones go with it. Tasks stay in your plan.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    await actions.remove.mutateAsync(id);
                    router.replace('/(tabs)/goals');
                  },
                },
              ])
            }
          />
        </View>
      </View>

      <GoalSheet
        visible={editing}
        goal={data}
        areas={areas.data ?? []}
        onClose={() => setEditing(false)}
        saving={actions.update.isPending}
        error={actions.update.error?.message ?? null}
        onSave={async (patch) => {
          await actions.update.mutateAsync({ id, patch });
          setEditing(false);
        }}
      />
    </Screen>
  );
}
