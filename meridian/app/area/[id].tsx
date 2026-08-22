import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useTheme, areaPalette } from '@/theme';
import { Button, Card, EmptyState, Field, ProgressBar, Screen, SectionHeader, Sheet, Text } from '@/components/ui';
import { GoalCard } from '@/components/GoalCard';
import { HabitRow } from '@/components/HabitRow';
import { useAreaActions, useAreas, useLifeProgress } from '@/hooks/useLife';
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
  const areaActions = useAreaActions();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [satisfaction, setSatisfaction] = useState<number | null>(null);

  const area = (areas.data ?? []).find((a) => a.id === id);

  useEffect(() => {
    if (!editing || !area) return;
    setName(area.name);
    setDescription(area.description ?? '');
    setSatisfaction(area.satisfaction);
  }, [editing, area]);
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
            <Feather name="chevron-left" size={24} color={theme.colors.text} />
          </Pressable>
          <Pressable
            onPress={() => setEditing(true)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Edit this area"
          >
            <Feather name="edit-2" size={18} color={theme.colors.textSecondary} />
          </Pressable>
        </View>

        <View style={{ gap: theme.spacing.md }}>
          <Text variant="display">{area.name}</Text>
          {area.description ? (
            <Text variant="body" color="secondary">
              {area.description}
            </Text>
          ) : null}
          {area.satisfaction != null ? (
            <Text variant="footnote" color="tertiary">
              You rated this part of your life {area.satisfaction}/100
            </Text>
          ) : null}
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

      <Sheet visible={editing} onClose={() => setEditing(false)} title="Edit this area">
        <Field label="Name" value={name} onChangeText={setName} placeholder="Health" />
        <Field
          label="What this part of your life is about"
          value={description}
          onChangeText={setDescription}
          placeholder="Optional — it helps your planner understand what matters here."
          multiline
          style={{ minHeight: 80, textAlignVertical: 'top' }}
        />

        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="subhead" color="secondary">
            How satisfied are you with this area right now?
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {[20, 40, 60, 80, 100].map((value) => (
              <Pressable
                key={value}
                onPress={() => setSatisfaction(value)}
                accessibilityRole="button"
                accessibilityState={{ selected: satisfaction === value }}
                accessibilityLabel={`${value} out of 100`}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: theme.radius.pill,
                  backgroundColor: satisfaction === value ? tint : theme.colors.surfaceAlt,
                  borderWidth: 1,
                  borderColor: satisfaction === value ? tint : theme.colors.border,
                }}
              >
                <Text
                  variant="subhead"
                  style={{ color: satisfaction === value ? theme.colors.onAccent : theme.colors.text }}
                >
                  {value}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Button
          label="Save"
          full
          loading={areaActions.update.isPending}
          onPress={async () => {
            if (name.trim().length < 2) return;
            await areaActions.update.mutateAsync({
              id: area.id,
              patch: {
                name: name.trim(),
                description: description.trim() || null,
                satisfaction,
              },
            });
            setEditing(false);
          }}
        />
        <Button
          label="Hide this area"
          variant="secondary"
          full
          onPress={async () => {
            await areaActions.update.mutateAsync({ id: area.id, patch: { is_active: false } });
            setEditing(false);
            router.back();
          }}
        />
        <Text variant="caption" color="tertiary" align="center">
          Hiding keeps everything inside it — goals and habits stay exactly where they are.
        </Text>
      </Sheet>
    </Screen>
  );
}
