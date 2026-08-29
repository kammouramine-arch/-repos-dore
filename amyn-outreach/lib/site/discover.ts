// ---------------------------------------------------------------------------
// RECHERCHE DU SITE OFFICIEL D'UNE ENTREPRISE
//
// Le registre des entreprises ne publie pas de site web. Sans cette étape, la
// prospection nationale s'arrête net : pas de site, pas d'audit, pas de
// constat, donc pas d'email. C'était le goulot du pipeline.
//
// LA RÈGLE, ET ELLE NE SE NÉGOCIE PAS. Un domaine n'est enregistré comme site
// de l'entreprise que si son appartenance est PROUVÉE. Un domaine qui répond,
// qui porte le bon nom, qui « a l'air d'être le bon » ne suffit pas : c'est
// la description exacte du site d'un homonyme.
//
// POLITESSE. robots.txt est consulté avant toute page, le délai entre deux
// requêtes vers un même hôte est respecté, et l'agent s'identifie avec une
// adresse de contact. On sonde peu de candidats, et on s'arrête au premier
// confirmé.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { fetchPage, fetchRobots, isPathAllowed, normalizeUrl, type FetchStats } from "@/lib/audit/http";
import { parsePage, allLinks } from "@/lib/audit/html";
import type { FetchedPage } from "@/lib/audit/types";
import { candidatsDomaine } from "./candidates";
import { verifierAppartenance, type Preuve, type EntrepriseAVerifier } from "./verify";

export type SiteRecherche = {
  prospectId: string;
  nom: string;
  statut: "CONFIRMED" | "NOT_FOUND" | "UNCONFIRMED" | "PROVIDED";
  website: string | null;
  preuves: Preuve[];
  raison: string;
  /** Ce qui a été essayé, et pourquoi chaque candidat a été retenu ou non. */
  candidats: Array<{ domaine: string; issue: string }>;
  requetes: number;
};

/** Injectable : les tests ne touchent jamais le réseau. */
export type Recuperateur = (url: string, stats: FetchStats) => Promise<FetchedPage>;

export type OptionsRecherche = {
  recuperateur?: Recuperateur;
  /** Consulter robots.txt. Désactivable UNIQUEMENT en test. */
  verifierRobots?: boolean;
  maxCandidats?: number;
};

/**
 * Cherche et vérifie le site d'un prospect.
 *
 * Ne modifie la fiche que dans un sens : elle peut gagner un site prouvé,
 * jamais un site supposé.
 */
export async function discoverWebsite(
  prospectId: string,
  options: OptionsRecherche = {},
): Promise<SiteRecherche> {
  const recuperer = options.recuperateur ?? fetchPage;
  const controlerRobots = options.verifierRobots ?? true;

  const prospect = await prisma.prospect.findUnique({
    where: { id: prospectId },
    select: {
      id: true, name: true, website: true, websiteStatus: true,
      siret: true, siren: true, postalCode: true, city: true, phone: true,
    },
  });
  if (!prospect) throw new Error(`Prospect introuvable : ${prospectId}`);

  const stats: FetchStats = { requests: 0, bytes: 0 };
  const candidatsEssayes: SiteRecherche["candidats"] = [];

  // Un site déjà connu — publié par OpenStreetMap, Google Places, ou saisi à
  // la main — n'est pas une hypothèse : il vient d'une source. On le marque
  // comme tel plutôt que de le re-deviner.
  if (prospect.website) {
    if (prospect.websiteStatus === "UNKNOWN") {
      await prisma.prospect.update({
        where: { id: prospectId },
        data: { websiteStatus: "PROVIDED", websiteCheckedAt: new Date() },
      });
    }
    return {
      prospectId, nom: prospect.name, statut: "PROVIDED",
      website: prospect.website, preuves: [], candidats: [], requetes: 0,
      raison: "Site fourni par la source de découverte : aucune hypothèse à formuler.",
    };
  }

  const entreprise: EntrepriseAVerifier = {
    nom: prospect.name,
    siret: prospect.siret,
    siren: prospect.siren,
    postalCode: prospect.postalCode,
    city: prospect.city,
    phone: prospect.phone,
  };

  const candidats = candidatsDomaine(prospect.name, { maxCandidats: options.maxCandidats ?? 6 });

  if (candidats.length === 0) {
    return finir(prospectId, {
      prospectId, nom: prospect.name, statut: "NOT_FOUND", website: null,
      preuves: [], candidats: [], requetes: 0,
      raison:
        `« ${prospect.name} » ne produit aucun candidat exploitable : le nom est trop court ` +
        `ou trop générique pour désigner un domaine sans risque de confusion.`,
    });
  }

  for (const candidat of candidats) {
    const base = normalizeUrl(candidat.domaine);
    if (!base) {
      candidatsEssayes.push({ domaine: candidat.domaine, issue: "URL invalide" });
      continue;
    }

    // robots.txt AVANT toute page : c'est l'ordre correct, même pour une
    // seule requête. Un site qui refuse les robots refuse aussi le nôtre.
    if (controlerRobots) {
      const robots = await fetchRobots(new URL(base).origin, stats);
      if (!isPathAllowed(robots, base)) {
        candidatsEssayes.push({ domaine: candidat.domaine, issue: "robots.txt interdit l'exploration" });
        continue;
      }
    }

    const home = await recuperer(base, stats);
    if (!home.ok || !home.html) {
      candidatsEssayes.push({
        domaine: candidat.domaine,
        issue: String(home.errorCode ?? `HTTP ${home.status}`),
      });
      continue;
    }

    const parsed = parsePage(home);
    let texte = parsed.text;
    let verdict = verifierAppartenance(entreprise, texte);

    // Les identifiants légaux vivent dans les mentions légales, pas sur la
    // page d'accueil. Ne pas aller les lire ferait rejeter des sites qui
    // apportent pourtant la preuve la plus forte qui soit.
    if (verdict.statut !== "CONFIRMED") {
      const legales = allLinks(parsed)
        .filter((l) => /mentions?[-_ ]?l[ée]gales?|legal|cgv|contact/i.test(`${l.href} ${l.text}`))
        .map((l) => {
          try {
            return new URL(l.href, home.finalUrl).toString().split("#")[0];
          } catch {
            return null;
          }
        })
        .filter((u): u is string => !!u && u.startsWith("http"))
        .filter((u) => new URL(u).hostname === new URL(home.finalUrl).hostname)
        .slice(0, 2);

      for (const url of legales) {
        const page = await recuperer(url, stats);
        if (!page.ok || !page.html) continue;
        texte += ` ${parsePage(page).text}`;
      }
      verdict = verifierAppartenance(entreprise, texte);
    }

    if (verdict.statut === "CONFIRMED") {
      candidatsEssayes.push({ domaine: candidat.domaine, issue: "APPARTENANCE PROUVÉE" });
      return finir(prospectId, {
        prospectId, nom: prospect.name, statut: "CONFIRMED",
        website: home.finalUrl,
        preuves: verdict.preuves,
        raison: verdict.raison,
        candidats: candidatsEssayes,
        requetes: stats.requests,
      });
    }

    candidatsEssayes.push({ domaine: candidat.domaine, issue: verdict.raison });
  }

  // Un domaine a répondu sans prouver son appartenance : c'est différent de
  // « aucun site n'existe ». Le distinguer permet de savoir s'il faut chercher
  // autrement ou juger que l'entreprise n'a pas de présence en ligne.
  const aRepondu = candidatsEssayes.some((c) => String(c.issue).includes("Appartenance non prouvée"));

  return finir(prospectId, {
    prospectId, nom: prospect.name,
    statut: aRepondu ? "UNCONFIRMED" : "NOT_FOUND",
    website: null, preuves: [], candidats: candidatsEssayes, requetes: stats.requests,
    raison: aRepondu
      ? `${candidatsEssayes.length} domaine(s) testé(s) : un ou plusieurs répondent, aucun ne prouve appartenir à cette entreprise.`
      : `${candidatsEssayes.length} domaine(s) testé(s), aucun ne répond. L'entreprise n'a probablement pas de site.`,
  });
}

async function finir(prospectId: string, resultat: SiteRecherche): Promise<SiteRecherche> {
  await prisma.prospect.update({
    where: { id: prospectId },
    data: {
      websiteStatus: resultat.statut,
      // Le site n'est écrit QUE s'il est prouvé. C'est le seul chemin qui
      // renseigne ce champ à partir d'une hypothèse.
      ...(resultat.statut === "CONFIRMED" && resultat.website
        ? { website: resultat.website }
        : {}),
      websiteEvidence: JSON.stringify({
        raison: resultat.raison,
        preuves: resultat.preuves,
        candidats: resultat.candidats,
      }),
      websiteCheckedAt: new Date(),
    },
  });

  if (resultat.statut === "CONFIRMED" && resultat.website) {
    await prisma.source.create({
      data: {
        prospectId,
        kind: "WEBSITE",
        label: `Site vérifié : ${new URL(resultat.website).hostname}`,
        url: resultat.website,
        note: resultat.raison,
        rawData: JSON.stringify(resultat.preuves),
      },
    });
  }

  await logActivity({
    actor: "SYSTEM",
    module: "RESEARCH",
    action: "site.discover",
    entityType: "Prospect",
    entityId: prospectId,
    summary: `${resultat.nom} — ${resultat.statut} : ${resultat.raison}`,
    details: { candidats: resultat.candidats, requetes: resultat.requetes },
    level: resultat.statut === "CONFIRMED" ? "INFO" : "WARN",
  });

  return resultat;
}
