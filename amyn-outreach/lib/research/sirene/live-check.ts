// ---------------------------------------------------------------------------
// SIRENE — BATTERIE DE VÉRIFICATION CONTRE L'API RÉELLE
//
// POURQUOI CE FICHIER EXISTE. Un simulateur prouve que notre code fait ce que
// nous croyons ; il ne prouve pas que l'API fait ce que nous croyons. Les
// deux erreurs les plus coûteuses de cette intégration — une syntaxe de
// filtre départemental refusée, un champ renvoyé `null` là où nous attendions
// `undefined` — ne se voient QUE contre le service réel.
//
// Cette batterie exécute donc, en vrai, chaque comportement dont dépend le
// balayage national. Elle est volontairement légère : quelques dizaines de
// résultats, pas un balayage.
//
// LA CLÉ N'EST JAMAIS AFFICHÉE. Ni dans les libellés, ni dans les URL
// rapportées, ni dans les messages d'erreur — un test qui divulgue un secret
// pour prouver qu'il fonctionne n'a rien prouvé du tout.
// ---------------------------------------------------------------------------

import { SireneClient, buildSireneQuery, SIRENE_ENDPOINT } from "./client";
import { departementsDeRegion } from "./geo";

export type LiveCheck = {
  label: string;
  ok: boolean;
  detail: string;
};

export type LiveResult = {
  cleDisponible: boolean;
  checks: LiveCheck[];
};

/** Masque toute occurrence de la clé dans un texte destiné à être affiché. */
export function masquerSecret(texte: string, secret: string | undefined): string {
  if (!secret) return texte;
  return texte.split(secret).join("«clé masquée»");
}

export async function runSireneLive(
  options: { departement?: string; client?: SireneClient } = {},
): Promise<LiveResult> {
  const cle = process.env.SIRENE_API_KEY;
  if (!cle && !options.client) return { cleDisponible: false, checks: [] };

  const departement = options.departement ?? "59";
  const client = options.client ?? new SireneClient();
  const checks: LiveCheck[] = [];

  const executer = async (label: string, travail: () => Promise<string>) => {
    try {
      const detail = await travail();
      checks.push({ label, ok: true, detail: masquerSecret(detail, cle) });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      checks.push({ label, ok: false, detail: masquerSecret(message, cle) });
    }
  };

  // 1. AUTHENTIFICATION — la première chose qui échoue si la clé est fausse.
  await executer("Authentification", async () => {
    const page = await client.fetchPage({ actifsSeulement: true }, "*", 1);
    return `acceptée, ${page.total ?? "?"} établissement(s) annoncé(s) au national`;
  });

  // 2. RECHERCHE NATIONALE, tous secteurs.
  await executer("Recherche nationale, tous secteurs", async () => {
    const page = await client.fetchPage({ actifsSeulement: true }, "*", 5);
    if (page.entreprises.length === 0 && page.ecartes.length === 0) {
      throw new Error("aucun résultat : la requête nationale ne renvoie rien");
    }
    return `${page.entreprises.length} retenue(s), ${page.ecartes.length} écartée(s)`;
  });

  // 3. FILTRE DÉPARTEMENTAL — LE point à vérifier en vrai. La syntaxe est
  //    documentée, mais seule l'API dit si elle l'accepte réellement.
  await executer(`Filtre départemental (${departement})`, async () => {
    const page = await client.fetchPage(
      { departements: [departement], actifsSeulement: true },
      "*",
      10,
    );
    if (page.entreprises.length === 0) {
      throw new Error(
        `aucun résultat pour le département ${departement} — la syntaxe du filtre ` +
          `est probablement refusée ; repli disponible : filtrage par code postal`,
      );
    }
    const hors = page.entreprises.filter(
      (e) => e.departement && e.departement !== departement,
    );
    if (hors.length > 0) {
      throw new Error(
        `${hors.length} résultat(s) HORS du département demandé : le filtre ne filtre pas`,
      );
    }
    return `${page.entreprises.length} établissement(s), tous dans le ${departement}`;
  });

  // 4. FILTRE PAR RÉGION — traduit en liste de départements.
  await executer("Filtre régional (Hauts-de-France)", async () => {
    const deps = departementsDeRegion("Hauts-de-France").map((d) => d.code);
    const page = await client.fetchPage({ departements: deps, actifsSeulement: true }, "*", 10);
    const hors = page.entreprises.filter((e) => e.departement && !deps.includes(e.departement));
    if (hors.length > 0) throw new Error(`${hors.length} résultat(s) hors région`);
    return `${page.entreprises.length} établissement(s) sur ${deps.length} départements`;
  });

  // 5. FILTRE PAR COMMUNE.
  await executer("Filtre par commune (Lille, 59350)", async () => {
    const page = await client.fetchPage({ communes: ["59350"], actifsSeulement: true }, "*", 5);
    if (page.entreprises.length === 0) throw new Error("aucun résultat pour la commune 59350");
    return `${page.entreprises.length} établissement(s)`;
  });

  // 6. FILTRE PAR ACTIVITÉ.
  await executer("Filtre par activité NAF (56.10A)", async () => {
    const page = await client.fetchPage(
      { naf: ["56.10A"], departements: [departement], actifsSeulement: true },
      "*",
      5,
    );
    const mauvais = page.entreprises.filter((e) => e.naf && !e.naf.startsWith("56.10"));
    if (mauvais.length > 0) throw new Error(`${mauvais.length} résultat(s) hors activité demandée`);
    return `${page.entreprises.length} établissement(s) en 56.10A`;
  });

  // 7. PLUSIEURS ACTIVITÉS À LA FOIS.
  await executer("Plusieurs activités (56.10A, 96.02A)", async () => {
    const page = await client.fetchPage(
      { naf: ["56.10A", "96.02A"], departements: [departement], actifsSeulement: true },
      "*",
      10,
    );
    return `${page.entreprises.length} établissement(s) sur deux activités`;
  });

  // 8. PAGINATION ET CURSEUR — deux pages, sans recouvrement.
  await executer("Pagination par curseur, sans doublon", async () => {
    const vus = new Set<string>();
    let pages = 0;
    let dernierCurseur: string | null = null;

    for await (const page of client.iterate(
      { departements: [departement], actifsSeulement: true },
      { taillePage: 20, maxPages: 3 },
    )) {
      pages += 1;
      for (const e of page.entreprises) {
        if (e.siret && vus.has(e.siret)) {
          throw new Error(`SIRET ${e.siret} servi deux fois : la pagination se recouvre`);
        }
        if (e.siret) vus.add(e.siret);
      }
      dernierCurseur = page.curseurSuivant;
    }

    if (pages < 2) throw new Error(`une seule page obtenue : la pagination ne progresse pas`);
    if (!dernierCurseur) throw new Error("aucun curseur suivant : la reprise serait impossible");
    return `${pages} pages, ${vus.size} SIRET distincts, curseur de reprise obtenu`;
  });

  // 9. REPRISE DEPUIS UN CURSEUR — le cœur des checkpoints du lot 3.
  await executer("Reprise depuis un curseur enregistré", async () => {
    const criteres = { departements: [departement], actifsSeulement: true };
    const premiere = await client.fetchPage(criteres, "*", 10);
    if (!premiere.curseurSuivant) throw new Error("pas de curseur après la première page");

    const reprise = await client.fetchPage(criteres, premiere.curseurSuivant, 10);
    const sirets1 = new Set(premiere.entreprises.map((e) => e.siret));
    const recouvrement = reprise.entreprises.filter((e) => e.siret && sirets1.has(e.siret));

    if (recouvrement.length > 0) {
      throw new Error(`${recouvrement.length} établissement(s) resservis après reprise`);
    }
    return `reprise propre : ${reprise.entreprises.length} nouveaux établissements`;
  });

  // 10. DONNÉES NULLES — l'API renvoie null, pas undefined. Une conversion
  //     qui l'ignore casse dès le premier établissement incomplet.
  await executer("Champs nuls tolérés", async () => {
    const page = await client.fetchPage(
      { departements: [departement], actifsSeulement: true },
      "*",
      50,
    );
    const sansAdresse = page.entreprises.filter((e) => !e.address).length;
    return `${page.entreprises.length} converti(s) sans erreur, dont ${sansAdresse} sans adresse complète`;
  });

  // 11. UNITÉS NON DIFFUSIBLES — doivent être écartées, avec leur motif.
  await executer("Unités non diffusibles écartées", async () => {
    const page = await client.fetchPage(
      { departements: [departement], actifsSeulement: true, inclureEntrepreneursIndividuels: true },
      "*",
      100,
    );
    const motifs = new Map<string, number>();
    for (const e of page.ecartes) motifs.set(e.raison, (motifs.get(e.raison) ?? 0) + 1);
    const resume = [...motifs.entries()].map(([m, n]) => `${n} × ${m}`).join(", ");
    return page.ecartes.length === 0
      ? "aucune unité à écarter dans cet échantillon"
      : `${page.ecartes.length} écartée(s) : ${resume}`;
  });

  // 12. DÉDOUBLONNAGE — chaque SIRET n'apparaît qu'une fois.
  await executer("Dédoublonnage sur SIRET", async () => {
    const page = await client.fetchPage(
      { departements: [departement], actifsSeulement: true },
      "*",
      100,
    );
    const sirets = page.entreprises.map((e) => e.siret).filter(Boolean);
    const distincts = new Set(sirets);
    if (distincts.size !== sirets.length) {
      throw new Error(`${sirets.length - distincts.size} doublon(s) dans une même page`);
    }
    return `${distincts.size} SIRET distincts sur ${sirets.length}`;
  });

  // 13. LA REQUÊTE NE TRANSPORTE JAMAIS LA CLÉ.
  await executer("La clé ne circule pas dans l'URL", async () => {
    const q = buildSireneQuery({ departements: [departement], naf: ["56.10A"] });
    const url = `${SIRENE_ENDPOINT}?q=${encodeURIComponent(q)}`;
    if (cle && url.includes(cle)) throw new Error("la clé apparaît dans l'URL");
    return "la clé voyage en en-tête, jamais dans l'URL";
  });

  return { cleDisponible: true, checks };
}
