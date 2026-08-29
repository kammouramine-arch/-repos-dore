// ---------------------------------------------------------------------------
// ATTESTATION DKIM — quand l'en-tête réel dit autre chose que le DNS
//
// POURQUOI CE FICHIER EXISTE.
//
// La vérification DNS est une DEVINETTE éclairée : le DNS ne permet pas de
// demander « quels sélecteurs ce domaine publie-t-il ? ». On teste une liste,
// et une liste n'est jamais exhaustive. Un domaine correctement signé sous un
// sélecteur absent de la liste sera donc déclaré « DKIM absent » — à tort.
//
// L'en-tête d'un message réellement reçu, lui, ne devine rien : il rapporte
// ce qu'un serveur destinataire a effectivement vérifié, clé publique à
// l'appui. C'est une preuve d'un ordre supérieur à notre sondage.
//
// Ce module permet d'enregistrer cette preuve — avec sa DATE, sa SOURCE et
// son AUTEUR. Ce n'est pas un interrupteur qui éteint le contrôle : c'est un
// constat qui le remplace, et qui reste affiché partout où le contrôle
// l'aurait été. Personne ne pourra se demander plus tard pourquoi le sas
// s'est ouvert alors que le DNS semblait muet.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";

const CLE = "deliverability.dkim_attestation";

export type DkimAttestation = {
  /** Domaine attesté. */
  domain: string;
  /** Ce qui a été constaté, dans les mots de la personne qui l'a constaté. */
  note: string;
  /** Qui atteste. */
  by: string;
  /** Quand. Une attestation ancienne mérite d'être refaite. */
  at: string;
};

/** Au-delà de ce délai, l'attestation est signalée comme vieillissante. */
export const PEREMPTION_JOURS = 90;

export async function recordDkimAttestation(input: {
  domain: string;
  note: string;
  by?: string;
}): Promise<DkimAttestation> {
  const attestation: DkimAttestation = {
    domain: input.domain,
    note: input.note.trim(),
    by: input.by ?? "HUMAN",
    at: new Date().toISOString(),
  };

  await prisma.setting.upsert({
    where: { key: CLE },
    update: { value: JSON.stringify(attestation) },
    create: { key: CLE, value: JSON.stringify(attestation) },
  });

  await logActivity({
    actor: "HUMAN",
    module: "POLICY",
    action: "deliverability.dkim_attested",
    summary:
      `DKIM attesté pour ${attestation.domain} sur constat d'en-tête réel : ${attestation.note}`,
    details: attestation,
    level: "WARN",
  });

  return attestation;
}

export async function readDkimAttestation(domain?: string): Promise<DkimAttestation | null> {
  const row = await prisma.setting.findUnique({ where: { key: CLE } });
  if (!row) return null;

  let parsed: DkimAttestation;
  try {
    parsed = JSON.parse(row.value) as DkimAttestation;
  } catch {
    return null;
  }

  // Une attestation posée pour un autre domaine ne vaut rien ici.
  if (domain && parsed.domain !== domain) return null;
  return parsed;
}

export async function clearDkimAttestation(): Promise<boolean> {
  const existe = await prisma.setting.findUnique({ where: { key: CLE } });
  if (!existe) return false;

  await prisma.setting.delete({ where: { key: CLE } });
  await logActivity({
    actor: "HUMAN",
    module: "POLICY",
    action: "deliverability.dkim_attestation_cleared",
    summary: "Attestation DKIM retirée : le contrôle DNS redevient seul juge.",
    level: "WARN",
  });
  return true;
}

/** Âge de l'attestation, en jours. */
export function ageEnJours(attestation: DkimAttestation, now = new Date()): number {
  const pose = new Date(attestation.at).getTime();
  return Math.floor((now.getTime() - pose) / (24 * 3600_000));
}

/** Phrase affichée partout où le contrôle DKIM apparaît. */
export function resumeAttestation(attestation: DkimAttestation, now = new Date()): string {
  const age = ageEnJours(attestation, now);
  const anciennete =
    age >= PEREMPTION_JOURS
      ? ` Attestation vieille de ${age} jours : à reconfirmer sur un envoi récent.`
      : "";
  return (
    `Non trouvé dans le DNS, mais ATTESTÉ le ${attestation.at.slice(0, 10)} par ${attestation.by} ` +
    `sur constat d'en-tête réel — « ${attestation.note} ».${anciennete}`
  );
}
