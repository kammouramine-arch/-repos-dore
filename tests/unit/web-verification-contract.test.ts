import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('does not consume legacy email tokens while rendering a GET page', () => {
  const page = readFileSync('src/app/(auth)/verification/page.tsx', 'utf8');
  expect(page).not.toContain('await verifyEmail(');
  expect(page).toContain('<LegacyVerificationForm');
});

it('requests code-based verification for new website signup', () => {
  const action = readFileSync('src/app/(auth)/actions.ts', 'utf8');
  expect(action).toContain("verificationMethod: 'code'");
});
