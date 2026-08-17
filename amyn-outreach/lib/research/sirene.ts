// ---------------------------------------------------------------------------
// SOURCE : API Sirene (INSEE) — registre officiel des entreprises francaises
//
// ETAT : implementee, INACTIVE tant que SIRENE_API_KEY est absente.
//
// Utile pour : verifier qu'une entreprise existe legalement, recuperer sa
// raison sociale exacte, son code d'activite (NAF) et son adresse.
// Ne fournit ni site web ni email.
// ---------------------------------------------------------------------------

import type { ProspectSource, RawBusiness, SearchQuery, SourceAvailability } from "./types";

const ENDPOINT = "https://api.insee.fr/api-sirene/3.11/siret";

export class SireneSource implements ProspectSource {
  readonly id = "sirene";
  readonly label = "API Sirene (INSEE)";

  availability(): SourceAvailability {
    const key = process.env.SIRENE_API_KEY;
    if (!key) {
      return {
        available: false,
        missing: "SIRENE_API_KEY",
        note:
          "Créer un compte sur portail-api.insee.fr, souscrire à l'API Sirene, puis renseigner SIRENE_API_KEY dans .env. Gratuit.",
      };
    }
    return { available: true, note: "Clé présente. Sert à confirmer l'existence légale." };
  }

  async search(query: SearchQuery): Promise<RawBusiness[]> {
    const key = process.env.SIRENE_API_KEY;
    if (!key) throw new Error("SIRENE_API_KEY absente : source Sirene indisponible.");

    const q = `libelleCommuneEtablissement:"${query.city}" AND etatAdministratifEtablissement:A`;
    const url = `${ENDPOINT}?q=${encodeURIComponent(q)}&nombre=${Math.min(query.limit, 100)}`;

    const response = await fetch(url, {
      headers: { "X-INSEE-Api-Key-Integration": key, Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`API Sirene : HTTP ${response.status} — ${await response.text()}`);
    }

    const json = (await response.json()) as {
      etablissements?: Array<{
        siret: string;
        uniteLegale?: { denominationUniteLegale?: string; activitePrincipaleUniteLegale?: string };
        adresseEtablissement?: Record<string, string>;
      }>;
    };

    const mapped: Array<RawBusiness | null> = (json.etablissements ?? []).map((e) => {
      const name = e.uniteLegale?.denominationUniteLegale?.trim();
      if (!name) return null;
      const adr = e.adresseEtablissement ?? {};
      return {
          externalId: `sirene:${e.siret}`,
          name,
          sector: e.uniteLegale?.activitePrincipaleUniteLegale ?? "Non précisé",
          city: adr.libelleCommuneEtablissement ?? query.city,
          postalCode: adr.codePostalEtablissement,
          address: [adr.numeroVoieEtablissement, adr.typeVoieEtablissement, adr.libelleVoieEtablissement]
            .filter(Boolean)
            .join(" "),
          sourceKind: "SIRENE",
          sourceLabel: `Sirene SIRET ${e.siret}`,
          raw: { siret: e.siret },
      } satisfies RawBusiness;
    });

    return mapped.filter((b): b is RawBusiness => b !== null);
  }
}
