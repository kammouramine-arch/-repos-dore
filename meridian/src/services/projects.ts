import { supabase } from '@/lib/supabase';
import { toAppError } from '@/lib/errors';
import type { Project, ProjectMilestone } from '@/types/database';

export async function fetchProjects(status?: Project['status'] | 'all'): Promise<Project[]> {
  let query = supabase.from('projects').select('*');
  if (!status || status === 'all') query = query.neq('status', 'archived');
  else query = query.eq('status', status);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw toAppError(error);
  return data ?? [];
}

export async function fetchProject(id: string): Promise<Project | null> {
  const { data, error } = await supabase.from('projects').select('*').eq('id', id).maybeSingle();
  if (error) throw toAppError(error);
  return data;
}

export async function createProject(input: Partial<Project>): Promise<Project> {
  const { data, error } = await supabase.from('projects').insert(input).select('*').single();
  if (error) throw toAppError(error);
  return data;
}

export async function updateProject(id: string, patch: Partial<Project>): Promise<Project> {
  const { data, error } = await supabase.from('projects').update(patch).eq('id', id).select('*').single();
  if (error) throw toAppError(error);
  return data;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw toAppError(error);
}

export async function fetchProjectMilestones(projectId: string): Promise<ProjectMilestone[]> {
  const { data, error } = await supabase
    .from('project_milestones')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order');
  if (error) throw toAppError(error);
  return data ?? [];
}

export async function createProjectMilestone(
  input: Partial<ProjectMilestone>,
): Promise<ProjectMilestone> {
  const { data, error } = await supabase.from('project_milestones').insert(input).select('*').single();
  if (error) throw toAppError(error);
  return data;
}

export async function toggleProjectMilestone(id: string, isDone: boolean): Promise<ProjectMilestone> {
  const { data, error } = await supabase
    .from('project_milestones')
    .update({ is_done: isDone, completed_at: isDone ? new Date().toISOString() : null })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw toAppError(error);
  return data;
}
