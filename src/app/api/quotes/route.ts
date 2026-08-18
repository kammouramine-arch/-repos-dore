import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/session';
import { ok, parseBody, parseQuery, route } from '@/server/api';
import { quoteSchema } from '@/server/validation';
import { createQuote } from '@/server/services/quoteService';
import { toQuoteDTO } from '@/server/dto';

const querySchema = z.object({
  statut: z
    .enum(['BROUILLON', 'ENVOYE', 'CONSULTE', 'ACCEPTE', 'REFUSE', 'MODIFICATION_DEMANDEE', 'EXPIRE', 'ANNULE'])
    .optional(),
  clientId: z.string().uuid().optional(),
  take: z.coerce.number().int().min(1).max(100).default(50),
  skip: z.coerce.number().int().min(0).default(0),
});

export async function GET(request: Request) {
  return route(async () => {
    const auth = await requirePermission('quote:read');
    const query = parseQuery(request, querySchema);
    const where = {
      organizationId: auth.organization.organizationId,
      deletedAt: null,
      ...(query.statut ? { status: query.statut } : {}),
      ...(query.clientId ? { customerId: query.clientId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.quote.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.take,
        skip: query.skip,
        include: { customer: true },
      }),
      prisma.quote.count({ where }),
    ]);

    return ok({
      total,
      items: items.map((quote) => ({
        ...toQuoteDTO(quote),
        customerName:
          quote.customer.companyName ??
          [quote.customer.firstName, quote.customer.lastName].filter(Boolean).join(' '),
      })),
    });
  });
}

export async function POST(request: Request) {
  return route(async () => {
    const auth = await requirePermission('quote:write');
    const body = await parseBody(request, quoteSchema);
    const quote = await createQuote(auth.organization.organizationId, auth.user.id, {
      ...body,
      items: body.items.map((item) => ({ ...item, description: item.description ?? null })),
    });
    return ok(toQuoteDTO(quote), { status: 201 });
  });
}
