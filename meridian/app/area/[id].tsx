import React from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useTheme, areaPalette } from '@/theme';
import { Card, EmptyState, ProgressBar, Screen, SectionHeader, Text } from '@/components/ui';
import { GoalCard } from '@/components/GoalCard';
import { HabitRow } from '@/components/HabitRow';
import { useAreas, useLifeProgress } from '@/hooks/useLife';
import { useGoals } from '@/hooks/useGoals';
import { useHabitActions, useHabitLogs, useHabits } from '@/hooks/useHabits';
import { useProjects } from '@/hooks/useProjects';
import { todayISO } from '@/utils/date';

/** One life area, with everything that belongs to it. */
export default function AreaDetail() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const today = todayISO();

  const areas = useAreas();
  const progress = useLifeProgress();
  const goals = useGoals('active');
  const habits = useHabits();
  const habitLogs = useHabitLogs(7);
  const habitActions = useHabitActions();
  const projects = useProjects('active');

  const area = (areas.data ?? []).find((a) => a.id === id);
  const row = (progress.data ?? []).find((r) => r.life_area_id === id);
  const tint = area ? areaPalette[area.key]?.[theme.scheme] ?? theme.colors.accent : theme.colors.accent;

  const areaGoals = (goals.data ?? []).filter((g) => g.life_area_id === id);
  const areaHabits = (habits.data ?? []).filter((h) => h.life_area_id === id);
  const areaProjects = (projects.data ?? []).filter((p) => p.life_area_id === id);

  if (!area) {
    return (
      <Screen>
        <EmptyState icon="compass" title="That area is gone." actionLabel="Back" onAction={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ gap: theme.spacing.xl }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
          <Feather name="chevron-left" size={24} color={theme.colors.text} />
        </Pressable>

        <View style={{ gap: theme.spacing.md }}>
          <Text variant="display">{area.name}</Text>
          {row ? (
            <>
              <Text variant="title3" style={{ color: tint }}>
                {Math.round(Number(row.score))}%
              </Text>
              <ProgressBar progress={Number(row.score)} color={tint} />
              <Text variant="footnote" color="secondary">
                Goals {Math.round(Number(row.goal_progress))}% · habits{' '}
                {Math.round(Number(row.habit_consistency))}% · finished work{' '}
                {Math.round(Number(row.task_completion))}%
              </Text>
            </>
          ) : (
            <Text variant="callout" color="secondary">
              Nothing tracked here yet.
            </Text>
          )}
        </View>

        <View>
          <SectionHeader title="Goals" />
          {areaGoals.length === 0 ? (
            <EmptyState
              icon="target"
              title="No goals in this area."
              body="Tell your planner what you want here and it will set it up."
              actionLabel="Talk"
              onAction={() => router.push('/(tabs)/talk')}
            />
          ) : (
            <View style={{ gap: theme.spacing.md }}>
              {areaGoals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} area={area} onPress={() => router.push(`/goal/${goal.id}`)} />
              ))}
            </View>
          )}
        </View>

        {areaHabits.length > 0 ? (
          <View>
            <SectionHeader title="Habits" />
            <Card>
              {areaHabits.map((habit) => (
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
                />
              ))}
            </Card>
          </View>
        ) : null}

        {areaProjects.length > 0 ? (
          <View>
            <SectionHeader title="Projects" />
            <Card>
              {areaProjects.map((project) => (
                <Pressable
                  key={project.id}
                  onPress={() => router.push(`/project/${project.id}`)}
                  accessibilityRole="button"
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}
                >
                  <Text variant="body" style={{ flex: 1 }}>
                    {project.title}
                  </Text>
                  <Text variant="caption" color="tertiary">
                    {project.progress}%
                  </Text>
                </Pressable>
              ))}
            </Card>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
