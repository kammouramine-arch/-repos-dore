import { supabase } from '@/lib/supabase';
import { toAppError } from '@/lib/errors';
import type { AiActionReceipt } from '@/types/database';

/**
 * Reports are what a deep analysis, an agent run or a weekly review leaves behind —
 * readable weeks later, without scrolling back through a conversation.
 */
export type AiReport = {
  id: string;
  user_id: string;
  kind: 'deep_analysis' | 'agent_run' | 'weekly_review';
  agent_key: string | null;
  title: string;
  body: string;
  actions: AiActionReceipt[];
  conversation_id: string | null;
  created_at: string;
};

export async function fetchReports(kind?: AiReport['kind'], limit = 20): Promise<AiReport[]> {
  let query = supabase.from('ai_reports').select('*').order('created_at', { ascending: false });
  if (kind) query = query.eq('kind', kind);
  const { data, error } = await query.limit(limit);
  if (error) throw toAppError(error);
  return (data ?? []) as AiReport[];
}

export async function fetchLatestReport(kind: AiReport['kind']): Promise<AiReport | null> {
  const { data, error } = await supabase
    .from('ai_reports')
    .select('*')
    .eq('kind', kind)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw toAppError(error);
  return (data ?? null) as AiReport | null;
}

export async function deleteReport(id: string): Promise<void> {
  const { error } = await supabase.from('ai_reports').delete().eq('id', id);
  if (error) throw toAppError(error);
}
