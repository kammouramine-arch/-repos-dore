import { describe, expect, it } from 'vitest';
import { resolveBusinessLocale, businessDocumentLabels } from '@devisia/shared';
import { localizedSystemPrompt } from '@/lib/ai/prompts';
import { buildTemplateFollowUp } from '@/lib/ai/heuristic';

describe('language and business-country separation', () => {
  it('keeps English independent from the UK/US business country', () => {
    const us = resolveBusinessLocale({ language: 'en', country: 'US' });
    const gb = resolveBusinessLocale({ language: 'en', country: 'GB' });
    expect(us.currency).toBe('USD');
    expect(gb.currency).toBe('GBP');
    expect(businessDocumentLabels(us).title).toBe('ESTIMATE');
    expect(businessDocumentLabels(gb).title).toBe('QUOTE');
  });

  it('instructs AI output to follow the persisted locale and region', () => {
    const prompt = localizedSystemPrompt('base', { locale: 'en', country: 'US', currency: 'USD' });
    expect(prompt).toContain('English');
    expect(prompt).toContain('United States');
    expect(prompt).toContain('USD');
  });

  it('provides an English fallback follow-up without French leakage', () => {
    const message = buildTemplateFollowUp({ customerName: 'Alex', quoteNumber: 'Q-1', quoteTitle: 'Repair', totalCents: 12500, attempt: 1, viewed: false, companyName: 'Trade Co', language: 'en', country: 'US', currency: 'USD' });
    expect(message.objet).toContain('Your quote');
    expect(message.message).toContain('Hello Alex');
    expect(message.message).not.toContain('Bonjour');
    expect(message.message).toContain('$125.00');
  });
});
