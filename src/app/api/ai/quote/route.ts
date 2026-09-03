import { z } from 'zod';
import { requirePermission } from '@/lib/auth/session';
import { ok, parseBody, route } from '@/server/api';
import { assertCanWrite } from '@/server/services/accessService';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { assertWithinPlan } from '@/server/services/usageService';
import { generateQuoteDraft } from '@/server/services/aiQuoteService';
import { prisma } from '@/lib/prisma';

const bodySchema = z.object({
  description: z.string().trim().min(10, 'Décrivez le chantier en quelques mots.').max(8000),
  fileIds: z.array(z.string().uuid()).max(6).default([]),
  leadId: z.string().uuid().nullish(),
});

export async function POST(request: Request) {
  return route(async () => {
    const auth = await requirePermission('quote:write');
    await assertCanWrite(auth.organization.organizationId);
    const organizationId = auth.organization.organizationId;

    await enforceRateLimit({ key: `ai:${organizationId}`, ...RATE_LIMITS.aiGeneration });

    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
      select: { plan: true },
    });
    await assertWithinPlan(organizationId, subscription?.plan ?? 'ESSENTIEL', 'AI_GENERATION');

    const body = await parseBody(request, bodySchema);
    const draft = await generateQuoteDraft({
      organizationId,
      userId: auth.user.id,
      description: body.description,
      fileIds: body.fileIds,
      leadId: body.leadId,
    });

    return ok(draft);
  });
}
