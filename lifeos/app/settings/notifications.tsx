import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import { Banner, Button, Card, Row, Screen, SectionHeader, Text } from '@/components/ui';
import { TimeField } from '@/components/fields';
import { usePreferences, useUpdatePreferences } from '@/hooks/useProfile';
import { useTasksForDate } from '@/hooks/usePlanner';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useInsights } from '@/hooks/useInsights';
import { syncPendingReminders, syncSchedule } from '@/services/notifications';
import { todayISO } from '@/utils/date';

/** Notifications are rebuilt from these settings every time they change. */
export default function NotificationSettings() {
  const theme = useTheme();
  const router = useRouter();
  const preferences = usePreferences();
  const update = useUpdatePreferences();
  const tasks = useTasksForDate(todayISO());
  const { can, upgradeForCapability } = useEntitlements();
  const { insights } = useInsights();
  const proactive = can('PROACTIVE_AI');
  const [status, setStatus] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const p = preferences.data;

  const apply = async (patch: Parameters<typeof update.mutateAsync>[0]) => {
    const next = await update.mutateAsync(patch);
    setBusy(true);
    const result = await syncSchedule(next, tasks.data ?? [], { insights, proactive });
    setBusy(false);
    setDenied(!result.permission);
    setStatus(
      result.permission
        ? `${result.scheduled} notification${result.scheduled === 1 ? '' : 's'} scheduled.`
        : null,
    );
  };

  return (
    <Screen>
      <View style={{ gap: theme.spacing.lg }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
          <Feather name="chevron-left" size={24} color={theme.colors.text} />
        </Pressable>
        <Text variant="title1">Notifications</Text>
        <Text variant="callout" color="secondary">
          Three moments, not a stream: a briefing in the morning, a nudge before things
          with a fixed time, and the reset at the end of the day.
        </Text>

        {denied ? (
          <Banner
            tone="warning"
            title="Notifications are off at the system level"
            body="Turn them on for this app in your device settings, then come back."
          />
        ) : status ? (
          <Banner tone="success" title={status} onDismiss={() => setStatus(null)} />
        ) : null}

        <Card padded={false} style={{ paddingHorizontal: theme.spacing.base }}>
          <Row
            icon="bell"
            label="Allow notifications"
            toggle={p?.notifications_enabled ?? true}
            onToggle={(notifications_enabled) => void apply({ notifications_enabled })}
          />
          <Row
            icon="sunrise"
            label="Morning briefing"
            toggle={p?.morning_brief_enabled ?? true}
            onToggle={(morning_brief_enabled) => void apply({ morning_brief_enabled })}
          />
          <Row
            icon="moon"
            label="Daily reset"
            toggle={p?.daily_reset_enabled ?? true}
            onToggle={(daily_reset_enabled) => void apply({ daily_reset_enabled })}
          />
          <Row
            icon="clock"
            label="Reminders before timed tasks"
            toggle={p?.task_reminders_enabled ?? true}
            onToggle={(task_reminders_enabled) => void apply({ task_reminders_enabled })}
          />
          <Row
            icon="calendar"
            label="Weekly review"
            toggle={p?.weekly_review_enabled ?? true}
            onToggle={(weekly_review_enabled) => void apply({ weekly_review_enabled })}
            last
          />
        </Card>

        <View>
          <SectionHeader title="Proactive assistance" />
          <Card>
            <Text variant="body" color={proactive ? 'primary' : 'tertiary'}>
              {proactive
                ? 'On. When something is drifting or a week stops fitting, your planner reaches out once — never more than once a day, and never at night.'
                : `Your planner still notices these things and shows them in the app. Reaching out about them is part of ${upgradeForCapability('PROACTIVE_AI')?.name ?? 'a higher plan'}.`}
            </Text>
            {!proactive ? (
              <Button
                label="See plans"
                size="sm"
                variant="secondary"
                style={{ marginTop: 12 }}
                onPress={() => router.push('/paywall')}
              />
            ) : null}
          </Card>
        </View>

        <View>
          <SectionHeader title="Timing" />
          <Card>
            <View style={{ gap: theme.spacing.lg }}>
              <TimeField
                label="Morning briefing at"
                value={p?.morning_brief_time?.slice(0, 5) ?? null}
                onChange={(morning_brief_time) =>
                  morning_brief_time && void apply({ morning_brief_time })
                }
              />
              <TimeField
                label="Daily reset at"
                value={p?.daily_reset_time?.slice(0, 5) ?? null}
                onChange={(daily_reset_time) => daily_reset_time && void apply({ daily_reset_time })}
              />
            </View>
          </Card>
        </View>

        <Button
          label="Rebuild my schedule"
          variant="secondary"
          full
          loading={busy}
          onPress={async () => {
            setBusy(true);
            const result = await syncSchedule(p ?? null, tasks.data ?? [], { insights, proactive });
            const reminders = await syncPendingReminders();
            setBusy(false);
            setDenied(!result.permission);
            if (result.permission) {
              setStatus(`${result.scheduled + reminders} notification${result.scheduled + reminders === 1 ? '' : 's'} scheduled.`);
            }
          }}
        />
      </View>
    </Screen>
  );
}
