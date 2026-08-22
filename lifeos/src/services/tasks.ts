import { supabase } from '@/lib/supabase';
import { toAppError } from '@/lib/errors';
import type { Task } from '@/types/database';

export async function fetchTasksForDate(date: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('scheduled_date', date)
    .neq('status', 'cancelled')
    .order('scheduled_time', { ascending: true, nullsFirst: false })
    .order('order_index');
  if (error) throw toAppError(error);
  return data ?? [];
}

export async function fetchTasksInRange(from: string, to: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .gte('scheduled_date', from)
    .lte('scheduled_date', to)
    .neq('status', 'cancelled')
    .order('scheduled_date')
    .order('scheduled_time', { ascending: true, nullsFirst: false });
  if (error) throw toAppError(error);
  return data ?? [];
}

/** Tasks with no date yet — the backlog the planner draws from. */
export async function fetchUnscheduledTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .is('scheduled_date', null)
    .eq('status', 'todo')
    .order('created_at', { ascending: false });
  if (error) throw toAppError(error);
  return data ?? [];
}

export async function fetchTasksForGoal(goalId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('goal_id', goalId)
    .neq('status', 'cancelled')
    .order('scheduled_date', { nullsFirst: false });
  if (error) throw toAppError(error);
  return data ?? [];
}

export async function fetchTasksForProject(projectId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .neq('status', 'cancelled')
    .order('scheduled_date', { nullsFirst: false });
  if (error) throw toAppError(error);
  return data ?? [];
}

export async function createTask(input: Partial<Task>): Promise<Task> {
  const { data, error } = await supabase.from('tasks').insert(input).select('*').single();
  if (error) throw toAppError(error);
  return data;
}

export async function updateTask(id: string, patch: Partial<Task>): Promise<Task> {
  const { data, error } = await supabase.from('tasks').update(patch).eq('id', id).select('*').single();
  if (error) throw toAppError(error);
  return data;
}

export async function setTaskDone(id: string, done: boolean): Promise<Task> {
  return updateTask(id, { status: done ? 'done' : 'todo' });
}

export async function rescheduleTask(id: string, date: string, time?: string | null): Promise<Task> {
  return updateTask(id, { scheduled_date: date, ...(time !== undefined ? { scheduled_time: time } : {}) });
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw toAppError(error);
}
