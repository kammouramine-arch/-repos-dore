import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  user: { findFirst: vi.fn(), updateMany: vi.fn() },
  organizationMember: { findFirst: vi.fn() },
  organization: { updateMany: vi.fn() },
}));
vi.mock('@/lib/prisma', () => ({ prisma: { ...mocks, $transaction: (fn: (tx: unknown) => unknown) => fn(mocks) } }));
import { updatePreferredLanguage } from '@/server/services/languageService';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.updateMany.mockResolvedValue({ count: 1 });
  mocks.organizationMember.findFirst.mockResolvedValue({ role: 'OWNER' });
  mocks.organization.updateMany.mockResolvedValue({ count: 1 });
});

describe('preferred language', () => {
  it('records an explicit choice with its date and propagates it to the owned organization', async () => {
    mocks.user.findFirst.mockResolvedValue({ locale: 'fr', localeChosenAt: null });
    const result = await updatePreferredLanguage('user', 'en', 'org', 'explicit');
    expect(result.language).toBe('en');
    expect(result.localeChosenAt).toMatch(/^\d{4}-/);
    expect(mocks.user.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { locale: 'en', localeChosenAt: expect.any(Date) } }));
    expect(mocks.organization.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { locale: 'en' } }));
  });

  it('lets a device-inferred language replace an accidental value while no choice exists', async () => {
    mocks.user.findFirst.mockResolvedValue({ locale: 'en', localeChosenAt: null });
    const result = await updatePreferredLanguage('user', 'fr', 'org', 'inferred');
    expect(result).toEqual({ language: 'fr', localeChosenAt: null });
    expect(mocks.user.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { locale: 'fr', localeChosenAt: null } }));
  });

  it('never lets an inferred language override an explicit choice', async () => {
    const chosen = new Date('2026-09-01T10:00:00.000Z');
    mocks.user.findFirst.mockResolvedValue({ locale: 'en', localeChosenAt: chosen });
    const result = await updatePreferredLanguage('user', 'fr', 'org', 'inferred');
    expect(result).toEqual({ language: 'en', localeChosenAt: chosen.toISOString() });
    expect(mocks.user.updateMany).not.toHaveBeenCalled();
    expect(mocks.organization.updateMany).not.toHaveBeenCalled();
  });

  it('forgets the choice on reset so the device language applies again', async () => {
    mocks.user.findFirst.mockResolvedValue({ locale: 'en', localeChosenAt: new Date() });
    const result = await updatePreferredLanguage('user', 'fr', undefined, 'reset');
    expect(result).toEqual({ language: 'fr', localeChosenAt: null });
    expect(mocks.organization.updateMany).not.toHaveBeenCalled();
  });

  it('does not change shared documents for a non-owner member', async () => {
    mocks.user.findFirst.mockResolvedValue({ locale: 'fr', localeChosenAt: null });
    mocks.organizationMember.findFirst.mockResolvedValue({ role: 'MEMBER' });
    await updatePreferredLanguage('user', 'en', 'org');
    expect(mocks.organization.updateMany).not.toHaveBeenCalled();
  });

  it('rejects unknown languages and missing accounts', async () => {
    await expect(updatePreferredLanguage('user', 'de')).rejects.toThrow();
    mocks.user.findFirst.mockResolvedValue(null);
    await expect(updatePreferredLanguage('user', 'fr')).rejects.toThrow('Compte introuvable.');
  });
});
