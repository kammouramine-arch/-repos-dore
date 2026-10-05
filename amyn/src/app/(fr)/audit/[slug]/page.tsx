import { notFound } from "next/navigation";
import { auditSlugs, getAudit } from "@/lib/audit/registry";
import { AuditPage, auditMetadata } from "@/views/AuditPage";

/* Audits privés : générés à la construction, adresse inconnue = 404.
   Jamais dans le plan du site ; noindex (voir auditMetadata et next.config). */
export const dynamicParams = false;

export function generateStaticParams() {
  return auditSlugs("fr").map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return auditMetadata(getAudit((await params).slug, "fr"));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const audit = getAudit((await params).slug, "fr");
  if (!audit) notFound();
  return <AuditPage audit={audit} />;
}
