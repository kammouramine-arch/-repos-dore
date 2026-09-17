import { prisma } from '@/lib/prisma';
import { fail } from '@/server/api';
import { notFound } from '@/lib/errors';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { buildInvoicePdf } from '@/server/services/quotePdfService';

type Params = { params: Promise<{ token: string }> };

/**
 * La facture en PDF, pour le client qui a reçu le lien.
 *
 * Le jeton fait autorité, exactement comme pour la page de règlement : on
 * résout la facture par son jeton public et jamais par son identifiant, de
 * sorte qu'un numéro deviné ne donne accès à rien. La limite de débit ferme
 * la porte aux essais en série.
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const token = (await params).token;
    await enforceRateLimit({ key: `facture-pdf:${token}`, ...RATE_LIMITS.publicQuoteAction });

    const invoice = await prisma.invoice.findUnique({
      where: { publicToken: token },
      select: { id: true, deletedAt: true },
    });
    if (!invoice || invoice.deletedAt) throw notFound('Cette facture n’est plus disponible.');

    const { bytes, fileName } = await buildInvoicePdf(invoice.id);
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
