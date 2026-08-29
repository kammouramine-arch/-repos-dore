// ---------------------------------------------------------------------------
// VÉRIFICATION D'APPARTENANCE D'UN DOMAINE
//
// La question à laquelle ce module répond n'est pas « ce domaine répond-il ? »
// mais « ce site est-il celui de CETTE entreprise ? ». Les deux sont très
// différentes : boulangerie-dupont.fr existe sûrement, et appartient
// probablement à une autre boulangerie Dupont, dans une autre ville.
//
// Se tromper ici n'est pas une imprécision, c'est une faute : écrire à un
// commerçant pour commenter le site d'un homonyme détruit le message et la
// crédibilité d'AMYN en une phrase. Le doute conduit donc toujours au refus.
//
// HIÉRARCHIE DES PREUVES
//   1. SIREN ou SIRET sur la page — décisif. Ces numéros sont uniques et
//      figurent dans les mentions légales, que la loi impose.
//   2. Nom + adresse (code postal et commune) — un homonyme dans la même
//      commune, à la même adresse, n'est plus un homonyme.
//   3. Nom + téléphone — même raisonnement.
//
// Un nom seul ne prouve RIEN : c'est exactement le cas de l'homonyme.
// ---------------------------------------------------------------------------

import { motsSignifiants } from "./candidates";

export type PreuveKind = "SIREN" | "SIRET" | "CODE_POSTAL" | "COMMUNE" | "TELEPHONE" | "NOM";

export type Preuve = {
  kind: PreuveKind;
  /** Ce qui a été cherché. */
  valeur: string;
  /** L'extrait de page qui le contient — la preuve elle-même, relisible. */
  extrait: string;
};

export type VerdictSite =
  | { statut: "CONFIRMED"; preuves: Preuve[]; raison: string }
  | { statut: "UNCONFIRMED"; preuves: Preuve[]; raison: string };

export type EntrepriseAVerifier = {
  nom: string;
  siret?: string | null;
  siren?: string | null;
  postalCode?: string | null;
  city?: string | null;
  phone?: string | null;
};

/** Normalise un texte de page pour la recherche : accents et espaces neutralisés. */
export function normaliserTexte(texte: string): string {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

/** Ne garde que les chiffres — les numéros s'écrivent de dix façons. */
function chiffres(v: string): string {
  return v.replace(/\D/g, "");
}

function extraitAutour(texte: string, index: number, longueur: number): string {
  const debut = Math.max(0, index - 40);
  const fin = Math.min(texte.length, index + longueur + 40);
  return `…${texte.slice(debut, fin).trim()}…`;
}

/**
 * Un domaine « à vendre » ou en parking n'est le site de personne.
 * Le reconnaître évite de compter une page d'annonce comme une présence en
 * ligne, ce qui fausserait ensuite tout l'audit.
 */
const PARKING = [
  "ce domaine est a vendre",
  "this domain is for sale",
  "domain for sale",
  "acheter ce domaine",
  "buy this domain",
  "parked domain",
  "domaine parque",
  "site en construction",
  "under construction",
  "coming soon",
  "page par defaut",
  "default web page",
  "apache2 ubuntu default",
  "nginx welcome",
  "welcome to nginx",
  "index of /",
];

export function estUnParking(texteNormalise: string): string | null {
  const debut = texteNormalise.slice(0, 3000);
  return PARKING.find((m) => debut.includes(m)) ?? null;
}

/**
 * Le site appartient-il à l'entreprise ?
 *
 * `texte` est le contenu textuel des pages consultées (accueil + mentions
 * légales), concaténé.
 */
export function verifierAppartenance(
  entreprise: EntrepriseAVerifier,
  texte: string,
): VerdictSite {
  const t = normaliserTexte(texte);
  const preuves: Preuve[] = [];

  const parking = estUnParking(t);
  if (parking) {
    return {
      statut: "UNCONFIRMED",
      preuves: [],
      raison: `Domaine sans site réel (« ${parking} ») : ce n'est le site de personne.`,
    };
  }

  // Les numéros écrits sur les pages le sont avec espaces, points ou tirets.
  // On compare donc chiffre à chiffre, sur une version du texte réduite aux
  // chiffres, en gardant l'index pour pouvoir citer l'extrait d'origine.
  const chiffresTexte = chiffres(t);

  // --- 1. Identifiants légaux : décisifs ---------------------------------
  const siret = entreprise.siret ? chiffres(entreprise.siret) : "";
  if (siret.length === 14 && chiffresTexte.includes(siret)) {
    const i = t.indexOf(siret.slice(0, 3));
    preuves.push({ kind: "SIRET", valeur: siret, extrait: extraitAutour(t, Math.max(i, 0), 20) });
  }

  const siren = entreprise.siren ? chiffres(entreprise.siren) : siret.slice(0, 9);
  if (siren.length === 9 && chiffresTexte.includes(siren)) {
    const i = t.indexOf(siren.slice(0, 3));
    preuves.push({ kind: "SIREN", valeur: siren, extrait: extraitAutour(t, Math.max(i, 0), 15) });
  }

  const identifiantTrouve = preuves.some((p) => p.kind === "SIREN" || p.kind === "SIRET");

  // --- 2. Nom de l'entreprise -------------------------------------------
  const mots = motsSignifiants(entreprise.nom);
  const motsPresents = mots.filter((m) => m.length >= 4 && t.includes(m));
  // Il faut retrouver l'essentiel du nom, pas un mot au hasard : « boulangerie »
  // seul apparaît sur la moitié des sites de boulangerie de France.
  const nomTrouve = mots.length > 0 && motsPresents.length >= Math.max(1, Math.ceil(mots.length / 2))
    && motsPresents.join("").length >= 5;
  if (nomTrouve) {
    const i = t.indexOf(motsPresents[0]);
    preuves.push({
      kind: "NOM",
      valeur: motsPresents.join(" "),
      extrait: extraitAutour(t, Math.max(i, 0), 30),
    });
  }

  // --- 3. Localisation ---------------------------------------------------
  if (entreprise.postalCode && t.includes(entreprise.postalCode.toLowerCase())) {
    const i = t.indexOf(entreprise.postalCode.toLowerCase());
    preuves.push({
      kind: "CODE_POSTAL",
      valeur: entreprise.postalCode,
      extrait: extraitAutour(t, i, entreprise.postalCode.length),
    });
  }

  const commune = entreprise.city ? normaliserTexte(entreprise.city) : "";
  if (commune.length >= 3 && t.includes(commune)) {
    const i = t.indexOf(commune);
    preuves.push({ kind: "COMMUNE", valeur: entreprise.city!, extrait: extraitAutour(t, i, commune.length) });
  }

  // --- 4. Téléphone ------------------------------------------------------
  const tel = entreprise.phone ? chiffres(entreprise.phone) : "";
  // Un numéro français significatif : au moins 9 chiffres après l'indicatif.
  const telLocal = tel.startsWith("33") ? `0${tel.slice(2)}` : tel;
  if (telLocal.length >= 9 && chiffresTexte.includes(telLocal)) {
    preuves.push({ kind: "TELEPHONE", valeur: telLocal, extrait: "numéro présent sur la page" });
  }

  const adresseTrouvee = preuves.some((p) => p.kind === "CODE_POSTAL" || p.kind === "COMMUNE");
  const telTrouve = preuves.some((p) => p.kind === "TELEPHONE");
  const codePostalTrouve = preuves.some((p) => p.kind === "CODE_POSTAL");

  // --- Verdict -----------------------------------------------------------
  if (identifiantTrouve) {
    return {
      statut: "CONFIRMED",
      preuves,
      raison: "Identifiant légal (SIREN/SIRET) de l'entreprise présent sur le site.",
    };
  }

  // Le nom seul ne suffit jamais : c'est précisément la signature d'un
  // homonyme. Il lui faut un second point d'ancrage, propre à CET
  // établissement — son adresse ou son téléphone.
  if (nomTrouve && codePostalTrouve) {
    return {
      statut: "CONFIRMED",
      preuves,
      raison: "Nom de l'entreprise et code postal de l'établissement présents sur le site.",
    };
  }
  if (nomTrouve && telTrouve) {
    return {
      statut: "CONFIRMED",
      preuves,
      raison: "Nom de l'entreprise et numéro de téléphone de l'établissement présents sur le site.",
    };
  }

  const manque = !nomTrouve
    ? "le nom de l'entreprise n'apparaît pas"
    : adresseTrouvee
      ? "seule la commune correspond, ce qui ne distingue pas un homonyme du même quartier"
      : "aucune adresse ni téléphone ne corrobore le nom";

  return {
    statut: "UNCONFIRMED",
    preuves,
    raison: `Appartenance non prouvée : ${manque}.`,
  };
}
