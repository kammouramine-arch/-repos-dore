// ---------------------------------------------------------------------------
// MODULE RECHERCHE — registre des sources + import dédupliqué
//
// Ajouter une source = l'implémenter puis l'ajouter à SOURCES.
//
// L'import garantit une propriété simple et vérifiée par un test :
//
//     trouvées = créées + doublons + écartées
//
// Aucune entreprise ne disparaît en silence. Une entreprise écartée l'est
// toujours POUR UN MOTIF NOMMÉ, et un doublon est compté comme doublon —
// jamais comme « non qualifié », qui voudrait dire tout autre chose.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import {
  buildIdentity,
  findDuplicatesBatch,
  sameEntity,
  type Identity,
  type MatchedOn,
} from "@/lib/dedup";
import { OpenStreetMapSource } from "./osm";
import { GooglePlacesSource } from "./google-places";
import { SireneSource } from "./sirene/index";
import { AnnuaireSource } from "./annuaire/index";
import { resolveSector } from "./sectors";
import type { ProspectSource, RawBusiness, SearchQuery } from "./types";

export * from "./types";
export * from "./sectors";
export { normalizeName, normalizeDomain } from "@/lib/dedup";

/**
 * Ordre de préférence : la première source disponible est utilisée.
 *
 * Sirene d'abord dès que sa clé existe — c'est le registre de référence.
 * L'annuaire public prend le relais sans clé : la couverture nationale ne
 * dépend donc d'aucune configuration préalable. Google Places et
 * OpenStreetMap restent en aval pour l'ancrage local.
 */
export const SOURCES: ProspectSource[] = [
  new SireneSource(),
  new AnnuaireSource(),
  new GooglePlacesSource(),
  new OpenStreetMapSource(),
];

export function sourceStatus() {
  return SOURCES.map((s) => ({ id: s.id, label: s.label, ...s.availability() }));
}

export function activeSource(): ProspectSource {
  const available = SOURCES.find((s) => s.availability().available);
  if (!available) throw new Error("Aucune source de recherche disponible.");
  return available;
}

/** Sources capables de couvrir la France entière, dans l'ordre de préférence. */
export function nationalSource(): ProspectSource {
  const source = SOURCES.find(
    (s) => (s.id === "sirene" || s.id === "annuaire") && s.availability().available,
  );
  if (!source) throw new Error("Aucune source nationale disponible.");
  return source;
}

export type ImportOutcome = {
  found: number;
  created: number;
  duplicates: number;
  skipped: number;
  /** Par quelle clé chaque doublon a été reconnu. Rend la décision relisible. */
  duplicateBreakdown: Record<string, number>;
  /** Motif de chaque écartement. Jamais de disparition muette. */
  skippedReasons: Record<string, number>;
  prospects: Array<{ id: string; name: string; city: string; website: string | null }>;
};

export type ImportResult = ImportOutcome & { sourceId: string; notes: string[] };

/**
 * Enregistre un lot d'entreprises, en écartant les doublons.
 *
 * COÛT. La reconnaissance des doublons se fait en trois requêtes indexées
 * pour tout le lot, quelle que soit sa taille — jamais en chargeant la base.
 * C'est ce qui permet d'importer indéfiniment sans ralentir.
 */
export async function importBusinesses(
  businesses: RawBusiness[],
  options: { isDemo?: boolean; territoryId?: string } = {},
): Promise<ImportOutcome> {
  const found = businesses.length;
  const duplicateBreakdown: Record<string, number> = {};
  const skippedReasons: Record<string, number> = {};
  const prospects: ImportOutcome["prospects"] = [];
  let created = 0;
  let duplicates = 0;
  let skipped = 0;

  const noteDoublon = (cle: MatchedOn | "IN_BATCH") => {
    duplicates += 1;
    duplicateBreakdown[cle] = (duplicateBreakdown[cle] ?? 0) + 1;
  };
  const noteEcart = (raison: string) => {
    skipped += 1;
    skippedReasons[raison] = (skippedReasons[raison] ?? 0) + 1;
  };

  // 1. Identités. Une entreprise sans nom exploitable n'a pas d'identité :
  //    elle est écartée tout de suite, avec son motif.
  const retenues: Array<{ business: RawBusiness; identity: Identity }> = [];
  for (const b of businesses) {
    if (!b.name?.trim()) {
      noteEcart("dénomination absente");
      continue;
    }
    const identity = buildIdentity({
      name: b.name,
      website: b.website,
      siret: b.siret,
      postalCode: b.postalCode,
    });
    if (!identity.nameKey) {
      noteEcart("dénomination réduite à rien après normalisation");
      continue;
    }
    retenues.push({ business: b, identity });
  }

  // 2. Doublons déjà en base — trois requêtes pour tout le lot.
  const dejaEnBase = await findDuplicatesBatch(retenues.map((r) => r.identity));

  // 3. Doublons À L'INTÉRIEUR du lot : une page d'API peut servir deux fois
  //    le même établissement, et deux créations successives violeraient la
  //    contrainte d'unicité au lieu d'être comptées comme doublons.
  const vues: Identity[] = [];

  for (let i = 0; i < retenues.length; i += 1) {
    const { business, identity } = retenues[i];

    const enBase = dejaEnBase.get(i);
    if (enBase) {
      noteDoublon(enBase.matchedOn);
      continue;
    }

    const dansLeLot = vues.find((v) => sameEntity(v, identity));
    if (dansLeLot) {
      noteDoublon("IN_BATCH");
      continue;
    }

    try {
      const prospect = await createProspectFromBusiness(business, identity, options);
      created += 1;
      vues.push(identity);
      prospects.push({
        id: prospect.id,
        name: prospect.name,
        city: prospect.city,
        website: prospect.website,
      });
    } catch (error) {
      // Une violation de contrainte d'unicité signifie qu'un autre exécutant
      // a créé ce prospect entre notre lecture et notre écriture. C'est bien
      // un doublon, pas une panne : c'est la base qui arbitre la course.
      if (estViolationUnicite(error)) {
        noteDoublon(identity.siret ? "SIRET" : identity.domainKey ? "DOMAIN" : "NAME_POSTAL");
      } else {
        noteEcart(
          `création impossible : ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`,
        );
      }
    }
  }

  return { found, created, duplicates, skipped, duplicateBreakdown, skippedReasons, prospects };
}

function estViolationUnicite(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  if (code === "P2002") return true;
  const message = error instanceof Error ? error.message : "";
  return /unique constraint|UNIQUE constraint/i.test(message);
}

/**
 * Recherche puis enregistre les entreprises trouvées.
 */
export async function searchAndImport(
  query: SearchQuery,
  options: { isDemo?: boolean; sourceId?: string; territoryId?: string } = {},
): Promise<ImportResult> {
  const source = options.sourceId
    ? SOURCES.find((s) => s.id === options.sourceId) ?? activeSource()
    : activeSource();

  const availability = source.availability();
  if (!availability.available) {
    throw new Error(
      `Source ${source.label} indisponible. Manquant : ${availability.missing}. ${availability.note}`,
    );
  }

  const businesses = await source.search(query);
  const resultat = await importBusinesses(businesses, options);
  const notes: string[] = [];

  if (businesses.length === 0) {
    notes.push(
      `Aucun résultat pour « ${query.sectors.join(", ")} » à ${query.city} via ${source.label}. ` +
        `Élargir la zone, changer de secteur, ou lancer un balayage territorial : ` +
        `npm run amyn -- territory plan.`,
    );
  }

  await logActivity({
    actor: "SYSTEM",
    module: "RESEARCH",
    action: "research.search",
    summary:
      `Recherche ${query.sectors.join(", ")} à ${query.city} via ${source.label} : ` +
      `${resultat.found} trouvée(s), ${resultat.created} créée(s), ${resultat.duplicates} doublon(s), ` +
      `${resultat.skipped} écartée(s).`,
    details: { query, sourceId: source.id, ...resultat, prospects: resultat.prospects.length },
  });

  return { sourceId: source.id, ...resultat, notes };
}

async function createProspectFromBusiness(
  b: RawBusiness,
  identity: Identity,
  options: { isDemo?: boolean; territoryId?: string },
) {
  const prospect = await prisma.prospect.create({
    data: {
      name: b.name,
      sector: b.sector,
      city: b.city,
      region: b.region,
      address: b.address,
      postalCode: b.postalCode,
      website: b.website ?? null,
      phone: b.phone ?? null,
      googleBusinessUrl: b.googleBusinessUrl ?? null,
      instagramUrl: b.instagramUrl ?? null,
      facebookUrl: b.facebookUrl ?? null,
      googlePlaceId: b.externalId.startsWith("places:") ? b.externalId.slice(7) : null,

      // Clés de déduplication, calculées une seule fois et stockées : les
      // recalculer à chaque comparaison coûterait un parcours complet.
      siret: identity.siret,
      siren: identity.siren ?? b.siren ?? null,
      domainKey: identity.domainKey,
      nameKey: identity.nameKey,
      naf: b.naf ?? null,
      departement: b.departement ?? null,
      territoryId: options.territoryId ?? null,

      status: "FOUND",
      isDemo: options.isDemo ?? false,
      sources: {
        create: {
          kind: b.sourceKind,
          label: b.sourceLabel,
          url: b.website ?? b.googleBusinessUrl ?? null,
          note: `Importé depuis ${b.sourceLabel}.`,
          rawData: JSON.stringify(b.raw),
        },
      },
      statusEvents: {
        create: {
          toStatus: "FOUND",
          reason: `Trouvé via ${b.sourceLabel}.`,
          actor: "SYSTEM",
        },
      },
    },
  });

  // Un email publié par la source elle-même est un contact public valable :
  // on le conserve AVEC sa provenance. On ne l'invente pas.
  if (b.email) {
    const { validateEmailSyntax, isGenericAddress } = await import("@/lib/contact/discover");
    const validation = validateEmailSyntax(b.email);
    if (validation.status === "SYNTAX_OK") {
      const contact = await prisma.contact.create({
        data: {
          prospectId: prospect.id,
          email: b.email.toLowerCase(),
          isGeneric: isGenericAddress(b.email),
          discoveryMethod: b.sourceKind === "OSM" ? "MANUAL" : "GOOGLE_BUSINESS",
          sourceUrl: b.website ?? b.googleBusinessUrl ?? b.sourceLabel,
          sourceSnippet: `Adresse publiée dans ${b.sourceLabel}`,
          validationStatus: validation.status,
          isPrimary: true,
        },
      });
      await prisma.prospect.update({
        where: { id: prospect.id },
        data: { primaryContactId: contact.id },
      });
    }
  }

  return prospect;
}

export { resolveSector };
