import React from 'react';
import { View } from 'react-native';
import { useTheme, areaPalette } from '@/theme';
import { Card, ProgressBar, Text } from '@/components/ui';
import type { Goal, LifeArea } from '@/types/database';
import { relativeDays } from '@/utils/date';

export function GoalCard({
  goal,
  area,
  onPress,
}: {
  goal: Goal;
  area?: LifeArea;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const tint = area ? areaPalette[area.key]?.[theme.scheme] ?? theme.colors.accent : theme.colors.accent;

  return (
    <Card onPress={onPress} accessibilityLabel={`${goal.title}, ${goal.progress} percent`}>
      <View style={{ gap: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1, gap: 4 }}>
            {area ? (
              <Text variant="overline" style={{ color: tint }}>
                {area.name.toUpperCase()}
              </Text>
            ) : null}
            <Text variant="title3" numberOfLines={2}>
              {goal.title}
            </Text>
          </View>
          <Text variant="title3" style={{ color: tint }}>
            {goal.progress}%
          </Text>
        </View>

        <ProgressBar progress={goal.progress} color={tint} />

        <View style={{ flexDirection: 'row', gap: 12 }}>
          {goal.target_date ? (
            <Text variant="caption" color="tertiary">
              Target {relativeDays(goal.target_date)}
            </Text>
          ) : (
            <Text variant="caption" color="tertiary">
              No target date
            </Text>
          )}
          {goal.status === 'paused' ? (
            <Text variant="caption" color="tertiary">
              Paused
            </Text>
          ) : null}
        </View>
      </View>
    </Card>
  );
}
