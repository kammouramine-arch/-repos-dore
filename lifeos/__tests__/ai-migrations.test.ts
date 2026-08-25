import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const sql = fs.readFileSync(
  path.join(root, 'supabase/migrations/20260101000600_ai_router.sql'),
  'utf8',
);

describe('AI router migration', () => {
  it('creates the accounting, budget and health tables', () => {
    for (const table of ['ai_requests', 'ai_budgets', 'ai_budget_reservations', 'ai_provider_health']) {
      expect(sql).toContain(`create table public.${table}`);
    }
  });

  it('is additive — it alters no existing table and drops nothing', () => {
    expect(sql).not.toMatch(/drop table/i);
    expect(sql).not.toMatch(/drop column/i);
    // The only `alter table` statements are the RLS switches on tables created here.
    const alters = sql.match(/alter table public\.(\w+)/g) ?? [];
    for (const a of alters) {
      expect(a).toMatch(/ai_requests|ai_budgets|ai_budget_reservations|ai_provider_health/);
    }
  });

  it('enables and forces RLS on every new table', () => {
    for (const table of ['ai_requests', 'ai_budgets', 'ai_budget_reservations', 'ai_provider_health']) {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
      expect(sql).toContain(`alter table public.${table} force row level security`);
    }
  });

  it('scopes every user-facing policy to auth.uid()', () => {
    const policies = sql.match(/create policy[\s\S]*?;/g) ?? [];
    expect(policies.length).toBeGreaterThan(0);
    for (const policy of policies) expect(policy).toContain('auth.uid() = user_id');
  });

  it('grants users read-only access — a client can never write its own budget', () => {
    expect(sql).toContain('grant select on public.ai_requests to authenticated');
    expect(sql).toContain('grant select on public.ai_budgets to authenticated');
    expect(sql).not.toMatch(/grant (insert|update|delete)[^;]*to authenticated/);
  });

  it('gives reservations and health no policy at all, so they are invisible', () => {
    expect(sql).not.toMatch(/create policy[^;]*ai_budget_reservations/);
    expect(sql).not.toMatch(/create policy[^;]*ai_provider_health/);
  });

  it('keeps the money-moving functions away from the public role', () => {
    expect(sql).toContain('revoke all on function public.reserve_ai_budget');
    expect(sql).toContain('revoke all on function public.settle_ai_budget');
  });

  it('pins search_path on every definer function', () => {
    const definers = sql.match(/security definer[^\n]*/g) ?? [];
    expect(definers.length).toBeGreaterThan(0);
    for (const d of definers) expect(d).toContain('set search_path');
  });

  it('uses no security invoker function that touches auth', () => {
    expect(sql).not.toMatch(/security invoker/);
  });

  it('locks the budget row before deciding, so two requests cannot both win', () => {
    expect(sql).toContain('for update');
  });

  it('returns immediately when refusing, rather than falling through', () => {
    // The bug class already fixed twice in this codebase: reporting a refusal and then
    // appending a contradictory allowed row.
    const reserve = sql.slice(sql.indexOf('function public.reserve_ai_budget'));
    const refusal = reserve.indexOf("'budget_exceeded'");
    const nextReturn = reserve.indexOf('return;', refusal);
    expect(refusal).toBeGreaterThan(-1);
    expect(nextReturn).toBeGreaterThan(refusal);
    expect(nextReturn - refusal).toBeLessThan(200);
  });

  it('names the settle output column so it cannot collide with the table column', () => {
    // An OUT parameter called `spent` makes every unqualified `spent` ambiguous inside
    // the function and fails at run time, not at creation.
    expect(sql).toContain('returns table (settled boolean, total_spent numeric)');
  });

  it('constrains the accounting method to the two honest values', () => {
    expect(sql).toContain("accounting_method in ('metered', 'estimated')");
  });

  it('prevents a request from reserving budget twice', () => {
    expect(sql).toContain('unique (user_id, request_id)');
  });

  it('forbids negative money', () => {
    expect(sql).toContain('check (reserved >= 0)');
    expect(sql).toContain('check (spent >= 0)');
    expect(sql).toContain('check (amount >= 0)');
  });
});

describe('bundle stays in step with the migrations', () => {
  it('includes the AI router migration', () => {
    const bundle = fs.readFileSync(path.join(root, 'supabase/dist/all-migrations.sql'), 'utf8');
    expect(bundle).toContain('create table public.ai_budget_reservations');
    expect(bundle).toContain('reserve_ai_budget');
  });
});
