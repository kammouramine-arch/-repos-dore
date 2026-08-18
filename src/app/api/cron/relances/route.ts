import { env } from '@/lib/env';
import { processDueFollowUps } from '@/server/services/followUpService';
import { expireOutdatedQuotes } from '@/server/services/quoteService';

/**
 * Tâche planifiée : traitement des relances arrivées à échéance et
 * expiration des devis dépassés. Protégée par un secret partagé.
 */
export async function POST(request: Request) {
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
