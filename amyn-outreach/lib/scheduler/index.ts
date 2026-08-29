// ---------------------------------------------------------------------------
// JOBS PLANIFIÉS — exécution répétable sans doublon
//
// IDEMPOTENCE : chaque exécution pose un verrou unique en base (`JobRun.lockKey`).
// Si le même job est lancé deux fois pour la même fenêtre — deux crons qui se
// chevauchent, un worker relancé après un crash, un double-clic — la seconde
// tentative échoue à l'insertion et s'arrête proprement, sans rien refaire.
//
// C'est la base de données qui garantit l'unicité, pas une variable en mémoire :
// le verrou survit donc à un redémarrage.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";

export type JobName =
  | "sync-inbox"         // lire la boîte
  | "decide-replies"     // décider quoi faire des réponses non traitées
  | "due-followups"      // préparer les relances arrivées à échéance
  | "sweep-territories"  // avancer le balayage national depuis les checkpoints
  // --- Chaîne d'enrichissement, dans l'ordre où elle se parcourt ---------
  | "enrich-sites"       // trouver et PROUVER le site officiel
  | "audit-sites"        // analyser la présence en ligne
  | "find-emails"        // chercher les adresses publiées
  | "qualify-prospects"  // scorer puis trancher
  | "prepare-emails"     // rédiger, sans jamais approuver
  | "maintenance";       // cohérence et nettoyage

export type JobResult = {
  job: JobName;
  ran: boolean;
  /** true si un autre exécutant tenait déjà le verrou. */
  skipped: boolean;
  summary: string;
  itemsSeen: number;
  itemsChanged: number;
  details?: Record<string, unknown>;
  error?: string;
  durationMs: number;
};

/**
 * Fenêtre d'idempotence : deux exécutions dans la même minute sont considérées
 * comme la même. Assez court pour ne pas bloquer un rattrapage volontaire,
 * assez long pour absorber les chevauchements de cron.
 */
export function windowKey(job: JobName, now = new Date()): string {
  const minute = new Date(now);
  minute.setSeconds(0, 0);
  return `${job}:${minute.toISOString()}`;
}

/**
 * Exécute un job sous verrou.
 *
 * `lockKey` peut être forcé pour un job dont la fenêtre naturelle est plus
 * large (une relance ne doit pas partir deux fois dans la même journée, même
 * si le worker tourne toutes les minutes).
 */
export async function runJob(
  job: JobName,
  work: () => Promise<{ summary: string; itemsSeen: number; itemsChanged: number; details?: Record<string, unknown> }>,
  options: { lockKey?: string } = {},
): Promise<JobResult> {
  const lockKey = options.lockKey ?? windowKey(job);
  const t0 = Date.now();

  const dejaPris = {
    job, ran: false, skipped: true,
    summary: `Déjà exécuté pour cette fenêtre (${lockKey}). Rien n'a été refait.`,
    itemsSeen: 0, itemsChanged: 0, durationMs: Date.now() - t0,
  } satisfies JobResult;

  // Pré-vérification : évite de provoquer une violation de contrainte dans le
  // cas courant (deux appels successifs), qui remonterait comme une erreur
  // alors que c'est le comportement attendu.
  if (await prisma.jobRun.findUnique({ where: { lockKey }, select: { id: true } })) {
    return dejaPris;
  }

  let run;
  try {
    // La création reste le verrou réel : entre la vérification ci-dessus et
    // ici, un autre exécutant a pu passer. Seule la contrainte d'unicité de la
    // base tranche vraiment cette course.
    run = await prisma.jobRun.create({ data: { job, lockKey, status: "RUNNING" } });
  } catch {
    return dejaPris;
  }

  try {
    const out = await work();
    const durationMs = Date.now() - t0;

    await prisma.jobRun.update({
      where: { id: run.id },
      data: {
        status: "DONE", summary: out.summary,
        itemsSeen: out.itemsSeen, itemsChanged: out.itemsChanged,
        result: out.details ? JSON.stringify(out.details) : null,
        finishedAt: new Date(), durationMs,
      },
    });

    return {
      job, ran: true, skipped: false, summary: out.summary,
      itemsSeen: out.itemsSeen, itemsChanged: out.itemsChanged,
      details: out.details, durationMs,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const durationMs = Date.now() - t0;

    await prisma.jobRun.update({
      where: { id: run.id },
      data: { status: "FAILED", error: message, finishedAt: new Date(), durationMs },
    });

    await logActivity({
      actor: "SYSTEM", module: "SCHEDULER", action: `job.${job}.failed`,
      summary: `Job ${job} en échec : ${message}`, level: "ERROR",
    });

    return {
      job, ran: true, skipped: false,
      summary: `Échec : ${message}`,
      itemsSeen: 0, itemsChanged: 0, error: message, durationMs,
    };
  }
}

/** Les dernières exécutions, pour l'interface et le diagnostic. */
export async function recentJobs(limit = 20) {
  return prisma.jobRun.findMany({ orderBy: { startedAt: "desc" }, take: limit });
}

/** Un job a-t-il déjà tourné avec succès dans la fenêtre donnée ? */
export async function hasRunSince(job: JobName, since: Date): Promise<boolean> {
  const n = await prisma.jobRun.count({
    where: { job, status: "DONE", startedAt: { gte: since } },
  });
  return n > 0;
}
