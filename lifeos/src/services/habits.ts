import { supabase } from '@/lib/supabase';
import { toAppError } from '@/lib/errors';
import type { Habit, HabitLog } from '@/types/database';

export async function fetchHabits(includeInactive = false): Promise<Habit[]> {
  let query = supabase.from('habits').select('*');
  if (!includeInactive) query = query.eq('is_active', true);
  const { data, error } = await query.order('created_at');
  if (error) throw toAppError(error);
  return data ?? [];
}

export async function fetchHabitLogs(from: string, to: string): Promise<HabitLog[]> {
  const { data, error } = await supabase
    .from('habit_logs')
    .select('*')
    .gte('date', from)
    .lte('date', to);
  if (error) throw toAppError(error);
  return data ?? [];
}

export async function createHabit(input: Partial<Habit>): Promise<Habit> {
  const { data, error } = await supabase.from('habits').insert(input).select('*').single();
  if (error) throw toAppError(error);
  return data;
}

export async function updateHabit(id: string, patch: Partial<Habit>): Promise<Habit> {
  const { data, error } = await supabase.from('habits').update(patch).eq('id', id).select('*').single();
  if (error) throw toAppError(error);
  return data;
}

export async function deleteHabit(id: string): Promise<void> {
  const { error } = await supabase.from('habits').delete().eq('id', id);
  if (error) throw toAppError(error);
}

export async function logHabit(
  habitId: string,
  date: string,
  status: HabitLog['status'] = 'done',
): Promise<HabitLog> {
  const { data, error } = await supabase
    .from('habit_logs')
    .upsert({ habit_id: habitId, date, status }, { onConflict: 'habit_id,date' })
    .select('*')
    .single();
  if (error) throw toAppError(error);
  return data;
}

export async function clearHabitLog(habitId: string, date: string): Promise<void> {
  const { error } = await supabase.from('habit_logs').delete().eq('habit_id', habitId).eq('date', date);
  if (error) throw toAppError(error);
}

/** Consecutive completed days ending today (or yesterday). Computed in Postgres. */
export async function fetchStreak(habitId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_habit_streak', { p_habit_id: habitId });
  if (error) return 0;
  return Number(data ?? 0);
}
