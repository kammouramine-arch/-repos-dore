// ---------------------------------------------------------------------------
// SOURCE : OpenStreetMap (API Overpass)
//
// Gratuite, sans cle, donnees ouvertes (licence ODbL).
// Fournit : nom, adresse, telephone, site web, parfois email publie par le
// commerce lui-meme. C'est la seule source utilisable immediatement sans
// configuration, elle sert donc de source par defaut.
//
// Politesse : un seul appel par recherche, delai entre recherches, User-Agent
// explicite. L'API Overpass est un service benevole : on ne la martele pas.
// ---------------------------------------------------------------------------

import { resolveSector } from "./sectors";
import type { ProspectSource, RawBusiness, SearchQuery, SourceAvailability } from "./types";

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const USER_AGENT = "AmynOutreachBot/1.0 (+prospection B2B; contact@amyn.agency)";

type OverpassElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

function buildQuery(city: string, osmFilters: string[], limit: number): string {
  const safeCity = city.replace(/["\\]/g, "");
  const blocks = osmFilters
    .flatMap((f) => [`  node[${f}](area.searchArea);`, `  way[${f}](area.searchArea);`])
    .join("\n");

  return `[out:json][timeout:40];
area["name"="${safeCity}"]["boundary"="administrative"]->.searchArea;
(
${blocks}
);
out center tags ${Math.min(limit * 3, 400)};`;
}

/** Un commerce sans nom n'est pas exploitable : on ne l'invente pas. */
function toBusiness(el: OverpassElement, sectorLabel: string, city: string): RawBusiness | null {
  const tags = el.tags ?? {};
  const name = tags.name?.trim();
  if (!name) return null;

  const website =
    tags.website ?? tags["contact:website"] ?? tags.url ?? tags["contact:url"] ?? undefined;
  const phone = tags.phone ?? tags["contact:phone"] ?? tags["contact:mobile"] ?? undefined;
  const email = tags.email ?? tags["contact:email"] ?? undefined;
  const facebook = tags["contact:facebook"] ?? undefined;
  const instagram = tags["contact:instagram"] ?? undefined;

  const addressParts = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean);

  return {
    externalId: `osm:${el.type}/${el.id}`,
    name,
    sector: sectorLabel,
    city: tags["addr:city"] ?? city,
    address: addressParts.length ? addressParts.join(" ") : undefined,
    postalCode: tags["addr:postcode"] ?? undefined,
    website: website && /^https?:\/\//i.test(website) ? website : website ? `https://${website}` : undefined,
    phone,
    email,
    facebookUrl: facebook,
    instagramUrl: instagram && instagram.startsWith("http") ? instagram : undefined,
    sourceKind: "OSM",
    sourceLabel: `OpenStreetMap ${el.type}/${el.id}`,
    raw: tags,
  };
}

export class OpenStreetMapSource implements ProspectSource {
  readonly id = "osm";
  readonly label = "OpenStreetMap (Overpass)";

  availability(): SourceAvailability {
    return {
      available: true,
      note: "Source ouverte, aucune clé requise. Couverture variable selon les communes.",
    };
  }

  async search(query: SearchQuery): Promise<RawBusiness[]> {
    const results: RawBusiness[] = [];
    const seen = new Set<string>();

    for (const sectorInput of query.sectors) {
      const resolved = resolveSector(sectorInput);
      if (!resolved) continue;
      if (results.length >= query.limit) break;

      const overpassQuery = buildQuery(query.city, resolved.def.osm, query.limit);
      const elements = await this.callOverpass(overpassQuery);

      for (const el of elements) {
        if (results.length >= query.limit) break;
        const business = toBusiness(el, resolved.def.label, query.city);
        if (!business || seen.has(business.externalId)) continue;
        seen.add(business.externalId);
        results.push(business);
      }
    }

    return results;
  }

  private async callOverpass(query: string): Promise<OverpassElement[]> {
    let lastError: Error | null = null;

    // Overpass est un service benevole soumis a des limites de debit.
    // On reessaie avec une attente progressive plutot que d'echouer sec.
    for (const attempt of [0, 1, 2]) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, attempt * 5000));
      }
      for (const endpoint of ENDPOINTS) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 60_000);
        const response = await fetch(endpoint, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": USER_AGENT,
          },
          body: new URLSearchParams({ data: query }).toString(),
        });
        clearTimeout(timer);

        if (!response.ok) {
          lastError = new Error(
            response.status === 429
              ? `Overpass ${endpoint} : limite de débit atteinte (429)`
              : `Overpass ${endpoint} : HTTP ${response.status}`,
          );
          continue;
        }
        const json = (await response.json()) as { elements?: OverpassElement[] };
        return json.elements ?? [];
      } catch (err) {
        lastError = err as Error;
      }
      }
    }

    throw new Error(
      `Aucun serveur Overpass n'a répondu après 3 tentatives. Dernière erreur : ${lastError?.message ?? "inconnue"}. ` +
        `Overpass limite le débit : réessayez dans une minute, ou configurez GOOGLE_PLACES_API_KEY pour une source sans limite gratuite.`,
    );
  }
}
