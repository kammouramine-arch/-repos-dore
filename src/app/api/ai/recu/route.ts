import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/session';
import { ok, parseBody, route } from '@/server/api';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { assertCanWrite, assertPlanFeature } from '@/server/services/accessService';
import { assertAiConsent } from '@/server/services/aiConsentService';
import { assertWithinPlan } from '@/server/services/usageService';
import { extractReceipt } from '@/server/services/expenseService';

const schema = z.object({ fileId: z.string().uuid() });

/**
 * Lecture d'un justificatif déjà téléversé.
 *
 * Ne crée aucune dépense : renvoie ce que l'IA a lu, avec ses champs manquants
 * assumés, pour que l'artisan relise avant d'enregistrer.
 */
export async function POST(request: Request) {
  return route(async () => {
    const auth = await requirePermission('expense:write');
    const organizationId = auth.organization.organizationId;
    await assertCanWrite(organizationId);
    await assertPlanFeature(organizationId, 'receiptScanning');
    await assertAiConsent(auth.user.id, organizationId);
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
      select: { plan: true },
    });
    await assertWithinPlan(organizationId, subscription?.plan ?? 'ESSENTIEL', 'RECEIPT_SCAN');
    await enforceRateLimit({ key: `recu:${organizationId}`, ...RATE_LIMITS.aiGeneration });

    const { fileId } = await parseBody(request, schema);
    return ok(await extractReceipt(organizationId, auth.user.id, fileId));
  });
}
