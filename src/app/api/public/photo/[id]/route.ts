import { prisma } from '@/lib/prisma';
import { getStorageProvider } from '@/lib/storage';

type Params = { params: Promise<{ id: string }> };

/**
 * Sert une photo de chantier au client final, uniquement si elle est rattachée
 * au devis dont le jeton public est fourni. Sans jeton valide, aucun accès.
 */
export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const token = new URL(request.url).searchParams.get('devis');
  if (!token) return new Response('Non autorisé', { status: 401 });

  const file = await prisma.file.findFirst({
    where: {
      id,
      deletedAt: null,
      kind: 'PHOTO_CHANTIER',
      quote: { publicToken: token, deletedAt: null, status: { not: 'BROUILLON' } },
    },
  });
  if (!file) return new Response('Introuvable', { status: 404 });

  try {
    const buffer = await getStorageProvider().get(file.storageKey);
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': file.mimeType,
        'Cache-Control': 'private, max-age=600',
      },
    });
  } catch {
    return new Response('Introuvable', { status: 404 });
  }
}
