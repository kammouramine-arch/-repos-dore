import { z } from 'zod';
import { requireAuth } from '@/lib/auth/session';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { ok, route } from '@/server/api';
import { validation } from '@/lib/errors';
import { readAvatar, saveAvatar, removeAvatar } from '@/server/services/avatarService';

const privateResult = (value: { image: string | null }) => {
  const response = ok(value);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
};
export async function GET() {
  return route(async () => {
    const auth = await requireAuth({ requireVerified: true });
    return privateResult(await readAvatar(auth.user.id));
  });
}
export async function POST(request: Request) {
  return route(async () => {
    const auth = await requireAuth({ requireVerified: true });
    await enforceRateLimit({ key: `avatar:${auth.user.id}`, ...RATE_LIMITS.upload });
    const reader = request.body?.getReader();
    if (!reader) throw validation('Image manquante.');
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > 710_000) { await reader.cancel(); throw validation('Image trop volumineuse.'); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    let payload: unknown;
    try { payload = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw validation('Image invalide.'); }
    const body = z.object({ image: z.string().max(700_000) }).strict().parse(payload);
    return privateResult(await saveAvatar(auth.user.id, body.image));
  });
}
export async function DELETE() {
  return route(async () => {
    const auth = await requireAuth({ requireVerified: true });
    return privateResult(await removeAvatar(auth.user.id));
  });
}
