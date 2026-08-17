// ---------------------------------------------------------------------------
// SOURCE : Google Places API (New)
//
// ETAT : implementee, mais INACTIVE tant que GOOGLE_PLACES_API_KEY est absente.
// Le code ci-dessous est le vrai appel : il fonctionnera des que la cle sera
// renseignee dans .env. Aucun faux-semblant.
//
// A savoir :
//   • Places ne fournit AUCUNE adresse email. C'est normal, aucune API ne le fait.
//   • Les conditions Google interdisent de stocker durablement les donnees
//     Places autres que place_id : on ne conserve donc que place_id + les
//     champs que le commerce publie par ailleurs.
// ---------------------------------------------------------------------------

import { resolveSector } from "./sectors";
import type { ProspectSource, RawBusiness, SearchQuery, SourceAvailability } from "./types";

const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";

type PlaceResult = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  googleMapsUri?: string;
  primaryTypeDisplayName?: { text?: string };
};

export class GooglePlacesSource implements ProspectSource {
  readonly id = "google_places";
  readonly label = "Google Places API";

  availability(): SourceAvailability {
    const key = process.env.GOOGLE_PLACES_API_KEY;
    if (!key) {
      return {
        available: false,
        missing: "GOOGLE_PLACES_API_KEY",
        note:
          "Renseigner GOOGLE_PLACES_API_KEY dans .env (console.cloud.google.com > API Places New > créer une clé). La facturation doit être activée, même si l'usage reste dans le palier gratuit.",
      };
    }
    return { available: true, note: "Clé présente. Meilleure couverture pour les commerces." };
  }

  async search(query: SearchQuery): Promise<RawBusiness[]> {
    const key = process.env.GOOGLE_PLACES_API_KEY;
    if (!key) throw new Error("GOOGLE_PLACES_API_KEY absente : source Google Places indisponible.");

    const results: RawBusiness[] = [];
    const seen = new Set<string>();

    for (const sectorInput of query.sectors) {
      if (results.length >= query.limit) break;
      const resolved = resolveSector(sectorInput);
      const label = resolved?.def.label ?? sectorInput;

      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": [
            "places.id",
            "places.displayName",
            "places.formattedAddress",
            "places.websiteUri",
            "places.nationalPhoneNumber",
            "places.internationalPhoneNumber",
            "places.googleMapsUri",
            "places.primaryTypeDisplayName",
          ].join(","),
        },
        body: JSON.stringify({
          textQuery: `${sectorInput} ${query.city}`,
          languageCode: "fr",
          regionCode: "FR",
          maxResultCount: Math.min(20, query.limit),
        }),
      });

      if (!response.ok) {
        throw new Error(`Google Places : HTTP ${response.status} — ${await response.text()}`);
      }

      const json = (await response.json()) as { places?: PlaceResult[] };
      for (const place of json.places ?? []) {
        if (results.length >= query.limit) break;
        const name = place.displayName?.text?.trim();
        if (!name || seen.has(place.id)) continue;
        seen.add(place.id);

        results.push({
          externalId: `places:${place.id}`,
          name,
          sector: resolved?.def.label ?? place.primaryTypeDisplayName?.text ?? label,
          city: query.city,
          address: place.formattedAddress,
          website: place.websiteUri,
          phone: place.internationalPhoneNumber ?? place.nationalPhoneNumber,
          googleBusinessUrl: place.googleMapsUri,
          sourceKind: "GOOGLE_BUSINESS",
          sourceLabel: `Google Places ${place.id}`,
          // Conditions Google : on ne conserve durablement que l'identifiant.
          raw: { placeId: place.id },
        });
      }
    }

    return results;
  }
}
