import React from 'react';
import { Pressable, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { Text } from '@/components/ui';
import type { Habit, HabitLog } from '@/types/database';
import { addDays, formatTime, toISODate } from '@/utils/date';

/** Seven-day dot trail: presence, not punishment. Missed days are simply empty. */
export function HabitRow({
  habit,
  logs,
  today,
  onToggle,
  onPress,
}: {
  habit: Habit;
  logs: HabitLog[];
  today: string;
  onToggle?: (done: boolean) => void;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const byDate = new Map(logs.filter((l) => l.habit_id === habit.id).map((l) => [l.date, l.status]));
  const doneToday = byDate.get(today) === 'done';
  const days = Array.from({ length: 7 }, (_, i) => toISODate(addDays(new Date(`${today}T00:00:00`), i - 6)));
  const weekCount = days.filter((d) => byDate.get(d) === 'done').length;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          onToggle?.(!doneToday);
        }}
        hitSlop={8}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: doneToday }}
        accessibilityLabel={`${habit.title}${doneToday ? ', done today' : ''}`}
        style={{
          width: 30,
          height: 30,
          borderRadius: 15,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: doneToday ? theme.colors.success : theme.colors.surfaceAlt,
          borderWidth: doneToday ? 0 : 1,
          borderColor: theme.colors.border,
        }}
      >
        <Feather
          name={doneToday ? 'check' : 'circle'}
          size={13}
          color={doneToday ? theme.colors.onAccent : theme.colors.textTertiary}
        />
      </Pressable>

      <Pressable style={{ flex: 1, gap: 4 }} onPress={onPress} accessibilityRole="button">
        <Text variant="body" numberOfLines={1}>
          {habit.title}
        </Text>
        <Text variant="caption" color="tertiary">
          {weekCount}/{habit.target_per_week} this week
          {habit.preferred_time ? ` · ${formatTime(habit.preferred_time)}` : ''}
        </Text>
      </Pressable>

      <View style={{ flexDirection: 'row', gap: 4 }}>
        {days.map((d) => (
          <View
            key={d}
            style={{
              width: 7,
              height: 7,
              borderRadius: 4,
              backgroundColor:
                byDate.get(d) === 'done' ? theme.colors.success : theme.colors.surfaceSunken,
            }}
          />
        ))}
      </View>
    </View>
  );
}
