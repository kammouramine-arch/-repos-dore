import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/session';
import { idSchema, fail } from '@/server/api';
import { notFound } from '@/lib/errors';
import { buildInvoicePdf } from '@/server/services/quotePdfService';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const auth = await requirePermission('invoice:read');
    const id = idSchema.parse((await params).id);

    // Cloisonnement : la facture doit appartenir à l'entreprise de la session.
    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId: auth.organization.organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!invoice) throw notFound('Facture introuvable.');

    const { bytes, fileName } = await buildInvoicePdf(id);
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
