import { expect, it } from 'vitest';
import { safeErrorCategory } from '@/lib/safe-error';
import { quoteSentEmail } from '@/lib/email/templates';

it('never serializes exception messages, arbitrary names, causes or payloads', () => {
  const error = new Error('private payload', { cause: { token: 'private-token' } });
  error.name = 'private-name';
  expect(safeErrorCategory(error)).toBe('operation_failed');
  error.name = 'PrismaClientKnownRequestError';
  expect(safeErrorCategory(error)).toBe('database_error');
  expect(safeErrorCategory({ message: 'private payload' })).toBe('unknown_error');
});

it.each(['fr', 'en'])('quote email promises viewing, not unsupported acceptance (%s)', language => {
  const message = quoteSentEmail({ language, customerName: 'Test', companyName: 'DEVISERA QA', quoteNumber: 'TEST-1', quoteTitle: 'Test', totalCents: 0, publicUrl: 'https://devisera.fr/devis/test' });
  expect(message.html).toContain(language === 'en' ? 'View the quote' : 'Consulter le devis');
  expect(message.html).not.toMatch(/accepter|View and respond/);
});
