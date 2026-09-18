import { env } from '@/lib/env';
import { getStripe } from '@/lib/billing/stripe';
import { handleConnectEvent } from '@/server/services/invoicePaymentWebhookService';

/**
 * Webhook Stripe Connect : encaissement des factures des artisans.
 *
 * Distinct du webhook d'abonnement DEVISERA (`/api/webhooks/stripe`) : les
 * événements arrivent depuis les comptes connectés et portent leur propre
 * secret de signature. Les mélanger ferait traiter un paiement de chantier
 * comme un changement d'abonnement.
 */
export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = env().STRIPE_CONNECT_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return Response.json({ error: 'Encaissement non configuré.' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) return Response.json({ error: 'Signature manquante.' }, { status: 400 });

  const payload = await request.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch {
    return Response.json({ error: 'Signature invalide.' }, { status: 400 });
  }

  try {
    const result = await handleConnectEvent(event);
    return Response.json({ received: true, skipped: result.skipped });
  } catch (error) {
    console.error('[stripe-connect] traitement du webhook impossible', error);
    // Un 500 déclenche une nouvelle tentative côté Stripe.
    return Response.json({ error: 'Traitement impossible.' }, { status: 500 });
  }
}
