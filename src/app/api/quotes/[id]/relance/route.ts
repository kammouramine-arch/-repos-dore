import { z } from 'zod';
import { requirePermission } from '@/lib/auth/session';
import { idSchema, ok, parseBody, route } from '@/server/api';
import { assertCanWrite } from '@/server/services/accessService';
import { draftFollowUpMessage, sendFollowUp } from '@/server/services/followUpService';
import type { FollowUpTone } from '@devisia/shared';

type Params = { params: Promise<{ id: string }> };

/** Prépare un message de relance sans rien envoyer. */
export async function GET(request: Request, { params }: Params) {
  return route(async () => {
    const auth = await requirePermission('followup:send');
    await assertCanWrite(auth.organization.organizationId);
    const id = idSchema.parse((await params).id);
    const search = new URL(request.url).searchParams;
    const attempt = Number(search.get('tentative') ?? '1') || 1;
    const requested = search.get('ton');
    const tone = (['court', 'professionnel', 'amical', 'ferme'] as const).includes(
      requested as FollowUpTone,
    )
      ? (requested as FollowUpTone)
      : 'professionnel';
    const draft = await draftFollowUpMessage(auth.organization.organizationId, id, attempt, tone);
    return ok(draft);
  });
}

const bodySchema = z.object({
  subject: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(4000),
  followUpId: z.string().uuid().optional(),
});

export async function POST(request: Request, { params }: Params) {
  return route(async () => {
    const auth = await requirePermission('followup:send');
    const id = idSchema.parse((await params).id);
    const payload = await parseBody(request, bodySchema);

    const record = await sendFollowUp({
      organizationId: auth.organization.organizationId,
      userId: auth.user.id,
      quoteId: id,
      followUpId: payload.followUpId,
      subject: payload.subject,
      body: payload.body,
    });

    return ok({ id: record.id, sentAt: record.sentAt?.toISOString() ?? null });
  });
}
