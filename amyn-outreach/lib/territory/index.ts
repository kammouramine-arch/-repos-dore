// ---------------------------------------------------------------------------
// TERRITOIRES — découper la France en unités de travail reprenables
//
// POURQUOI CE MODULE EXISTE. Les registres d'entreprises refusent de servir
// au-delà de 10 000 résultats pour une même requête. « Toutes les entreprises
// de France » — plusieurs millions d'établissements — ne peut donc pas être
// demandé. Il faut poser des milliers de questions étroites, savoir laquelle
// a déjà reçu sa réponse, et pouvoir s'arrêter au milieu sans rien perdre.
//
// Le territoire est cette question étroite, rendue persistante :
//
//     « les restaurants du Nord, page 7 »
//
// Le couple (source, zone, secteur) est unique en base. Replanifier ne
// duplique donc jamais : un territoire déjà connu est retrouvé et poursuivi.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { DEPARTEMENTS, regions, resolveZone, type Departement } from "@/lib/research/sirene/geo";
import { addressableDivisions, resolveSectorOpen } from "@/lib/research/sectors";

export type TerritoryScope = "NATIONAL" | "REGION" | "DEPARTEMENT" | "COMMUNE";
export type TerritorySource = "ANNUAIRE" | "SIRENE";
export type TerritoryStatus =
  | "PENDING"
  | "RUNNING"
  | "DONE"
  | "SATURATED"
  | "FAILED"
  | "PAUSED";

/** Un territoire dont personne ne s'occupe depuis ce délai est repris. */
export const DELAI_REPRISE_MS = 15 * 60_000;

export type PlanRequest = {
  /** Zones visées : codes de département, de région, ou « FR » pour la France. */
  zones?: string[];
  /** Secteurs en français. Vide = toutes les divisions NAF adressables. */
  secteurs?: string[];
  source?: TerritorySource;
  /**
   * Découper aussi par secteur.
   *
   * Vrai par défaut, et ce n'est pas un détail : un département entier, tous
   * secteurs confondus, dépasse toujours les 10 000 résultats servis. Sans
   * découpage sectoriel, chaque département serait saturé d'emblée et la
   * majorité des entreprises resterait invisible.
   */
  parSecteur?: boolean;
};

export type PlanResult = {
  created: number;
  existing: number;
  territories: Array<{ id: string; label: string; sectorLabel: string; status: string }>;
  notes: string[];
};

type Cible = { scope: TerritoryScope; code: string; label: string };

/** Traduit les zones demandées en une liste de cibles géographiques. */
export function resoudreZones(zones: string[] | undefined): { cibles: Cible[]; notes: string[] } {
  const notes: string[] = [];

  // Aucune zone, ou « France » : les 101 départements. Le département est la
  // maille de travail — jamais le pays d'un bloc, qu'aucune API ne sert.
  if (!zones || zones.length === 0 || zones.some((z) => /^(fr|france|nationale?)$/i.test(z.trim()))) {
    notes.push(
      `France entière → ${DEPARTEMENTS.length} départements. ` +
        `Le pays n'est jamais interrogé d'un bloc : aucune API ne sert plus de 10 000 résultats.`,
    );
    return {
      cibles: DEPARTEMENTS.map((d) => ({
        scope: "DEPARTEMENT" as const,
        code: d.code,
        label: `${d.code} — ${d.nom}`,
      })),
      notes,
    };
  }

  const cibles: Cible[] = [];
  const vues = new Set<string>();

  const ajouter = (d: Departement) => {
    if (vues.has(d.code)) return;
    vues.add(d.code);
    cibles.push({ scope: "DEPARTEMENT", code: d.code, label: `${d.code} — ${d.nom}` });
  };

  for (const zone of zones) {
    const brut = zone.trim();
    if (!brut) continue;

    // Un code INSEE de commune (5 caractères) est une maille valide en soi :
    // c'est ce qu'on utilise pour subdiviser un département saturé.
    if (/^\d{5}$/.test(brut) && !DEPARTEMENTS.some((d) => d.code === brut)) {
      if (!vues.has(brut)) {
        vues.add(brut);
        cibles.push({ scope: "COMMUNE", code: brut, label: `Commune ${brut}` });
      }
      continue;
    }

    const resolue = resolveZone(brut);
    if (resolue.kind === "UNKNOWN") {
      notes.push(`Zone « ${brut} » non reconnue : ni département, ni région, ni code commune.`);
      continue;
    }
    if (resolue.kind === "REGION") {
      notes.push(`${resolue.label} → ${resolue.departements.length} département(s).`);
    }
    resolue.departements.forEach(ajouter);
  }

  return { cibles, notes };
}

type Secteur = { key: string; label: string; naf: string[] };

/**
 * Traduit les secteurs demandés en cellules de balayage.
 *
 * Aucune liste fermée : un secteur absent du catalogue curé retombe sur la
 * nomenclature NAF. Aucun secteur demandé = toutes les divisions adressables.
 */
export function resoudreSecteurs(
  secteurs: string[] | undefined,
  parSecteur: boolean,
): { cellules: Secteur[]; notes: string[] } {
  const notes: string[] = [];

  if (!parSecteur) {
    return { cellules: [{ key: "ALL", label: "Tous secteurs", naf: [] }], notes };
  }

  if (!secteurs || secteurs.length === 0) {
    const divisions = addressableDivisions();
    notes.push(
      `Aucun secteur précisé → ${divisions.length} divisions NAF adressables. ` +
        `Le découpage sectoriel n'est pas optionnel : sans lui, chaque département ` +
        `dépasserait le plafond de 10 000 résultats.`,
    );
    return {
      cellules: divisions.map((d) => ({ key: d.code, label: d.label, naf: [d.code] })),
      notes,
    };
  }

  const cellules: Secteur[] = [];
  for (const secteur of secteurs) {
    const resolu = resolveSectorOpen(secteur);
    if (resolu.kind === "UNKNOWN") {
      notes.push(`Secteur « ${secteur} » non reconnu : ignoré plutôt que deviné.`);
      continue;
    }
    if (resolu.kind === "NOT_A_SECTOR") {
      notes.push(resolu.matchedOn);
      continue;
    }
    if (resolu.sensitive) {
      notes.push(
        `« ${resolu.label} » relève d'une profession encadrée : à engager en connaissance de cause.`,
      );
    }
    cellules.push({ key: resolu.key, label: resolu.label, naf: resolu.naf });
  }

  if (cellules.length === 0) {
    notes.push("Aucun secteur exploitable : le balayage portera sur tous les secteurs.");
    return { cellules: [{ key: "ALL", label: "Tous secteurs", naf: [] }], notes };
  }

  return { cellules, notes };
}

/**
 * Crée — ou retrouve — les territoires correspondant à une demande.
 *
 * IDEMPOTENT. Replanifier la même demande ne crée aucun doublon et ne remet à
 * zéro aucun avancement : les territoires déjà connus sont comptés comme tels.
 */
export async function planTerritories(request: PlanRequest): Promise<PlanResult> {
  const source: TerritorySource = request.source ?? "ANNUAIRE";
  const parSecteur = request.parSecteur ?? true;

  const { cibles, notes: notesZones } = resoudreZones(request.zones);
  const { cellules, notes: notesSecteurs } = resoudreSecteurs(request.secteurs, parSecteur);
  const notes = [...notesZones, ...notesSecteurs];

  if (cibles.length === 0) {
    return { created: 0, existing: 0, territories: [], notes: [...notes, "Aucune zone exploitable."] };
  }

  let created = 0;
  let existing = 0;
  const territories: PlanResult["territories"] = [];

  for (const cible of cibles) {
    for (const cellule of cellules) {
      const cle = {
        source_scope_code_sectorKey: {
          source,
          scope: cible.scope,
          code: cible.code,
          sectorKey: cellule.key,
        },
      };

      const deja = await prisma.territory.findUnique({ where: cle, select: { id: true, status: true } });
      if (deja) {
        existing += 1;
        territories.push({
          id: deja.id,
          label: cible.label,
          sectorLabel: cellule.label,
          status: deja.status,
        });
        continue;
      }

      const t = await prisma.territory.create({
        data: {
          scope: cible.scope,
          code: cible.code,
          label: cible.label,
          sectorKey: cellule.key,
          sectorLabel: cellule.label,
          naf: JSON.stringify(cellule.naf),
          source,
          status: "PENDING",
        },
      });
      created += 1;
      territories.push({ id: t.id, label: cible.label, sectorLabel: cellule.label, status: "PENDING" });
    }
  }

  notes.push(
    `${cibles.length} zone(s) × ${cellules.length} secteur(s) = ${cibles.length * cellules.length} territoire(s).`,
  );

  await logActivity({
    actor: "SYSTEM",
    module: "RESEARCH",
    action: "territory.plan",
    summary: `Plan national : ${created} territoire(s) créé(s), ${existing} déjà connu(s).`,
    details: { source, zones: cibles.length, secteurs: cellules.length, created, existing },
  });

  return { created, existing, territories, notes };
}

/**
 * Réserve un territoire pour exécution.
 *
 * L'appropriation se fait en une seule écriture conditionnelle : la clause
 * `where` n'accepte que les territoires libres. Deux workers qui visent le
 * même territoire au même instant ne peuvent pas le prendre tous les deux —
 * l'un des deux verra `count: 0` et passera au suivant. C'est la base qui
 * arbitre, pas une variable en mémoire, donc le verrou survit à un
 * redémarrage.
 *
 * Un territoire RUNNING dont personne ne s'est occupé depuis DELAI_REPRISE_MS
 * est considéré abandonné — sinon un worker tué au mauvais moment bloquerait
 * ce territoire pour toujours.
 */
export async function claimTerritory(
  territoryId: string,
  now = new Date(),
): Promise<boolean> {
  const limiteAbandon = new Date(now.getTime() - DELAI_REPRISE_MS);

  const { count } = await prisma.territory.updateMany({
    where: {
      id: territoryId,
      OR: [
        { status: { in: ["PENDING", "FAILED"] } },
        { status: "RUNNING", lastRunAt: { lt: limiteAbandon } },
        { status: "RUNNING", lastRunAt: null },
      ],
    },
    data: { status: "RUNNING", lastRunAt: now },
  });

  return count === 1;
}

/** Les territoires qui restent à traiter, les moins avancés d'abord. */
export async function pendingTerritories(limit = 10, source?: TerritorySource) {
  const limiteAbandon = new Date(Date.now() - DELAI_REPRISE_MS);
  return prisma.territory.findMany({
    where: {
      ...(source ? { source } : {}),
      OR: [
        { status: { in: ["PENDING", "FAILED"] } },
        { status: "RUNNING", lastRunAt: { lt: limiteAbandon } },
      ],
    },
    orderBy: [{ status: "asc" }, { lastRunAt: "asc" }, { code: "asc" }],
    take: limit,
  });
}

/** Avancement global du balayage. */
export async function territoryProgress(source?: TerritorySource) {
  const where = source ? { source } : {};

  const parStatut = await prisma.territory.groupBy({
    by: ["status"],
    where,
    _count: { _all: true },
  });

  const compte: Record<string, number> = {};
  for (const ligne of parStatut) compte[ligne.status] = ligne._count._all;

  const totaux = await prisma.territory.aggregate({
    where,
    _sum: {
      discovered: true,
      created: true,
      duplicates: true,
      qualified: true,
      rejected: true,
      needsHuman: true,
      errors: true,
    },
  });

  const total = Object.values(compte).reduce((a, b) => a + b, 0);
  const termines = (compte.DONE ?? 0) + (compte.SATURATED ?? 0);

  return {
    total,
    parStatut: compte,
    termines,
    restants: total - termines,
    /** Part des territoires traités. Null si aucun territoire n'est planifié. */
    progression: total > 0 ? Math.round((termines / total) * 100) : null,
    decouvertes: {
      discovered: totaux._sum.discovered ?? 0,
      created: totaux._sum.created ?? 0,
      duplicates: totaux._sum.duplicates ?? 0,
      qualified: totaux._sum.qualified ?? 0,
      rejected: totaux._sum.rejected ?? 0,
      needsHuman: totaux._sum.needsHuman ?? 0,
      errors: totaux._sum.errors ?? 0,
    },
  };
}

export { DEPARTEMENTS, regions };
