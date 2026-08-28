// ---------------------------------------------------------------------------
// SOURCE SIRENE — socle national de decouverte
//
// Implemente le contrat ProspectSource (compatibilite avec l'existant) ET
// expose une API paginee pour le balayage national.
//
// Ne fournit ni site web, ni telephone, ni email : l'enrichissement reste le
// role des etapes suivantes. Aucune adresse n'est jamais devinee.
// ---------------------------------------------------------------------------

import { resolveSectorOpen } from "../sectors";
import type { ProspectSource, RawBusiness, SearchQuery, SourceAvailability } from "../types";
import { SireneClient, type SireneCriteria, type SireneClientOptions } from "./client";
import { resolveZone } from "./geo";

export * from "./geo";
export * from "./client";

/**
 * Traduit une demande exprimee en francais en criteres Sirene.
 *
 * Aucune liste fermee : les secteurs passent par resolveSectorOpen, qui
 * retombe sur la nomenclature NAF pour tout metier absent du catalogue cure.
 */
export function criteresDepuisDemande(demande: {
  secteurs?: string[];
  zone?: string;
  departements?: string[];
  ville?: string;
  inclureEntrepreneursIndividuels?: boolean;
}): { criteres: SireneCriteria; notes: string[] } {
  const notes: string[] = [];
  const naf: string[] = [];

  for (const secteur of demande.secteurs ?? []) {
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
        `« ${resolu.label} » relève d'une profession encadrée : prospection à n'engager qu'en connaissance de cause.`,
      );
    }
    naf.push(...resolu.naf);
  }

  const departements = [...(demande.departements ?? [])];
  if (demande.zone) {
    const zone = resolveZone(demande.zone);
    if (zone.kind === "UNKNOWN") {
      notes.push(`Zone « ${demande.zone} » non reconnue : ni département, ni région.`);
    } else {
      departements.push(...zone.departements.map((d) => d.code));
      notes.push(`${zone.label} → ${zone.departements.length} département(s).`);
    }
  }

  if (naf.length === 0 && (demande.secteurs?.length ?? 0) > 0) {
    notes.push("Aucun code NAF exploitable : la recherche portera sur tous les secteurs.");
  }

  return {
    criteres: {
      naf: [...new Set(naf)],
      departements: [...new Set(departements)],
      ville: demande.ville,
      actifsSeulement: true,
      inclureEntrepreneursIndividuels: demande.inclureEntrepreneursIndividuels ?? false,
    },
    notes,
  };
}

export class SireneSource implements ProspectSource {
  readonly id = "sirene";
  readonly label = "API Sirene (INSEE)";

  constructor(private readonly options: SireneClientOptions = {}) {}

  availability(): SourceAvailability {
    const key = this.options.apiKey ?? process.env.SIRENE_API_KEY;
    if (!key && !this.options.transport) {
      return {
        available: false,
        missing: "SIRENE_API_KEY",
        note:
          "Créer un compte sur portail-api.insee.fr, souscrire à l'API Sirene, puis renseigner " +
          "SIRENE_API_KEY dans .env. Gratuit, sans quota commercial, couverture nationale.",
      };
    }
    return {
      available: true,
      note: "Registre officiel des entreprises françaises. Ne fournit ni site web ni email.",
    };
  }

  /**
   * Contrat ProspectSource : une recherche bornee.
   *
   * Pour un balayage national, utiliser iterate() plutot que cette methode :
   * elle s'arrete volontairement a `limit` resultats.
   */
  async search(query: SearchQuery): Promise<RawBusiness[]> {
    const { criteres } = criteresDepuisDemande({
      secteurs: query.sectors,
      ville: query.city || undefined,
    });

    const client = new SireneClient(this.options);
    const resultats: RawBusiness[] = [];

    for await (const page of client.iterate(criteres, {
      taillePage: Math.min(query.limit, 100),
    })) {
      resultats.push(...page.entreprises);
      if (resultats.length >= query.limit) break;
    }

    return resultats.slice(0, query.limit);
  }

  /** Acces direct au client paginé, pour le balayage national. */
  client(): SireneClient {
    return new SireneClient(this.options);
  }
}
