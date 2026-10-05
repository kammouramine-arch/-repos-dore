import type { Metadata } from "next";
import { AuditDocument } from "@/components/audit/AuditDocument";
import { getAuditCopy } from "@/lib/audit/copy";
import type { RevenueAudit } from "@/lib/audit/types";

/**
 * Métadonnées d'un audit : jamais indexé, jamais suivi, jamais mis en
 * cache par les moteurs ; aucun référent transmis aux liens sortants.
 * Pas d'adresse canonique ni de version alternative publiées.
 */
export function auditMetadata(audit: RevenueAudit | undefined): Metadata {
  const robots = { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false, noimageindex: true } };
  if (!audit) return { robots };
  const t = getAuditCopy(audit.locale);
  return {
    title: `${t.product.replace("™", "")} — ${audit.company.name}`,
    description: `${t.brand} ${t.product} · ${t.confidential}`,
    robots,
    referrer: "no-referrer",
    alternates: { canonical: null, languages: {} },
    openGraph: null,
  };
}

/** Audit scellé : métadonnées neutres — le serveur ne connaît pas l'entreprise. */
export function sealedAuditMetadata(locale: "fr" | "en"): Metadata {
  return {
    title: getAuditCopy(locale).sealed.title,
    robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false, noimageindex: true } },
    referrer: "no-referrer",
    alternates: { canonical: null, languages: {} },
    openGraph: null,
  };
}

export function AuditPage({ audit }: { audit: RevenueAudit }) {
  return <AuditDocument audit={audit} />;
}
