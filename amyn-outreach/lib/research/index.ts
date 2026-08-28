// ---------------------------------------------------------------------------
// MODULE RECHERCHE — registre des sources + import avec deduplication.
//
// Ajouter une source = l'implementer puis l'ajouter a SOURCES.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { OpenStreetMapSource } from "./osm";
import { GooglePlacesSource } from "./google-places";
import { SireneSource } from "./sirene/index";
import { resolveSector } from "./sectors";
import type { ProspectSource, RawBusiness, SearchQuery } from "./types";

export * from "./types";
export * from "./sectors";

/** Ordre de preference : la premiere source disponible est utilisee. */
export const SOURCES: ProspectSource[] = [
  new GooglePlacesSource(),
  new OpenStreetMapSource(),
  new SireneSource(),
];

export function sourceStatus() {
  return SOURCES.map((s) => ({ id: s.id, label: s.label, ...s.availability() }));
}

export function activeSource(): ProspectSource {
  const available = SOURCES.find((s) => s.availability().available);
  if (!available) throw new Error("Aucune source de recherche disponible.");
  return available;
}

/** Normalise un nom pour comparer deux entreprises. */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(sarl|sas|sasu|eurl|sa|snc|eirl|ei|scop)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeDomain(website: string | undefined): string | null {
  if (!website) return null;
  try {
    return new URL(website.startsWith("http") ? website : `https://${website}`).hostname
      .replace(/^www\./, "")
      .toLowerCase();
  } catch {
    return null;
  }
}

export type ImportResult = {
  sourceId: string;
  found: number;
  created: number;
  duplicates: number;
  skipped: number;
  prospects: Array<{ id: string; name: string; city: string; website: string | null }>;
  notes: string[];
};

/**
 * Recherche puis enregistre les entreprises trouvees.
 * Deduplication sur trois cles : identifiant source, domaine, nom+ville.
 */
export async function searchAndImport(
  query: SearchQuery,
  options: { isDemo?: boolean; sourceId?: string } = {},
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
  const notes: string[] = [];
  let created = 0;
  let duplicates = 0;
  let skipped = 0;
  const prospects: ImportResult["prospects"] = [];

  // Index des prospects existants, pour la deduplication.
  const existing = await prisma.prospect.findMany({
    select: { id: true, name: true, city: true, website: true, sources: { select: { label: true } } },
  });
  const byName = new Map(existing.map((p) => [`${normalizeName(p.name)}|${p.city.toLowerCase()}`, p]));
  const byDomain = new Map(
    existing
      .map((p) => [normalizeDomain(p.website ?? undefined), p] as const)
      .filter((e): e is [string, (typeof existing)[number]] => e[0] !== null),
  );
  const byExternalId = new Set(existing.flatMap((p) => p.sources.map((s) => s.label)));

  for (const b of businesses) {
    if (byExternalId.has(b.sourceLabel)) {
      duplicates += 1;
      continue;
    }
    const domain = normalizeDomain(b.website);
    if (domain && byDomain.has(domain)) {
      duplicates += 1;
      continue;
    }
    const nameKey = `${normalizeName(b.name)}|${b.city.toLowerCase()}`;
    if (byName.has(nameKey)) {
      duplicates += 1;
      continue;
    }
    if (!b.name.trim()) {
      skipped += 1;
      continue;
    }

    const prospect = await createProspectFromBusiness(b, options.isDemo ?? false);
    created += 1;
    prospects.push({
      id: prospect.id,
      name: prospect.name,
      city: prospect.city,
      website: prospect.website,
    });
    byName.set(nameKey, {
      id: prospect.id,
      name: prospect.name,
      city: prospect.city,
      website: prospect.website,
      sources: [],
    });
    if (domain) {
      byDomain.set(domain, {
        id: prospect.id,
        name: prospect.name,
        city: prospect.city,
        website: prospect.website,
        sources: [],
      });
    }
    byExternalId.add(b.sourceLabel);
  }

  if (businesses.length === 0) {
    notes.push(
      `Aucun résultat pour « ${query.sectors.join(", ")} » à ${query.city}. La couverture d'OpenStreetMap varie selon les communes ; essayer une ville plus grande ou un autre secteur.`,
    );
  }

  await logActivity({
    actor: "SYSTEM",
    module: "RESEARCH",
    action: "research.search",
    summary: `Recherche ${query.sectors.join(", ")} à ${query.city} via ${source.label} : ${businesses.length} trouvé(s), ${created} créé(s), ${duplicates} doublon(s).`,
    details: { query, sourceId: source.id, found: businesses.length, created, duplicates },
  });

  return { sourceId: source.id, found: businesses.length, created, duplicates, skipped, prospects, notes };
}

async function createProspectFromBusiness(b: RawBusiness, isDemo: boolean) {
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
      status: "FOUND",
      isDemo,
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

  // Un email publie par la source elle-meme est un contact public valable :
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
