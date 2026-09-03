import type { MemberRole } from '@prisma/client';
import { forbidden } from '../errors';

/**
 * Permissions vérifiées côté serveur, jamais côté client.
 * OWNER > ADMIN > MEMBER.
 */
export const PERMISSIONS = {
  'org:update': ['OWNER', 'ADMIN'],
  'org:delete': ['OWNER'],
  'member:invite': ['OWNER', 'ADMIN'],
  'member:remove': ['OWNER', 'ADMIN'],
  'member:role': ['OWNER'],
  'billing:manage': ['OWNER'],
  'billing:view': ['OWNER', 'ADMIN'],
  'customer:read': ['OWNER', 'ADMIN', 'MEMBER'],
  'customer:write': ['OWNER', 'ADMIN', 'MEMBER'],
  'customer:delete': ['OWNER', 'ADMIN'],
  'lead:read': ['OWNER', 'ADMIN', 'MEMBER'],
  'lead:write': ['OWNER', 'ADMIN', 'MEMBER'],
  'quote:read': ['OWNER', 'ADMIN', 'MEMBER'],
  'quote:write': ['OWNER', 'ADMIN', 'MEMBER'],
  'quote:send': ['OWNER', 'ADMIN', 'MEMBER'],
  'quote:delete': ['OWNER', 'ADMIN'],
  'pricebook:read': ['OWNER', 'ADMIN', 'MEMBER'],
  'pricebook:write': ['OWNER', 'ADMIN'],
  'automation:read': ['OWNER', 'ADMIN', 'MEMBER'],
  'automation:write': ['OWNER', 'ADMIN'],
  'followup:send': ['OWNER', 'ADMIN', 'MEMBER'],
  'settings:read': ['OWNER', 'ADMIN', 'MEMBER'],
  'settings:write': ['OWNER', 'ADMIN'],
  'analytics:read': ['OWNER', 'ADMIN'],
  'invoice:read': ['OWNER', 'ADMIN'],
  'invoice:write': ['OWNER', 'ADMIN'],
} as const satisfies Record<string, readonly MemberRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: MemberRole, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly MemberRole[]).includes(role);
}

export function assertCan(role: MemberRole, permission: Permission): void {
  if (!can(role, permission)) {
    throw forbidden("Votre rôle ne permet pas cette action. Contactez le propriétaire du compte.");
  }
}

export const ROLE_LABELS: Record<MemberRole, string> = {
  OWNER: 'Propriétaire',
  ADMIN: 'Administrateur',
  MEMBER: 'Membre',
};

export const ROLE_DESCRIPTIONS: Record<MemberRole, string> = {
  OWNER: 'Accès complet, y compris la facturation et la suppression du compte.',
  ADMIN: "Gestion opérationnelle complète : devis, clients, catalogue, automatisations.",
  MEMBER: 'Création et suivi des devis, clients et prospects.',
};
