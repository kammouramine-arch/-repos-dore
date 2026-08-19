import { supabase } from '@/lib/supabase';
import { toAppError } from '@/lib/errors';
import type { Goal, GoalMilestone } from '@/types/database';

export async function fetchGoals(status?: Goal['status'] | 'all'): Promise<Goal[]> {
  let query = supabase.from('goals').select('*');
  if (!status || status === 'all') query = query.neq('status', 'archived');
  else query = query.eq('status', status);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw toAppError(error);
  return data ?? [];
}

export async function fetchGoal(id: string): Promise<Goal | null> {
  const { data, error } = await supabase.from('goals').select('*').eq('id', id).maybeSingle();
  if (error) throw toAppError(error);
  return data;
}

export async function createGoal(input: Partial<Goal>): Promise<Goal> {
  const { data, error } = await supabase.from('goals').insert(input).select('*').single();
  if (error) throw toAppError(error);
  return data;
}

export async function updateGoal(id: string, patch: Partial<Goal>): Promise<Goal> {
  const { data, error } = await supabase.from('goals').update(patch).eq('id', id).select('*').single();
  if (error) throw toAppError(error);
  return data;
}

export async function deleteGoal(id: string): Promise<void> {
  const { error } = await supabase.from('goals').delete().eq('id', id);
  if (error) throw toAppError(error);
}

export async function fetchMilestones(goalId: string): Promise<GoalMilestone[]> {
  const { data, error } = await supabase
    .from('goal_milestones')
    .select('*')
    .eq('goal_id', goalId)
    .order('sort_order');
  if (error) throw toAppError(error);
  return data ?? [];
}

export async function createMilestone(input: Partial<GoalMilestone>): Promise<GoalMilestone> {
  const { data, error } = await supabase.from('goal_milestones').insert(input).select('*').single();
  if (error) throw toAppError(error);
  return data;
}

export async function toggleMilestone(id: string, isDone: boolean): Promise<GoalMilestone> {
  const { data, error } = await supabase
    .from('goal_milestones')
    .update({ is_done: isDone, completed_at: isDone ? new Date().toISOString() : null })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw toAppError(error);
  return data;
}

export async function deleteMilestone(id: string): Promise<void> {
  const { error } = await supabase.from('goal_milestones').delete().eq('id', id);
  if (error) throw toAppError(error);
}
