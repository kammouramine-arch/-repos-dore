import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/session';
import { idSchema, fail } from '@/server/api';
import { notFound } from '@/lib/errors';
import { buildQuotePdf } from '@/server/services/quotePdfService';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const auth = await requirePermission('quote:read');
    const id = idSchema.parse((await params).id);

    const quote = await prisma.quote.findFirst({
      where: { id, organizationId: auth.organization.organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!quote) throw notFound('Devis introuvable.');

    const { bytes, fileName } = await buildQuotePdf(id);
    await prisma.quoteEvent.create({
      data: { quoteId: id, type: 'PDF_TELECHARGE', actor: `user:${auth.user.id}` },
    });

    return new Response(new Uint8Array(bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    return fail(error);
  }
}
