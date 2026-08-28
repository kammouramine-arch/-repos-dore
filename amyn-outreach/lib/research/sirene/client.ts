// ---------------------------------------------------------------------------
// CLIENT API SIRENE (INSEE) — socle national de decouverte
//
// Sirene est le registre officiel des entreprises francaises : exhaustif,
// gratuit, sans quota commercial. C'est le seul socle legitime pour un
// balayage national.
//
// CE QU'IL DONNE : SIRET, raison sociale, code NAF, adresse, commune, code
// postal, tranche d'effectifs, date de creation, etat administratif.
// CE QU'IL NE DONNE PAS : site web, telephone, email. L'enrichissement est le
// role des etapes suivantes.
//
// PAGINATION : au-dela de 10 000 resultats, `debut` ne fonctionne plus. On
// utilise le curseur : `curseur=*` au premier appel, puis la valeur de
// `curseurSuivant` renvoyee. On s'arrete quand le curseur ne bouge plus.
//
// MEMOIRE : le client rend les pages une par une. Rien n'est accumule ici —
// l'appelant decide quoi garder.
// ---------------------------------------------------------------------------

import { departementDeCommune } from "./geo";
import type { RawBusiness } from "../types";

export const SIRENE_ENDPOINT = "https://api.insee.fr/api-sirene/3.11/siret";

/** L'API plafonne une page a 1000 etablissements. */
export const TAILLE_PAGE_MAX = 1000;

/**
 * Transport HTTP, injectable.
 *
 * Les tests fournissent une implementation en memoire : la logique de
 * pagination, de reprise et de conversion est donc verifiable sans reseau et
 * sans cle API.
 */
export type SireneTransport = (
  url: string,
  headers: Record<string, string>,
) => Promise<{ status: number; body: unknown; text: string }>;

const transportReseau: SireneTransport = async (url, headers) => {
  const reponse = await fetch(url, { headers });
  const text = await reponse.text();
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }
  return { status: reponse.status, body, text };
};

// --- Criteres de recherche --------------------------------------------------

export type SireneCriteria = {
  /**
   * Prefixes de code NAF. "56" couvre toute la restauration,
   * "43.22A" cible l'installation d'eau et de gaz.
   * Vide = tous secteurs.
   */
  naf?: string[];
  /** Codes departement : ["59", "62"]. */
  departements?: string[];
  /** Codes commune INSEE, 5 caracteres. */
  communes?: string[];
  /** Codes postaux, ou prefixes ("59*"). */
  codesPostaux?: string[];
  /** Libelle de commune, quand on ne connait que le nom. */
  ville?: string;
  /** N'inclure que les etablissements en activite. Vrai par defaut. */
  actifsSeulement?: boolean;
  /**
   * Inclure les entrepreneurs individuels (personnes physiques).
   *
   * Beaucoup d'artisans en font partie : les exclure amputerait la cible.
   * Mais leur denomination est un NOM DE PERSONNE — une donnee personnelle.
   * On ne retient donc que les unites explicitement diffusibles, et on le
   * signale sur chaque resultat.
   */
  inclureEntrepreneursIndividuels?: boolean;
};

export type SirenePage = {
  entreprises: RawBusiness[];
  /** Curseur a passer au prochain appel. null quand il n'y a plus rien. */
  curseurSuivant: string | null;
  /** Total annonce par l'API pour cette requete. */
  total: number | null;
  /** Nombre d'etablissements renvoyes par cette page, avant filtrage. */
  recus: number;
  /** Etablissements ecartes, avec la raison. Jamais de disparition muette. */
  ecartes: Array<{ siret: string; raison: string }>;
};

// --- Construction de la requete ---------------------------------------------

/** Echappe une valeur pour la syntaxe de requete Sirene. */
function litteral(valeur: string): string {
  return `"${valeur.replace(/["\\]/g, "")}"`;
}

/**
 * Construit le parametre `q`.
 *
 * Les criteres se combinent en ET ; a l'interieur d'un critere, les valeurs se
 * combinent en OU. Un critere vide est simplement absent.
 */
export function buildSireneQuery(criteres: SireneCriteria): string {
  const blocs: string[] = [];

  if (criteres.naf && criteres.naf.length > 0) {
    // Un prefixe se traduit par un joker : "56" → activite commencant par 56.
    const ou = criteres.naf.map((code) => {
      const propre = code.trim().toUpperCase();
      const complet = /^\d{2}\.\d{2}[A-Z]$/.test(propre);
      return complet
        ? `activitePrincipaleUniteLegale:${litteral(propre)}`
        : `activitePrincipaleUniteLegale:${propre}*`;
    });
    blocs.push(`(${ou.join(" OR ")})`);
  }

  if (criteres.departements && criteres.departements.length > 0) {
    // Le code commune INSEE commence par le code departement.
    const ou = criteres.departements.map((d) => `codeCommuneEtablissement:${d.trim().toUpperCase()}*`);
    blocs.push(`(${ou.join(" OR ")})`);
  }

  if (criteres.communes && criteres.communes.length > 0) {
    const ou = criteres.communes.map((c) => `codeCommuneEtablissement:${litteral(c.trim())}`);
    blocs.push(`(${ou.join(" OR ")})`);
  }

  if (criteres.codesPostaux && criteres.codesPostaux.length > 0) {
    const ou = criteres.codesPostaux.map((cp) => {
      const propre = cp.trim();
      return propre.includes("*")
        ? `codePostalEtablissement:${propre}`
        : `codePostalEtablissement:${litteral(propre)}`;
    });
    blocs.push(`(${ou.join(" OR ")})`);
  }

  if (criteres.ville) {
    blocs.push(`libelleCommuneEtablissement:${litteral(criteres.ville.toUpperCase())}`);
  }

  if (criteres.actifsSeulement !== false) {
    blocs.push("etatAdministratifEtablissement:A");
  }

  if (blocs.length > 0) return blocs.join(" AND ");

  // Aucun critere : l'API refuserait une requete vide. On exprime alors
  // explicitement « tous les etats », plutot que de retomber sur « actifs
  // seulement » — ce qui contredirait la demande de l'appelant en silence.
  return "(etatAdministratifEtablissement:A OR etatAdministratifEtablissement:F)";
}

// --- Conversion --------------------------------------------------------------

/**
 * Forme d'un etablissement tel que l'API le renvoie.
 *
 * ATTENTION : l'API renvoie `null` — et non `undefined` — pour tout champ
 * vide. Le type doit l'accepter, sans quoi une reponse reelle serait rejetee
 * a la compilation alors qu'elle est parfaitement valide.
 */
export type EtablissementSirene = {
  siret?: string | null;
  etatAdministratifEtablissement?: string | null;
  denominationUsuelleEtablissement?: string | null;
  uniteLegale?: {
    denominationUniteLegale?: string | null;
    denominationUsuelle1UniteLegale?: string | null;
    nomUniteLegale?: string | null;
    nomUsageUniteLegale?: string | null;
    prenom1UniteLegale?: string | null;
    activitePrincipaleUniteLegale?: string | null;
    categorieJuridiqueUniteLegale?: string | null;
    trancheEffectifsUniteLegale?: string | null;
    statutDiffusionUniteLegale?: string | null;
    dateCreationUniteLegale?: string | null;
  };
  adresseEtablissement?: Record<string, string | null | undefined>;
  periodesEtablissement?: Array<{ etatAdministratifEtablissement?: string | null; enseigne1Etablissement?: string | null }>;
};

/**
 * Nom exploitable d'un etablissement.
 *
 * Ordre : enseigne, denomination usuelle, raison sociale. En dernier recours
 * seulement, le nom de la personne physique — et uniquement si l'unite est
 * diffusible.
 */
function nomExploitable(e: EtablissementSirene): { nom: string | null; personnePhysique: boolean } {
  const u = e.uniteLegale ?? {};
  const enseigne = e.periodesEtablissement?.[0]?.enseigne1Etablissement?.trim();

  const morale =
    e.denominationUsuelleEtablissement?.trim() ||
    u.denominationUniteLegale?.trim() ||
    u.denominationUsuelle1UniteLegale?.trim() ||
    enseigne;

  if (morale) return { nom: morale, personnePhysique: false };

  // Entrepreneur individuel : le nom est celui d'une personne.
  if (u.statutDiffusionUniteLegale === "O") {
    const nom = [u.prenom1UniteLegale?.trim(), (u.nomUsageUniteLegale ?? u.nomUniteLegale)?.trim()]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (nom) return { nom, personnePhysique: true };
  }

  return { nom: null, personnePhysique: false };
}

function adresseLisible(adr: Record<string, string | null | undefined>): string {
  return [
    adr.numeroVoieEtablissement,
    adr.indiceRepetitionEtablissement,
    adr.typeVoieEtablissement,
    adr.libelleVoieEtablissement,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

/** Convertit un etablissement Sirene, ou explique pourquoi il est ecarte. */
export function toRawBusiness(
  e: EtablissementSirene,
  options: { inclureEntrepreneursIndividuels: boolean },
): { business: RawBusiness } | { ecarte: string } {
  const siret = e.siret?.trim();
  if (!siret) return { ecarte: "Établissement sans SIRET." };

  const u = e.uniteLegale ?? {};

  // Une unite non diffusible ne doit pas etre exploitee.
  if (u.statutDiffusionUniteLegale === "N") {
    return { ecarte: "Unité légale non diffusible (statut N) : exclue par l'INSEE." };
  }

  const { nom, personnePhysique } = nomExploitable(e);
  if (!nom) return { ecarte: "Aucune dénomination exploitable." };

  if (personnePhysique && !options.inclureEntrepreneursIndividuels) {
    return { ecarte: "Entrepreneur individuel : nom de personne, exclu par défaut." };
  }

  const adr = e.adresseEtablissement ?? {};
  const codeCommune = adr.codeCommuneEtablissement ?? null;
  const dep = departementDeCommune(codeCommune);

  return {
    business: {
      externalId: `sirene:${siret}`,
      name: nom,
      sector: u.activitePrincipaleUniteLegale ?? "Non précisé",
      city: adr.libelleCommuneEtablissement ?? "",
      region: dep?.region,
      address: adresseLisible(adr) || undefined,
      postalCode: adr.codePostalEtablissement ?? undefined,
      sourceKind: "SIRENE",
      sourceLabel: `Sirene SIRET ${siret}`,
      raw: {
        siret,
        siren: siret.slice(0, 9),
        naf: u.activitePrincipaleUniteLegale ?? null,
        codeCommune,
        departementCode: dep?.code ?? null,
        departementNom: dep?.nom ?? null,
        region: dep?.region ?? null,
        trancheEffectifs: u.trancheEffectifsUniteLegale ?? null,
        categorieJuridique: u.categorieJuridiqueUniteLegale ?? null,
        dateCreation: u.dateCreationUniteLegale ?? null,
        personnePhysique,
        collecteLe: new Date().toISOString(),
      },
    },
  };
}

// --- Erreurs -----------------------------------------------------------------

export class SireneError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Peut-on reessayer utilement ? */
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "SireneError";
  }
}

function erreurDepuisStatut(status: number, corps: string): SireneError {
  const extrait = corps.slice(0, 200);
  switch (status) {
    case 401:
      return new SireneError(
        "Clé Sirene refusée (401). Vérifiez SIRENE_API_KEY dans .env.",
        401, false,
      );
    case 403:
      return new SireneError(
        "Accès refusé (403). La clé existe mais n'est pas abonnée à l'API Sirene sur portail-api.insee.fr.",
        403, false,
      );
    case 404:
      return new SireneError("Aucun résultat pour cette requête (404).", 404, false);
    case 400:
      return new SireneError(`Requête refusée par l'API (400) : ${extrait}`, 400, false);
    case 429:
      return new SireneError("Limite de débit atteinte (429). Nouvelle tentative après attente.", 429, true);
    default:
      if (status >= 500) {
        return new SireneError(`Service Sirene indisponible (${status}).`, status, true);
      }
      return new SireneError(`Réponse inattendue de l'API Sirene (${status}) : ${extrait}`, status, false);
  }
}

// --- Client -------------------------------------------------------------------

export type SireneClientOptions = {
  apiKey?: string;
  transport?: SireneTransport;
  /** Tentatives par page en cas d'erreur reessayable. */
  maxTentatives?: number;
  /** Attente de base entre deux tentatives, en millisecondes. */
  attenteBaseMs?: number;
  /** Attente entre deux pages : l'API est gratuite, on ne la maltraite pas. */
  attenteEntrePagesMs?: number;
};

export class SireneClient {
  private readonly apiKey: string;
  private readonly transport: SireneTransport;
  private readonly maxTentatives: number;
  private readonly attenteBaseMs: number;
  readonly attenteEntrePagesMs: number;

  /** Compteurs d'execution, utiles au diagnostic. */
  pagesLues = 0;
  tentatives = 0;

  constructor(options: SireneClientOptions = {}) {
    const cle = options.apiKey ?? process.env.SIRENE_API_KEY ?? "";
    if (!cle && !options.transport) {
      throw new SireneError(
        "SIRENE_API_KEY absente : impossible d'interroger le registre national.",
        0, false,
      );
    }
    this.apiKey = cle;
    this.transport = options.transport ?? transportReseau;
    this.maxTentatives = options.maxTentatives ?? 4;
    this.attenteBaseMs = options.attenteBaseMs ?? 2000;
    this.attenteEntrePagesMs = options.attenteEntrePagesMs ?? 600;
  }

  /** Une page. Ne conserve rien : c'est l'appelant qui decide. */
  async fetchPage(
    criteres: SireneCriteria,
    curseur: string = "*",
    taille = 100,
  ): Promise<SirenePage> {
    const q = buildSireneQuery(criteres);
    const nombre = Math.max(1, Math.min(taille, TAILLE_PAGE_MAX));
    const url =
      `${SIRENE_ENDPOINT}?q=${encodeURIComponent(q)}` +
      `&nombre=${nombre}&curseur=${encodeURIComponent(curseur)}`;

    const reponse = await this.avecReessai(url);

    const corps = reponse.body as {
      header?: { total?: number; curseur?: string; curseurSuivant?: string; statut?: number };
      etablissements?: EtablissementSirene[];
    } | null;

    const etablissements = corps?.etablissements ?? [];
    const entreprises: RawBusiness[] = [];
    const ecartes: SirenePage["ecartes"] = [];

    for (const e of etablissements) {
      const resultat = toRawBusiness(e, {
        inclureEntrepreneursIndividuels: criteres.inclureEntrepreneursIndividuels ?? false,
      });
      if ("business" in resultat) entreprises.push(resultat.business);
      else ecartes.push({ siret: e.siret ?? "(sans siret)", raison: resultat.ecarte });
    }

    // Le curseur ne bouge plus, ou la page est vide : c'est la fin.
    const suivant = corps?.header?.curseurSuivant ?? null;
    const termine = !suivant || suivant === curseur || etablissements.length === 0;

    this.pagesLues += 1;

    return {
      entreprises,
      curseurSuivant: termine ? null : suivant,
      total: corps?.header?.total ?? null,
      recus: etablissements.length,
      ecartes,
    };
  }

  /**
   * Parcourt toutes les pages.
   *
   * Rend une page a la fois : la memoire reste constante quel que soit le
   * volume. Le curseur de chaque page est fourni pour permettre une reprise
   * exacte apres interruption (lot 3).
   */
  async *iterate(
    criteres: SireneCriteria,
    options: { taillePage?: number; maxPages?: number; curseurInitial?: string } = {},
  ): AsyncGenerator<SirenePage & { curseurUtilise: string; numeroPage: number }> {
    const taille = options.taillePage ?? 100;
    const maxPages = options.maxPages ?? Number.POSITIVE_INFINITY;

    let curseur = options.curseurInitial ?? "*";
    let numeroPage = 0;

    while (numeroPage < maxPages) {
      const page = await this.fetchPage(criteres, curseur, taille);
      numeroPage += 1;

      yield { ...page, curseurUtilise: curseur, numeroPage };

      if (!page.curseurSuivant) return;
      curseur = page.curseurSuivant;

      if (this.attenteEntrePagesMs > 0) await pause(this.attenteEntrePagesMs);
    }
  }

  /** Reessaie sur les erreurs temporaires, avec attente croissante. */
  private async avecReessai(url: string): Promise<{ status: number; body: unknown; text: string }> {
    let derniere: SireneError | null = null;

    for (let tentative = 1; tentative <= this.maxTentatives; tentative += 1) {
      this.tentatives += 1;
      let reponse: { status: number; body: unknown; text: string };

      try {
        reponse = await this.transport(url, {
          "X-INSEE-Api-Key-Integration": this.apiKey,
          Accept: "application/json",
        });
      } catch (erreur) {
        // Panne reseau : reessayable.
        derniere = new SireneError(
          `Réseau indisponible : ${erreur instanceof Error ? erreur.message : String(erreur)}`,
          0, true,
        );
        if (tentative < this.maxTentatives) {
          await pause(this.attenteBaseMs * tentative);
          continue;
        }
        throw derniere;
      }

      if (reponse.status >= 200 && reponse.status < 300) return reponse;

      // 404 signifie « aucun resultat », pas une panne : page vide.
      if (reponse.status === 404) return { status: 404, body: { etablissements: [] }, text: reponse.text };

      derniere = erreurDepuisStatut(reponse.status, reponse.text);
      if (!derniere.retryable || tentative === this.maxTentatives) throw derniere;

      await pause(this.attenteBaseMs * tentative);
    }

    throw derniere ?? new SireneError("Échec inexpliqué.", 0, false);
  }
}

function pause(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
