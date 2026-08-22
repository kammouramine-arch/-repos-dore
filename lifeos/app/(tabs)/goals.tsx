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
  Screen,
  SectionHeader,
  Segmented,
  Skeleton,
  Text,
} from '@/components/ui';
import { GoalCard } from '@/components/GoalCard';
import { GoalSheet } from '@/components/GoalSheet';
import { useGoalActions, useGoals } from '@/hooks/useGoals';
import { useAreas } from '@/hooks/useLife';
import { useProjects } from '@/hooks/useProjects';
import { useEntitlements } from '@/hooks/useEntitlements';
import type { Goal } from '@/types/database';

export default function Goals() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ new?: string }>();
  const [filter, setFilter] = useState<'active' | 'completed'>('active');
  const [sheetOpen, setSheetOpen] = useState(params.new === '1');
  const [editing, setEditing] = useState<Goal | null>(null);

  const goals = useGoals(filter);
  const areas = useAreas();
  const projects = useProjects('active');
  const actions = useGoalActions();
  const entitlements = useEntitlements();

  const areaById = useMemo(
    () => new Map((areas.data ?? []).map((a) => [a.id, a])),
    [areas.data],
  );

  const allowance = entitlements.objects('goals', goals.data?.length ?? 0);
  const atLimit = filter === 'active' && allowance.atLimit;

  return (
    <Screen refreshing={goals.isRefetching} onRefresh={() => void goals.refetch()}>
      <View style={{ gap: theme.spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="title1">Goals</Text>
          <Pressable
            onPress={() => {
              if (atLimit) return router.push('/paywall');
              setEditing(null);
              setSheetOpen(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="New goal"
            hitSlop={10}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.accent,
            }}
          >
            <Feather name="plus" size={18} color={theme.colors.onAccent} />
          </Pressable>
        </View>

        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'completed', label: 'Done' },
          ]}
        />

        {atLimit ? (
          <Banner
            tone="info"
            title={`${allowance.limit} active goals on ${entitlements.plan.name}`}
            body={`Focus is the point — but ${allowance.upgradeTo?.name ?? 'a higher plan'} lifts the limit when you genuinely need more. Your existing goals stay exactly as they are.`}
            actionLabel={allowance.upgradeTo ? `See ${allowance.upgradeTo.name}` : 'See plans'}
            onAction={() => router.push('/paywall')}
          />
        ) : null}

        {goals.isLoading && !goals.data ? (
          <View style={{ gap: theme.spacing.md }}>
            {[0, 1, 2].map((i) => (
              <Card key={i}>
                <Skeleton height={18} width="60%" />
                <Skeleton height={8} width="100%" style={{ marginTop: 14 }} />
              </Card>
            ))}
          </View>
        ) : (goals.data?.length ?? 0) === 0 ? (
          <EmptyState
            icon="target"
            title="Nothing here yet."
            body="Tell me what you want to accomplish and I will turn it into a plan with real steps."
            actionLabel="Talk it through"
            onAction={() => router.push('/(tabs)/talk')}
          />
        ) : (
          <View style={{ gap: theme.spacing.md }}>
            {(goals.data ?? []).map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                area={goal.life_area_id ? areaById.get(goal.life_area_id) : undefined}
                onPress={() => router.push(`/goal/${goal.id}`)}
              />
            ))}
          </View>
        )}

        {(projects.data?.length ?? 0) > 0 ? (
          <View>
            <SectionHeader title="Projects" action="All" onAction={() => router.push('/projects')} />
            <Card>
              {(projects.data ?? []).slice(0, 4).map((project, index, all) => (
                <Pressable
                  key={project.id}
                  onPress={() => router.push(`/project/${project.id}`)}
                  accessibilityRole="button"
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingVertical: 12,
                    borderBottomWidth: index === all.length - 1 ? 0 : 1,
                    borderBottomColor: theme.colors.border,
                  }}
                >
                  <Feather name="folder" size={15} color={theme.colors.textSecondary} />
                  <Text variant="body" style={{ flex: 1 }} numberOfLines={1}>
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

        <Button
          label="Ask for a strategy"
          variant="secondary"
          full
          onPress={() => router.push('/(tabs)/talk')}
        />
      </View>

      <GoalSheet
        visible={sheetOpen}
        goal={editing}
        areas={areas.data ?? []}
        onClose={() => setSheetOpen(false)}
        saving={actions.create.isPending || actions.update.isPending}
        error={actions.create.error?.message ?? actions.update.error?.message ?? null}
        onSave={async (patch) => {
          if (editing) await actions.update.mutateAsync({ id: editing.id, patch });
          else await actions.create.mutateAsync(patch);
          setSheetOpen(false);
        }}
      />
    </Screen>
  );
}
