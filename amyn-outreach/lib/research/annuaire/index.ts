// ---------------------------------------------------------------------------
// SOURCE ANNUAIRE — implémente le contrat ProspectSource
//
// Disponible sans configuration : c'est la source qui permet à la prospection
// nationale de fonctionner avant même que la clé Sirene existe.
// ---------------------------------------------------------------------------

import { resolveSectorOpen } from "../sectors";
import type { ProspectSource, RawBusiness, SearchQuery, SourceAvailability } from "../types";
import { resolveZone, DEPARTEMENTS } from "../sirene/geo";
import {
  AnnuaireClient,
  type AnnuaireCriteria,
  type AnnuaireClientOptions,
  TAILLE_PAGE_MAX,
} from "./client";

export * from "./client";

/**
 * Traduit une demande en français en critères pour l'annuaire.
 *
 * Aucune liste fermée de métiers : `resolveSectorOpen` retombe sur la
 * nomenclature NAF pour tout secteur absent du catalogue curé, et sur « tous
 * secteurs » quand aucun n'est demandé.
 */
export function criteresAnnuaire(demande: {
  secteurs?: string[];
  zone?: string;
  departements?: string[];
  communes?: string[];
  codesPostaux?: string[];
  ville?: string;
  inclureEntrepreneursIndividuels?: boolean;
}): { criteres: AnnuaireCriteria; notes: string[] } {
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

  // Une region est traduite en sa liste de departements plutot que passee
  // telle quelle : le decoupage territorial travaille au departement, et un
  // seul chemin de code evite deux comportements divergents.
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

  // Une ville nommée mais non résolue en code : recherche texte, en dernier
  // recours et signalée comme telle. Un filtre géographique exact vaut
  // toujours mieux qu'une correspondance de nom.
  let texte: string | undefined;
  if (demande.ville) {
    const zone = resolveZone(demande.ville);
    if (zone.kind === "UNKNOWN") {
      texte = demande.ville;
      notes.push(
        `« ${demande.ville} » n'est ni un département ni une région : recherche par nom, ` +
          `moins précise qu'un filtre par code commune.`,
      );
    } else {
      departements.push(...zone.departements.map((d) => d.code));
    }
  }

  const uniques = [...new Set(departements)];
  const inconnus = uniques.filter((d) => !DEPARTEMENTS.some((dep) => dep.code === d));
  for (const d of inconnus) {
    notes.push(`Département « ${d} » inconnu : ignoré plutôt que transmis tel quel à l'API.`);
  }

  return {
    criteres: {
      naf: [...new Set(naf)],
      departements: uniques.filter((d) => !inconnus.includes(d)),
      communes: demande.communes,
      codesPostaux: demande.codesPostaux,
      texte,
      actifsSeulement: true,
      inclureEntrepreneursIndividuels: demande.inclureEntrepreneursIndividuels ?? false,
    },
    notes,
  };
}

export class AnnuaireSource implements ProspectSource {
  readonly id = "annuaire";
  readonly label = "Annuaire des Entreprises (API publique)";

  constructor(private readonly options: AnnuaireClientOptions = {}) {}

  availability(): SourceAvailability {
    return {
      available: true,
      note:
        "Registre officiel des entreprises françaises, servi par l'API publique de la DINUM. " +
        "Aucune clé requise. Ne fournit ni site web ni email : l'enrichissement reste à faire.",
    };
  }

  /** Recherche bornée. Pour un balayage national, utiliser client().iterate(). */
  async search(query: SearchQuery): Promise<RawBusiness[]> {
    const { criteres } = criteresAnnuaire({
      secteurs: query.sectors,
      ville: query.city || undefined,
    });

    const client = new AnnuaireClient(this.options);
    const resultats: RawBusiness[] = [];

    for await (const page of client.iterate(criteres, {
      parPage: Math.min(query.limit, TAILLE_PAGE_MAX),
    })) {
      resultats.push(...page.entreprises);
      if (resultats.length >= query.limit) break;
    }

    return resultats.slice(0, query.limit);
  }

  client(): AnnuaireClient {
    return new AnnuaireClient(this.options);
  }
}
