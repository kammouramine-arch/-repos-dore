import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { Text } from '@/components/ui';
import type { Task } from '@/types/database';
import { formatTime, minutesToLabel } from '@/utils/date';

export function TaskRow({
  task,
  onToggle,
  onPress,
  showDate,
  dateLabel,
}: {
  task: Task;
  onToggle?: (done: boolean) => void;
  onPress?: () => void;
  showDate?: boolean;
  dateLabel?: string;
}) {
  const theme = useTheme();
  const done = task.status === 'done';
  const time = formatTime(task.scheduled_time);

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(
            done ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium,
          ).catch(() => {});
          onToggle?.(!done);
        }}
        hitSlop={10}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={`${task.title}${done ? ', completed' : ''}`}
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          borderWidth: 2,
          borderColor: done ? theme.colors.success : theme.colors.borderStrong,
          backgroundColor: done ? theme.colors.success : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 1,
        }}
      >
        {done ? <Feather name="check" size={14} color={theme.colors.onAccent} /> : null}
      </Pressable>

      <Pressable style={{ flex: 1 }} onPress={onPress} accessibilityRole="button">
        <View style={{ gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {task.is_focus && !done ? (
              <Feather name="star" size={12} color={theme.colors.highlight} />
            ) : null}
            <Text
              variant="body"
              color={done ? 'tertiary' : 'primary'}
              style={done ? { textDecorationLine: 'line-through' } : undefined}
              numberOfLines={2}
            >
              {task.title}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {time ? (
              <Text variant="caption" color="secondary">
                {time}
              </Text>
            ) : null}
            <Text variant="caption" color="tertiary">
              {minutesToLabel(task.duration_minutes)}
            </Text>
            {task.priority === 'high' && !done ? (
              <Text variant="caption" style={{ color: theme.colors.danger }}>
                High
              </Text>
            ) : null}
            {showDate && dateLabel ? (
              <Text variant="caption" color="tertiary">
                {dateLabel}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 10 },
});
