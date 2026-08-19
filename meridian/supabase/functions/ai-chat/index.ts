// deno-lint-ignore-file no-explicit-any
import Anthropic from '@anthropic-ai/sdk';
import { corsHeaders, fail, json, preflight } from '../_shared/http.ts';
import { adminClient, requireUser } from '../_shared/supabase.ts';
import { buildContext } from '../_shared/context.ts';
import { contextBlock, identityBlock, type Mode } from '../_shared/prompt.ts';
import { executeTool } from '../_shared/executor.ts';
import { anthropicTools, describeAction, isToolName, requiresConfirmation } from '../_shared/tools.ts';
import { AI_EFFORT_DEFAULT, AI_MODEL_DEFAULT, FREE_LIMITS } from '../_shared/limits.ts';

/**
 * The assistant endpoint.
 *
 * Everything that matters happens here rather than on the device: the API key stays
 * server side, the model can only call the tools declared in _shared/tools.ts, every
 * argument is validated before it reaches the database, and each executed call is
 * written back as a receipt so the app can show what actually happened — never a
 * claim the model made about itself.
 */

const MAX_TOOL_ROUNDS = 8;
const HISTORY_LIMIT = 24;

type ActionReceipt = {
  tool: string;
  status: 'succeeded' | 'failed' | 'awaiting_confirmation' | 'rejected';
  summary: string;
  entity_id?: string | null;
  entity_type?: string | null;
  error?: string | null;
  /** Stored so a confirmed action replays exactly what was proposed. */
  input?: Record<string, unknown>;
};

let refusalFallbackEnabled = (Deno.env.get('AI_REFUSAL_FALLBACK') ?? 'true') !== 'false';

function suggestFollowUps(mode: Mode, receipts: ActionReceipt[]): string[] {
  if (receipts.some((r) => r.status === 'awaiting_confirmation')) return ['Yes, do it', 'No, leave it'];
  switch (mode) {
    case 'plan_day':
      return ['Make today lighter', 'Move something', 'What should I start with?'];
    case 'plan_week':
      return ['Rebalance the week', 'What am I at risk of dropping?'];
    case 'daily_reset':
      return ['Plan tomorrow', 'Tomorrow should be lighter'];
    case 'onboarding':
      return ['That sounds right', 'Change something'];
    case 'life_reset':
      return ['Build the 90-day plan', 'Start with this week'];
    default:
      return ['Plan my day', 'What should I focus on?', "I don't know what to do"];
  }
}

Deno.serve(async (req) => {
  const cors = preflight(req);
  if (cors) return cors;
  if (req.method !== 'POST') return fail('method_not_allowed', 'Use POST', 405);

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return fail(
      'ai_not_configured',
      'The assistant is not configured on the server. Set ANTHROPIC_API_KEY as a Supabase secret.',
      503,
    );
  }

  const { client: db, user, error: authError } = await requireUser(req);
  if (!db || !user) return fail('unauthorized', authError ?? 'Not authenticated', 401);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return fail('bad_request', 'Body must be JSON');
  }

  const mode: Mode = (body.mode ?? 'chat') as Mode;
  const offset = Number.isFinite(body.timezone_offset_minutes) ? Number(body.timezone_offset_minutes) : 0;
  const context = await buildContext(db, offset);
  const execCtx = {
    db,
    userId: user.id,
    today: context.today,
    weekStart: context.weekStart,
    tier: context.tier,
  };

  // ---------------------------------------------------------- confirmation --
  // Approving a proposed action replays it from the stored receipt, so what runs is
  // exactly what the user saw — the client cannot smuggle in different arguments.
  if (body.approve || body.reject) {
    const req_ = body.approve ?? body.reject;
    const approving = Boolean(body.approve);
    const { data: message, error } = await db
      .from('ai_messages')
      .select('id, actions, conversation_id')
      .eq('id', req_.message_id)
      .maybeSingle();
    if (error || !message) return fail('not_found', 'That message no longer exists', 404);

    const actions = (message.actions ?? []) as ActionReceipt[];
    const action = actions[req_.action_index];
    if (!action) return fail('not_found', 'That action no longer exists', 404);
    if (action.status !== 'awaiting_confirmation') {
      return json({ conversation_id: message.conversation_id, actions, already_resolved: true });
    }

    if (!approving) {
      actions[req_.action_index] = { ...action, status: 'rejected', summary: `Cancelled: ${action.summary}` };
    } else if (!isToolName(action.tool)) {
      actions[req_.action_index] = { ...action, status: 'failed', summary: 'Unknown action', error: 'unknown_tool' };
    } else {
      const result = await executeTool(execCtx, action.tool, action.input ?? {});
      actions[req_.action_index] = {
        ...action,
        status: result.ok ? 'succeeded' : 'failed',
        summary: result.summary,
        entity_id: result.entityId ?? null,
        entity_type: result.entityType ?? null,
        error: result.ok ? null : (result.error ?? 'failed'),
      };
    }

    await db.from('ai_messages').update({ actions }).eq('id', message.id);
    return json({ conversation_id: message.conversation_id, actions });
  }

  const userText = String(body.message ?? '').slice(0, 8000).trim();
  if (!userText) return fail('bad_request', 'Message is empty');

  // ----------------------------------------------------------------- quota --
  const admin = adminClient();
  if (context.tier === 'free') {
    const { data: usage } = await admin
      .from('ai_usage')
      .select('message_count')
      .eq('user_id', user.id)
      .eq('date', context.today)
      .maybeSingle();
    if ((usage?.message_count ?? 0) >= FREE_LIMITS.aiMessagesPerDay) {
      return fail(
        'quota_exceeded',
        `You have used your ${FREE_LIMITS.aiMessagesPerDay} conversations for today. Pro removes the limit.`,
        402,
      );
    }
  }

  // ---------------------------------------------------------- conversation --
  let conversationId: string | null = body.conversation_id ?? null;
  if (conversationId) {
    const { data } = await db.from('ai_conversations').select('id').eq('id', conversationId).maybeSingle();
    if (!data) conversationId = null;
  }
  if (!conversationId) {
    const { data, error } = await db
      .from('ai_conversations')
      .insert({ kind: body.kind ?? 'general', title: userText.slice(0, 60) })
      .select('id')
      .single();
    if (error || !data) return fail('db_error', error?.message ?? 'Could not start a conversation', 500);
    conversationId = data.id as string;
  }

  const { error: userMsgError } = await db.from('ai_messages').insert({
    conversation_id: conversationId,
    role: 'user',
    content: userText,
  });
  if (userMsgError) return fail('db_error', userMsgError.message, 500);

  const { data: history } = await db
    .from('ai_messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(HISTORY_LIMIT);

  const messages: any[] = (history ?? [])
    .filter((m) => m.content && String(m.content).trim().length > 0)
    .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content) }));
  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    messages.push({ role: 'user', content: userText });
  }

  // ------------------------------------------------------------ model loop --
  const anthropic = new Anthropic({ apiKey });
  const model = Deno.env.get('AI_MODEL') ?? AI_MODEL_DEFAULT;
  const effort = Deno.env.get('AI_EFFORT') ?? AI_EFFORT_DEFAULT;
  const tools = anthropicTools();

  // Stable half first so the prefix caches across turns; volatile context after.
  const aiName = Deno.env.get('AI_NAME') ?? 'Meridian';
  const system = [
    {
      type: 'text',
      text: identityBlock({ aiName, mode, tier: context.tier }),
      cache_control: { type: 'ephemeral' },
    },
    { type: 'text', text: contextBlock(context.text) },
  ];

  const callModel = async (payload: any) => {
    if (refusalFallbackEnabled) {
      try {
        return await anthropic.beta.messages.create({
          ...payload,
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
        });
      } catch (e: any) {
        // If the account is not enrolled in the beta, fall back to the standard call
        // for this and every later request in this isolate.
        const message = String(e?.message ?? '');
        if (e?.status === 400 && /fallback|beta/i.test(message)) refusalFallbackEnabled = false;
        else throw e;
      }
    }
    return await anthropic.messages.create(payload);
  };

  const receipts: ActionReceipt[] = [];
  let assistantText = '';
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const response: any = await callModel({
        model,
        max_tokens: 8000,
        system,
        messages,
        tools,
        thinking: { type: 'adaptive' },
        output_config: { effort },
      });

      inputTokens += response.usage?.input_tokens ?? 0;
      outputTokens += response.usage?.output_tokens ?? 0;

      const text = (response.content ?? [])
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text)
        .join('\n')
        .trim();
      if (text) assistantText = text;

      if (response.stop_reason === 'refusal') {
        assistantText =
          assistantText ||
          "I can't help with that one. If it's something else about your plans, I'm here.";
        break;
      }

      const toolUses = (response.content ?? []).filter((b: any) => b.type === 'tool_use');
      if (response.stop_reason !== 'tool_use' || toolUses.length === 0) break;

      // Thinking and tool_use blocks must be echoed back unchanged.
      messages.push({ role: 'assistant', content: response.content });

      const results: any[] = [];
      for (const use of toolUses) {
        const name = String(use.name);
        if (!isToolName(name)) {
          results.push({
            type: 'tool_result',
            tool_use_id: use.id,
            is_error: true,
            content: `Unknown tool "${name}".`,
          });
          continue;
        }

        if (requiresConfirmation(name)) {
          const summary = describeAction(name, use.input ?? {});
          receipts.push({
            tool: name,
            status: 'awaiting_confirmation',
            summary,
            input: use.input ?? {},
          });
          results.push({
            type: 'tool_result',
            tool_use_id: use.id,
            content: JSON.stringify({
              status: 'awaiting_confirmation',
              note:
                'NOT DONE. The user must approve this first. Tell them what you plan to do and ask for confirmation. Do not say it is done.',
            }),
          });
          continue;
        }

        const result = await executeTool(execCtx, name, use.input);
        if (result.error === 'requires_pro') {
          receipts.push({
            tool: name,
            status: 'failed',
            summary: 'That is a Pro feature',
            error: 'requires_pro',
          });
          results.push({
            type: 'tool_result',
            tool_use_id: use.id,
            is_error: true,
            content: JSON.stringify({
              status: 'requires_pro',
              note: 'This is a Pro feature and was not performed. Say so plainly.',
            }),
          });
          continue;
        }

        receipts.push({
          tool: name,
          status: result.ok ? 'succeeded' : 'failed',
          summary: result.summary,
          entity_id: result.entityId ?? null,
          entity_type: result.entityType ?? null,
          error: result.ok ? null : (result.error ?? 'failed'),
        });
        results.push({
          type: 'tool_result',
          tool_use_id: use.id,
          is_error: !result.ok,
          content: JSON.stringify({
            status: result.ok ? 'succeeded' : 'failed',
            summary: result.summary,
            data: result.data ?? null,
            error: result.error ?? null,
          }).slice(0, 60000),
        });
      }

      messages.push({ role: 'user', content: results });
    }
  } catch (e: any) {
    const status = e?.status ?? 500;
    const code =
      status === 429 ? 'rate_limited' : status === 401 ? 'ai_auth' : 'ai_unavailable';
    // Anything the model already did is real and stays recorded.
    if (receipts.length) {
      await db.from('ai_messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content:
          assistantText ||
          'I made some changes but then lost my connection before I could finish. Here is what went through.',
        actions: receipts,
      });
    }
    return fail(code, 'The assistant is unreachable right now. Your plan is unchanged.', 503);
  }

  if (!assistantText) {
    assistantText = receipts.length
      ? 'Done — the changes are in your plan.'
      : "I didn't catch that. Say it another way?";
  }

  const suggestions = suggestFollowUps(mode, receipts);
  const { data: saved, error: saveError } = await db
    .from('ai_messages')
    .insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: assistantText,
      actions: receipts,
      suggestions,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
    })
    .select('id, created_at')
    .single();
  if (saveError) return fail('db_error', saveError.message, 500);

  await db.from('ai_conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);

  // Usage counter is server-owned so the limit cannot be bypassed by the client.
  await admin.rpc('increment_ai_usage', {
    p_user: user.id,
    p_date: context.today,
    p_input: inputTokens,
    p_output: outputTokens,
  });

  return new Response(
    JSON.stringify({
      conversation_id: conversationId,
      message: {
        id: saved.id,
        role: 'assistant',
        content: assistantText,
        actions: receipts,
        suggestions,
        created_at: saved.created_at,
      },
      tier: context.tier,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
