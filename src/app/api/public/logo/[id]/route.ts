import { prisma } from '@/lib/prisma';
import { getStorageProvider } from '@/lib/storage';

type Params = { params: Promise<{ id: string }> };

/**
 * Sert le logo d'une entreprise : il figure déjà sur les devis envoyés aux
 * clients, il n'y a donc pas de donnée confidentielle. Seuls les fichiers de
 * type LOGO sont accessibles par cette route.
 */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;

  const file = await prisma.file.findFirst({
    where: { id, kind: 'LOGO', deletedAt: null },
  });
  if (!file) return new Response('Introuvable', { status: 404 });

  try {
    const buffer = await getStorageProvider().get(file.storageKey);
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': file.mimeType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return new Response('Introuvable', { status: 404 });
  }
}
