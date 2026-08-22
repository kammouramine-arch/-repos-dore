import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import { Card, Chip, Screen, SectionHeader, Text } from '@/components/ui';
import { OptionField, TimeField } from '@/components/fields';
import { usePreferences, useUpdatePreferences } from '@/hooks/useProfile';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** How the planner treats your time. The AI reads all of this before scheduling. */
export default function PlanningSettings() {
  const theme = useTheme();
  const router = useRouter();
  const preferences = usePreferences();
  const update = useUpdatePreferences();
  const p = preferences.data;

  return (
    <Screen>
      <View style={{ gap: theme.spacing.lg }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
          <Feather name="chevron-left" size={24} color={theme.colors.text} />
        </Pressable>
        <Text variant="title1">Planning</Text>
        <Text variant="callout" color="secondary">
          Your planner schedules around this. Getting it roughly right matters more than
          getting it exact.
        </Text>

        <Card>
          <View style={{ gap: theme.spacing.lg }}>
            <TimeField
              label="I wake around"
              value={p?.wake_time?.slice(0, 5) ?? null}
              onChange={(wake_time) => wake_time && update.mutate({ wake_time })}
            />
            <TimeField
              label="I sleep around"
              value={p?.sleep_time?.slice(0, 5) ?? null}
              onChange={(sleep_time) => sleep_time && update.mutate({ sleep_time })}
            />
            <TimeField
              label="Work starts"
              value={p?.work_start?.slice(0, 5) ?? null}
              onChange={(work_start) => work_start && update.mutate({ work_start })}
            />
            <TimeField
              label="Work ends"
              value={p?.work_end?.slice(0, 5) ?? null}
              onChange={(work_end) => work_end && update.mutate({ work_end })}
            />
          </View>
        </Card>

        <View>
          <SectionHeader title="Working days" />
          <Card>
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              {DAYS.map((label, index) => {
                const selected = (p?.working_days ?? []).includes(index);
                return (
                  <Chip
                    key={index}
                    label={label}
                    small
                    selected={selected}
                    onPress={() => {
                      const current = p?.working_days ?? [];
                      const next = selected
                        ? current.filter((d) => d !== index)
                        : [...current, index].sort();
                      update.mutate({ working_days: next });
                    }}
                  />
                );
              })}
            </View>
          </Card>
        </View>

        <View>
          <SectionHeader
            title="Realistic capacity"
            caption="How much focused task time you actually finish on a normal day"
          />
          <Card>
            <OptionField
              label=""
              value={String(p?.daily_capacity_minutes ?? 240)}
              options={[
                { value: '120', label: '2h' },
                { value: '180', label: '3h' },
                { value: '240', label: '4h' },
                { value: '300', label: '5h' },
                { value: '420', label: '7h' },
              ]}
              onChange={(v) => update.mutate({ daily_capacity_minutes: Number(v) })}
            />
          </Card>
        </View>

        <View>
          <SectionHeader title="Planning style" />
          <Card>
            <OptionField
              label=""
              value={p?.planning_style ?? 'balanced'}
              options={[
                { value: 'gentle' as const, label: 'Gentle' },
                { value: 'balanced' as const, label: 'Balanced' },
                { value: 'ambitious' as const, label: 'Ambitious' },
              ]}
              onChange={(planning_style) => update.mutate({ planning_style })}
            />
            <Text variant="footnote" color="tertiary" style={{ marginTop: 10 }}>
              Gentle leaves more slack and reschedules sooner. Ambitious packs your days
              tighter — and will still tell you when a week does not fit.
            </Text>
          </Card>
        </View>
      </View>
    </Screen>
  );
}
