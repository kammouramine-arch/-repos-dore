import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/session';
import { fail, ok } from '@/server/api';
import { AppError } from '@/lib/errors';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import {
  DOCUMENT_MIME_TYPES,
  IMAGE_MIME_TYPES,
  MAX_DOCUMENT_BYTES,
  MAX_IMAGE_BYTES,
  getStorageProvider,
  storageKey,
  validateUpload,
} from '@/lib/storage';

const KINDS = ['LOGO', 'PHOTO_CHANTIER', 'PIECE_JOINTE', 'DEVIS_IMPORTE', 'CATALOGUE_IMPORTE', 'AUTRE'] as const;
type Kind = (typeof KINDS)[number];

/** Téléversement d'un fichier, cloisonné par organisation. */
export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    const organizationId = auth.organization.organizationId;
    await enforceRateLimit({ key: `upload:${organizationId}`, ...RATE_LIMITS.upload });

    const form = await request.formData().catch(() => null);
    if (!form) throw new AppError('VALIDATION', 'Requête invalide.');

    const file = form.get('file');
    if (!(file instanceof File)) throw new AppError('VALIDATION', 'Aucun fichier reçu.');

    const rawKind = String(form.get('kind') ?? 'PIECE_JOINTE');
    const kind: Kind = (KINDS as readonly string[]).includes(rawKind) ? (rawKind as Kind) : 'PIECE_JOINTE';
    const isImage = kind === 'LOGO' || kind === 'PHOTO_CHANTIER' || file.type.startsWith('image/');

    const validated = await validateUpload(file, {
      allowed: isImage ? IMAGE_MIME_TYPES : [...DOCUMENT_MIME_TYPES, ...IMAGE_MIME_TYPES],
      maxBytes: isImage ? MAX_IMAGE_BYTES : MAX_DOCUMENT_BYTES,
    });

    const id = randomUUID();
    const key = storageKey(organizationId, kind, id, validated.extension);
    await getStorageProvider().put(key, validated.buffer, validated.mimeType);

    const record = await prisma.file.create({
      data: {
        id,
        organizationId,
        kind,
        storageKey: key,
        fileName: validated.fileName,
        mimeType: validated.mimeType,
        sizeBytes: validated.size,
        uploadedById: auth.user.id,
        quoteId: (form.get('quoteId') as string) || null,
        leadId: (form.get('leadId') as string) || null,
      },
    });

    return ok(
      {
        id: record.id,
        fileName: record.fileName,
        mimeType: record.mimeType,
        sizeBytes: record.sizeBytes,
        url: `/api/files/${record.id}`,
      },
      { status: 201 },
    );
  } catch (error) {
    return fail(error);
  }
}
