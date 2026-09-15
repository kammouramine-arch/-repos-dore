import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { createTestOrganization, cleanupOrganization, prisma } from '../helpers';
const identity = vi.hoisted(() => ({ userId: '' }));
vi.mock('@/lib/auth/session', () => ({ requireAuth: async () => ({ user: { id: identity.userId } }) }));
vi.mock('@/lib/rate-limit', () => ({ enforceRateLimit: async () => {}, RATE_LIMITS: { upload: {} } }));
import { GET, POST, DELETE } from '@/app/api/auth/avatar/route';
import { readAvatar, saveAvatar, avatarKey } from '@/server/services/avatarService';
const created: Awaited<ReturnType<typeof createTestOrganization>>[] = [];
let jpeg: string;
beforeAll(async () => {
  created.push(await createTestOrganization('Avatar A'), await createTestOrganization('Avatar B'));
  identity.userId = created[0].user.id;
  jpeg = (await sharp({ create: { width: 512, height: 512, channels: 3, background: '#2547E0' } }).jpeg().toBuffer()).toString('base64');
});
afterAll(async () => {
  for (const a of created) {
    await prisma.fileBlob.deleteMany({ where: { storageKey: avatarKey(a.user.id) } });
    await cleanupOrganization(a.organization.id, a.user.id);
  }
  await prisma.$disconnect();
});
describe('private personal avatar API', () => {
  it('saves a compressed photo, strips metadata and returns no public URL', async () => {
    const response = await POST(new Request('http://localhost/api/auth/avatar', { method: 'POST', body: JSON.stringify({ image: jpeg }) }));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    const saved = await prisma.fileBlob.findUniqueOrThrow({ where: { storageKey: avatarKey(identity.userId) } });
    const meta = await sharp(Buffer.from(saved.bytes)).metadata();
    expect(meta).toMatchObject({ width: 256, height: 256, format: 'jpeg' });
    expect(meta.exif).toBeUndefined();
    expect(saved.bytes.length).toBeLessThan(100_000);
  });
  it('cannot read or remove another user photo', async () => {
    identity.userId = created[1].user.id;
    expect(await (await GET()).json()).toMatchObject({ data: { image: null } });
    await DELETE();
    expect((await readAvatar(created[0].user.id)).image).not.toBeNull();
    // The API rejects any supplied ownership selector instead of trusting it.
    expect((await POST(new Request('http://localhost/api/auth/avatar', { method: 'POST', body: JSON.stringify({ image: jpeg, userId: created[0].user.id }) }))).status).toBe(422);
    identity.userId = created[0].user.id;
  });
  it('rejects invalid and oversized content while preserving the previous photo', async () => {
    const before = await readAvatar(identity.userId);
    await expect(saveAvatar(identity.userId, Buffer.from('not an image').toString('base64'))).rejects.toBeDefined();
    expect((await POST(new Request('http://localhost/api/auth/avatar', { method: 'POST', body: 'x'.repeat(720_000) }))).status).toBe(422);
    expect(await readAvatar(identity.userId)).toEqual(before);
  });
  it('replaces atomically, then removes to restore initials', async () => {
    const other = (await sharp({ create: { width: 100, height: 100, channels: 3, background: '#ffffff' } }).jpeg().toBuffer()).toString('base64');
    const before = await readAvatar(identity.userId);
    await saveAvatar(identity.userId, other);
    expect(await readAvatar(identity.userId)).not.toEqual(before);
    await DELETE();
    expect(await readAvatar(identity.userId)).toEqual({ image: null });
  });
});
