import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  createConversation,
  fetchLatestConversation,
  fetchMessages,
} from '@/services/conversations';
import { resolveAction, sendMessage, type AiMode } from '@/services/ai';
import { track } from '@/services/analytics';
import { AppError } from '@/lib/errors';
import type { AiActionReceipt, AiMessage, ConversationKind } from '@/types/database';
import { useAuth } from '@/state/AuthProvider';

type Draft = AiMessage & { pending?: boolean };

/**
 * Drives one conversation. The user's message appears immediately, the assistant's
 * reply arrives with its receipts, and a failure leaves the transcript honest — the
 * user's line stays, and the error is shown rather than a fabricated answer.
 */
export function useConversation(options: {
  kind: ConversationKind;
  mode: AiMode;
  autoStart?: string;
  /** Runs the conversation as a specialised agent. */
  agent?: string;
  /** Starts a new conversation each time instead of resuming the last one. */
  fresh?: boolean;
}) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const started = useRef(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      if (options.fresh) {
        setConversationId(null);
        setMessages([]);
        return;
      }
      const existing = await fetchLatestConversation(options.kind);
      if (existing) {
        setConversationId(existing.id);
        setMessages(await fetchMessages(existing.id));
      } else {
        setConversationId(null);
        setMessages([]);
      }
    } catch (e) {
      setError(e instanceof AppError ? e : new AppError('Could not load this conversation.'));
    } finally {
      setLoading(false);
    }
  }, [options.fresh, options.kind, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || thinking) return;

      setError(null);
      const localId = `local-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: localId,
          user_id: userId ?? '',
          conversation_id: conversationId ?? '',
          role: 'user',
          content: trimmed,
          actions: [],
          suggestions: [],
          input_tokens: null,
          output_tokens: null,
          created_at: new Date().toISOString(),
        },
      ]);
      setThinking(true);

      try {
        const reply = await sendMessage({
          message: trimmed,
          conversationId,
          mode: options.mode,
          kind: options.kind,
          agent: options.agent,
        });
        setConversationId(reply.conversation_id);
        setMessages((prev) => [
          ...prev,
          {
            id: reply.message.id,
            user_id: userId ?? '',
            conversation_id: reply.conversation_id,
            role: 'assistant',
            content: reply.message.content,
            actions: reply.message.actions ?? [],
            suggestions: reply.message.suggestions ?? [],
            input_tokens: null,
            output_tokens: null,
            created_at: reply.message.created_at,
          },
        ]);
        track('ai_message_sent', { mode: options.mode });
        // Anything the assistant changed should show up across the app immediately.
        if ((reply.message.actions ?? []).some((a) => a.status === 'succeeded')) {
          void queryClient.invalidateQueries();
        }
      } catch (e) {
        setError(e instanceof AppError ? e : new AppError('The assistant is unreachable.'));
      } finally {
        setThinking(false);
      }
    },
    [conversationId, options.agent, options.kind, options.mode, queryClient, thinking, userId],
  );

  /** Approve or cancel an action the assistant proposed but did not perform. */
  const resolve = useCallback(
    async (messageId: string, actionIndex: number, approve: boolean) => {
      try {
        const actions = await resolveAction({ messageId, actionIndex, approve });
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, actions } : m)),
        );
        if (approve) {
          track('ai_action_confirmed');
          void queryClient.invalidateQueries();
        }
      } catch (e) {
        setError(e instanceof AppError ? e : new AppError('Could not complete that action.'));
      }
    },
    [queryClient],
  );

  /** Opens a fresh conversation of this kind. */
  const startNew = useCallback(async () => {
    const created = await createConversation(options.kind);
    setConversationId(created.id);
    setMessages([]);
  }, [options.kind]);

  // Some entry points (Daily Reset, Life Reset) open with a first message already sent.
  useEffect(() => {
    if (!options.autoStart || loading || started.current || messages.length > 0) return;
    started.current = true;
    void send(options.autoStart);
  }, [loading, messages.length, options.autoStart, send]);

  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
  const pendingActions: { messageId: string; index: number; action: AiActionReceipt }[] =
    lastAssistant
      ? (lastAssistant.actions ?? [])
          .map((action, index) => ({ messageId: lastAssistant.id, index, action }))
          .filter((entry) => entry.action.status === 'awaiting_confirmation')
      : [];

  return {
    conversationId,
    messages,
    loading,
    thinking,
    error,
    send,
    resolve,
    startNew,
    reload: load,
    suggestions: lastAssistant?.suggestions ?? [],
    pendingActions,
    clearError: () => setError(null),
  };
}
