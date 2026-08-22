import { supabase } from '@/lib/supabase';
import { toAppError } from '@/lib/errors';
import type { AiConversation, AiMessage, ConversationKind } from '@/types/database';

export async function fetchConversations(limit = 30): Promise<AiConversation[]> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('*')
    .eq('archived', false)
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw toAppError(error);
  return data ?? [];
}

/** The most recent conversation of a kind, so returning to Talk resumes context. */
export async function fetchLatestConversation(kind?: ConversationKind): Promise<AiConversation | null> {
  let query = supabase.from('ai_conversations').select('*').eq('archived', false);
  if (kind) query = query.eq('kind', kind);
  const { data, error } = await query.order('updated_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw toAppError(error);
  return data;
}

export async function fetchMessages(conversationId: string): Promise<AiMessage[]> {
  const { data, error } = await supabase
    .from('ai_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at');
  if (error) throw toAppError(error);
  return data ?? [];
}

export async function createConversation(kind: ConversationKind, title?: string): Promise<AiConversation> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .insert({ kind, title: title ?? null })
    .select('*')
    .single();
  if (error) throw toAppError(error);
  return data;
}

export async function deleteConversation(id: string): Promise<void> {
  const { error } = await supabase.from('ai_conversations').delete().eq('id', id);
  if (error) throw toAppError(error);
}
