import { requirePermission } from '@/lib/auth/session';
import { fail, ok } from '@/server/api';
import { AppError } from '@/lib/errors';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { getTranscriptionProvider } from '@/lib/ai';
import { TRADE_VOCABULARY } from '@/lib/ai/transcription';
import { AUDIO_MIME_TYPES, MAX_AUDIO_BYTES } from '@/lib/storage/validation';
import { incrementUsage } from '@/server/services/usageService';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const auth = await requirePermission('quote:write');
    const organizationId = auth.organization.organizationId;
    await enforceRateLimit({ key: `transcribe:${organizationId}`, ...RATE_LIMITS.aiGeneration });

    const provider = getTranscriptionProvider();
    if (!provider) {
      throw new AppError(
        'PROVIDER_UNAVAILABLE',
        "La transcription serveur n'est pas activée. Utilisez la dictée de votre navigateur ou saisissez le texte.",
      );
    }

    const form = await request.formData().catch(() => null);
    const file = form?.get('audio');
    if (!(file instanceof File)) throw new AppError('VALIDATION', 'Fichier audio manquant.');
    if (!AUDIO_MIME_TYPES.includes(file.type)) {
      throw new AppError('VALIDATION', 'Format audio non pris en charge.');
    }
    if (file.size > MAX_AUDIO_BYTES) {
      throw new AppError('VALIDATION', "L'enregistrement dépasse 20 Mo.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await provider.transcribeAudio({
      audio: { base64: buffer.toString('base64'), mimeType: file.type, fileName: file.name },
      language: 'fr',
      hints: TRADE_VOCABULARY,
    });

    await incrementUsage(organizationId, 'AI_TRANSCRIPTION');
    await prisma.aIRequest
      .create({
        data: {
          organizationId,
          userId: auth.user.id,
          kind: 'TRANSCRIPTION',
          provider: provider.name,
          latencyMs: result.usage.latencyMs,
        },
      })
      .catch(() => undefined);

    return ok({ text: result.data.text });
  } catch (error) {
    return fail(error);
  }
}
