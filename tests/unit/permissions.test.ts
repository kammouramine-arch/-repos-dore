import { describe, expect, it } from 'vitest';
import { can, assertCan, PERMISSIONS } from '@/lib/auth/permissions';
import { AppError } from '@/lib/errors';

describe('permissions', () => {
  it('donne au propriétaire tous les droits déclarés', () => {
    for (const permission of Object.keys(PERMISSIONS) as (keyof typeof PERMISSIONS)[]) {
      expect(can('OWNER', permission)).toBe(true);
    }
  });

  it('limite le membre aux opérations commerciales courantes', () => {
    expect(can('MEMBER', 'quote:write')).toBe(true);
    expect(can('MEMBER', 'quote:send')).toBe(true);
    expect(can('MEMBER', 'customer:write')).toBe(true);

    expect(can('MEMBER', 'pricebook:write')).toBe(false);
    expect(can('MEMBER', 'billing:manage')).toBe(false);
    expect(can('MEMBER', 'member:invite')).toBe(false);
    expect(can('MEMBER', 'quote:delete')).toBe(false);
    expect(can('MEMBER', 'analytics:read')).toBe(false);
  });

  it('réserve la facturation et les rôles au propriétaire', () => {
    expect(can('ADMIN', 'billing:manage')).toBe(false);
    expect(can('ADMIN', 'member:role')).toBe(false);
    expect(can('ADMIN', 'org:delete')).toBe(false);
    expect(can('ADMIN', 'pricebook:write')).toBe(true);
  });

  it('lève une erreur 403 explicite', () => {
    expect(() => assertCan('MEMBER', 'billing:manage')).toThrowError(AppError);
    try {
      assertCan('MEMBER', 'billing:manage');
    } catch (error) {
      expect((error as AppError).status).toBe(403);
    }
  });
});
