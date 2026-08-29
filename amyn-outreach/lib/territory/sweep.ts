// ---------------------------------------------------------------------------
// BALAYAGE D'UN TERRITOIRE — page par page, avec point de reprise
//
// GARANTIE DE REPRISE. Le point de reprise est écrit en base APRÈS que la page
// a été importée, jamais avant. Une coupure — plantage, arrêt du worker,
// machine éteinte — fait donc perdre au pire le travail de la page en cours ;
// la reprise repart de la page suivante, jamais du début.
//
// CE QUE CE MODULE NE FAIT PAS. Il découvre et enregistre des entreprises.
// Il ne qualifie pas, ne rédige aucun email, n'approuve rien et n'envoie
// rien. Le balayage national n'ouvre donc aucun chemin vers l'envoi : il
// alimente le début du tuyau, et tous les contrôles restent en aval, sur le
// seul chemin qui mène à un envoi.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { importBusinesses } from "@/lib/research";
import { AnnuaireClient, type AnnuaireCriteria } from "@/lib/research/annuaire/client";
import { SireneClient, type SireneCriteria } from "@/lib/research/sirene/client";
import type { RawBusiness } from "@/lib/research/types";
import { claimTerritory, pendingTerritories, type TerritoryStatus } from "./index";

export type SweepOptions = {
  /** Pages traitées au maximum pour ce territoire, sur cette invocation. */
  maxPages?: number;
  /** Clients injectables : les tests n'ont jamais besoin du réseau. */
  annuaire?: AnnuaireClient;
  sirene?: SireneClient;
  isDemo?: boolean;
  now?: Date;
  /** Ne rien écrire : sert à vérifier un territoire sans le consommer. */
  inspectionSeulement?: boolean;
};

export type SweepResult = {
  territoryId: string;
  label: string;
  sectorLabel: string;
  source: string;
  claimed: boolean;
  status: TerritoryStatus;
  pages: number;
  discovered: number;
  created: number;
  duplicates: number;
  skipped: number;
  duplicateBreakdown: Record<string, number>;
  skippedReasons: Record<string, number>;
  nextPage: number;
  cursor: string | null;
  totalAnnonce: number | null;
  sature: boolean;
  error?: string;
  summary: string;
};

/**
 * Reconstruit les critères d'interrogation à partir du territoire stocké.
 *
 * Les codes NAF viennent du champ `naf`, jamais de `sectorKey` : ce dernier
 * est une clé lisible (« restaurant ») que l'API ne comprend pas.
 */
function criteresDuTerritoire(t: {
  scope: string;
  code: string;
  sectorKey: string;
  naf: string;
}): { annuaire: AnnuaireCriteria; sirene: SireneCriteria } {
  const naf = lireNaf(t.naf, t.sectorKey);

  const geo =
    t.scope === "COMMUNE"
      ? { communes: [t.code] }
      : t.scope === "DEPARTEMENT"
        ? { departements: [t.code] }
        : {};

  return {
    annuaire: {
      naf,
      ...(("communes" in geo) ? { communes: geo.communes } : {}),
      ...(("departements" in geo) ? { departements: geo.departements } : {}),
      actifsSeulement: true,
      inclureEntrepreneursIndividuels: false,
    },
    sirene: {
      naf,
      ...(("communes" in geo) ? { communes: geo.communes } : {}),
      ...(("departements" in geo) ? { departements: geo.departements } : {}),
      actifsSeulement: true,
      inclureEntrepreneursIndividuels: false,
    },
  };
}

/**
 * Balaie un territoire, page par page.
 *
 * Renvoie toujours un résultat lisible, y compris en cas d'échec : un
 * territoire qui n'a pas pu être traité doit le dire, pas disparaître.
 */
export async function sweepTerritory(
  territoryId: string,
  options: SweepOptions = {},
): Promise<SweepResult> {
  const now = options.now ?? new Date();
  const maxPages = options.maxPages ?? 4;

  const territoire = await prisma.territory.findUnique({ where: { id: territoryId } });
  if (!territoire) throw new Error(`Territoire ${territoryId} introuvable.`);

  const base: SweepResult = {
    territoryId,
    label: territoire.label,
    sectorLabel: territoire.sectorLabel,
    source: territoire.source,
    claimed: false,
    status: territoire.status as TerritoryStatus,
    pages: 0,
    discovered: 0,
    created: 0,
    duplicates: 0,
    skipped: 0,
    duplicateBreakdown: {},
    skippedReasons: {},
    nextPage: territoire.nextPage,
    cursor: territoire.cursor,
    totalAnnonce: territoire.totalResults,
    sature: territoire.status === "SATURATED",
    summary: "",
  };

  if (territoire.status === "DONE" || territoire.status === "SATURATED") {
    return {
      ...base,
      summary: `${territoire.label} / ${territoire.sectorLabel} : déjà traité (${territoire.status}). Rien à refaire.`,
    };
  }
  if (territoire.status === "PAUSED") {
    return { ...base, summary: `${territoire.label} : en pause, non traité.` };
  }

  if (options.inspectionSeulement) {
    return { ...base, summary: `${territoire.label} : inspection seule, aucune écriture.` };
  }

  // Appropriation atomique : deux workers ne peuvent pas balayer le même
  // territoire en même temps et créer deux fois les mêmes prospects.
  const pris = await claimTerritory(territoryId, now);
  if (!pris) {
    return {
      ...base,
      summary: `${territoire.label} / ${territoire.sectorLabel} : déjà pris par une autre exécution.`,
    };
  }
  base.claimed = true;

  const criteres = criteresDuTerritoire(territoire);
  const cumul = {
    pages: 0,
    discovered: 0,
    created: 0,
    duplicates: 0,
    skipped: 0,
    duplicateBreakdown: {} as Record<string, number>,
    skippedReasons: {} as Record<string, number>,
  };

  let nextPage = territoire.nextPage;
  let cursor = territoire.cursor;
  let totalAnnonce = territoire.totalResults;
  let sature = false;
  let termine = false;
  let erreur: string | undefined;

  const fusionner = (cible: Record<string, number>, ajout: Record<string, number>) => {
    for (const [k, v] of Object.entries(ajout)) cible[k] = (cible[k] ?? 0) + v;
  };

  /** Écrit le point de reprise. Appelé APRÈS chaque page importée. */
  const checkpoint = async (statut: TerritoryStatus) => {
    await prisma.territory.update({
      where: { id: territoryId },
      data: {
        status: statut,
        nextPage,
        cursor,
        totalResults: totalAnnonce,
        checkpointAt: new Date(),
        lastRunAt: new Date(),
        ...(statut === "DONE" || statut === "SATURATED" ? { completedAt: new Date() } : {}),
      },
    });
  };

  try {
    if (territoire.source === "SIRENE") {
      const client = options.sirene ?? new SireneClient();
      for await (const page of client.iterate(criteres.sirene, {
        curseurInitial: cursor ?? "*",
        maxPages,
      })) {
        const lot = await enregistrer(page.entreprises, territoryId, options.isDemo);
        cumul.pages += 1;
        cumul.discovered += page.recus;
        cumul.created += lot.created;
        cumul.duplicates += lot.duplicates;
        cumul.skipped += lot.skipped;
        fusionner(cumul.duplicateBreakdown, lot.duplicateBreakdown);
        fusionner(cumul.skippedReasons, lot.skippedReasons);

        // Les etablissements ecartes A LA CONVERSION — non diffusibles,
        // personnes physiques, hors activite — n'atteignent jamais l'import.
        // Sans cette ligne, ils disparaissaient du compte : le territoire
        // annoncait 50 entreprises vues pour 40 traitees, et les 10 manquantes
        // n'etaient nulle part.
        for (const e of page.ecartes) {
          cumul.skipped += 1;
          cumul.skippedReasons[e.raison] = (cumul.skippedReasons[e.raison] ?? 0) + 1;
        }

        cursor = page.curseurSuivant ?? cursor;
        totalAnnonce = page.total ?? totalAnnonce;
        nextPage = page.numeroPage + 1;
        await appliquerCompteurs(territoryId, page.recus, lot);
        await checkpoint("RUNNING");

        // Sirene signale la fin en cessant de faire avancer son curseur.
        if (page.curseurSuivant === null) {
          termine = true;
          break;
        }
      }
    } else {
      const client = options.annuaire ?? new AnnuaireClient();
      for await (const page of client.iterate(criteres.annuaire, {
        pageDepart: nextPage,
        maxPages,
      })) {
        const lot = await enregistrer(page.entreprises, territoryId, options.isDemo);
        cumul.pages += 1;
        cumul.discovered += page.brut;
        cumul.created += lot.created;
        cumul.duplicates += lot.duplicates;
        cumul.skipped += lot.skipped;
        fusionner(cumul.duplicateBreakdown, lot.duplicateBreakdown);
        fusionner(cumul.skippedReasons, lot.skippedReasons);

        // Meme raison que ci-dessus : ce qui est ecarte a la conversion doit
        // rester visible dans les comptes du territoire.
        for (const [raison, n] of Object.entries(page.ecartes)) {
          cumul.skipped += n;
          cumul.skippedReasons[raison] = (cumul.skippedReasons[raison] ?? 0) + n;
        }

        totalAnnonce = page.total;
        sature = sature || page.sature;
        // Le point de reprise pointe la page SUIVANTE : celle-ci est importée.
        nextPage = page.page + 1;
        await appliquerCompteurs(territoryId, page.brut, lot);
        await checkpoint("RUNNING");

        if (!page.encore) {
          termine = true;
          break;
        }
      }
    }
  } catch (e) {
    erreur = e instanceof Error ? e.message : String(e);
  }

  // Un territoire saturé n'est PAS « terminé ». Le déclarer terminé
  // laisserait croire que ses entreprises ont toutes été vues, alors que la
  // source a cessé d'en servir. Il doit être subdivisé.
  const statutFinal: TerritoryStatus = erreur
    ? "FAILED"
    : sature && termine
      ? "SATURATED"
      : termine
        ? "DONE"
        : "PENDING";

  await prisma.territory.update({
    where: { id: territoryId },
    data: {
      status: statutFinal,
      nextPage,
      cursor,
      totalResults: totalAnnonce,
      lastRunAt: new Date(),
      checkpointAt: new Date(),
      lastError: erreur ?? null,
      ...(erreur ? { errors: { increment: 1 } } : {}),
      ...(statutFinal === "DONE" || statutFinal === "SATURATED"
        ? { completedAt: new Date() }
        : {}),
    },
  });

  const summary =
    `${territoire.label} / ${territoire.sectorLabel} : ` +
    `${cumul.pages} page(s), ${cumul.discovered} entreprise(s) vue(s) = ` +
    `${cumul.created} nouvelle(s) + ${cumul.duplicates} doublon(s) + ${cumul.skipped} écartée(s). ` +
    (erreur
      ? `ÉCHEC : ${erreur}`
      : statutFinal === "SATURATED"
        ? `SATURÉ : la source refuse de servir au-delà de ${totalAnnonce ?? "10 000"} résultats — territoire à subdiviser.`
        : statutFinal === "DONE"
          ? "Territoire couvert."
          : `Reprise à la page ${nextPage}.`);

  await logActivity({
    actor: "AGENT",
    module: "RESEARCH",
    action: "territory.sweep",
    entityType: "Territory",
    entityId: territoryId,
    summary,
    details: { ...cumul, statutFinal, nextPage, sature, erreur },
    level: erreur ? "ERROR" : "INFO",
  });

  return {
    ...base,
    claimed: true,
    status: statutFinal,
    pages: cumul.pages,
    discovered: cumul.discovered,
    created: cumul.created,
    duplicates: cumul.duplicates,
    skipped: cumul.skipped,
    duplicateBreakdown: cumul.duplicateBreakdown,
    skippedReasons: cumul.skippedReasons,
    nextPage,
    cursor,
    totalAnnonce,
    sature,
    error: erreur,
    summary,
  };
}

/**
 * Lit les codes NAF enregistrés.
 *
 * Repli sur `sectorKey` uniquement s'il ressemble à un code NAF — un
 * territoire créé avant l'ajout du champ garde ainsi un comportement correct,
 * sans jamais transformer « restaurant » en filtre d'activité.
 */
function lireNaf(brut: string, sectorKey: string): string[] {
  try {
    const codes = JSON.parse(brut);
    if (Array.isArray(codes) && codes.every((c) => typeof c === "string")) {
      if (codes.length > 0) return codes;
    }
  } catch {
    // Champ illisible : on retombe sur le repli ci-dessous.
  }
  return /^\d{2}/.test(sectorKey) ? [sectorKey] : [];
}

async function enregistrer(
  entreprises: RawBusiness[],
  territoryId: string,
  isDemo: boolean | undefined,
) {
  return importBusinesses(entreprises, { isDemo, territoryId });
}

async function appliquerCompteurs(
  territoryId: string,
  vues: number,
  lot: { created: number; duplicates: number; skipped: number },
) {
  await prisma.territory.update({
    where: { id: territoryId },
    data: {
      discovered: { increment: vues },
      created: { increment: lot.created },
      duplicates: { increment: lot.duplicates },
    },
  });
}

/**
 * Balaie plusieurs territoires à la suite.
 *
 * Borné volontairement : un tour de worker fait un peu de travail, écrit ses
 * points de reprise et rend la main. Un balayage qui prétendrait tout faire
 * d'un coup ne survivrait pas à sa première coupure.
 */
export async function sweepBatch(
  options: SweepOptions & { maxTerritories?: number; source?: "ANNUAIRE" | "SIRENE" } = {},
): Promise<{ results: SweepResult[]; summary: string }> {
  const maxTerritories = options.maxTerritories ?? 3;
  const candidats = await pendingTerritories(maxTerritories, options.source);

  if (candidats.length === 0) {
    return {
      results: [],
      summary:
        "Aucun territoire en attente. Planifier un balayage : npm run amyn -- territory plan.",
    };
  }

  const results: SweepResult[] = [];
  for (const t of candidats) {
    results.push(await sweepTerritory(t.id, options));
  }

  const created = results.reduce((n, r) => n + r.created, 0);
  const duplicates = results.reduce((n, r) => n + r.duplicates, 0);
  const discovered = results.reduce((n, r) => n + r.discovered, 0);
  const echecs = results.filter((r) => r.error).length;

  return {
    results,
    summary:
      `${results.length} territoire(s) balayé(s) : ${discovered} entreprise(s) vue(s), ` +
      `${created} nouvelle(s), ${duplicates} doublon(s)` +
      (echecs > 0 ? `, ${echecs} en échec` : "") +
      ".",
  };
}

/**
 * Subdivise un territoire saturé, en s'appuyant sur les codes postaux
 * RÉELLEMENT observés pendant son balayage.
 *
 * LIMITE ASSUMÉE. Les codes postaux proviennent des entreprises déjà
 * découvertes — c'est-à-dire des 10 000 premiers résultats. Une commune dont
 * aucune entreprise n'est apparue dans cette tranche ne produira pas de
 * sous-territoire. La subdivision élargit donc réellement la couverture sans
 * prétendre la rendre exhaustive, et le dire vaut mieux que le laisser croire.
 */
export async function subdivideTerritory(
  territoryId: string,
): Promise<{ created: number; codes: string[]; note: string }> {
  const territoire = await prisma.territory.findUnique({ where: { id: territoryId } });
  if (!territoire) throw new Error(`Territoire ${territoryId} introuvable.`);

  const observes = await prisma.prospect.groupBy({
    by: ["postalCode"],
    where: { territoryId, postalCode: { not: null } },
    _count: { _all: true },
  });

  const codes = observes
    .map((o) => o.postalCode)
    .filter((c): c is string => !!c)
    .sort();

  if (codes.length === 0) {
    return {
      created: 0,
      codes: [],
      note:
        "Aucun code postal observé sur ce territoire : rien à subdiviser. " +
        "Balayer au moins une page avant de subdiviser.",
    };
  }

  let created = 0;
  for (const code of codes) {
    const cle = {
      source_scope_code_sectorKey: {
        source: territoire.source,
        scope: "COMMUNE",
        code,
        sectorKey: territoire.sectorKey,
      },
    };
    const deja = await prisma.territory.findUnique({ where: cle, select: { id: true } });
    if (deja) continue;

    await prisma.territory.create({
      data: {
        scope: "COMMUNE",
        code,
        label: `${territoire.label} — CP ${code}`,
        sectorKey: territoire.sectorKey,
        sectorLabel: territoire.sectorLabel,
        source: territoire.source,
        status: "PENDING",
      },
    });
    created += 1;
  }

  return {
    created,
    codes,
    note:
      `${created} sous-territoire(s) créé(s) à partir de ${codes.length} code(s) postal(aux) observé(s). ` +
      `Couverture élargie, sans garantie d'exhaustivité : seules les communes déjà apparues sont couvertes.`,
  };
}
