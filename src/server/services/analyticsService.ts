import 'server-only';
import { prisma } from '@/lib/prisma';

/** Événements produit suivis — strictement ce qui sert au pilotage. */
export type ProductEvent =
  | 'signup'
  | 'onboarding_completed'
  | 'quote_created'
  | 'quote_sent'
  | 'quote_viewed'
  | 'quote_accepted'
  | 'quote_refused'
  | 'lead_created'
  | 'followup_sent'
  | 'ai_generation'
  | 'subscription_started';

export async function trackEvent(
  name: ProductEvent,
  options: {
    organizationId?: string | null;
    userId?: string | null;
    properties?: Record<string, string | number | boolean | null>;
  } = {},
): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        name,
        organizationId: options.organizationId ?? null,
        userId: options.userId ?? null,
        properties: (options.properties ?? undefined) as never,
      },
    });
  } catch (error) {
    console.error('[analytics] écriture impossible', error);
  }
}
