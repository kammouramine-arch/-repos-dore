import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  fetchConversation,
  fetchLatestConversation,
  fetchMessages,
} from '@/services/conversations';
import { conversationsKey } from '@/hooks/useConversations';
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
  /** Opens this specific conversation instead of resuming the most recent one. */
  conversationId?: string;
}) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const started = useRef(false);
  // Date.now() alone collides when two messages land in the same millisecond, which
  // gives the list duplicate keys.
  const localSeq = useRef(0);
  /*
    Set when the user deliberately starts a new conversation.

    Without it, clearing the ?conversation= param re-runs `load`, which falls back to
    the most recent conversation and silently puts the user right back in the thread
    they just left. This is what makes "new chat" mean new.
  */
  const explicitlyNew = useRef(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      if (options.fresh) {
        setConversationId(null);
        setMessages([]);
        return;
      }
      // An explicit id wins over everything: opening a conversation from history must
      // show that one, not whichever happens to be most recent.
      if (options.conversationId) {
        const opened = await fetchConversation(options.conversationId);
        if (opened) {
          explicitlyNew.current = false;
          setConversationId(opened.id);
          setMessages(await fetchMessages(opened.id));
          return;
        }
      }
      if (explicitlyNew.current) {
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
  }, [options.conversationId, options.fresh, options.kind, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || thinking) return;

      setError(null);
      localSeq.current += 1;
      const localId = `local-${Date.now()}-${localSeq.current}`;
      setMessages((prev) => [
        ...prev,
        {
          id: localId,
          // Dimmed until the server acknowledges it, so a slow network looks slow
          // rather than looking like the message was accepted and lost.
          pending: true,
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
        // The conversation now exists on the server, so resuming it later is correct.
        explicitlyNew.current = false;
        setConversationId(reply.conversation_id);
        setMessages((prev) => [
          ...prev.map((m) =>
            m.id === localId ? { ...m, pending: false, conversation_id: reply.conversation_id } : m,
          ),
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
        // The history list shows previews and ordering by recency, so it is stale the
        // moment a message lands.
        void queryClient.invalidateQueries({ queryKey: conversationsKey });
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

  /**
   * Opens a fresh conversation.
   *
   * Nothing is written yet: ai-chat creates the row when the first message arrives.
   * Inserting one here instead would leave an empty conversation in history every time
   * someone tapped "new chat" and then changed their mind.
   */
  const startNew = useCallback(async () => {
    explicitlyNew.current = true;
    setConversationId(null);
    setMessages([]);
    setError(null);
    started.current = false;
    await queryClient.invalidateQueries({ queryKey: conversationsKey });
  }, [queryClient]);

  /** Loads an existing conversation into this view. */
  const open = useCallback(async (id: string) => {
    explicitlyNew.current = false;
    setLoading(true);
    setError(null);
    try {
      setConversationId(id);
      setMessages(await fetchMessages(id));
    } catch (e) {
      setError(e instanceof AppError ? e : new AppError('Could not open that conversation.'));
    } finally {
      setLoading(false);
    }
  }, []);

  /** Re-sends the last user message, dropping the failed exchange after it. */
  const retry = useCallback(async () => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser || thinking) return;
    setMessages((prev) => {
      const index = prev.findIndex((m) => m.id === lastUser.id);
      return index >= 0 ? prev.slice(0, index) : prev;
    });
    await send(lastUser.content);
  }, [messages, send, thinking]);

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
    open,
    retry,
    reload: load,
    suggestions: lastAssistant?.suggestions ?? [],
    pendingActions,
    clearError: () => setError(null),
  };
}
