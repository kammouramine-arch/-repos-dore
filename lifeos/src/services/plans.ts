import { supabase } from '@/lib/supabase';
import { toAppError } from '@/lib/errors';
import type { DailyPlan, LifePlan, LifePlanItem, WeeklyPlan } from '@/types/database';

export async function fetchDailyPlan(date: string): Promise<DailyPlan | null> {
  const { data, error } = await supabase.from('daily_plans').select('*').eq('date', date).maybeSingle();
  if (error) throw toAppError(error);
  return data;
}

export async function upsertDailyPlan(input: Partial<DailyPlan> & { date: string }): Promise<DailyPlan> {
  const { data, error } = await supabase
    .from('daily_plans')
    .upsert(input, { onConflict: 'user_id,date' })
    .select('*')
    .single();
  if (error) throw toAppError(error);
  return data;
}

export async function fetchWeeklyPlan(weekStart: string): Promise<WeeklyPlan | null> {
  const { data, error } = await supabase
    .from('weekly_plans')
    .select('*')
    .eq('week_start', weekStart)
    .maybeSingle();
  if (error) throw toAppError(error);
  return data;
}

export async function fetchActiveLifePlan(): Promise<LifePlan | null> {
  const { data, error } = await supabase
    .from('life_plans')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw toAppError(error);
  return data;
}

export async function fetchLifePlanItems(lifePlanId: string): Promise<LifePlanItem[]> {
  const { data, error } = await supabase
    .from('life_plan_items')
    .select('*')
    .eq('life_plan_id', lifePlanId)
    .order('horizon')
    .order('position');
  if (error) throw toAppError(error);
  return data ?? [];
}

export async function toggleLifePlanItem(id: string, isDone: boolean): Promise<void> {
  const { error } = await supabase.from('life_plan_items').update({ is_done: isDone }).eq('id', id);
  if (error) throw toAppError(error);
}
