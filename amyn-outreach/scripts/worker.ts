#!/usr/bin/env tsx
/**
 * ---------------------------------------------------------------------------
 * WORKER — l'opérateur qui tourne tout seul
 *
 * Un tour = lire la boîte, décider des réponses, préparer les relances dues,
 * vérifier la cohérence. AUCUN ENVOI : la préparation s'arrête à « prêt, en
 * attente d'approbation ».
 *
 * Deux usages :
 *
 *   npm run worker              une passe puis sortie — pour un cron
 *   npm run worker -- --loop    boucle continue — pour un service
 *
 * Idempotent : chaque job pose un verrou en base. Deux crons qui se
 * chevauchent, un redémarrage, un double lancement — rien n'est refait deux
 * fois. Le verrou survit au redémarrage puisqu'il est en base.
 * ---------------------------------------------------------------------------
 */

process.loadEnvFile?.();

import { runAllJobs } from "../lib/scheduler/jobs";
import { prisma } from "../lib/db";
import { config } from "../lib/config";

const C = { reset: "\x1b[0m", dim: "\x1b[2m", green: "\x1b[32m", red: "\x1b[31m", amber: "\x1b[33m" };

function horodate(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

async function unTour(): Promise<{ erreurs: number; aFaire: string[] }> {
  const resultats = await runAllJobs();
  let erreurs = 0;
  const aFaire: string[] = [];

  for (const r of resultats) {
    if (r.error) {
      erreurs += 1;
      console.log(`${horodate()} ${C.red}✗${C.reset} ${r.job.padEnd(16)} ${r.summary}`);
    } else if (r.skipped) {
      console.log(`${horodate()} ${C.dim}·${C.reset} ${r.job.padEnd(16)} ${C.dim}${r.summary}${C.reset}`);
    } else {
      console.log(`${horodate()} ${C.green}✓${C.reset} ${r.job.padEnd(16)} ${r.summary}`);
    }
  }

  // Ce qui attend une décision humaine : c'est la seule chose que le worker
  // ne peut pas faire avancer.
  const [aApprouver, aLire] = await Promise.all([
    prisma.campaignMember.count({ where: { status: "READY" } }),
    prisma.reply.count({ where: { reviewStatus: "ACTION_REQUIRED" } }),
  ]);
  if (aApprouver > 0) aFaire.push(`${aApprouver} email(s) en attente d'approbation`);
  if (aLire > 0) aFaire.push(`${aLire} réponse(s) nécessitent votre lecture`);

  return { erreurs, aFaire };
}

async function main() {
  const boucle = process.argv.includes("--loop");
  const intervalleArg = process.argv.find((a) => a.startsWith("--interval="));
  const intervalleMinutes = intervalleArg ? Number.parseInt(intervalleArg.slice(11), 10) : 15;

  console.log(
    `${C.dim}AMYN worker · mode ${config.dryRun ? "SIMULATION" : "ENVOI RÉEL"} · ` +
    `${boucle ? `boucle toutes les ${intervalleMinutes} min` : "passe unique"} · ` +
    `aucun envoi effectué par le worker${C.reset}`,
  );

  do {
    const { erreurs, aFaire } = await unTour();

    if (aFaire.length > 0) {
      console.log(`${horodate()} ${C.amber}→${C.reset} ${aFaire.join(" · ")} — voir /operator`);
    }
    if (erreurs > 0) process.exitCode = 1;

    if (boucle) {
      await new Promise((r) => setTimeout(r, intervalleMinutes * 60_000));
    }
  } while (boucle);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(`${horodate()} ${C.red}worker interrompu :${C.reset}`, e instanceof Error ? e.message : e);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
