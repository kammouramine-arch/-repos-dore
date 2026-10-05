import "server-only";
import { AUDITS } from "@/content/audits";
import type { AuditLocale, RevenueAudit } from "./types";

/**
 * Accès aux audits, côté serveur uniquement : les données d'un audit ne
 * partent vers le navigateur que dans la page de cet audit. Un audit
 * archivé n'est plus servi.
 */
const served = (a: RevenueAudit) => a.status !== "archived";

export function getAudit(slug: string, locale: AuditLocale): RevenueAudit | undefined {
  return AUDITS.find((a) => a.slug === slug && a.locale === locale && served(a));
}

export function auditSlugs(locale: AuditLocale): string[] {
  return AUDITS.filter((a) => a.locale === locale && served(a)).map((a) => a.slug);
}
