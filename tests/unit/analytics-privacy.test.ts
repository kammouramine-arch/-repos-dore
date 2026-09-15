import { afterEach, describe, expect, it, vi } from 'vitest';

const create = vi.hoisted(() => vi.fn());
vi.mock('@/lib/prisma', () => ({ prisma: { analyticsEvent: { create } } }));
import { trackEvent } from '@/server/services/analyticsService';

afterEach(() => { vi.restoreAllMocks(); create.mockReset(); });
describe('analytics failure privacy', () => {
  it('does not leak database errors or block the customer operation', async () => {
    create.mockRejectedValue(new Error('private customer payload and database connection'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(trackEvent('quote_created', { userId: 'private-user' })).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledExactlyOnceWith('[analytics] write_failed');
  });
  it('persists the intended event without diagnostic logging on success', async () => {
    create.mockResolvedValue({});
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await trackEvent('signup', { userId: 'test-user' });
    expect(create).toHaveBeenCalledWith({ data: { name: 'signup', userId: 'test-user', organizationId: null, properties: undefined } });
    expect(log).not.toHaveBeenCalled();
  });
});
