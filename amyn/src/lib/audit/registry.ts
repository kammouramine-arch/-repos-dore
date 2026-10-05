import "server-only";
import { AUDITS } from "@/content/audits";
import type { AuditLocale, RevenueAudit } from "./types";

/**
 * Audits EN CLAIR : réservés aux exemples fictifs (publics). Un audit de
 * prospect réel n'est jamais servi par ce registre, même ajouté par
 * erreur : il passe par les audits scellés (lib/audit/seal.ts).
 */
const served = (a: RevenueAudit) => a.fictional && a.status !== "archived";

export function getAudit(slug: string, locale: AuditLocale): RevenueAudit | undefined {
  return AUDITS.find((a) => a.slug === slug && a.locale === locale && served(a));
}

export function auditSlugs(locale: AuditLocale): string[] {
  return AUDITS.filter((a) => a.locale === locale && served(a)).map((a) => a.slug);
}
