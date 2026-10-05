import { notFound } from "next/navigation";
import { SealedAuditView } from "@/components/audit/SealedAuditView";
import { getSealed, sealedIds } from "@/lib/audit/sealed";
import { sealedAuditMetadata } from "@/views/AuditPage";

/* Audits privés scellés (voir lib/audit/seal.ts) : texte chiffré seulement,
   clé dans le lien (#k=…). Identifiant inconnu = 404. Jamais indexés. */
export const dynamicParams = false;

export function generateStaticParams() {
  return sealedIds("en").map((id) => ({ id }));
}

export const metadata = sealedAuditMetadata("en");

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const sealed = getSealed((await params).id, "en");
  if (!sealed) notFound();
  return <SealedAuditView sealed={sealed} />;
}
