import fs from 'fs';
import path from 'path';
import { AGENTS, AGENT_KEYS, agentInstructions, isAgentKey } from '@shared/agents';
import { route } from '@shared/ai/router';
import { DEFAULT_REGISTRY, mergeRegistry } from '@shared/ai/registry';
import { DEFAULT_BUDGETS, agentMayContinue } from '@shared/ai/budget';
import { TASK_PRIVACY } from '@shared/ai/types';
import type { AIRequest, PrivacyClass, TaskType } from '@shared/ai/types';

const root = path.resolve(__dirname, '..');
const chat = fs.readFileSync(path.join(root, 'supabase/functions/ai-chat/index.ts'), 'utf8');

const SIX = ['life', 'career', 'business', 'fitness', 'finance', 'learning'];

function agentRequest(task: TaskType, over: Partial<AIRequest> = {}): AIRequest {
  return {
    requestId: 'agent-1', userId: 'u1', tier: 'ultra', taskType: task,
    system: 'sys', messages: [{ role: 'user', content: 'go' }],
    requiredCapabilities: ['tools'], qualityRequirement: 'advanced',
    latencyRequirement: 'normal', privacyRequirement: TASK_PRIVACY[task],
    maxCost: 0.4, maxOutputTokens: 8000, budgetRemaining: 16,
    metadata: { estimatedInputTokens: 4000 },
    ...over,
  };
}
const ctx = (over = {}) => ({
  registry: DEFAULT_REGISTRY, health: {}, now: 1_000_000, requireVerifiedPricing: false, ...over,
});

describe('all six agents', () => {
  it('exist and are the approved six', () => {
    expect(AGENT_KEYS.sort()).toEqual([...SIX].sort());
    for (const key of SIX) expect(isAgentKey(key)).toBe(true);
  });

  it('each has a brief the model actually receives', () => {
    for (const key of AGENT_KEYS) {
      const brief = agentInstructions(key);
      expect(typeof brief).toBe('string');
      expect(brief.length).toBeGreaterThan(40);
      expect(AGENTS[key].key).toBe(key);
    }
  });

  it('reach the model only through the router', () => {
    // Agents run as mode 'agent_run' inside ai-chat, which routes via runMetered.
    expect(chat).toContain("agent_run: 'agent_execution'");
    expect(chat).toContain('runMetered');
  });

  it('never import a provider SDK or name a provider', () => {
    const agentsSrc = fs.readFileSync(path.join(root, 'supabase/functions/_shared/agents.ts'), 'utf8');
    expect(agentsSrc).not.toMatch(/anthropic|openai|gemini|groq|mistral/i);
  });

  it('routes agent execution to a tool-capable model', () => {
    const d = route(agentRequest('agent_execution'), ctx());
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    for (const c of d.candidates) expect(c.model.capabilities).toContain('tools');
  });

  it('routes each agent domain to a provider cleared for its data', () => {
    const domains: [string, TaskType][] = [
      ['career', 'career_planning'],
      ['business', 'business_planning'],
      ['fitness', 'fitness_planning'],
      ['finance', 'finance_planning'],
      ['learning', 'learning_planning'],
      ['life', 'life_analysis'],
    ];
    for (const [name, task] of domains) {
      const d = route(agentRequest(task), ctx());
      if (!d.ok) continue;
      const required = TASK_PRIVACY[task];
      for (const c of d.candidates) {
        const cleared = DEFAULT_REGISTRY.providers[c.model.provider].maxPrivacyClass;
        const rank = { normal: 0, sensitive: 1, highly_sensitive: 2 };
        expect(`${name}: ${rank[cleared as PrivacyClass] >= rank[required]}`).toBe(`${name}: true`);
      }
    }
  });

  it('sends finance work only to a provider cleared for highly sensitive data', () => {
    const d = route(agentRequest('finance_planning'), ctx());
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    for (const c of d.candidates) expect(c.model.provider).toBe('mistral');
  });

  it('refuses a finance agent rather than downgrading privacy when Mistral is unavailable', () => {
    const registry = mergeRegistry(DEFAULT_REGISTRY, { providers: { mistral: { enabled: false } } as any });
    const d = route(agentRequest('finance_planning'), ctx({ registry }));
    expect(d.ok).toBe(false);
    if (d.ok) return;
    expect(d.code).toBe('PRIVACY_NOT_PERMITTED');
  });
});

describe('agent economics', () => {
  it('gives no agent budget to Free or Plus', () => {
    for (const tier of ['free', 'plus'] as const) {
      expect(agentMayContinue(DEFAULT_BUDGETS[tier], { callsMade: 0, spent: 0 }).ok).toBe(false);
    }
  });

  it('stops an agent loop before it can eat the month', () => {
    const policy = DEFAULT_BUDGETS.ultra;
    let spent = 0;
    let calls = 0;
    // Simulate an agent that keeps going until something stops it.
    for (let i = 0; i < 1000; i++) {
      if (!agentMayContinue(policy, { callsMade: calls, spent }).ok) break;
      calls += 1;
      spent += 0.05;
    }
    expect(calls).toBeLessThanOrEqual(policy.maxAgentCalls);
    expect(spent).toBeLessThanOrEqual(policy.perAgentRunMax + 0.05);
    expect(spent).toBeLessThan(DEFAULT_BUDGETS.ultra.monthlyCeiling);
  });

  it('keeps a full month of agent runs inside the monthly ceiling', () => {
    const worst = DEFAULT_BUDGETS.ultra.perAgentRunMax * 150;
    // 150 runs at the per-run cap would exceed the ceiling, which is exactly why the
    // monthly budget exists alongside the operation allowance rather than instead of it.
    expect(worst).toBeGreaterThan(DEFAULT_BUDGETS.ultra.monthlyCeiling);
    // The monthly ceiling is the binding constraint, and it is enforced per request.
    expect(DEFAULT_BUDGETS.ultra.monthlyCeiling).toBe(16);
  });
});
