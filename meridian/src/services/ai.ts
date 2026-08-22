import { supabase } from '@/lib/supabase';
import { AI_UNAVAILABLE_MESSAGE, AppError } from '@/lib/errors';
import type { AiActionReceipt, ConversationKind } from '@/types/database';

/**
 * Client side of the assistant. The device never talks to a model provider directly —
 * it calls our edge function, which holds the key, validates every tool call and
 * returns receipts describing what actually happened.
 */

export type AiMode =
  | 'chat'
  | 'onboarding'
  | 'plan_day'
  | 'plan_week'
  | 'daily_reset'
  | 'life_reset'
  | 'ninety_day'
  | 'morning_brief';

export type AiReply = {
  conversation_id: string;
  message: {
    id: string;
    role: 'assistant';
    content: string;
    actions: AiActionReceipt[];
    suggestions: string[];
    created_at: string;
  };
  plan: { tier: string; name: string; status: string };
  usage: { spent: Record<string, number>; period_end: string };
  /** Which model actually served the request, for the plan screen. */
  model: string;
};

type EdgeError = {
  error?: {
    code?: string;
    message?: string;
    meter?: string | null;
    operation?: string | null;
    upgrade_to?: string | null;
    upgrade_name?: string | null;
    period_end?: string | null;
  };
};

/**
 * An entitlement or allowance failure carries what the UI needs to offer the right
 * upgrade: which meter ran out, which plan raises it, and when it resets.
 */
export class LimitError extends AppError {
  readonly meter: string | null;
  readonly upgradeTo: string | null;
  readonly upgradeName: string | null;
  readonly resetsAt: string | null;

  constructor(
    message: string,
    code: string,
    details: { meter?: string | null; upgradeTo?: string | null; upgradeName?: string | null; resetsAt?: string | null },
  ) {
    super(message, code, false);
    this.name = 'LimitError';
    this.meter = details.meter ?? null;
    this.upgradeTo = details.upgradeTo ?? null;
    this.upgradeName = details.upgradeName ?? null;
    this.resetsAt = details.resetsAt ?? null;
  }
}

/** Turns an edge-function failure into an error the UI can explain. */
async function toEdgeError(error: unknown): Promise<AppError> {
  const context = (error as { context?: Response })?.context;
  if (context && typeof context.json === 'function') {
    try {
      const body = (await context.json()) as EdgeError;
      const code = body.error?.code ?? 'ai_unavailable';
      const message = body.error?.message ?? AI_UNAVAILABLE_MESSAGE;

      if (code === 'quota_exceeded' || code === 'not_entitled') {
        return new LimitError(message, code, {
          meter: body.error?.meter,
          upgradeTo: body.error?.upgrade_to,
          upgradeName: body.error?.upgrade_name,
          resetsAt: body.error?.period_end,
        });
      }
      return new AppError(message, code, code !== 'ai_not_configured');
    } catch {
      /* fall through to the generic message */
    }
  }
  return new AppError(AI_UNAVAILABLE_MESSAGE, 'ai_unavailable');
}

const offsetMinutes = () => -new Date().getTimezoneOffset();

export async function sendMessage(input: {
  message: string;
  conversationId?: string | null;
  mode?: AiMode;
  kind?: ConversationKind;
}): Promise<AiReply> {
  const { data, error } = await supabase.functions.invoke<AiReply>('ai-chat', {
    body: {
      message: input.message,
      conversation_id: input.conversationId ?? null,
      mode: input.mode ?? 'chat',
      kind: input.kind ?? 'general',
      timezone_offset_minutes: offsetMinutes(),
    },
  });
  if (error) throw await toEdgeError(error);
  if (!data) throw new AppError(AI_UNAVAILABLE_MESSAGE, 'ai_unavailable');
  return data;
}

/**
 * Approves (or cancels) an action the assistant proposed. The arguments are replayed
 * from what was stored server side, so approving cannot change what runs.
 */
export async function resolveAction(input: {
  messageId: string;
  actionIndex: number;
  approve: boolean;
}): Promise<AiActionReceipt[]> {
  const key = input.approve ? 'approve' : 'reject';
  const { data, error } = await supabase.functions.invoke<{ actions: AiActionReceipt[] }>('ai-chat', {
    body: {
      [key]: { message_id: input.messageId, action_index: input.actionIndex },
      timezone_offset_minutes: offsetMinutes(),
    },
  });
  if (error) throw await toEdgeError(error);
  return data?.actions ?? [];
}

export async function generateMorningBrief(): Promise<{ date: string; headline: string; brief: string }> {
  const { data, error } = await supabase.functions.invoke<{ date: string; headline: string; brief: string }>(
    'daily-brief',
    { body: { timezone_offset_minutes: offsetMinutes() } },
  );
  if (error) throw await toEdgeError(error);
  if (!data) throw new AppError(AI_UNAVAILABLE_MESSAGE, 'ai_unavailable');
  return data;
}

/**
 * Uploads a recording for transcription. Returns null when the server has no
 * transcription provider configured — the caller then tells the user plainly
 * instead of pretending the recording was understood.
 */
export async function transcribe(uri: string, durationSeconds?: number): Promise<string | null> {
  const form = new FormData();
  form.append('file', {
    uri,
    name: 'speech.m4a',
    type: 'audio/m4a',
  } as unknown as Blob);
  // Voice is metered by the second; the server floors this against the upload size.
  if (durationSeconds && durationSeconds > 0) {
    form.append('duration_seconds', String(Math.ceil(durationSeconds)));
  }

  const { data, error } = await supabase.functions.invoke<{ text: string }>('transcribe', {
    body: form,
  });
  if (error) {
    const appError = await toEdgeError(error);
    if (appError.code === 'transcription_not_configured') return null;
    throw appError;
  }
  return data?.text ?? '';
}
