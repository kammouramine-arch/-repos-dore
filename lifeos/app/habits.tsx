import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import { Banner, Card, EmptyState, Screen, SectionHeader, Text } from '@/components/ui';
import { HabitRow } from '@/components/HabitRow';
import { HabitSheet } from '@/components/HabitSheet';
import { useHabitActions, useHabitLogs, useHabits } from '@/hooks/useHabits';
import { useAreas } from '@/hooks/useLife';
import { useEntitlements } from '@/hooks/useEntitlements';
import type { Habit } from '@/types/database';
import { todayISO } from '@/utils/date';

export default function Habits() {
  const theme = useTheme();
  const router = useRouter();
  const today = todayISO();
  const habits = useHabits();
  const logs = useHabitLogs(28);
  const areas = useAreas();
  const actions = useHabitActions();
  const entitlements = useEntitlements();
  const [sheet, setSheet] = useState<{ open: boolean; habit: Habit | null }>({
    open: false,
    habit: null,
  });

  const allowance = entitlements.objects('habits', habits.data?.length ?? 0);
  const atLimit = allowance.atLimit;

  return (
    <Screen refreshing={habits.isRefetching} onRefresh={() => void habits.refetch()}>
      <View style={{ gap: theme.spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
            <Feather name="chevron-left" size={24} color={theme.colors.text} />
          </Pressable>
          <Pressable
            onPress={() => (atLimit ? router.push('/paywall') : setSheet({ open: true, habit: null }))}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="New habit"
          >
            <Feather name="plus" size={22} color={theme.colors.accentText} />
          </Pressable>
        </View>

        <Text variant="title1">Habits</Text>

        {atLimit ? (
          <Banner
            tone="info"
            title={`${allowance.limit} habits on ${entitlements.plan.name}`}
            body={`Consistency beats volume, but ${allowance.upgradeTo?.name ?? 'a higher plan'} removes the cap.`}
            actionLabel={allowance.upgradeTo ? `See ${allowance.upgradeTo.name}` : 'See plans'}
            onAction={() => router.push('/paywall')}
          />
        ) : null}

        {(habits.data?.length ?? 0) === 0 ? (
          <EmptyState
            icon="repeat"
            title="Want to build a routine?"
            body="Say what you want to do regularly — I will pick a cadence you can actually keep."
            actionLabel="Add a habit"
            onAction={() => setSheet({ open: true, habit: null })}
          />
        ) : (
          <Card>
            {(habits.data ?? []).map((habit) => (
              <HabitRow
                key={habit.id}
                habit={habit}
                logs={logs.data ?? []}
                today={today}
                onToggle={(done) =>
                  done
                    ? actions.log.mutate({ habitId: habit.id, date: today })
                    : actions.unlog.mutate({ habitId: habit.id, date: today })
                }
                onPress={() => setSheet({ open: true, habit })}
              />
            ))}
          </Card>
        )}

        <View>
          <SectionHeader title="How this works" />
          <Card tone="alt" elevated={false}>
            <Text variant="callout" color="secondary">
              Missing a day does not reset anything. The dots show the last seven days so
              you can see the pattern, not a score to protect.
            </Text>
          </Card>
        </View>
      </View>

      <HabitSheet
        visible={sheet.open}
        habit={sheet.habit}
        areas={areas.data ?? []}
        onClose={() => setSheet({ open: false, habit: null })}
        saving={actions.create.isPending || actions.update.isPending}
        error={actions.create.error?.message ?? actions.update.error?.message ?? null}
        onSave={async (patch) => {
          if (sheet.habit) await actions.update.mutateAsync({ id: sheet.habit.id, patch });
          else await actions.create.mutateAsync(patch);
          setSheet({ open: false, habit: null });
        }}
        onDelete={
          sheet.habit
            ? async () => {
                await actions.remove.mutateAsync(sheet.habit!.id);
                setSheet({ open: false, habit: null });
              }
            : undefined
        }
      />
    </Screen>
  );
}
