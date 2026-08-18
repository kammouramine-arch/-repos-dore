import { env } from '@/lib/env';
import { getStripe } from '@/lib/billing/stripe';
import { handleStripeEvent } from '@/server/services/billingService';

/**
 * Webhook Stripe.
 * La signature est vérifiée avant tout traitement : l'état d'abonnement ne
 * provient jamais du frontend.
 */
export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = env().STRIPE_WEBHOOK_SECRET;

  if (!stripe || !secret) {
    return Response.json({ error: 'Facturation non configurée.' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return Response.json({ error: 'Signature manquante.' }, { status: 400 });
  }

  const payload = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch {
    return Response.json({ error: 'Signature invalide.' }, { status: 400 });
  }

  try {
    const result = await handleStripeEvent(event);
    return Response.json({ received: true, skipped: result.skipped });
  } catch (error) {
    console.error('[stripe] traitement du webhook impossible', error);
    // Un 500 déclenche une nouvelle tentative côté Stripe.
    return Response.json({ error: 'Traitement impossible.' }, { status: 500 });
  }
}
