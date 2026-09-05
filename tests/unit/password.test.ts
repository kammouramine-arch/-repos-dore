import { describe, expect, it } from 'vitest';
import { passwordErrors } from '@devisia/shared';
import { passwordSchema } from '@/server/validation';
import { assertPasswordStrength } from '@/lib/auth/password';

describe('password policy shared by phone and server', () => {
  it.each(['abcdefghij', 'abcdefghijkl', 'abcdefghijklm'])(
    'explains the missing number for %s instead of asking for more characters', (value) => {
      expect(passwordErrors(value)).toEqual(['Ajoutez au moins un chiffre.']);
      const result = passwordSchema.safeParse(value);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.issues[0].message).toBe('Ajoutez au moins un chiffre.');
    },
  );
  it.each(['abcdefghi1', 'abcdefghijk1', 'abcdefghijkl1', 'étéChantier7'])('accepts %s consistently', (value) => {
    expect(passwordErrors(value)).toEqual([]);
    expect(passwordSchema.safeParse(value).success).toBe(true);
    expect(() => assertPasswordStrength(value)).not.toThrow();
  });
  it('explains a missing letter and rejects excessively long passwords', () => {
    expect(passwordErrors('1234567890')).toEqual(['Ajoutez au moins une lettre.']);
    expect(passwordErrors('a'.repeat(200) + '1')).toContain('200 caractères maximum.');
  });
});
