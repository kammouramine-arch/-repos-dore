import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/session';
import { ok, parseBody, route } from '@/server/api';
import { AppError } from '@/lib/errors';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { getAIProvider } from '@/lib/ai';
import { getStorageProvider } from '@/lib/storage';
import { incrementUsage } from '@/server/services/usageService';

const bodySchema = z.object({
  fileIds: z.array(z.string().uuid()).min(1).max(6),
  description: z.string().trim().max(4000).optional(),
});

export async function POST(request: Request) {
  return route(async () => {
    const auth = await requirePermission('quote:write');
    const organizationId = auth.organization.organizationId;
    await enforceRateLimit({ key: `vision:${organizationId}`, ...RATE_LIMITS.aiGeneration });

    const provider = getAIProvider();
    if (!provider) {
      throw new AppError(
        'PROVIDER_UNAVAILABLE',
        "L'analyse de photos nécessite un fournisseur d'IA configuré.",
      );
    }

    const body = await parseBody(request, bodySchema);
    const files = await prisma.file.findMany({
      where: { id: { in: body.fileIds }, organizationId, deletedAt: null },
    });
    if (files.length === 0) throw new AppError('NOT_FOUND', 'Photos introuvables.');

    const storage = getStorageProvider();
    const images = [];
    for (const file of files) {
      if (!file.mimeType.startsWith('image/')) continue;
      const buffer = await storage.get(file.storageKey);
      images.push({
        base64: buffer.toString('base64'),
        mimeType: file.mimeType,
        fileName: file.fileName,
      });
    }

    const profile = await prisma.businessProfile.findUnique({
      where: { organizationId },
      select: { trade: true },
    });

    const result = await provider.analyzeImage({
      images,
      trade: profile?.trade,
      untrusted: body.description,
    });

    await incrementUsage(organizationId, 'AI_IMAGE_ANALYSIS');
    await prisma.aIRequest
      .create({
        data: {
          organizationId,
          userId: auth.user.id,
          kind: 'IMAGE_ANALYSIS',
          provider: result.usage.provider,
          model: result.usage.model,
          latencyMs: result.usage.latencyMs,
        },
      })
      .catch(() => undefined);

    // Le devis dit quel modèle l'a rédigé ; l'analyse doit en faire autant.
    // Sans cela, vérifier quel modèle sert réellement la vision oblige à le
    // déduire — et une déduction n'est pas une preuve.
    return ok({
      ...result.data,
      provider: result.usage.provider,
      model: result.usage.model ?? null,
      usage: {
        inputTokens: result.usage.inputTokens ?? null,
        outputTokens: result.usage.outputTokens ?? null,
        thoughtsTokens: result.usage.thoughtsTokens ?? null,
        totalTokens: result.usage.totalTokens ?? null,
        latencyMs: result.usage.latencyMs,
      },
    });
  });
}
