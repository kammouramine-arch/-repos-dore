import { env } from '@/lib/env';
import { processDueFollowUps } from '@/server/services/followUpService';
import { expireOutdatedQuotes } from '@/server/services/quoteService';

/**
 * Tâche planifiée : traitement des relances arrivées à échéance et
 * expiration des devis dépassés. Protégée par un secret partagé.
 *
 * Exposée en GET et en POST : les tâches planifiées de Vercel déclenchent la
 * route par une requête GET, tandis que les ordonnanceurs externes et les
 * appels manuels utilisent POST. Le traitement et le contrôle d'accès sont
 * identiques dans les deux cas.
 */
async function handle(request: Request): Promise<Response> {
  const secret = env().CRON_SECRET;
  if (!secret) {
    return Response.json({ error: 'CRON_SECRET non configuré.' }, { status: 503 });
  }

  const provided = request.headers.get('authorization')?.replace('Bearer ', '');
  if (provided !== secret) {
    return Response.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const [followUps, expired] = await Promise.all([processDueFollowUps(), expireOutdatedQuotes()]);
  return Response.json({ data: { ...followUps, expiredQuotes: expired } });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
