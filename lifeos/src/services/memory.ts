import { supabase } from '@/lib/supabase';
import { toAppError } from '@/lib/errors';
import type { AiMemory } from '@/types/database';

export async function fetchMemory(): Promise<AiMemory[]> {
  const { data, error } = await supabase
    .from('ai_memory')
    .select('*')
    .order('importance', { ascending: false })
    .order('updated_at', { ascending: false });
  if (error) throw toAppError(error);
  return data ?? [];
}

export async function updateMemory(id: string, patch: Partial<AiMemory>): Promise<AiMemory> {
  const { data, error } = await supabase.from('ai_memory').update(patch).eq('id', id).select('*').single();
  if (error) throw toAppError(error);
  return data;
}

export async function deleteMemory(id: string): Promise<void> {
  const { error } = await supabase.from('ai_memory').delete().eq('id', id);
  if (error) throw toAppError(error);
}

/** Deletes every conversation and memory without touching plans or the account. */
export async function forgetEverything(): Promise<void> {
  const { error } = await supabase.rpc('forget_everything');
  if (error) throw toAppError(error);
}
