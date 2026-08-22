import { executeTool } from '@shared/executor';
import { createFakeDb, errorResponse, okResponse, type RecordedCall } from './helpers/fakeSupabase';
import { DEFAULT_CATALOGUE, resolveEntitlement } from '@shared/plans';

const UUID = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';
const OTHER_UUID = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';

const entitlementsFor = (tier: 'free' | 'plus' | 'pro') =>
  resolveEntitlement(DEFAULT_CATALOGUE, {
    tier,
    status: tier === 'free' ? 'free' : 'active',
    current_period_end: '2099-01-01T00:00:00Z',
  });

const proEntitlement = entitlementsFor('pro');

const baseCtx = {
  userId: 'user-1',
  today: '2026-03-10',
  weekStart: '2026-03-09',
  entitlements: proEntitlement.entitlements,
  memoryLimit: proEntitlement.quotas.memory_items,
};

function ctxWith(respond: (call: RecordedCall) => { data: unknown; error: { message: string } | null }) {
  const { db, calls } = createFakeDb(respond);
  return { ctx: { ...baseCtx, db: db as never }, calls };
}

describe('executeTool — validation', () => {
  it('refuses invalid arguments before touching the database', async () => {
    const { ctx, calls } = ctxWith(() => okResponse({ id: UUID }));
    const result = await executeTool(ctx, 'create_task', { title: '' });

    expect(result.ok).toBe(false);
    expect(result.summary).toMatch(/invalid arguments/i);
    expect(calls).toHaveLength(0);
  });

  it('refuses a non-uuid id', async () => {
    const { ctx, calls } = ctxWith(() => okResponse({ title: 'x' }));
    const result = await executeTool(ctx, 'delete_task', { task_id: 'all' });

    expect(result.ok).toBe(false);
    expect(calls).toHaveLength(0);
  });
});

describe('executeTool — writes', () => {
  it('creates a task and reports what it did', async () => {
    const { ctx, calls } = ctxWith((call) =>
      call.op === 'insert' ? okResponse({ id: UUID }) : okResponse(null),
    );

    const result = await executeTool(ctx, 'create_task', {
      title: 'Call the bank',
      scheduled_date: '2026-03-11',
      duration_minutes: 15,
    });

    expect(result.ok).toBe(true);
    expect(result.summary).toContain('Call the bank');
    expect(result.entityId).toBe(UUID);

    const insert = calls.find((c) => c.op === 'insert');
    expect(insert?.table).toBe('tasks');
    expect(insert?.payload).toMatchObject({
      title: 'Call the bank',
      scheduled_date: '2026-03-11',
      duration_minutes: 15,
      source: 'ai',
    });
  });

  it('never writes a user_id — the database supplies it from the session', async () => {
    const { ctx, calls } = ctxWith(() => okResponse({ id: UUID }));
    await executeTool(ctx, 'create_goal', { title: 'Save €10,000' });

    const insert = calls.find((c) => c.op === 'insert' && c.table === 'goals');
    expect(insert?.payload).not.toHaveProperty('user_id');
  });

  it('reports a database failure instead of claiming success', async () => {
    const { ctx } = ctxWith(() => errorResponse('permission denied for table tasks'));
    const result = await executeTool(ctx, 'create_task', { title: 'Blocked task' });

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/permission denied/);
  });

  it('says the row does not exist rather than silently doing nothing', async () => {
    const { ctx } = ctxWith(() => okResponse(null));
    const result = await executeTool(ctx, 'complete_task', { task_id: UUID });

    expect(result.ok).toBe(false);
    expect(result.summary).toMatch(/does not exist/i);
  });

  it('checks the parent goal belongs to the user before linking a task to it', async () => {
    // Ownership probe returns nothing: the goal is not this user's (RLS filtered it out).
    const { ctx, calls } = ctxWith((call) =>
      call.table === 'goals' ? okResponse(null) : okResponse({ id: UUID }),
    );

    const result = await executeTool(ctx, 'create_task', { title: 'Sneaky', goal_id: OTHER_UUID });

    expect(result.ok).toBe(false);
    expect(calls.some((c) => c.table === 'tasks' && c.op === 'insert')).toBe(false);
  });

  it('rejects an event that ends before it starts', async () => {
    const { ctx, calls } = ctxWith(() => okResponse({ id: UUID }));
    const result = await executeTool(ctx, 'create_event', {
      title: 'Impossible',
      date: '2026-03-11',
      start_time: '18:00',
      end_time: '09:00',
    });

    expect(result.ok).toBe(false);
    expect(calls.some((c) => c.op === 'insert')).toBe(false);
  });

  it('does not store a memory when the user has memory switched off', async () => {
    const { ctx, calls } = ctxWith((call) =>
      call.table === 'user_preferences' ? okResponse({ memory_enabled: false }) : okResponse({ id: UUID }),
    );

    const result = await executeTool(ctx, 'remember', {
      kind: 'routine',
      key: 'gym_days',
      value: 'Trains Tuesday and Thursday',
    });

    expect(result.ok).toBe(false);
    expect(result.summary).toMatch(/memory is turned off/i);
    expect(calls.some((c) => c.table === 'ai_memory')).toBe(false);
  });

  it('reports partial success honestly when milestones fail', async () => {
    const { ctx } = ctxWith((call) =>
      call.table === 'goal_milestones'
        ? errorResponse('constraint violation')
        : okResponse({ id: UUID }),
    );

    const result = await executeTool(ctx, 'create_goal', {
      title: 'Launch the shop',
      milestones: [{ title: 'Pick a supplier' }],
    });

    expect(result.ok).toBe(true);
    expect(result.summary).toMatch(/milestones failed/i);
  });
});

describe('executeTool — entitlements', () => {
  it('blocks a capability the plan does not include, without touching the database', async () => {
    const free = entitlementsFor('free');
    const { db, calls } = createFakeDb(() => okResponse({ id: UUID }));
    const result = await executeTool(
      {
        ...baseCtx,
        entitlements: free.entitlements,
        memoryLimit: free.quotas.memory_items,
        db: db as never,
      },
      'generate_90_day_plan',
      {
        vision: 'A calmer, healthier three months',
        months: [
          { position: 1, title: 'Foundations' },
          { position: 2, title: 'Build' },
          { position: 3, title: 'Scale' },
        ],
      },
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBe('not_entitled:PLANNING_ADVANCED');
    expect(calls).toHaveLength(0);
  });

  it('allows the same tool on a plan that includes it', async () => {
    const { ctx } = ctxWith(() => okResponse({ id: UUID }));
    const result = await executeTool(ctx, 'generate_90_day_plan', {
      vision: 'A calmer, healthier three months',
      months: [
        { position: 1, title: 'Foundations' },
        { position: 2, title: 'Build' },
        { position: 3, title: 'Scale' },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.summary).toMatch(/90-day plan/i);
  });
});

describe('executeTool — plan capacity', () => {
  it('refuses a new memory once the plan is full, and says where more is', async () => {
    const { ctx } = ctxWith((call) => {
      if (call.table === 'user_preferences') return okResponse({ memory_enabled: true });
      if (call.table === 'ai_memory') {
        // No existing row for this key, and the count is already at the limit.
        const isCount = call.filters.some((f) => f.method === 'select' && f.args[1] !== undefined);
        return isCount ? { data: null, error: null, count: 5 } : okResponse(null);
      }
      return okResponse({ id: UUID });
    });

    const result = await executeTool(
      { ...ctx, memoryLimit: 5 },
      'remember',
      { kind: 'fact', key: 'new_thing', value: 'Something worth keeping' },
    );

    expect(result.ok).toBe(false);
    expect(result.summary).toMatch(/holds 5 memories/i);
  });

  it('still updates an existing memory when the plan is full', async () => {
    const { ctx } = ctxWith((call) => {
      if (call.table === 'user_preferences') return okResponse({ memory_enabled: true });
      if (call.table === 'ai_memory') return okResponse({ id: UUID });
      return okResponse({ id: UUID });
    });

    const result = await executeTool(
      { ...ctx, memoryLimit: 1 },
      'remember',
      { kind: 'schedule', key: 'work_hours', value: 'Now works 08:00 to 16:00' },
    );

    expect(result.ok).toBe(true);
  });
});

describe('executeTool — bulk moves', () => {
  it('counts what actually moved and what did not', async () => {
    let seen = 0;
    const { ctx } = ctxWith((call) => {
      if (call.table !== 'tasks') return okResponse({ id: UUID });
      seen += 1;
      return seen === 1 ? okResponse({ id: UUID }) : okResponse(null); // second task is gone
    });

    const result = await executeTool(ctx, 'reorganize_day', {
      moves: [
        { task_id: UUID, scheduled_time: '09:00' },
        { task_id: OTHER_UUID, scheduled_time: '11:00' },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.summary).toMatch(/moved 1 task/);
    expect(result.summary).toMatch(/1 could not be moved/);
  });
});
