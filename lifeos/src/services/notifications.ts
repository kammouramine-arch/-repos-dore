import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';
import type { Task, UserPreferences } from '@/types/database';
import type { Insight } from '@/utils/insights';
import { fromISODate } from '@/utils/date';

/**
 * Local notifications, scheduled on device. They are deliberately sparse: a morning
 * briefing, an end-of-day reset, and a reminder only for tasks that have a real time.
 * Everything is derived from the user's preferences, and turning a preference off
 * cancels the corresponding notifications immediately.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensurePermission(): Promise<boolean> {
  if (!Device.isDevice) return false;

  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== 'granted') return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Planning',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 120, 80, 120],
    });
  }
  return true;
}

/**
 * Registers for push. Requires an EAS project id; without one we return null rather
 * than pretending remote push is wired up.
 */
export async function registerForPush(): Promise<string | null> {
  const projectId =
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
  if (!projectId || !Device.isDevice) return null;
  if (!(await ensurePermission())) return null;

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch {
    return null;
  }
}

function parseClock(value: string): { hour: number; minute: number } {
  const [h, m] = value.split(':');
  return { hour: Number(h ?? 8), minute: Number(m ?? 0) };
}

export async function cancelAll(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Rebuilds the whole schedule from preferences, today's tasks and — for plans that
 * include proactive assistance — anything the app has noticed that is worth raising
 * before it becomes a problem. Idempotent: it cancels and rebuilds every time.
 */
export async function syncSchedule(
  preferences: UserPreferences | null,
  todaysTasks: Task[],
  options: { insights?: Insight[]; proactive?: boolean } = {},
): Promise<{ scheduled: number; permission: boolean }> {
  const granted = await ensurePermission();
  if (!granted) return { scheduled: 0, permission: false };

  await cancelAll();
  if (!preferences?.notifications_enabled) return { scheduled: 0, permission: true };

  let scheduled = 0;

  if (preferences.morning_brief_enabled) {
    const { hour, minute } = parseClock(preferences.morning_brief_time);
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Your day', body: 'Here is what matters today.', data: { route: '/briefing' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
    });
    scheduled += 1;
  }

  if (preferences.daily_reset_enabled) {
    const { hour, minute } = parseClock(preferences.daily_reset_time);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'How did today go?',
        body: 'Two minutes now makes tomorrow realistic.',
        data: { route: '/daily-reset' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
    });
    scheduled += 1;
  }

  if (preferences.weekly_review_enabled) {
    const { hour, minute } = parseClock(preferences.daily_reset_time);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Your weekly review',
        body: 'Fifteen minutes now makes next week realistic.',
        data: { route: '/weekly-review' },
      },
      // Sunday evening, before the week starts.
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 1,
        hour,
        minute,
      },
    });
    scheduled += 1;
  }

  /*
    Proactive assistance: at most one a day, only for something that actually needs a
    decision, and only on plans that include it. Everything the app notices is still
    visible in the app for everyone — this is the part that reaches out.
  */
  if (options.proactive && preferences.notifications_enabled) {
    const worth = (options.insights ?? []).filter((i) => i.severity !== 'info').slice(0, 1);
    for (const insight of worth) {
      const when = new Date();
      when.setHours(when.getHours() + 2, 0, 0, 0);
      // Never in the middle of the night.
      const { hour: wake } = parseClock(preferences.wake_time);
      if (when.getHours() < wake) when.setHours(wake, 30, 0, 0);
      if (when.getTime() <= Date.now()) continue;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: insight.title,
          body: insight.body,
          data: { route: '/analysis', insight: insight.kind },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
      });
      scheduled += 1;
    }
  }

  if (preferences.task_reminders_enabled) {
    const now = Date.now();
    const timed = todaysTasks
      .filter((t) => t.status === 'todo' && t.scheduled_time && t.scheduled_date)
      .slice(0, 8);

    for (const task of timed) {
      const { hour, minute } = parseClock(task.scheduled_time as string);
      const when = fromISODate(task.scheduled_date as string);
      when.setHours(hour, minute, 0, 0);
      // 15 minutes of warning, and never a notification about a moment that has passed.
      const fireAt = new Date(when.getTime() - 15 * 60 * 1000);
      if (fireAt.getTime() <= now) continue;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: task.title,
          body: `Starts at ${task.scheduled_time?.slice(0, 5)}.`,
          data: { route: '/(tabs)/plan', taskId: task.id },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt },
      });
      scheduled += 1;
    }
  }

  return { scheduled, permission: true };
}

/** Schedules any reminders the assistant created since the last sync. */
export async function syncPendingReminders(): Promise<number> {
  const { data } = await supabase
    .from('notifications')
    .select('id, title, body, scheduled_for, local_identifier')
    .is('local_identifier', null)
    .not('scheduled_for', 'is', null)
    .gte('scheduled_for', new Date().toISOString())
    .limit(20);

  let count = 0;
  for (const row of data ?? []) {
    const date = new Date(row.scheduled_for as string);
    if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) continue;
    const identifier = await Notifications.scheduleNotificationAsync({
      content: { title: row.title, body: row.body ?? undefined },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
    });
    await supabase.from('notifications').update({ local_identifier: identifier }).eq('id', row.id);
    count += 1;
  }
  return count;
}
