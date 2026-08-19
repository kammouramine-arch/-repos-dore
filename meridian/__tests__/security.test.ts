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
  'ai_conversations', 'ai_messages', 'ai_memory', 'ai_usage', 'notifications', 'analytics_events',
];

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
    expect(rls).toContain('enable row level security');
    expect(rls).toContain('force row level security');
    for (const table of USER_TABLES) {
      expect(`${table}: ${rls.includes(`'${table}'`)}`).toBe(`${table}: true`);
    }
  });

  it('scopes every policy to auth.uid()', () => {
    const policyLines = migrations
      .split('\n')
      .filter((line) => line.includes('create policy') || line.includes('for select using') || line.includes('for all'));
    expect(policyLines.length).toBeGreaterThan(0);
    for (const line of policyLines) {
      if (line.includes('using') || line.includes('check')) {
        expect(line).toMatch(/auth\.uid\(\)/);
      }
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
