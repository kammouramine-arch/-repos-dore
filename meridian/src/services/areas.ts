import { supabase } from '@/lib/supabase';
import { toAppError } from '@/lib/errors';
import type { LifeArea, LifeProgressRow } from '@/types/database';

export async function fetchAreas(): Promise<LifeArea[]> {
  const { data, error } = await supabase
    .from('life_areas')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw toAppError(error);
  return data ?? [];
}

export async function createArea(input: Partial<LifeArea>): Promise<LifeArea> {
  const { data, error } = await supabase.from('life_areas').insert(input).select('*').single();
  if (error) throw toAppError(error);
  return data;
}

export async function updateArea(id: string, patch: Partial<LifeArea>): Promise<LifeArea> {
  const { data, error } = await supabase.from('life_areas').update(patch).eq('id', id).select('*').single();
  if (error) throw toAppError(error);
  return data;
}

export async function fetchLifeProgress(): Promise<LifeProgressRow[]> {
  const { data, error } = await supabase.rpc('get_life_progress');
  if (error) throw toAppError(error);
  return (data ?? []) as LifeProgressRow[];
}
