import { describe, expect, it } from 'vitest';
import { resolveBusinessLocale, businessDocumentLabels, formatBusinessMoney } from '@devisia/shared';
import { localizedSystemPrompt } from '@/lib/ai/prompts';
import { buildHeuristicQuoteDraft, buildTemplateFollowUp } from '@/lib/ai/heuristic';
import { newLeadEmail, paymentReceiptEmail, quoteSentEmail, resetPasswordEmail, verifyEmailTemplate, welcomeEmail } from '@/lib/email/templates';
import { quotePdfLabels } from '@/lib/pdf/quote-pdf';

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

  it('keeps the local AI quote fallback in English', () => {
    const draft = buildHeuristicQuoteDraft({ description: 'Replace a leaking kitchen sink trap', catalog: [], hourlyRateCents: 4500, defaultVatRate: 20, language: 'en' });
    expect(draft.alertes.join(' ')).toContain('Quote prepared automatically');
    expect(draft.questions.join(' ')).toContain('How long');
    expect(draft.alertes.join(' ')).not.toContain('Devis préparé');
  });

  it('renders customer quote email in the selected English region', () => {
    const email = quoteSentEmail({ customerName: 'Alex', companyName: 'Trade Co', quoteNumber: 'Q-1', quoteTitle: 'Repair', totalCents: 12500, publicUrl: 'https://example.test/q', language: 'en', country: 'US', currency: 'USD' });
    expect(email.subject).toContain('Your quote');
    expect(email.text).toContain('$125.00');
    expect(email.text).not.toContain('Bonjour');
    expect(email.html).toContain('lang="en"');
  });

  it('renders authentication and billing emails in English when selected', () => {
    expect(welcomeEmail({ firstName: 'Alex', language: 'en' }).subject).toBe('Welcome to DEVISERA');
    expect(verifyEmailTemplate({ url: 'https://example.test/verify', language: 'en' }).text).toContain('Confirm your DEVISERA email address');
    expect(resetPasswordEmail({ url: 'https://example.test/reset', language: 'en' }).subject).toBe('Reset your password');
    expect(paymentReceiptEmail({ plan: 'Pro', amountCents: 7900, language: 'en', country: 'GB', currency: 'GBP' }).text).toContain('£79.00');
    expect(newLeadEmail({ contactName: 'Alex', title: 'Bathroom repair', language: 'en' }).subject).toContain('New quote request');
  });

  it('selects regional document terminology without conflating language and country', () => {
    const fr = quotePdfLabels({ language: 'fr', country: 'FR' });
    const gb = quotePdfLabels({ language: 'en', country: 'GB' });
    const us = quotePdfLabels({ language: 'en', country: 'US' });
    expect(fr.title).toBe('DEVIS');
    expect(fr.tax).toBe('TVA');
    expect(fr.validUntil).toBe("Valable jusqu'au");
    expect(gb.title).toBe('QUOTE');
    expect(gb.tax).toBe('VAT');
    expect(gb.validUntil).toBe('Valid until');
    expect(us.title).toBe('ESTIMATE');
    expect(us.tax).toBe('Sales tax');
    expect(us.quantity).toBe('QTY');
    expect(quotePdfLabels({ language: 'en', country: 'GB' }).companyIdentifier).toBe('Company number');
    expect(quotePdfLabels({ language: 'fr', country: 'US' }).companyIdentifier).toBe('IDENTIFIANT ENTREPRISE');
    expect(quotePdfLabels({ language: 'fr', country: 'US' }).vatExemption).not.toContain('293 B');
  });

  it('formats document money with the business country currency', () => {
    expect(formatBusinessMoney(3900, resolveBusinessLocale({ language: 'fr', country: 'FR' }))).toContain('39');
    expect(formatBusinessMoney(3900, resolveBusinessLocale({ language: 'en', country: 'GB' }))).toContain('£');
    expect(formatBusinessMoney(3900, resolveBusinessLocale({ language: 'en', country: 'US' }))).toContain('$');
  });
});
