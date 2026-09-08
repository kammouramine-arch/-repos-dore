import { beforeEach, describe, expect, it, vi } from 'vitest';
const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), update: vi.fn() },
  organizationMember: { findMany: vi.fn(), updateMany: vi.fn() },
  organization: { update: vi.fn() }, automation: { updateMany: vi.fn() },
  followUp: { updateMany: vi.fn() }, teamInvitation: { updateMany: vi.fn() },
  session: { updateMany: vi.fn() }, authToken: { updateMany: vi.fn() },
  emailChallenge: { updateMany: vi.fn() },
  fileBlob: { deleteMany: vi.fn() },
}));
vi.mock('@/lib/prisma', () => ({ prisma: { ...db, $transaction: (fn: (tx: unknown) => unknown) => fn(db) } }));
vi.mock('@/lib/auth/password', () => ({ verifyPassword: async (p: string) => p === 'correct' }));
import { deletePersonalAccount } from '@/server/services/accountService';
beforeEach(() => {
  vi.clearAllMocks();
  db.user.findUnique.mockResolvedValue({ passwordHash: 'hash', deletedAt: null });
  db.organizationMember.findMany.mockResolvedValueOnce([{ organizationId: 'solo' }]).mockResolvedValue([]);
});
describe('integrated account deletion', () => {
  it('archives a solo workspace, stops automation, revokes invitations and sessions', async () => {
    await expect(deletePersonalAccount('user', 'correct', 'SUPPRIMER')).resolves.toMatchObject({ deleted: true });
    expect(db.organization.update).toHaveBeenCalledWith({ where: { id: 'solo' }, data: { deletedAt: expect.any(Date) } });
    expect(db.automation.updateMany).toHaveBeenCalled();
    expect(db.teamInvitation.updateMany).toHaveBeenCalled();
    expect(db.session.updateMany).toHaveBeenCalled();
    expect(db.user.update).toHaveBeenCalled();
    expect(db.fileBlob.deleteMany).toHaveBeenCalledWith({ where: { storageKey: 'private-avatar/user' } });
  });
  it('does not archive a workspace with another owner', async () => {
    db.organizationMember.findMany.mockReset().mockResolvedValueOnce([{ organizationId: 'team' }]).mockResolvedValue([{ role: 'OWNER' }]);
    await deletePersonalAccount('user', 'correct', 'SUPPRIMER');
    expect(db.organization.update).not.toHaveBeenCalled();
  });
  it('requires transfer when active teammates have no other owner', async () => {
    db.organizationMember.findMany.mockReset().mockResolvedValueOnce([{ organizationId: 'team' }]).mockResolvedValue([{ role: 'MEMBER' }]);
    await expect(deletePersonalAccount('user', 'correct', 'SUPPRIMER')).rejects.toMatchObject({ code: 'VALIDATION' });
    expect(db.user.update).not.toHaveBeenCalled();
  });
  it('rejects incorrect passwords without mutations', async () => {
    await expect(deletePersonalAccount('user', 'wrong', 'SUPPRIMER')).rejects.toMatchObject({ code: 'VALIDATION' });
    expect(db.user.update).not.toHaveBeenCalled();
  });
});
