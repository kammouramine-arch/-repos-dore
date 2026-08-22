import { supabase } from '@/lib/supabase';
import { toAppError } from '@/lib/errors';
import type { Reflection } from '@/types/database';

export async function fetchReflections(limit = 30): Promise<Reflection[]> {
  const { data, error } = await supabase
    .from('reflections')
    .select('*')
    .order('date', { ascending: false })
    .limit(limit);
  if (error) throw toAppError(error);
  return data ?? [];
}

export async function createReflection(input: Partial<Reflection>): Promise<Reflection> {
  const { data, error } = await supabase.from('reflections').insert(input).select('*').single();
  if (error) throw toAppError(error);
  return data;
}
