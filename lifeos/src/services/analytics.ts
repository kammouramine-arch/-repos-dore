import { supabase } from '@/lib/supabase';
import { env } from '@/config/env';

/**
 * Privacy-conscious product analytics: event names and counts only. No task titles,
 * no goal text, no message content ever leaves the device through this path, and the
 * user can switch it off entirely in Privacy settings.
 */
export type AnalyticsName =
  | 'app_opened'
  | 'signed_up'
  | 'signed_in'
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'first_ai_conversation'
  | 'ai_message_sent'
  | 'ai_action_confirmed'
  | 'goal_created'
  | 'task_created'
  | 'task_completed'
  | 'habit_created'
  | 'habit_logged'
  | 'project_created'
  | 'plan_generated'
  | 'week_planned'
  | 'ninety_day_generated'
  | 'daily_reset_completed'
  | 'weekly_review_completed'
  | 'life_reset_started'
  | 'agent_run_started'
  | 'deep_analysis_run'
  | 'insight_acted'
  | 'paywall_viewed'
  | 'subscription_started';

let enabled = env.analyticsEnabled;

export function setAnalyticsEnabled(value: boolean) {
  enabled = value && env.analyticsEnabled;
}

export function track(name: AnalyticsName, props: Record<string, string | number | boolean> = {}) {
  if (!enabled) return;
  // Fire and forget: analytics must never block or break a user action.
  void supabase
    .from('analytics_events')
    .insert({ name, props })
    .then(() => undefined);
}
