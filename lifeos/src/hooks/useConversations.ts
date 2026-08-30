import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  archiveConversation,
  deleteConversation,
  fetchConversationSummaries,
  renameConversation,
  type ConversationSummary,
} from '@/services/conversations';
import { useAuth } from '@/state/AuthProvider';

export const conversationsKey = ['conversations'] as const;

/**
 * The conversation history list.
 *
 * Conversations were already being persisted to Supabase — every one of them — but
 * nothing ever read them back, so each new chat silently buried the last. This is the
 * surface that was missing, not the storage.
 */
export function useConversations() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery<ConversationSummary[]>({
    queryKey: conversationsKey,
    queryFn: () => fetchConversationSummaries(),
    // Only signed-in users have conversations; without this the query runs during the
    // auth handshake and returns an empty list that looks like "no history".
    enabled: Boolean(userId),
    staleTime: 30_000,
  });

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: conversationsKey }),
    [queryClient],
  );

  const rename = useCallback(
    async (id: string, title: string) => {
      // Optimistic: renaming should feel instant, and the row is already on screen.
      queryClient.setQueryData<ConversationSummary[]>(conversationsKey, (prev) =>
        prev?.map((c) => (c.id === id ? { ...c, title: title.trim() || null } : c)),
      );
      try {
        await renameConversation(id, title);
      } finally {
        await refresh();
      }
    },
    [queryClient, refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      queryClient.setQueryData<ConversationSummary[]>(conversationsKey, (prev) =>
        prev?.filter((c) => c.id !== id),
      );
      try {
        await deleteConversation(id);
      } finally {
        await refresh();
      }
    },
    [queryClient, refresh],
  );

  const archive = useCallback(
    async (id: string) => {
      queryClient.setQueryData<ConversationSummary[]>(conversationsKey, (prev) =>
        prev?.filter((c) => c.id !== id),
      );
      try {
        await archiveConversation(id);
      } finally {
        await refresh();
      }
    },
    [queryClient, refresh],
  );

  return {
    conversations: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    refreshing: query.isFetching && !query.isLoading,
    refresh,
    rename,
    remove,
    archive,
  };
}
