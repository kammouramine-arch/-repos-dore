import 'server-only';
import { prisma } from '@/lib/prisma';
import { hashIp } from '@/lib/auth/tokens';

/** Actions tracées dans le journal d'audit. Aucun secret n'y est enregistré. */
export type AuditAction =
  | 'auth.login'
  | 'auth.logout'
  | 'auth.signup'
  | 'auth.password_reset'
  | 'organization.created'
  | 'organization.updated'
  | 'member.invited'
  | 'member.removed'
  | 'member.role_changed'
  | 'customer.created'
  | 'customer.updated'
  | 'customer.deleted'
  | 'lead.created'
  | 'lead.updated'
  | 'lead.converted'
  | 'quote.created'
  | 'quote.updated'
  | 'quote.sent'
  | 'quote.accepted'
  | 'quote.refused'
  | 'quote.change_requested'
  | 'quote.deleted'
  | 'pricebook.imported'
  | 'pricebook.updated'
  | 'followup.sent'
  | 'automation.updated'
  | 'subscription.updated'
  | 'settings.updated';

export interface AuditInput {
  organizationId?: string | null;
  userId?: string | null;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  ip?: string | null;
  metadata?: Record<string, unknown>;
}

/** Écrit une entrée d'audit sans jamais faire échouer l'action métier. */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: input.organizationId ?? null,
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        ipHash: hashIp(input.ip),
        metadata: (input.metadata ?? undefined) as never,
      },
    });
  } catch (error) {
    console.error('[audit] écriture impossible', error);
  }
}
