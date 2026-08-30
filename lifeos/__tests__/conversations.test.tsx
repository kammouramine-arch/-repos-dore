import React from 'react';
import { Text } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AiConversation, AiMessage } from '@/types/database';
import {
  conversationTitle,
  deleteConversation,
  fetchConversationSummaries,
  renameConversation,
} from '@/services/conversations';
import { useConversation } from '@/hooks/useConversation';
import { groupByAge } from '@/lib/conversationGroups';


/*
  A minimal stand-in for the supabase-js query mockBuilder. The real client is a chain of
  thenables, so the tests assert on the chain that was built — which is how the N+1
  guarantee below is actually verifiable.
*/
type Row = Record<string, unknown>;
const calls: { table: string; op: string; filters: Row[] }[] = [];
let tables: Record<string, Row[]> = {};
let failNext: string | null = null;

function mockBuilder(table: string, op: string) {
  const record = { table, op, filters: [] as Row[] };
  calls.push(record);
  let rows = [...(tables[table] ?? [])];

  const chain: Record<string, any> = {
    select: () => chain,
    insert: (values: Row) => {
      const inserted = { id: `new-${(tables[table] ?? []).length + 1}`, ...values };
      tables[table] = [...(tables[table] ?? []), inserted];
      rows = [inserted];
      return chain;
    },
    update: (values: Row) => {
      tables[table] = (tables[table] ?? []).map((r) =>
        rows.some((m) => m.id === r.id) ? { ...r, ...values } : r,
      );
      rows = rows.map((r) => ({ ...r, ...values }));
      return chain;
    },
    delete: () => {
      chain.__delete = true;
      return chain;
    },
    eq: (column: string, value: unknown) => {
      record.filters.push({ column, value });
      rows = rows.filter((r) => r[column] === value);
      if (chain.__delete) tables[table] = (tables[table] ?? []).filter((r) => r[column] !== value);
      return chain;
    },
    in: (column: string, values: unknown[]) => {
      record.filters.push({ column, in: values });
      rows = rows.filter((r) => values.includes(r[column]));
      return chain;
    },
    order: (column: string, opts?: { ascending?: boolean }) => {
      const dir = opts?.ascending === false ? -1 : 1;
      rows = [...rows].sort((a, b) => (String(a[column]) > String(b[column]) ? dir : -dir));
      return chain;
    },
    limit: (n: number) => {
      rows = rows.slice(0, n);
      return chain;
    },
    maybeSingle: async () => resolve(rows[0] ?? null),
    single: async () => resolve(rows[0] ?? null),
    then: (onFulfilled: (r: unknown) => unknown) => Promise.resolve(resolve(rows)).then(onFulfilled),
  };

  function resolve(data: unknown) {
    if (failNext) {
      const error = { message: failNext };
      failNext = null;
      return { data: null, error };
    }
    return { data, error: null };
  }

  return chain;
}

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      select: () => mockBuilder(table, 'select').select(),
      insert: (values: Record<string, unknown>) => mockBuilder(table, 'insert').insert(values),
      update: (values: Record<string, unknown>) => mockBuilder(table, 'update').update(values),
      delete: () => mockBuilder(table, 'delete').delete(),
    }),
  },
}));

jest.mock('@/state/AuthProvider', () => ({
  useAuth: () => ({ session: null, userId: 'user-1', initialising: false, configured: true }),
}));

const mockSendMessage = jest.fn();
jest.mock('@/services/ai', () => ({
  sendMessage: (...args: unknown[]) => mockSendMessage(...args),
  resolveAction: jest.fn(),
}));
jest.mock('@/services/analytics', () => ({ track: jest.fn() }));


const conversation = (id: string, over: Partial<AiConversation> = {}): Row => ({
  id,
  user_id: 'user-1',
  kind: 'general',
  title: null,
  archived: false,
  created_at: '2026-01-01T10:00:00.000Z',
  updated_at: '2026-01-01T10:00:00.000Z',
  ...over,
});

const message = (id: string, conversationId: string, over: Partial<AiMessage> = {}): Row => ({
  id,
  conversation_id: conversationId,
  user_id: 'user-1',
  role: 'user',
  content: 'hello',
  actions: [],
  suggestions: [],
  created_at: '2026-01-01T10:00:00.000Z',
  ...over,
});

beforeEach(() => {
  calls.length = 0;
  failNext = null;
  mockSendMessage.mockReset();
  tables = {};
});

describe('conversation history', () => {
  it('builds previews and counts without a query per conversation', async () => {
    tables = {
      ai_conversations: [conversation('c1'), conversation('c2')],
      ai_messages: [
        message('m1', 'c1', { content: 'first', created_at: '2026-01-01T10:00:00.000Z' }),
        message('m2', 'c1', { content: 'latest reply', created_at: '2026-01-01T11:00:00.000Z' }),
        message('m3', 'c2', { content: 'only one' }),
      ],
    };

    const summaries = await fetchConversationSummaries();

    expect(summaries.map((s) => [s.id, s.preview, s.messageCount])).toEqual([
      ['c1', 'latest reply', 2],
      ['c2', 'only one', 1],
    ]);
    // One query for the conversations, one for every message — never one per row.
    expect(calls.filter((c) => c.table === 'ai_messages')).toHaveLength(1);
  });

  it('asks for all message rows in a single `in` filter', async () => {
    tables = {
      ai_conversations: [conversation('c1'), conversation('c2')],
      ai_messages: [message('m1', 'c1'), message('m2', 'c2')],
    };
    await fetchConversationSummaries();
    const messageCall = calls.find((c) => c.table === 'ai_messages');
    expect(messageCall?.filters[0]).toEqual({ column: 'conversation_id', in: ['c1', 'c2'] });
  });

  it('hides conversations that have no messages', async () => {
    tables = {
      ai_conversations: [conversation('c1'), conversation('empty')],
      ai_messages: [message('m1', 'c1')],
    };
    const summaries = await fetchConversationSummaries();
    expect(summaries.map((s) => s.id)).toEqual(['c1']);
  });

  it('takes the preview from the first non-blank line', async () => {
    tables = {
      ai_conversations: [conversation('c1')],
      ai_messages: [message('m1', 'c1', { content: '\n\n  Real first line\nsecond' })],
    };
    const [summary] = await fetchConversationSummaries();
    expect(summary.preview).toBe('Real first line');
  });

  it('does not query messages at all when there are no conversations', async () => {
    tables = { ai_conversations: [], ai_messages: [] };
    expect(await fetchConversationSummaries()).toEqual([]);
    expect(calls.filter((c) => c.table === 'ai_messages')).toHaveLength(0);
  });

  it('only lists conversations that are not archived', async () => {
    tables = {
      ai_conversations: [conversation('c1'), conversation('c2', { archived: true })],
      ai_messages: [message('m1', 'c1'), message('m2', 'c2')],
    };
    const summaries = await fetchConversationSummaries();
    expect(summaries.map((s) => s.id)).toEqual(['c1']);
  });

  it('surfaces a database failure instead of returning an empty list', async () => {
    tables = { ai_conversations: [conversation('c1')] };
    failNext = 'permission denied for table ai_conversations';
    // An RLS refusal must reach the UI as a refusal, not as an empty history that
    // looks like the user never had any conversations.
    await expect(fetchConversationSummaries()).rejects.toMatchObject({
      code: 'forbidden',
      message: 'You do not have access to that item.',
    });
  });

  it('does not render a raw driver object as the error message', async () => {
    tables = { ai_conversations: [conversation('c1')] };
    failNext = 'relation "ai_conversations" does not exist';
    await expect(fetchConversationSummaries()).rejects.toMatchObject({
      message: 'relation "ai_conversations" does not exist',
    });
  });
});

describe('rename and delete', () => {
  it('stores a trimmed title', async () => {
    tables = { ai_conversations: [conversation('c1')] };
    await renameConversation('c1', '  Career change  ');
    expect(tables.ai_conversations[0].title).toBe('Career change');
  });

  it('clears the title back to null when the name is blank', async () => {
    tables = { ai_conversations: [conversation('c1', { title: 'Old' })] };
    await renameConversation('c1', '   ');
    expect(tables.ai_conversations[0].title).toBeNull();
  });

  it('caps an absurdly long title rather than rejecting it', async () => {
    tables = { ai_conversations: [conversation('c1')] };
    await renameConversation('c1', 'x'.repeat(500));
    expect(String(tables.ai_conversations[0].title)).toHaveLength(120);
  });

  it('deletes only the conversation it was given', async () => {
    tables = { ai_conversations: [conversation('c1'), conversation('c2')] };
    await deleteConversation('c1');
    expect(tables.ai_conversations.map((c) => c.id)).toEqual(['c2']);
  });

  it('scopes every mutation to an id, so RLS has a row to check', async () => {
    tables = { ai_conversations: [conversation('c1')] };
    await renameConversation('c1', 'Named');
    await deleteConversation('c1');
    for (const call of calls.filter((c) => c.op === 'update' || c.op === 'delete')) {
      expect(call.filters).toContainEqual({ column: 'id', value: 'c1' });
    }
  });
});

describe('conversationTitle', () => {
  it('prefers the stored title', () => {
    expect(conversationTitle({ title: 'Money', kind: 'general' }, 'ignored')).toBe('Money');
  });

  it('falls back to the first message', () => {
    expect(conversationTitle({ title: null, kind: 'general' }, 'I want to quit my job')).toBe(
      'I want to quit my job',
    );
  });

  it('truncates a long fallback', () => {
    const title = conversationTitle({ title: null, kind: 'general' }, 'x'.repeat(200));
    expect(title).toHaveLength(49);
    expect(title.endsWith('…')).toBe(true);
  });

  it('never returns an empty string', () => {
    expect(conversationTitle({ title: '   ', kind: 'general' }, null)).toBe('New conversation');
  });
});

describe('groupByAge', () => {
  const now = new Date('2026-03-20T12:00:00.000Z');
  const at = (iso: string) => ({ ...conversation('x', { updated_at: iso }), preview: null, messageCount: 1 }) as never;

  it('labels buckets by recency and omits empty ones', () => {
    const rows = groupByAge(
      [at('2026-03-20T09:00:00.000Z'), at('2026-03-19T09:00:00.000Z'), at('2026-01-02T09:00:00.000Z')],
      now,
    );
    expect(rows.filter((r) => r.kind === 'header').map((r) => (r as { label: string }).label)).toEqual([
      'Today',
      'Yesterday',
      'Older',
    ]);
  });

  it('returns nothing at all for an empty list', () => {
    expect(groupByAge([], now)).toEqual([]);
  });
});

// --------------------------------------------------------------- the hook --

function Harness({ conversationId }: { conversationId?: string }) {
  const c = useConversation({ kind: 'general', mode: 'chat', conversationId });
  return (
    <>
      <Text testID="state">{c.loading ? 'loading' : `id=${c.conversationId ?? 'none'}`}</Text>
      <Text testID="messages">{c.messages.map((m) => `${m.role}:${m.content}`).join('|')}</Text>
      <Text testID="pending">{c.messages.filter((m) => m.pending).length}</Text>
      <Text testID="keys">{new Set(c.messages.map((m) => m.id)).size}</Text>
      <Text testID="controls" onPress={() => void c.startNew()}>
        new
      </Text>
      <Text testID="retry" onPress={() => void c.retry()}>
        retry
      </Text>
      <Text testID="send" onPress={() => void c.send('hello there')}>
        send
      </Text>
    </>
  );
}

const wrap = async (ui: React.ReactElement) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}>
      {ui}
    </QueryClientProvider>,
  );

describe('useConversation', () => {
  it('resumes the most recent conversation on open', async () => {
    tables = {
      ai_conversations: [conversation('c1', { updated_at: '2026-01-01T09:00:00.000Z' }), conversation('c2', { updated_at: '2026-01-02T09:00:00.000Z' })],
      ai_messages: [message('m1', 'c2', { content: 'resumed' })],
    };
    const view = await wrap(<Harness />);
    await waitFor(() => expect(view.getByTestId('state')).toHaveTextContent('id=c2'));
    expect(view.getByTestId('messages')).toHaveTextContent('user:resumed');
  });

  it('opens the conversation named in the route instead of the most recent one', async () => {
    tables = {
      ai_conversations: [conversation('old', { updated_at: '2026-01-01T09:00:00.000Z' }), conversation('recent', { updated_at: '2026-02-01T09:00:00.000Z' })],
      ai_messages: [message('m1', 'old', { content: 'from the old thread' })],
    };
    const view = await wrap(<Harness conversationId="old" />);
    await waitFor(() => expect(view.getByTestId('state')).toHaveTextContent('id=old'));
    expect(view.getByTestId('messages')).toHaveTextContent('user:from the old thread');
  });

  it('starting a new conversation does not silently resume the previous one', async () => {
    // The whole point of the explicit-new flag: `load` must not fall back to
    // fetchLatestConversation once the user has asked for a blank slate.
    tables = {
      ai_conversations: [conversation('c1')],
      ai_messages: [message('m1', 'c1', { content: 'earlier' })],
    };
    const view = await wrap(<Harness />);
    await waitFor(() => expect(view.getByTestId('state')).toHaveTextContent('id=c1'));

    await act(async () => {
      view.getByTestId('controls').props.onPress();
    });

    expect(view.getByTestId('state')).toHaveTextContent('id=none');
    expect(view.getByTestId('messages')).toHaveTextContent('');
  });

  it('writes no conversation row until the first message is sent', async () => {
    tables = { ai_conversations: [], ai_messages: [] };
    const view = await wrap(<Harness />);
    await waitFor(() => expect(view.getByTestId('state')).toHaveTextContent('id=none'));

    await act(async () => {
      view.getByTestId('controls').props.onPress();
    });

    expect(calls.filter((c) => c.op === 'insert')).toHaveLength(0);
  });

  it('keeps the user message on screen when the send fails', async () => {
    tables = { ai_conversations: [], ai_messages: [] };
    mockSendMessage.mockRejectedValue(new Error('offline'));
    const view = await wrap(<Harness />);
    await waitFor(() => expect(view.getByTestId('state')).toHaveTextContent('id=none'));

    await act(async () => {
      view.getByTestId('send').props.onPress();
    });

    // An honest transcript: the failed turn is not erased, so retry has something
    // to resend and the user does not lose what they typed.
    await waitFor(() => expect(view.getByTestId('messages')).toHaveTextContent('user:hello there'));
  });

  it('retry drops the failed exchange and resends the last user message', async () => {
    tables = { ai_conversations: [], ai_messages: [] };
    mockSendMessage.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({
      conversation_id: 'c-new',
      message: { id: 'a1', content: 'the answer', actions: [], suggestions: [], created_at: '2026-01-01T12:00:00.000Z' },
    });

    const view = await wrap(<Harness />);
    await waitFor(() => expect(view.getByTestId('state')).toHaveTextContent('id=none'));
    await act(async () => {
      view.getByTestId('send').props.onPress();
    });
    await waitFor(() => expect(view.getByTestId('messages')).toHaveTextContent('user:hello there'));

    await act(async () => {
      view.getByTestId('retry').props.onPress();
    });

    // Exactly one user turn — the retry replaced it rather than stacking a duplicate.
    await waitFor(() =>
      expect(view.getByTestId('messages')).toHaveTextContent('user:hello there|assistant:the answer'),
    );
    expect(mockSendMessage).toHaveBeenCalledTimes(2);
  });

  it('marks the user message pending until the server answers, then clears it', async () => {
    tables = { ai_conversations: [], ai_messages: [] };
    let release: ((value: unknown) => void) | null = null;
    mockSendMessage.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );

    const view = await wrap(<Harness />);
    await waitFor(() => expect(view.getByTestId('state')).toHaveTextContent('id=none'));
    await act(async () => {
      view.getByTestId('send').props.onPress();
    });

    expect(view.getByTestId('pending')).toHaveTextContent('1');

    await act(async () => {
      release?.({
        conversation_id: 'c-new',
        message: { id: 'a1', content: 'done', actions: [], suggestions: [], created_at: '2026-01-01T12:00:00.000Z' },
      });
    });

    await waitFor(() => expect(view.getByTestId('pending')).toHaveTextContent('0'));
  });

  it('gives every message a distinct key even when sends land in the same millisecond', async () => {
    tables = { ai_conversations: [], ai_messages: [] };
    mockSendMessage.mockRejectedValue(new Error('offline'));
    const view = await wrap(<Harness />);
    await waitFor(() => expect(view.getByTestId('state')).toHaveTextContent('id=none'));

    // Duplicate keys make FlatList drop rows, so the ids must not rely on the clock.
    await act(async () => {
      view.getByTestId('send').props.onPress();
    });
    await act(async () => {
      view.getByTestId('send').props.onPress();
    });

    expect(view.getByTestId('keys')).toHaveTextContent('2');
  });

  it('adopts the conversation id the server assigns', async () => {
    tables = { ai_conversations: [], ai_messages: [] };
    mockSendMessage.mockResolvedValue({
      conversation_id: 'server-made',
      message: { id: 'a1', content: 'ok', actions: [], suggestions: [], created_at: '2026-01-01T12:00:00.000Z' },
    });
    const view = await wrap(<Harness />);
    await waitFor(() => expect(view.getByTestId('state')).toHaveTextContent('id=none'));

    await act(async () => {
      view.getByTestId('send').props.onPress();
    });

    await waitFor(() => expect(view.getByTestId('state')).toHaveTextContent('id=server-made'));
  });
});
