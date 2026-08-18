import { z } from 'zod';
import { requirePermission } from '@/lib/auth/session';
import { idSchema, ok, parseBody, route } from '@/server/api';
import { draftFollowUpMessage, sendFollowUp } from '@/server/services/followUpService';

type Params = { params: Promise<{ id: string }> };

/** Prépare un message de relance sans rien envoyer. */
export async function GET(request: Request, { params }: Params) {
  return route(async () => {
    const auth = await requirePermission('followup:send');
    const id = idSchema.parse((await params).id);
    const attempt = Number(new URL(request.url).searchParams.get('tentative') ?? '1') || 1;
    const draft = await draftFollowUpMessage(auth.organization.organizationId, id, attempt);
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
