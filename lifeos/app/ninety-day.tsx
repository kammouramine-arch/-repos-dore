import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import { Button, Card, EmptyState, Screen, SectionHeader, Skeleton, Text } from '@/components/ui';
import { useAreaActions, useLifePlan, useLifePlanItems } from '@/hooks/useLife';
import { friendlyDate } from '@/utils/date';

/** The 90-day plan: three months, then weekly objectives, all editable. */
export default function NinetyDay() {
  const theme = useTheme();
  const router = useRouter();
  const plan = useLifePlan();
  const items = useLifePlanItems(plan.data?.id);
  const actions = useAreaActions();

  const months = (items.data ?? []).filter((i) => i.horizon === 'month');
  const weeks = (items.data ?? []).filter((i) => i.horizon === 'week');

  if (plan.isLoading && !plan.data) {
    return (
      <Screen>
        <Skeleton height={26} width="60%" />
        <Skeleton height={14} width="90%" style={{ marginTop: 16 }} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ gap: theme.spacing.xl }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
          <Feather name="chevron-left" size={24} color={theme.colors.text} />
        </Pressable>

        {!plan.data ? (
          <EmptyState
            icon="map"
            title="No 90-day plan yet."
            body="Tell your planner where you want to be in three months and it will build the path."
            actionLabel="Build it"
            onAction={() => router.replace('/(tabs)/talk?mode=ninety_day')}
          />
        ) : (
          <>
            <View style={{ gap: theme.spacing.sm }}>
              <Text variant="overline" color="accent">
                90 DAYS
              </Text>
              <Text variant="display">{plan.data.title}</Text>
              <Text variant="body" color="secondary">
                {plan.data.vision}
              </Text>
              <Text variant="caption" color="tertiary">
                {friendlyDate(plan.data.start_date)} → {friendlyDate(plan.data.end_date)}
              </Text>
            </View>

            <View>
              <SectionHeader title="Months" />
              <View style={{ gap: theme.spacing.md }}>
                {months.map((month) => (
                  <Card key={month.id}>
                    <Text variant="overline" color="tertiary">
                      MONTH {month.position}
                    </Text>
                    <Text variant="title3" style={{ marginTop: 6 }}>
                      {month.title}
                    </Text>
                    {month.description ? (
                      <Text variant="callout" color="secondary" style={{ marginTop: 6 }}>
                        {month.description}
                      </Text>
                    ) : null}
                    {(month.objectives ?? []).length > 0 ? (
                      <View style={{ gap: 6, marginTop: 12 }}>
                        {(month.objectives ?? []).map((objective, index) => (
                          <Text key={`${objective}-${index}`} variant="callout" color="secondary">
                            · {objective}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                  </Card>
                ))}
              </View>
            </View>

            {weeks.length > 0 ? (
              <View>
                <SectionHeader title="Weeks" caption="Tick these off as you go" />
                <Card>
                  {weeks.map((week) => (
                    <Pressable
                      key={week.id}
                      onPress={() => actions.toggleItem.mutate({ id: week.id, done: !week.is_done })}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: week.is_done }}
                      style={{ flexDirection: 'row', gap: 12, paddingVertical: 11, alignItems: 'flex-start' }}
                    >
                      <Feather
                        name={week.is_done ? 'check-circle' : 'circle'}
                        size={17}
                        color={week.is_done ? theme.colors.success : theme.colors.borderStrong}
                        style={{ marginTop: 2 }}
                      />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text variant="body" color={week.is_done ? 'tertiary' : 'primary'}>
                          Week {week.position} — {week.title}
                        </Text>
                        {(week.objectives ?? []).slice(0, 2).map((objective, index) => (
                          <Text key={`${objective}-${index}`} variant="caption" color="tertiary">
                            {objective}
                          </Text>
                        ))}
                      </View>
                    </Pressable>
                  ))}
                </Card>
              </View>
            ) : null}

            <Button
              label="Rebuild this plan"
              variant="secondary"
              full
              onPress={() => router.replace('/(tabs)/talk?mode=ninety_day')}
            />
          </>
        )}
      </View>
    </Screen>
  );
}
