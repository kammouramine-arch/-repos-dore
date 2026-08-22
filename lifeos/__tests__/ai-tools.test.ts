import {
  TOOL_NAMES,
  anthropicTools,
  describeAction,
  isToolName,
  requiresConfirmation,
  toolMeta,
  validateToolInput,
} from '@shared/tools';

const UUID = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';

describe('tool catalogue', () => {
  it('exposes every tool to the model with a JSON schema', () => {
    const tools = anthropicTools();
    expect(tools).toHaveLength(TOOL_NAMES.length);
    for (const tool of tools) {
      expect(typeof tool.description).toBe('string');
      expect(tool.description.length).toBeGreaterThan(10);
      expect(tool.input_schema.type).toBe('object');
      expect(tool.input_schema.additionalProperties).toBe(false);
      // Anthropic rejects a schema carrying a $schema key.
      expect((tool.input_schema as Record<string, unknown>).$schema).toBeUndefined();
    }
  });

  it('only recognises tools that exist', () => {
    expect(isToolName('create_task')).toBe(true);
    expect(isToolName('execute_sql')).toBe(false);
    expect(isToolName('drop_table')).toBe(false);
  });

  it('requires confirmation for everything destructive or wide-reaching', () => {
    for (const tool of ['delete_goal', 'delete_task', 'delete_habit', 'delete_project', 'delete_event', 'reorganize_day', 'replan_week'] as const) {
      expect(requiresConfirmation(tool)).toBe(true);
    }
  });

  it('never asks for confirmation to read', () => {
    for (const name of TOOL_NAMES) {
      if (!toolMeta[name].mutating) expect(toolMeta[name].requiresConfirmation).toBe(false);
    }
  });
});

describe('validateToolInput', () => {
  it('accepts a well formed task', () => {
    const result = validateToolInput('create_task', {
      title: 'Write the proposal',
      scheduled_date: '2026-03-14',
      scheduled_time: '09:30',
      duration_minutes: 60,
      priority: 'high',
    });
    expect(result.ok).toBe(true);
  });

  it('rejects a malformed date', () => {
    const result = validateToolInput('create_task', { title: 'Nope', scheduled_date: '14/03/2026' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/scheduled_date/);
  });

  it('rejects a malformed time', () => {
    expect(validateToolInput('create_task', { title: 'Nope', scheduled_time: '25:00' }).ok).toBe(false);
    expect(validateToolInput('create_task', { title: 'Nope', scheduled_time: '9am' }).ok).toBe(false);
  });

  it('rejects ids that are not uuids, so a model cannot guess a row', () => {
    expect(validateToolInput('complete_task', { task_id: '1' }).ok).toBe(false);
    expect(validateToolInput('complete_task', { task_id: UUID }).ok).toBe(true);
  });

  it('rejects a missing title', () => {
    expect(validateToolInput('create_goal', {}).ok).toBe(false);
    expect(validateToolInput('create_goal', { title: 'a' }).ok).toBe(false);
  });

  it('caps the day plan at three real priorities', () => {
    const four = {
      headline: 'Busy but doable',
      focus: [{ title: 'a' }, { title: 'b' }, { title: 'c' }, { title: 'd' }],
    };
    expect(validateToolInput('create_daily_plan', four).ok).toBe(false);
  });

  it('demands exactly three months in a 90-day plan', () => {
    const twoMonths = {
      vision: 'Get healthy and launch the shop',
      months: [
        { position: 1, title: 'Foundations' },
        { position: 2, title: 'Build' },
      ],
    };
    expect(validateToolInput('generate_90_day_plan', twoMonths).ok).toBe(false);
  });

  it('strips unknown keys instead of passing them through to the database', () => {
    const result = validateToolInput('create_task', {
      title: 'Legit task',
      user_id: 'someone-else',
      status: 'done',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).not.toHaveProperty('user_id');
      expect(result.data).not.toHaveProperty('status');
    }
  });

  it('bounds free text so a runaway generation cannot fill the database', () => {
    expect(validateToolInput('create_task', { title: 'x'.repeat(500) }).ok).toBe(false);
    expect(validateToolInput('remember', { kind: 'fact', key: 'k', value: 'v'.repeat(1000) }).ok).toBe(false);
  });
});

describe('describeAction', () => {
  it('describes a pending action in words a person can approve', () => {
    expect(describeAction('delete_goal', { goal_id: UUID })).toMatch(/delete a goal/i);
    expect(describeAction('reorganize_day', { moves: [{}, {}] })).toMatch(/2 moves/);
    expect(describeAction('create_task', { title: 'Call the bank' })).toContain('Call the bank');
  });
});
