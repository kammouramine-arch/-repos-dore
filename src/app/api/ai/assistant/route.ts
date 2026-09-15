import { z } from 'zod';
import { requirePermission } from '@/lib/auth/session';
import { ok, parseBody, route } from '@/server/api';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { askAssistant } from '@/server/services/assistantService';
import { prisma } from '@/lib/prisma';
import { assertCanWrite } from '@/server/services/accessService';
import { assertWithinPlan, incrementUsage } from '@/server/services/usageService';

const bodySchema = z.object({
  question: z.string().trim().min(3, 'Posez votre question.').max(600),
});

export async function POST(request: Request) {
  return route(async () => {
    const auth = await requirePermission('quote:read');
    const organizationId = auth.organization.organizationId;
    await assertCanWrite(organizationId);
    const subscription = await prisma.subscription.findUnique({ where: { organizationId }, select: { plan: true } });
    await assertWithinPlan(organizationId, subscription?.plan ?? 'ESSENTIEL', 'AI_GENERATION');
    await enforceRateLimit({ key: `assistant:${organizationId}`, ...RATE_LIMITS.aiGeneration });

    const body = await parseBody(request, bodySchema);
    const answer = await askAssistant(organizationId, auth.user.id, body.question);
    if (!answer.degraded) await incrementUsage(organizationId, 'AI_GENERATION');
    return ok(answer);
  });
}
