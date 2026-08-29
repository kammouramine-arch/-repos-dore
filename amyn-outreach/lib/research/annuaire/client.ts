// ---------------------------------------------------------------------------
// ANNUAIRE DES ENTREPRISES — source nationale publique, sans clé
//
// API ouverte de la DINUM, construite sur la base Sirene de l'INSEE :
//   https://recherche-entreprises.api.gouv.fr
//
// POURQUOI CETTE SOURCE EN PLUS DE SIRENE. L'API Sirene de l'INSEE exige une
// clé. Tant qu'elle n'est pas créée, le moteur national ne pourrait rien
// balayer du tout. Celle-ci sert les mêmes données, sans authentification :
// la prospection nationale devient possible immédiatement, et Sirene reprend
// la main dès que la clé existe.
//
// DEUX LIMITES DURES, mesurées contre l'API réelle et non supposées :
//   • 25 résultats par page au maximum ;
//   • page × per_page ≤ 10 000 : au-delà, l'API répond 400.
//
// La seconde est structurante. « Toutes les entreprises de France » représente
// des millions d'établissements : aucune requête unique ne peut les servir.
// C'est ce plafond, et non un choix esthétique, qui impose de découper le
// territoire (voir lib/territory).
// ---------------------------------------------------------------------------

import { NAF_DIVISIONS } from "../sectors";
import type { RawBusiness } from "../types";
import { departementDeCommune } from "../sirene/geo";

export const ANNUAIRE_ENDPOINT = "https://recherche-entreprises.api.gouv.fr/search";
export const TAILLE_PAGE_MAX = 25;
/** Produit page × per_page refusé au-delà. Constaté sur l'API réelle. */
export const PROFONDEUR_MAX = 10_000;

/** Transport injectable : les tests n'ont jamais besoin du réseau. */
export type AnnuaireTransport = (
  url: string,
) => Promise<{ status: number; body: unknown; text: string }>;

export type AnnuaireCriteria = {
  /** Codes NAF ; acceptés en division (« 56 ») ou en classe (« 56.10A »). */
  naf?: string[];
  departements?: string[];
  region?: string;
  /** Codes INSEE de commune (5 caractères). */
  communes?: string[];
  codesPostaux?: string[];
  /** Recherche texte libre, en dernier recours. */
  texte?: string;
  actifsSeulement?: boolean;
  /**
   * Inclure les entrepreneurs individuels.
   *
   * Exclus par défaut : leur dénomination est un nom de personne, donc une
   * donnée personnelle. Les inclure est un choix à poser en connaissance de
   * cause, pas un défaut silencieux.
   */
  inclureEntrepreneursIndividuels?: boolean;
};

export class AnnuaireError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "AnnuaireError";
  }
}

export type AnnuairePage = {
  entreprises: RawBusiness[];
  /** Total annoncé par l'API — plafonné à 10 000 par l'API elle-même. */
  total: number;
  page: number;
  parPage: number;
  /** Nombre de résultats bruts avant filtrage (diffusion, personnes physiques). */
  brut: number;
  ecartes: Record<string, number>;
  /** Une page suivante est-elle demandable sans dépasser la profondeur ? */
  encore: boolean;
  /**
   * true si le territoire contient plus de résultats que l'API n'en servira.
   * Un territoire saturé doit être subdivisé, pas déclaré terminé.
   */
  sature: boolean;
};

export function libelleNaf(code: string | null | undefined): string {
  if (!code) return "Activité non précisée";
  const division = code.replace(/\D/g, "").slice(0, 2);
  return NAF_DIVISIONS.find((d) => d.code === division)?.label ?? `NAF ${code}`;
}

/** Construit l'URL de recherche. La lisibilité prime : une requête se relit. */
export function buildAnnuaireUrl(
  criteres: AnnuaireCriteria,
  page: number,
  parPage: number,
): string {
  const params = new URLSearchParams();

  if (criteres.naf?.length) params.set("activite_principale", criteres.naf.join(","));
  if (criteres.departements?.length) params.set("departement", criteres.departements.join(","));
  if (criteres.region) params.set("region", criteres.region);
  if (criteres.communes?.length) params.set("code_commune", criteres.communes.join(","));
  if (criteres.codesPostaux?.length) params.set("code_postal", criteres.codesPostaux.join(","));
  if (criteres.texte?.trim()) params.set("q", criteres.texte.trim());
  if (criteres.actifsSeulement !== false) params.set("etat_administratif", "A");
  if (!criteres.inclureEntrepreneursIndividuels) {
    params.set("est_entrepreneur_individuel", "false");
  }

  params.set("page", String(page));
  params.set("per_page", String(Math.min(Math.max(parPage, 1), TAILLE_PAGE_MAX)));

  return `${ANNUAIRE_ENDPOINT}?${params.toString()}`;
}

type Etablissement = {
  siret?: string | null;
  adresse?: string | null;
  code_postal?: string | null;
  commune?: string | null;
  libelle_commune?: string | null;
  departement?: string | null;
  region?: string | null;
  activite_principale?: string | null;
  etat_administratif?: string | null;
  statut_diffusion_etablissement?: string | null;
  est_siege?: boolean | null;
  liste_enseignes?: string[] | null;
};

type UniteLegale = {
  siren?: string | null;
  nom_complet?: string | null;
  nom_raison_sociale?: string | null;
  sigle?: string | null;
  nature_juridique?: string | null;
  activite_principale?: string | null;
  etat_administratif?: string | null;
  statut_diffusion?: string | null;
  nombre_etablissements?: number | null;
  nombre_etablissements_ouverts?: number | null;
  tranche_effectif_salarie?: string | null;
  date_creation?: string | null;
  siege?: Etablissement | null;
  matching_etablissements?: Etablissement[] | null;
  complements?: { site_web?: string | null } | null;
};

/**
 * Convertit une unité légale en prospect brut.
 *
 * Renvoie un motif d'écartement plutôt qu'un objet vide : un enregistrement
 * ignoré doit pouvoir être expliqué, jamais disparaître en silence.
 */
export function toRawBusiness(
  unite: UniteLegale,
  options: { inclureEntrepreneursIndividuels?: boolean; nafDemandes?: string[] } = {},
): { business: RawBusiness } | { ecarte: string } {
  // 1. Diffusion. L'INSEE marque les unités qui ont demandé à ne pas être
  //    diffusées. Les exploiter serait illégal — et ce n'est pas négociable.
  if (unite.statut_diffusion && unite.statut_diffusion !== "O") {
    return { ecarte: "unité non diffusible" };
  }

  // 2. Choix de l'établissement.
  //
  //    Les établissements « matching » sont ceux qui répondent aux filtres
  //    géographiques : c'est le commerce visé, pas forcément le siège — une
  //    chaîne a son siège à Paris et son restaurant dans le Nord.
  //
  //    MAIS L'ACTIVITÉ SE FILTRE AU NIVEAU DE L'UNITÉ LÉGALE, pas de
  //    l'établissement. Constaté contre l'API réelle : une recherche de
  //    restaurants dans le Nord renvoyait aussi des sièges sociaux (70.10) et
  //    de la location immobilière (68.20) — des entreprises dont l'activité
  //    principale est bien la restauration, mais dont l'établissement retenu
  //    fait tout autre chose. Prospecter un siège social en lui parlant de sa
  //    carte de restaurant est une erreur qui se voit immédiatement.
  //
  //    On préfère donc l'établissement qui exerce RÉELLEMENT l'activité
  //    demandée. À défaut, on garde l'unité — elle a satisfait le filtre de
  //    l'API — mais le secteur affiché reste celui de l'établissement, jamais
  //    celui qu'on espérait trouver.
  const candidats = (unite.matching_etablissements ?? []).filter((e) => e && e.siret);
  const nafDemandes = options.nafDemandes ?? [];
  const correspond = (e: Etablissement) =>
    nafDemandes.length === 0 ||
    nafDemandes.some((n) => (e.activite_principale ?? "").startsWith(n));

  //    ORDRE DE PRÉFÉRENCE, et il n'est pas interchangeable. Les
  //    `matching_etablissements` sont ceux qui satisfont déjà la géographie
  //    demandée ; le siège, lui, peut être à l'autre bout du pays. Chercher
  //    d'abord la bonne activité SANS se limiter à eux ramenait le restaurant
  //    parisien d'une chaîne pendant qu'on prospectait le Nord — un secteur
  //    juste pour un prospect inatteignable. La géographie prime donc, et
  //    l'activité départage à l'intérieur.
  const etablissement =
    candidats.find(correspond) ?? // bonne zone ET bonne activité
    candidats[0] ?? //              bonne zone, activité au mieux
    unite.siege ?? //               aucun établissement dans la zone
    null;

  if (!etablissement?.siret) return { ecarte: "aucun établissement identifiable" };

  //    Dernier filet. Il reste des cas où AUCUN établissement de la zone
  //    n'exerce l'activité demandée : l'unité légale est classée en
  //    restauration, mais son seul site dans le département est un entrepôt
  //    ou un bureau. Mesuré sur l'API réelle : environ une unité sur six.
  //    Les garder, c'est écrire à un entrepôt pour parler de sa carte — une
  //    erreur qui se voit à la première ligne. On les écarte donc, avec un
  //    motif nommé, jamais en silence.
  //
  //    Une activité ABSENTE n'est pas une activité qui ne correspond pas :
  //    dans le doute, on garde plutôt que de deviner.
  const activite = etablissement.activite_principale;
  if (nafDemandes.length > 0 && activite && !nafDemandes.some((n) => activite.startsWith(n))) {
    return { ecarte: `activité de l'établissement hors cible (${activite})` };
  }

  if (
    etablissement.statut_diffusion_etablissement &&
    etablissement.statut_diffusion_etablissement !== "O"
  ) {
    return { ecarte: "établissement non diffusible" };
  }

  // 3. Personne physique. La dénomination est alors le nom de l'exploitant.
  const personnePhysique = unite.nature_juridique === "1000";
  if (personnePhysique && !options.inclureEntrepreneursIndividuels) {
    return { ecarte: "entrepreneur individuel (donnée personnelle)" };
  }

  const nom =
    etablissement.liste_enseignes?.find((e) => e && e.trim()) ??
    unite.nom_complet ??
    unite.nom_raison_sociale ??
    null;
  if (!nom?.trim()) return { ecarte: "dénomination absente" };

  const ville = etablissement.libelle_commune?.trim() || "";
  if (!ville) return { ecarte: "commune absente" };

  const naf = etablissement.activite_principale ?? unite.activite_principale ?? null;
  const departement =
    etablissement.departement ?? departementDeCommune(etablissement.commune)?.code ?? undefined;

  return {
    business: {
      externalId: `annuaire:${etablissement.siret}`,
      name: nom.trim(),
      sector: libelleNaf(naf),
      city: ville,
      siret: etablissement.siret,
      siren: unite.siren ?? etablissement.siret.slice(0, 9),
      naf: naf ?? undefined,
      departement,
      personnePhysique,
      region: etablissement.region ?? undefined,
      address: etablissement.adresse?.trim() || undefined,
      postalCode: etablissement.code_postal?.trim() || undefined,
      // L'annuaire ne publie pas de site fiable : l'enrichissement reste le
      // rôle des étapes suivantes. Aucune URL n'est devinée ici.
      website: undefined,
      sourceKind: "SIRENE",
      sourceLabel: `annuaire:${etablissement.siret}`,
      raw: {
        siren: unite.siren,
        nature_juridique: unite.nature_juridique,
        nombre_etablissements: unite.nombre_etablissements,
        nombre_etablissements_ouverts: unite.nombre_etablissements_ouverts,
        tranche_effectif_salarie: unite.tranche_effectif_salarie,
        date_creation: unite.date_creation,
        etablissement,
      },
    },
  };
}

const transportReseau: AnnuaireTransport = async (url) => {
  const reponse = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "AMYN-Outreach/1.0" },
  });
  const text = await reponse.text();
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }
  return { status: reponse.status, body, text };
};

export type AnnuaireClientOptions = {
  transport?: AnnuaireTransport;
  /** Pause entre deux pages, en ms. L'API publique impose un rythme modéré. */
  delaiEntrePagesMs?: number;
  maxTentatives?: number;
  /** Injectable pour que les tests n'attendent pas réellement. */
  attendre?: (ms: number) => Promise<void>;
};

export class AnnuaireClient {
  private readonly transport: AnnuaireTransport;
  private readonly delaiEntrePagesMs: number;
  private readonly maxTentatives: number;
  private readonly attendre: (ms: number) => Promise<void>;

  constructor(options: AnnuaireClientOptions = {}) {
    this.transport = options.transport ?? transportReseau;
    this.delaiEntrePagesMs = options.delaiEntrePagesMs ?? 120;
    this.maxTentatives = options.maxTentatives ?? 4;
    this.attendre = options.attendre ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  /**
   * Une page, avec réessais.
   *
   * Distingue ce qui se répare en réessayant (429, 5xx, coupure réseau) de ce
   * qui ne se répare pas (400 : requête invalide). Réessayer une requête
   * invalide ne fait que perdre du temps et marteler l'API.
   */
  async fetchPage(
    criteres: AnnuaireCriteria,
    page = 1,
    parPage = TAILLE_PAGE_MAX,
  ): Promise<AnnuairePage> {
    const taille = Math.min(Math.max(parPage, 1), TAILLE_PAGE_MAX);

    if (page * taille > PROFONDEUR_MAX) {
      throw new AnnuaireError(
        `Profondeur maximale atteinte : page ${page} × ${taille} dépasse ${PROFONDEUR_MAX} résultats. ` +
          `Ce territoire doit être subdivisé.`,
        400,
        false,
      );
    }

    const url = buildAnnuaireUrl(criteres, page, taille);
    let derniereErreur: AnnuaireError | null = null;

    for (let tentative = 1; tentative <= this.maxTentatives; tentative += 1) {
      let reponse: { status: number; body: unknown; text: string };
      try {
        reponse = await this.transport(url);
      } catch (e) {
        derniereErreur = new AnnuaireError(
          `Annuaire injoignable : ${e instanceof Error ? e.message : String(e)}`,
          0,
          true,
        );
        await this.attendre(this.delaiRetour(tentative));
        continue;
      }

      if (reponse.status === 200) {
        return this.lirePage(reponse.body, page, taille, criteres);
      }

      const retryable = reponse.status === 429 || reponse.status >= 500;
      const message = this.messageErreur(reponse);
      derniereErreur = new AnnuaireError(message, reponse.status, retryable);
      if (!retryable) throw derniereErreur;
      await this.attendre(this.delaiRetour(tentative));
    }

    throw derniereErreur ?? new AnnuaireError("Échec inexpliqué", 0, false);
  }

  /** Attente croissante : 0,5 s, 1 s, 2 s, 4 s. */
  private delaiRetour(tentative: number): number {
    return 500 * 2 ** (tentative - 1);
  }

  private messageErreur(reponse: { status: number; body: unknown; text: string }): string {
    const corps = reponse.body as { erreur?: string } | null;
    const detail = corps?.erreur ?? reponse.text.slice(0, 200);
    return `Annuaire a répondu ${reponse.status} : ${detail}`;
  }

  private lirePage(
    body: unknown,
    page: number,
    parPage: number,
    criteres: AnnuaireCriteria,
  ): AnnuairePage {
    const data = body as
      | { results?: UniteLegale[]; total_results?: number; total_pages?: number }
      | null;

    const resultats = Array.isArray(data?.results) ? data!.results! : [];
    const total = typeof data?.total_results === "number" ? data.total_results : resultats.length;

    const entreprises: RawBusiness[] = [];
    const ecartes: Record<string, number> = {};

    for (const unite of resultats) {
      const converti = toRawBusiness(unite, {
        inclureEntrepreneursIndividuels: criteres.inclureEntrepreneursIndividuels,
        nafDemandes: criteres.naf,
      });
      if ("business" in converti) entreprises.push(converti.business);
      else ecartes[converti.ecarte] = (ecartes[converti.ecarte] ?? 0) + 1;
    }

    const dejaVus = page * parPage;
    const encore = resultats.length === parPage && dejaVus < total && (page + 1) * parPage <= PROFONDEUR_MAX;
    // L'API plafonne elle-meme `total_results` a 10 000 : un total qui atteint
    // ce plafond signifie « au moins autant », pas « exactement autant ». Le
    // territoire contient donc des entreprises que l'API ne servira jamais
    // pour cette requete — il doit etre subdivise, pas declare termine.
    const sature = total >= PROFONDEUR_MAX;

    return { entreprises, total, page, parPage, brut: resultats.length, ecartes, encore, sature };
  }

  /**
   * Parcourt les pages une par une, à partir de `pageDepart`.
   *
   * Générateur, donc à mémoire constante : la page N est libérée avant que la
   * N+1 n'arrive. Balayer un département ne coûte pas plus de mémoire qu'en
   * balayer une page.
   */
  async *iterate(
    criteres: AnnuaireCriteria,
    options: { pageDepart?: number; parPage?: number; maxPages?: number } = {},
  ): AsyncGenerator<AnnuairePage> {
    const parPage = Math.min(options.parPage ?? TAILLE_PAGE_MAX, TAILLE_PAGE_MAX);
    const maxPages = options.maxPages ?? Number.POSITIVE_INFINITY;
    let page = Math.max(options.pageDepart ?? 1, 1);
    let rendues = 0;

    for (;;) {
      if (rendues >= maxPages) return;
      if (page * parPage > PROFONDEUR_MAX) return;

      const resultat = await this.fetchPage(criteres, page, parPage);
      yield resultat;
      rendues += 1;

      if (!resultat.encore) return;
      page += 1;
      if (this.delaiEntrePagesMs > 0) await this.attendre(this.delaiEntrePagesMs);
    }
  }
}
