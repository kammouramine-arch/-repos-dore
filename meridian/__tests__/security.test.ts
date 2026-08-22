import fs from 'fs';
import path from 'path';

/**
 * Guards on the things that are easy to get wrong once and never notice:
 * a table shipped without row level security, or a secret reaching the client bundle.
 */

const root = path.resolve(__dirname, '..');
const migrations = fs
  .readdirSync(path.join(root, 'supabase/migrations'))
  .filter((f) => f.endsWith('.sql'))
  .map((f) => fs.readFileSync(path.join(root, 'supabase/migrations', f), 'utf8'))
  .join('\n');

const USER_TABLES = [
  'profiles', 'user_preferences', 'subscriptions', 'life_areas', 'goals', 'goal_milestones',
  'projects', 'project_milestones', 'habits', 'habit_logs', 'tasks', 'calendar_events',
  'daily_plans', 'weekly_plans', 'life_plans', 'life_plan_items', 'reflections',
  'ai_conversations', 'ai_messages', 'ai_memory', 'notifications', 'analytics_events',
  'usage_counters', 'usage_events',
];

/** Splits SQL into statements so multi-line policies are matched as a whole. */
function statements(sql: string): string[] {
  return sql
    .split(';')
    .map((s) => s.replace(/--[^\n]*/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

describe('row level security', () => {
  it('creates every table that holds user data', () => {
    for (const table of USER_TABLES) {
      expect(migrations).toContain(`create table public.${table}`);
    }
  });

  it('enables and forces RLS on every user table', () => {
    // The RLS migration loops over an array of table names; every user table must be in it.
    const rls = fs.readFileSync(
      path.join(root, 'supabase/migrations/20260101000100_rls.sql'),
      'utf8',
    );
    const subs = fs.readFileSync(
      path.join(root, 'supabase/migrations/20260101000300_subscriptions.sql'),
      'utf8',
    );
    expect(rls).toContain('enable row level security');
    expect(rls).toContain('force row level security');

    for (const table of USER_TABLES) {
      const covered =
        rls.includes(`'${table}'`) ||
        subs.includes(`alter table public.${table} enable row level security`);
      expect(`${table}: ${covered}`).toBe(`${table}: true`);
    }
  });

  it('scopes every policy on user data to auth.uid()', () => {
    const policies = statements(migrations).filter((s) => s.includes('create policy'));
    expect(policies.length).toBeGreaterThan(0);

    for (const policy of policies) {
      // The plan catalogue is deliberately public — it holds no user data.
      if (policy.includes('public.app_config')) continue;
      expect(`${policy.slice(0, 60)} → ${/auth\.uid\(\)/.test(policy)}`).toMatch(/true$/);
    }
  });

  it('defaults user_id from the session so a client cannot write another user’s row', () => {
    expect(migrations).toContain('alter column user_id set default auth.uid()');
  });

  it('does not let clients write their own subscription tier', () => {
    const subscriptionPolicies = migrations
      .split('\n')
      .filter((l) => l.includes('subscriptions') && l.includes('create policy'));
    expect(subscriptionPolicies.join('\n')).not.toMatch(/for (all|insert|update)/);
  });

  it('never lets a device write its own usage or entitlement', () => {
    const subs = fs.readFileSync(
      path.join(root, 'supabase/migrations/20260101000300_subscriptions.sql'),
      'utf8',
    );
    // Usage counters and events are select-only for the owner.
    const usagePolicies = statements(subs).filter(
      (s) => s.includes('create policy') && s.includes('public.usage_'),
    );
    expect(usagePolicies).toHaveLength(2);
    for (const policy of usagePolicies) {
      expect(policy).toContain('for select');
      expect(policy).toContain('auth.uid() = user_id');
    }

    // The spend and refund functions are service-role only.
    expect(subs).toContain('revoke all on function public.consume_usage');
    expect(subs).toContain('revoke all on function public.refund_usage');
    expect(subs).not.toMatch(/grant execute on function public\.consume_usage[^;]*authenticated/);
  });

  it('keeps the plan catalogue readable but not writable from the app', () => {
    const subs = fs.readFileSync(
      path.join(root, 'supabase/migrations/20260101000300_subscriptions.sql'),
      'utf8',
    );
    const policies = statements(subs).filter(
      (s) => s.includes('create policy') && s.includes('public.app_config'),
    );
    expect(policies).toHaveLength(1);
    expect(policies[0]).toContain('for select using (is_public)');
    expect(policies[0]).not.toMatch(/for (all|insert|update|delete)/);
  });

  it('restricts the account deletion function to authenticated users', () => {
    expect(migrations).toContain('revoke all on function public.delete_my_account() from public');
    expect(migrations).toContain('grant execute on function public.delete_my_account() to authenticated');
  });
});

describe('secrets', () => {
  const sources = walk(path.join(root, 'src'))
    .concat(walk(path.join(root, 'app')))
    .map((file) => ({ file, body: fs.readFileSync(file, 'utf8') }));

  it('never references a service role key in client code', () => {
    for (const { file, body } of sources) {
      expect(`${file}: ${body.includes('SERVICE_ROLE')}`).toBe(`${file}: false`);
    }
  });

  it('never references an AI provider key in client code', () => {
    for (const { file, body } of sources) {
      expect(`${file}: ${/ANTHROPIC_API_KEY|OPENAI_API_KEY|sk-ant-|sk-proj-/.test(body)}`).toBe(
        `${file}: false`,
      );
    }
  });

  it('reads public configuration from the environment, never from a literal', () => {
    const env = fs.readFileSync(path.join(root, 'src/config/env.ts'), 'utf8');
    expect(env).not.toMatch(/https:\/\/[a-z0-9]+\.supabase\.co/);
    const appConfig = fs.readFileSync(path.join(root, 'app.config.ts'), 'utf8');
    expect(appConfig).toContain('process.env.EXPO_PUBLIC_SUPABASE_URL');
  });

  it('keeps the model provider behind the edge function', () => {
    for (const { file, body } of sources) {
      expect(`${file}: ${body.includes('api.anthropic.com')}`).toBe(`${file}: false`);
    }
  });
});

describe('AI integration is real', () => {
  it('the client only reaches the model through our own function', () => {
    const ai = fs.readFileSync(path.join(root, 'src/services/ai.ts'), 'utf8');
    expect(ai).toContain("functions.invoke");
    expect(ai).not.toMatch(/const responses = \[/);
  });

  it('resolves the model from the plan catalogue instead of a hardcoded name', () => {
    const fn = fs.readFileSync(path.join(root, 'supabase/functions/ai-chat/index.ts'), 'utf8');
    // The only model reference is the one routing produced.
    expect(fn).toContain('const { model, effort, priority } = spend');
    expect(fn).not.toMatch(/claude-[a-z0-9-]+/);

    const brief = fs.readFileSync(path.join(root, 'supabase/functions/daily-brief/index.ts'), 'utf8');
    expect(brief).not.toMatch(/claude-[a-z0-9-]+/);
  });

  it('spends allowance through the one central path', () => {
    const fn = fs.readFileSync(path.join(root, 'supabase/functions/ai-chat/index.ts'), 'utf8');
    expect(fn).toContain('spendForOperation');
    // No endpoint counts usage on its own.
    expect(fn).not.toMatch(/from\('usage_counters'\)\s*\.\s*(insert|update|upsert)/);
  });

  it('the edge function calls the provider SDK with our validated tools', () => {
    const fn = fs.readFileSync(path.join(root, 'supabase/functions/ai-chat/index.ts'), 'utf8');
    expect(fn).toContain("from '@anthropic-ai/sdk'");
    expect(fn).toContain('anthropicTools()');
    expect(fn).toContain('executeTool');
    expect(fn).toContain('requiresConfirmation');
  });

  it('has no path from model output to raw SQL', () => {
    const executor = fs.readFileSync(path.join(root, 'supabase/functions/_shared/executor.ts'), 'utf8');
    expect(executor).not.toMatch(/execute_sql|\.sql\(|raw\(/);
  });
});
