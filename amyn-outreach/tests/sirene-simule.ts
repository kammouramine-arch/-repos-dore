// ---------------------------------------------------------------------------
// API SIRENE SIMULÉE
//
// Rejoue la pagination par curseur, les erreurs et les formes de réponse
// réelles — sans réseau et sans clé API. Toute la logique du client est donc
// vérifiable en test.
// ---------------------------------------------------------------------------

import type { SireneTransport } from "@/lib/research/sirene/client";

export type EtablissementSimule = {
  siret: string;
  denomination?: string | null;
  nom?: string | null;
  prenom?: string | null;
  enseigne?: string | null;
  naf?: string;
  codeCommune?: string;
  libelleCommune?: string;
  codePostal?: string;
  statutDiffusion?: "O" | "N" | "P";
  etat?: "A" | "F";
};

/** Fabrique un établissement au format réel de l'API. */
export function etablissement(e: EtablissementSimule) {
  return {
    siret: e.siret,
    etatAdministratifEtablissement: e.etat ?? "A",
    denominationUsuelleEtablissement: null,
    uniteLegale: {
      denominationUniteLegale: e.denomination ?? null,
      nomUniteLegale: e.nom ?? null,
      nomUsageUniteLegale: null,
      prenom1UniteLegale: e.prenom ?? null,
      activitePrincipaleUniteLegale: e.naf ?? "56.10A",
      categorieJuridiqueUniteLegale: e.denomination ? "5710" : "1000",
      trancheEffectifsUniteLegale: "03",
      statutDiffusionUniteLegale: e.statutDiffusion ?? "O",
      dateCreationUniteLegale: "2015-06-01",
    },
    adresseEtablissement: {
      numeroVoieEtablissement: "12",
      typeVoieEtablissement: "RUE",
      libelleVoieEtablissement: "DE LA PAIX",
      codeCommuneEtablissement: e.codeCommune ?? "59350",
      libelleCommuneEtablissement: e.libelleCommune ?? "LILLE",
      codePostalEtablissement: e.codePostal ?? "59000",
    },
    periodesEtablissement: [{ enseigne1Etablissement: e.enseigne ?? null }],
  };
}

export type OptionsSimulation = {
  /** Tous les établissements du registre simulé. */
  registre: EtablissementSimule[];
  /** Statuts à renvoyer avant de servir normalement (pour tester les reprises). */
  echecs?: number[];
  /** Lever une exception réseau sur les N premiers appels. */
  pannesReseau?: number;
};

/** Ce que le transport simulé a observé — pour vérifier les requêtes émises. */
export type JournalSimulation = {
  urls: string[];
  curseurs: string[];
  requetes: string[];
  appels: number;
};

/**
 * Transport simulé.
 *
 * Découpe le registre en pages, rend un `curseurSuivant` cohérent, et répète
 * le curseur reçu sur la dernière page — exactement comme l'API réelle signale
 * la fin.
 */
export function transportSimule(
  options: OptionsSimulation,
): { transport: SireneTransport; journal: JournalSimulation } {
  const journal: JournalSimulation = { urls: [], curseurs: [], requetes: [], appels: 0 };
  const echecs = [...(options.echecs ?? [])];
  let pannesRestantes = options.pannesReseau ?? 0;

  const transport: SireneTransport = async (url) => {
    journal.appels += 1;
    journal.urls.push(url);

    const params = new URL(url).searchParams;
    const curseur = params.get("curseur") ?? "*";
    const nombre = Number.parseInt(params.get("nombre") ?? "100", 10);
    journal.curseurs.push(curseur);
    journal.requetes.push(params.get("q") ?? "");

    if (pannesRestantes > 0) {
      pannesRestantes -= 1;
      throw new Error("ECONNRESET simulé");
    }

    const statut = echecs.shift();
    if (statut !== undefined) {
      return { status: statut, body: null, text: `erreur simulée ${statut}` };
    }

    // Le curseur encode simplement la position dans le registre.
    const debut = curseur === "*" ? 0 : Number.parseInt(curseur, 10);
    const tranche = options.registre.slice(debut, debut + nombre);
    const suivant = debut + tranche.length;
    const fini = suivant >= options.registre.length;

    const body = {
      header: {
        statut: 200,
        total: options.registre.length,
        curseur,
        // Sur la dernière page, l'API répète le curseur reçu.
        curseurSuivant: fini ? curseur : String(suivant),
      },
      etablissements: tranche.map(etablissement),
    };

    return { status: 200, body, text: JSON.stringify(body) };
  };

  return { transport, journal };
}

/** Registre de N restaurants lillois, pour les tests de volume. */
export function registreTest(n: number, prefixe = "RESTAURANT"): EtablissementSimule[] {
  return Array.from({ length: n }, (_, i) => ({
    siret: String(10000000000000 + i),
    denomination: `${prefixe} ${i + 1}`,
    naf: "56.10A",
    codeCommune: "59350",
    libelleCommune: "LILLE",
    codePostal: "59000",
  }));
}
