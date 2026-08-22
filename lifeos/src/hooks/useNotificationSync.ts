import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { syncPendingReminders, syncSchedule } from '@/services/notifications';
import { usePreferences } from './useProfile';
import { useTasksForDate } from './usePlanner';
import { useEntitlements } from './useEntitlements';
import { useInsights } from './useInsights';
import { todayISO } from '@/utils/date';

/**
 * Keeps the device's scheduled notifications in step with the plan: rebuilt when the
 * app opens and whenever today's tasks or the user's preferences change. Reminders the
 * assistant created server-side are picked up here too.
 */
export function useNotificationSync() {
  const preferences = usePreferences();
  const tasks = useTasksForDate(todayISO());
  const { can } = useEntitlements();
  const { insights } = useInsights();
  const proactive = can('PROACTIVE_AI');
  const signature = useRef<string>('');

  useEffect(() => {
    if (!preferences.data) return;

    const next = JSON.stringify({
      notifications: preferences.data.notifications_enabled,
      brief: [preferences.data.morning_brief_enabled, preferences.data.morning_brief_time],
      reset: [preferences.data.daily_reset_enabled, preferences.data.daily_reset_time],
      reminders: preferences.data.task_reminders_enabled,
      weekly: preferences.data.weekly_review_enabled,
      tasks: (tasks.data ?? [])
        .filter((t) => t.scheduled_time && t.status === 'todo')
        .map((t) => `${t.id}:${t.scheduled_time}`),
      proactive,
      raised: insights.filter((i) => i.severity !== 'info').map((i) => i.fingerprint),
    });
    if (next === signature.current) return;
    signature.current = next;

    void syncSchedule(preferences.data, tasks.data ?? [], { insights, proactive });
    void syncPendingReminders();
  }, [preferences.data, tasks.data, insights, proactive]);

  // Coming back to the app is the right moment to catch up on anything scheduled elsewhere.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncPendingReminders();
    });
    return () => subscription.remove();
  }, []);
}
