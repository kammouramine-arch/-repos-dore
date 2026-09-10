import { headers } from 'next/headers';
import { ok, parseBody, route } from '@/server/api';
import { publicLeadSchema } from '@/server/validation';
import { receivePublicLead } from '@/server/services/leadService';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { clientIpFrom } from '@/lib/auth/session';

type Params = { params: Promise<{ token: string }> };

/** Formulaire public de demande de devis, intégrable sur le site d'un artisan. */
export async function POST(request: Request, { params }: Params) {
  return route(async () => {
    const { token } = await params;
    const ip = clientIpFrom(await headers());
    await enforceRateLimit({ key: `prospect-public:${ip ?? token}`, ...RATE_LIMITS.publicLeadForm });

    const body = await parseBody(request, publicLeadSchema);
    const result = await receivePublicLead(token, {
      contactName: body.contactName,
      email: body.email || null,
      phone: body.phone || null,
      city: body.city || null,
      postalCode: body.postalCode || null,
      addressLine1: body.addressLine1 || null,
      description: body.description,
      fileIds: body.fileIds,
    });

    return ok(result, { status: 201 });
  });
}

export async function OPTIONS() {
  // Le formulaire peut être intégré depuis le site de l'artisan.
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
