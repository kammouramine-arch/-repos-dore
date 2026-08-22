import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useTheme, areaPalette } from '@/theme';
import { Button, Card, Screen, Skeleton, Text } from '@/components/ui';
import { useAreas } from '@/hooks/useLife';
import { useGoals } from '@/hooks/useGoals';
import { useHabits } from '@/hooks/useHabits';
import { useProjects } from '@/hooks/useProjects';
import { useTasksForDate } from '@/hooks/usePlanner';
import { todayISO } from '@/utils/date';

/**
 * The moment the interview pays off: everything the assistant just built, in one view.
 * Each number here is read back from the database — it reflects rows that exist.
 */
export default function Reveal() {
  const theme = useTheme();
  const router = useRouter();
  const areas = useAreas();
  const goals = useGoals('active');
  const habits = useHabits();
  const projects = useProjects('active');
  const tasks = useTasksForDate(todayISO());

  const loading = areas.isLoading || goals.isLoading || habits.isLoading;

  return (
    <Screen>
      <View style={{ gap: theme.spacing.xl, paddingTop: theme.spacing.xl }}>
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="overline" color="accent">
            YOUR LIFE PLAN
          </Text>
          <Text variant="display">Here is what I built.</Text>
          <Text variant="body" color="secondary">
            You didn&apos;t fill in a planner. You talked, and this came out of it. Everything
            below is yours to change.
          </Text>
        </View>

        {loading ? (
          <Card>
            <Skeleton height={20} width="60%" />
            <Skeleton height={12} width="80%" style={{ marginTop: 10 }} />
            <Skeleton height={12} width="70%" style={{ marginTop: 6 }} />
          </Card>
        ) : (
          <>
            <Card>
              <Text variant="overline" color="tertiary">
                LIFE AREAS
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {(areas.data ?? []).map((area) => (
                  <View
                    key={area.id}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: theme.radius.pill,
                      backgroundColor: theme.colors.surfaceAlt,
                      borderLeftWidth: 3,
                      borderLeftColor: areaPalette[area.key]?.[theme.scheme] ?? theme.colors.accent,
                    }}
                  >
                    <Text variant="subhead">{area.name}</Text>
                  </View>
                ))}
              </View>
            </Card>

            <View style={{ gap: theme.spacing.md }}>
              <Summary
                icon="target"
                label="Goals"
                count={goals.data?.length ?? 0}
                items={(goals.data ?? []).slice(0, 3).map((g) => g.title)}
              />
              <Summary
                icon="repeat"
                label="Habits"
                count={habits.data?.length ?? 0}
                items={(habits.data ?? []).slice(0, 3).map((h) => h.title)}
              />
              <Summary
                icon="folder"
                label="Projects"
                count={projects.data?.length ?? 0}
                items={(projects.data ?? []).slice(0, 3).map((p) => p.title)}
              />
              <Summary
                icon="sun"
                label="Today"
                count={tasks.data?.length ?? 0}
                items={(tasks.data ?? []).slice(0, 3).map((t) => t.title)}
              />
            </View>
          </>
        )}

        <Button label="Go to my plan" full size="lg" onPress={() => router.replace('/(tabs)')} />
      </View>
    </Screen>
  );
}

function Summary({
  icon,
  label,
  count,
  items,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  count: number;
  items: string[];
}) {
  const theme = useTheme();
  if (count === 0) return null;

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Feather name={icon} size={15} color={theme.colors.accentText} />
        <Text variant="title3">
          {count} {label.toLowerCase()}
        </Text>
      </View>
      <View style={{ gap: 4, marginTop: 10 }}>
        {items.map((item) => (
          <Text key={item} variant="callout" color="secondary" numberOfLines={1}>
            · {item}
          </Text>
        ))}
      </View>
    </Card>
  );
}
