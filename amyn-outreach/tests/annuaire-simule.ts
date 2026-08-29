// ---------------------------------------------------------------------------
// ANNUAIRE DES ENTREPRISES SIMULÉ
//
// Rejoue la pagination par rang, les plafonds réels et les formes de réponse
// observées sur l'API publique — sans réseau.
//
// LA FIDÉLITÉ DU SIMULATEUR EST LE POINT. Un simulateur trop poli valide du
// code qui casserait en production : c'est en renvoyant `null` là où l'API
// renvoie `null`, et en refusant ce que l'API refuse, qu'il attrape les vraies
// erreurs. Les limites reproduites ici — 25 par page, produit page × per_page
// plafonné à 10 000, message d'erreur 400 — ont été mesurées contre le
// service réel, pas supposées.
// ---------------------------------------------------------------------------

import type { AnnuaireTransport } from "@/lib/research/annuaire/client";

export type UniteSimulee = {
  siren: string;
  siret: string;
  nom: string;
  naf?: string;
  departement?: string;
  commune?: string;
  libelleCommune?: string;
  codePostal?: string;
  /** O = diffusible. N ou P = à ne pas exploiter. */
  statutDiffusion?: "O" | "N" | "P";
  /** 1000 = entrepreneur individuel (personne physique). */
  natureJuridique?: string;
  enseignes?: string[] | null;
  adresse?: string | null;
  /**
   * Activite de l'ETABLISSEMENT, quand elle differe de celle de l'unite.
   *
   * Ce n'est pas un raffinement theorique : l'API filtre sur l'activite de
   * l'unite legale, si bien qu'un groupe classe « restauration » peut n'avoir
   * dans le departement qu'un entrepot. Le simulateur doit savoir reproduire
   * ce cas, sinon il valide un code qui echouerait en production.
   */
  nafEtablissement?: string;
  /** Etablissements supplementaires, pour tester le choix parmi plusieurs. */
  autresEtablissements?: Array<{ siret: string; naf?: string; departement?: string; codePostal?: string }>;
};

/**
 * Un établissement au format de l'API.
 *
 * Tous les champs textuels sont déclarés nullables, parce que l'API renvoie
 * bel et bien `null` — et non `undefined`, ni une chaîne vide. Un simulateur
 * qui promettrait des chaînes garantirait un code qui casse en production.
 */
type EtablissementSimu = {
  siret: string;
  adresse: string | null;
  code_postal: string | null;
  commune: string | null;
  libelle_commune: string | null;
  departement: string | null;
  region: string | null;
  activite_principale: string | null;
  etat_administratif: string | null;
  statut_diffusion_etablissement: string | null;
  est_siege: boolean;
  liste_enseignes: string[] | null;
  complement_adresse: string | null;
  cedex: string | null;
  nom_commercial: string | null;
};

/** Fabrique une unité légale au format réel de l'API. */
export function unite(u: UniteSimulee) {
  const etablissement: EtablissementSimu = {
    siret: u.siret,
    // L'API renvoie `null`, pas `undefined`, pour tout champ vide.
    adresse: u.adresse === undefined ? `12 RUE DE LA PAIX ${u.codePostal ?? "59000"} ${u.libelleCommune ?? "LILLE"}` : u.adresse,
    code_postal: u.codePostal ?? "59000",
    commune: u.commune ?? "59350",
    libelle_commune: u.libelleCommune ?? "LILLE",
    departement: u.departement ?? "59",
    region: "32",
    activite_principale: u.nafEtablissement ?? u.naf ?? "56.10A",
    etat_administratif: "A",
    statut_diffusion_etablissement: u.statutDiffusion ?? "O",
    est_siege: true,
    liste_enseignes: u.enseignes ?? null,
    complement_adresse: null,
    cedex: null,
    nom_commercial: null,
  };

  return {
    siren: u.siren,
    nom_complet: u.nom,
    nom_raison_sociale: u.nom,
    sigle: null,
    nombre_etablissements: 1,
    nombre_etablissements_ouverts: 1,
    nature_juridique: u.natureJuridique ?? "5710",
    activite_principale: u.naf ?? "56.10A",
    etat_administratif: "A",
    statut_diffusion: u.statutDiffusion ?? "O",
    tranche_effectif_salarie: "03",
    date_creation: "2015-06-01",
    siege: etablissement,
    matching_etablissements: [
      ...(u.autresEtablissements ?? []).map((e) => ({
        ...etablissement,
        siret: e.siret,
        activite_principale: e.naf ?? etablissement.activite_principale,
        departement: e.departement ?? etablissement.departement,
        code_postal: e.codePostal ?? etablissement.code_postal,
      })),
      etablissement,
    ],
    complements: null,
  };
}

export type OptionsAnnuaire = {
  registre: UniteSimulee[];
  /** Statuts HTTP à renvoyer avant de servir normalement. */
  echecs?: number[];
  /** Lever une exception réseau sur les N premiers appels. */
  pannesReseau?: number;
  /** Forcer le total annoncé, pour simuler un territoire saturé. */
  totalForce?: number;
};

export type SimulationAnnuaire = {
  transport: AnnuaireTransport;
  /** Les URL demandées, dans l'ordre. Permet d'auditer ce qui a été appelé. */
  appels: string[];
};

const PROFONDEUR_MAX = 10_000;

export function annuaireSimule(options: OptionsAnnuaire): SimulationAnnuaire {
  const appels: string[] = [];
  const echecs = [...(options.echecs ?? [])];
  let pannesRestantes = options.pannesReseau ?? 0;

  const transport: AnnuaireTransport = async (url) => {
    appels.push(url);

    if (pannesRestantes > 0) {
      pannesRestantes -= 1;
      throw new Error("ECONNRESET");
    }

    const statut = echecs.shift();
    if (statut !== undefined) {
      const corps = { erreur: `Erreur simulée ${statut}` };
      return { status: statut, body: corps, text: JSON.stringify(corps) };
    }

    const params = new URL(url).searchParams;
    const page = Number(params.get("page") ?? 1);
    const parPage = Number(params.get("per_page") ?? 10);

    // Le refus réel de l'API au-delà de 10 000 résultats.
    if (page * parPage > PROFONDEUR_MAX) {
      const corps = {
        erreur:
          "Le nombre total de résultats est restreint à 10 000. Pour garantir cela, " +
          "le produit du numéro de page et du nombre de résultats par page doit être inférieur à 10 000.",
      };
      return { status: 400, body: corps, text: JSON.stringify(corps) };
    }
    if (parPage < 1 || parPage > 25) {
      const corps = { erreur: "Veuillez indiquer un paramètre `per_page` entre `1` et `25`." };
      return { status: 400, body: corps, text: JSON.stringify(corps) };
    }

    // Filtrage, à l'image de ce que fait le service.
    const naf = params.get("activite_principale")?.split(",").filter(Boolean) ?? [];
    const departements = params.get("departement")?.split(",").filter(Boolean) ?? [];
    const communes = params.get("code_commune")?.split(",").filter(Boolean) ?? [];
    const codesPostaux = params.get("code_postal")?.split(",").filter(Boolean) ?? [];

    let selection = options.registre;
    if (naf.length > 0) {
      selection = selection.filter((u) =>
        naf.some((n) => (u.naf ?? "56.10A").startsWith(n)),
      );
    }
    if (departements.length > 0) {
      selection = selection.filter((u) => departements.includes(u.departement ?? "59"));
    }
    if (communes.length > 0) {
      selection = selection.filter((u) => communes.includes(u.commune ?? "59350"));
    }
    if (codesPostaux.length > 0) {
      selection = selection.filter((u) => codesPostaux.includes(u.codePostal ?? "59000"));
    }

    const debut = (page - 1) * parPage;
    const tranche = selection.slice(debut, debut + parPage);

    const corps = {
      results: tranche.map(unite),
      total_results: options.totalForce ?? selection.length,
      page,
      per_page: parPage,
      total_pages: Math.ceil((options.totalForce ?? selection.length) / parPage),
    };

    return { status: 200, body: corps, text: JSON.stringify(corps) };
  };

  return { transport, appels };
}

/** Un registre de n unités distinctes, pour les tests de volume. */
export function registreTest(n: number, prefixe = ""): UniteSimulee[] {
  return Array.from({ length: n }, (_, i) => {
    const rang = String(i + 1).padStart(6, "0");
    return {
      siren: `${prefixe}${rang}`.slice(-9).padStart(9, "1"),
      siret: `${prefixe}${rang}`.slice(-14).padStart(14, "1"),
      nom: `Entreprise ${prefixe}${rang}`,
      codePostal: `59${String(i % 1000).padStart(3, "0")}`,
    };
  });
}
