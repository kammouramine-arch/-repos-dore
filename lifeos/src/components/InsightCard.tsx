import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import { Card, Text } from '@/components/ui';
import type { Insight } from '@/utils/insights';

const ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  goal_stalled: 'pause-circle',
  deadline_at_risk: 'alert-triangle',
  week_overloaded: 'layers',
  habit_slipping: 'trending-down',
  productive_window: 'sunrise',
  nothing_scheduled: 'sun',
  project_stalled: 'folder',
  streak: 'award',
  ahead: 'trending-up',
};

/**
 * One thing the app noticed. Observation first, then the sentence that fixes it —
 * tapping hands that sentence straight to the assistant.
 */
export function InsightCard({ insight, onDismiss }: { insight: Insight; onDismiss?: () => void }) {
  const theme = useTheme();
  const router = useRouter();

  const tint =
    insight.severity === 'urgent'
      ? theme.colors.danger
      : insight.severity === 'attention'
        ? theme.colors.highlight
        : theme.colors.accentText;

  const act = () => {
    if (!insight.action) return;
    router.push(`/(tabs)/talk?prompt=${encodeURIComponent(insight.action)}`);
  };

  return (
    <Card onPress={insight.action ? act : undefined} accessibilityLabel={insight.title}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <Feather name={ICONS[insight.kind] ?? 'info'} size={17} color={tint} style={{ marginTop: 2 }} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="bodyStrong">{insight.title}</Text>
          <Text variant="footnote" color="secondary">
            {insight.body}
          </Text>
          {insight.action ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 }}>
              <Text variant="subhead" style={{ color: tint }}>
                Ask about this
              </Text>
              <Feather name="arrow-right" size={13} color={tint} />
            </View>
          ) : null}
        </View>
        {onDismiss ? (
          <Pressable onPress={onDismiss} hitSlop={10} accessibilityRole="button" accessibilityLabel="Dismiss">
            <Feather name="x" size={15} color={theme.colors.textTertiary} />
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}
