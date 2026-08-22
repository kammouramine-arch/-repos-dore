import { z } from 'zod';
import { requirePermission } from '@/lib/auth/session';
import { idSchema, ok, parseBody, route } from '@/server/api';
import { assertCanWrite } from '@/server/services/accessService';
import { sendQuote } from '@/server/services/quoteSendService';
import { toQuoteDTO } from '@/server/dto';

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  message: z.string().trim().max(2000).nullish(),
  to: z.string().trim().email('Adresse email invalide.').nullish(),
});

export async function POST(request: Request, { params }: Params) {
  return route(async () => {
    const auth = await requirePermission('quote:send');
    await assertCanWrite(auth.organization.organizationId);
    const id = idSchema.parse((await params).id);
    const body = await parseBody(request, bodySchema);

    const result = await sendQuote({
      organizationId: auth.organization.organizationId,
      userId: auth.user.id,
      quoteId: id,
      message: body.message,
      to: body.to,
    });

    return ok({
      quote: toQuoteDTO(result.quote),
      publicUrl: result.publicUrl,
      recipient: result.recipient,
    });
  });
}
