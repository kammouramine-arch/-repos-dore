import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/session';
import { fail, idSchema } from '@/server/api';
import { notFound } from '@/lib/errors';
import { getStorageProvider } from '@/lib/storage';

type Params = { params: Promise<{ id: string }> };

/**
 * Sert un fichier privé après vérification de l'appartenance à l'organisation.
 * Aucun fichier n'est exposé publiquement par une URL devinable.
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const auth = await requireAuth();
    const id = idSchema.parse((await params).id);

    const file = await prisma.file.findFirst({
      where: { id, organizationId: auth.organization.organizationId, deletedAt: null },
    });
    if (!file) throw notFound('Fichier introuvable.');

    const storage = getStorageProvider();
    const signed = await storage.signedUrl(file.storageKey, 300);
    if (signed) return Response.redirect(signed, 302);

    const buffer = await storage.get(file.storageKey);
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': file.mimeType,
        'Content-Disposition': `inline; filename="${file.fileName}"`,
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const auth = await requireAuth();
    const id = idSchema.parse((await params).id);
    const file = await prisma.file.findFirst({
      where: { id, organizationId: auth.organization.organizationId, deletedAt: null },
    });
    if (!file) throw notFound('Fichier introuvable.');

    await prisma.file.update({ where: { id }, data: { deletedAt: new Date() } });
    await getStorageProvider().delete(file.storageKey).catch(() => undefined);
    return Response.json({ data: { deleted: true } });
  } catch (error) {
    return fail(error);
  }
}
