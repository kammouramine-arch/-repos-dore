import { requirePermission } from '@/lib/auth/session';
import { ok, route } from '@/server/api';
import { listFollowUps, revenueToRecover } from '@/server/services/followUpService';
import { fullName } from '@/lib/utils';

export async function GET() {
  return route(async () => {
    const auth = await requirePermission('followup:send');
    const organizationId = auth.organization.organizationId;
    const [followUps, toRecover] = await Promise.all([
      listFollowUps(organizationId),
      revenueToRecover(organizationId),
    ]);

    return ok({
      toRecover,
      followUps: followUps.map((followUp) => ({
        id: followUp.id,
        status: followUp.status,
        channel: followUp.channel,
        attempt: followUp.attempt,
        subject: followUp.subject,
        body: followUp.body,
        scheduledFor: followUp.scheduledFor.toISOString(),
        quoteId: followUp.quoteId,
        quoteNumber: followUp.quote?.number ?? null,
        quoteTitle: followUp.quote?.title ?? null,
        totalCents: followUp.quote?.totalCents ?? 0,
        customerName: followUp.quote
          ? fullName(
              followUp.quote.customer.firstName,
              followUp.quote.customer.lastName,
              followUp.quote.customer.companyName,
            )
          : null,
      })),
    });
  });
}
