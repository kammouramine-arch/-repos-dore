import { supabase } from '@/lib/supabase';
import { toAppError } from '@/lib/errors';
import type { AiConversation, AiMessage, ConversationKind } from '@/types/database';

/** A conversation plus the bit of context a history list needs to be useful. */
export type ConversationSummary = AiConversation & {
  /** First line of the most recent message, for the history row. */
  preview: string | null;
  messageCount: number;
};

export async function fetchConversations(limit = 50): Promise<AiConversation[]> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('*')
    .eq('archived', false)
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw toAppError(error);
  return data ?? [];
}

/**
 * The history list. A row with no preview reads as broken, so the most recent message
 * of each conversation is fetched alongside — in one extra query rather than one per
 * conversation, which would be N+1 and visibly slow once someone has real history.
 */
export async function fetchConversationSummaries(limit = 50): Promise<ConversationSummary[]> {
  const conversations = await fetchConversations(limit);
  if (conversations.length === 0) return [];

  const { data, error } = await supabase
    .from('ai_messages')
    .select('conversation_id, content, created_at')
    .in('conversation_id', conversations.map((c) => c.id))
    .order('created_at', { ascending: false });
  if (error) throw toAppError(error);

  const latest = new Map<string, string>();
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.conversation_id, (counts.get(row.conversation_id) ?? 0) + 1);
    // Rows arrive newest first, so the first one seen per conversation is the latest.
    if (!latest.has(row.conversation_id)) latest.set(row.conversation_id, row.content);
  }

  return (
    conversations
      .map((c) => ({
        ...c,
        preview: latest.get(c.id)?.split('\n').find((l) => l.trim())?.trim() ?? null,
        messageCount: counts.get(c.id) ?? 0,
      }))
      // An empty conversation has nothing to show and nothing to reopen. Rows like this
      // exist from earlier builds that created one on "new chat"; listing them would
      // just be a wall of identical "New conversation" entries.
      .filter((c) => c.messageCount > 0)
  );
}

export async function fetchConversation(id: string): Promise<AiConversation | null> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw toAppError(error);
  return data;
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

export async function renameConversation(id: string, title: string): Promise<AiConversation> {
  const trimmed = title.trim().slice(0, 120);
  const { data, error } = await supabase
    .from('ai_conversations')
    // An empty name is stored as null so the list falls back to a derived title rather
    // than showing a blank row.
    .update({ title: trimmed.length > 0 ? trimmed : null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw toAppError(error);
  return data;
}

export async function deleteConversation(id: string): Promise<void> {
  const { error } = await supabase.from('ai_conversations').delete().eq('id', id);
  if (error) throw toAppError(error);
}

/** Keeps a conversation but removes it from the list. Reversible, unlike deletion. */
export async function archiveConversation(id: string): Promise<void> {
  const { error } = await supabase
    .from('ai_conversations')
    .update({ archived: true, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw toAppError(error);
}

/**
 * What to show as a conversation's name. An untitled conversation takes its first
 * user message, which is what the person actually typed and therefore what they will
 * recognise in a list.
 */
export function conversationTitle(
  conversation: Pick<AiConversation, 'title' | 'kind'>,
  fallbackFrom?: string | null,
): string {
  if (conversation.title?.trim()) return conversation.title.trim();
  const source = fallbackFrom?.trim();
  if (source) {
    const firstLine = source.split('\n').find((l) => l.trim())?.trim() ?? source;
    return firstLine.length > 48 ? `${firstLine.slice(0, 48).trimEnd()}…` : firstLine;
  }
  return 'New conversation';
}
