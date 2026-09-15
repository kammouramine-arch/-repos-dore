import { describe, expect, it } from 'vitest';
import { businessDocumentLabels, formatBusinessMoney, resolveBusinessLocale } from '@devisia/shared';
describe('independent language and business region', () => {
  it('does not move English speakers out of France or change their currency', () => {
    const profile = resolveBusinessLocale({ language: 'en', country: 'FR' });
    expect(profile.currency).toBe('EUR');
    expect(businessDocumentLabels(profile).companyIdentifier).toBe('SIRET');
    expect(businessDocumentLabels(profile).title).toBe('QUOTE');
  });
  it.each(['GB', 'US'])('never uses French exemption text for %s', country => {
    expect(businessDocumentLabels(resolveBusinessLocale({ language: 'fr', country })).showFrenchVatExemption).toBe(false);
  });
  it('formats currencies independently from UI language', () => {
    expect(formatBusinessMoney(12345, resolveBusinessLocale({ language: 'en', country: 'GB' }))).toContain('£123.45');
    expect(formatBusinessMoney(12345, resolveBusinessLocale({ language: 'en', country: 'US' }))).toContain('$123.45');
  });
  it('rejects unsupported jurisdictions instead of silently applying French rules', () => {
    expect(() => resolveBusinessLocale({ country: 'DE' })).toThrow();
    expect(() => resolveBusinessLocale({ timezone: 'invalid/timezone' })).toThrow();
  });
});
