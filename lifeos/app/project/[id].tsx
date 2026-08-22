import React, { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import {
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
import { TaskRow } from '@/components/TaskRow';
import {
  useProject,
  useProjectActions,
  useProjectMilestones,
  useProjectTasks,
} from '@/hooks/useProjects';
import { useTaskActions } from '@/hooks/usePlanner';
import { friendlyDate } from '@/utils/date';

export default function ProjectDetail() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const project = useProject(id);
  const milestones = useProjectMilestones(id);
  const tasks = useProjectTasks(id);
  const actions = useProjectActions();
  const taskActions = useTaskActions();
  const [newMilestone, setNewMilestone] = useState('');

  if (project.isLoading && !project.data) {
    return (
      <Screen>
        <Skeleton height={26} width="70%" />
        <Skeleton height={10} width="100%" style={{ marginTop: 18 }} />
      </Screen>
    );
  }

  if (!project.data) {
    return (
      <Screen>
        <EmptyState
          icon="alert-circle"
          title="That project is gone."
          actionLabel="Back"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const data = project.data;

  return (
    <Screen>
      <View style={{ gap: theme.spacing.xl }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
          <Feather name="chevron-left" size={24} color={theme.colors.text} />
        </Pressable>

        <View style={{ gap: theme.spacing.md }}>
          <Text variant="display">{data.title}</Text>
          {data.description ? (
            <Text variant="body" color="secondary">
              {data.description}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', gap: theme.spacing.base, alignItems: 'center' }}>
            <Text variant="title3" color="accent">
              {data.progress}%
            </Text>
            {data.due_date ? (
              <Text variant="footnote" color="tertiary">
                Due {friendlyDate(data.due_date)}
              </Text>
            ) : null}
          </View>
          <ProgressBar progress={data.progress} />
        </View>

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
                <Text variant="body" style={{ flex: 1 }} color={milestone.is_done ? 'tertiary' : 'primary'}>
                  {milestone.title}
                </Text>
              </Pressable>
            ))}

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}>
                <Field value={newMilestone} onChangeText={setNewMilestone} placeholder="Add a milestone" />
              </View>
              <Button
                label="Add"
                size="sm"
                onPress={() => {
                  if (newMilestone.trim().length < 2) return;
                  actions.addMilestone.mutate({ project_id: id, title: newMilestone.trim() });
                  setNewMilestone('');
                }}
              />
            </View>
          </Card>
        </View>

        <View>
          <SectionHeader title="Tasks" />
          <Card>
            {(tasks.data?.length ?? 0) === 0 ? (
              <EmptyState
                icon="check-square"
                title="No tasks yet."
                body="Ask your planner to turn this project into next actions."
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

        <Button
          label={data.status === 'completed' ? 'Reopen project' : 'Mark project done'}
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
          label="Delete project"
          variant="danger"
          full
          onPress={() =>
            Alert.alert('Delete this project?', 'Milestones go with it.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  await actions.remove.mutateAsync(id);
                  router.back();
                },
              },
            ])
          }
        />
      </View>
    </Screen>
  );
}
