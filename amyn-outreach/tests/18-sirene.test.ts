// ---------------------------------------------------------------------------
// LOT 2 — SIRENE, SOCLE NATIONAL
//
// Toute la logique est vérifiée sans réseau ni clé API, via un transport
// simulé qui rejoue la pagination par curseur et les erreurs réelles.
// ---------------------------------------------------------------------------

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  SireneClient, SireneError, buildSireneQuery, toRawBusiness,
  TAILLE_PAGE_MAX, SIRENE_ENDPOINT,
} from "@/lib/research/sirene/client";
import { SireneSource, criteresDepuisDemande } from "@/lib/research/sirene";
import {
  DEPARTEMENTS, regions, departementDeCommune, departementsDeRegion, resolveZone,
} from "@/lib/research/sirene/geo";
import { transportSimule, registreTest, etablissement } from "./sirene-simule";

const clientSimule = (options: Parameters<typeof transportSimule>[0], reglages = {}) => {
  const { transport, journal } = transportSimule(options);
  return {
    client: new SireneClient({ transport, attenteBaseMs: 1, attenteEntrePagesMs: 0, ...reglages }),
    journal,
  };
};

// === GÉOGRAPHIE =============================================================

describe("Géographie française", () => {
  test("les 101 départements et 18 régions sont présents", () => {
    assert.equal(DEPARTEMENTS.length, 101);
    assert.equal(regions().length, 18);
  });

  test("les codes de département sont uniques", () => {
    const codes = DEPARTEMENTS.map((d) => d.code);
    assert.equal(new Set(codes).size, codes.length);
  });

  test("le département se déduit du code commune, Corse et DOM compris", () => {
    assert.equal(departementDeCommune("59350")?.nom, "Nord");
    assert.equal(departementDeCommune("75056")?.nom, "Paris");
    assert.equal(departementDeCommune("2A004")?.nom, "Corse-du-Sud");
    assert.equal(departementDeCommune("2B033")?.nom, "Haute-Corse");
    assert.equal(departementDeCommune("97411")?.nom, "La Réunion");
    assert.equal(departementDeCommune("97209")?.nom, "Martinique");
  });

  test("un code commune absurde ne produit pas de département inventé", () => {
    assert.equal(departementDeCommune("99999"), null);
    assert.equal(departementDeCommune(""), null);
    assert.equal(departementDeCommune(null), null);
  });

  test("une zone s'exprime par code, par nom de département ou par région", () => {
    assert.equal(resolveZone("59").kind, "DEPARTEMENT");
    assert.equal(resolveZone("Nord").departements[0].code, "59");
    assert.equal(resolveZone("Hauts-de-France").kind, "REGION");
    assert.equal(resolveZone("Hauts-de-France").departements.length, 5);
    assert.equal(resolveZone("Île-de-France").departements.length, 8);
    assert.equal(resolveZone("Bretagne").departements.length, 4);
  });

  test("une zone inconnue est signalée, pas devinée", () => {
    const z = resolveZone("Atlantide");
    assert.equal(z.kind, "UNKNOWN");
    assert.equal(z.departements.length, 0);
  });

  test("chaque département appartient à une région existante", () => {
    for (const d of DEPARTEMENTS) {
      assert.ok(departementsDeRegion(d.region).some((x) => x.code === d.code), d.code);
    }
  });
});

// === CONSTRUCTION DE REQUÊTE ================================================

describe("Construction de la requête Sirene", () => {
  test("sans critère, la requête reste valide et borne aux actifs", () => {
    assert.equal(buildSireneQuery({}), "etatAdministratifEtablissement:A");
  });

  test("un préfixe NAF devient un joker, un code complet reste littéral", () => {
    const q = buildSireneQuery({ naf: ["56", "43.22A"] });
    assert.match(q, /activitePrincipaleUniteLegale:56\*/);
    assert.match(q, /activitePrincipaleUniteLegale:"43\.22A"/);
    assert.match(q, / OR /, "plusieurs NAF doivent se combiner en OU");
  });

  test("plusieurs critères se combinent en ET", () => {
    const q = buildSireneQuery({ naf: ["56"], departements: ["59"] });
    assert.match(q, / AND /);
    assert.match(q, /codeCommuneEtablissement:59\*/);
  });

  test("tous secteurs confondus : aucun filtre d'activité", () => {
    const q = buildSireneQuery({ departements: ["75"] });
    assert.ok(!q.includes("activitePrincipale"), q);
    assert.match(q, /codeCommuneEtablissement:75\*/);
  });

  test("les guillemets et antislashs sont neutralisés", () => {
    const q = buildSireneQuery({ ville: 'LIL"LE\\' });
    assert.ok(!q.includes('\\'), q);
    assert.equal((q.match(/"/g) ?? []).length % 2, 0, "guillemets déséquilibrés");
  });

  test("un code postal avec joker est conservé tel quel", () => {
    assert.match(buildSireneQuery({ codesPostaux: ["59*"] }), /codePostalEtablissement:59\*/);
    assert.match(buildSireneQuery({ codesPostaux: ["59000"] }), /codePostalEtablissement:"59000"/);
  });

  test("BUG · demander les établissements fermés ne doit pas être écrasé en silence", () => {
    // Le repli « aucun critère » imposait « actifs seulement », contredisant
    // sans un mot une demande explicite d'inclure les fermés.
    const seul = buildSireneQuery({ actifsSeulement: false });
    assert.ok(/etatAdministratifEtablissement:F/.test(seul), `état fermé absent : ${seul}`);
    assert.ok(/ OR /.test(seul), "la requête doit couvrir les deux états");

    // Avec un autre critère, aucune restriction d'état ne doit être ajoutée.
    const avecNaf = buildSireneQuery({ actifsSeulement: false, naf: ["56"] });
    assert.ok(!avecNaf.includes("etatAdministratif"), avecNaf);

    // Par défaut, on reste sur les actifs.
    assert.equal(buildSireneQuery({}), "etatAdministratifEtablissement:A");
  });
});

// === CONVERSION =============================================================

describe("Conversion d'un établissement", () => {
  test("une société devient un prospect complet", () => {
    const r = toRawBusiness(
      etablissement({ siret: "12345678900011", denomination: "LE BISTROT DU NORD", naf: "56.10A" }),
      { inclureEntrepreneursIndividuels: false },
    );
    assert.ok("business" in r);
    const b = r.business;
    assert.equal(b.name, "LE BISTROT DU NORD");
    assert.equal(b.externalId, "sirene:12345678900011");
    assert.equal(b.city, "LILLE");
    assert.equal(b.region, "Hauts-de-France");
    assert.equal(b.postalCode, "59000");
    assert.equal(b.raw.departementCode, "59");
    assert.equal(b.raw.siren, "123456789");
    assert.ok(b.raw.collecteLe, "date de collecte absente");
  });

  test("Sirene ne fournit jamais de site ni d'email", () => {
    const r = toRawBusiness(
      etablissement({ siret: "12345678900011", denomination: "TEST" }),
      { inclureEntrepreneursIndividuels: false },
    );
    assert.ok("business" in r);
    assert.equal(r.business.website, undefined);
    assert.equal(r.business.email, undefined);
    assert.equal(r.business.phone, undefined);
  });

  test("une unité non diffusible est écartée, avec sa raison", () => {
    const r = toRawBusiness(
      etablissement({ siret: "1", denomination: "SECRET", statutDiffusion: "N" }),
      { inclureEntrepreneursIndividuels: true },
    );
    assert.ok("ecarte" in r);
    assert.match(r.ecarte, /non diffusible/i);
  });

  test("un entrepreneur individuel est exclu par défaut", () => {
    const r = toRawBusiness(
      etablissement({ siret: "2", denomination: null, nom: "DUPONT", prenom: "Marie" }),
      { inclureEntrepreneursIndividuels: false },
    );
    assert.ok("ecarte" in r);
    assert.match(r.ecarte, /nom de personne/i);
  });

  test("un entrepreneur individuel n'est inclus que s'il est diffusible ET demandé", () => {
    const inclus = toRawBusiness(
      etablissement({ siret: "3", denomination: null, nom: "DUPONT", prenom: "Marie" }),
      { inclureEntrepreneursIndividuels: true },
    );
    assert.ok("business" in inclus);
    assert.equal(inclus.business.name, "Marie DUPONT");
    assert.equal(inclus.business.raw.personnePhysique, true, "le caractère personnel doit être signalé");

    const refuse = toRawBusiness(
      etablissement({ siret: "4", denomination: null, nom: "DUPONT", prenom: "Marie", statutDiffusion: "N" }),
      { inclureEntrepreneursIndividuels: true },
    );
    assert.ok("ecarte" in refuse);
  });

  test("l'enseigne sert de nom quand la raison sociale manque", () => {
    const r = toRawBusiness(
      etablissement({ siret: "5", denomination: null, enseigne: "CHEZ PAULETTE" }),
      { inclureEntrepreneursIndividuels: false },
    );
    assert.ok("business" in r);
    assert.equal(r.business.name, "CHEZ PAULETTE");
  });

  test("un établissement sans SIRET est écarté", () => {
    const brut = etablissement({ siret: "6", denomination: "X" });
    const r = toRawBusiness({ ...brut, siret: undefined }, { inclureEntrepreneursIndividuels: false });
    assert.ok("ecarte" in r);
  });
});

// === PAGINATION =============================================================

describe("Pagination par curseur", () => {
  test("parcourt tout le registre sans rien perdre ni dupliquer", async () => {
    const { client } = clientSimule({ registre: registreTest(250) });

    const vus: string[] = [];
    for await (const page of client.iterate({ naf: ["56"] }, { taillePage: 100 })) {
      vus.push(...page.entreprises.map((e) => e.externalId));
    }

    assert.equal(vus.length, 250, `${vus.length} au lieu de 250`);
    assert.equal(new Set(vus).size, 250, "doublons dans la pagination");
  });

  test("s'arrête quand le curseur ne bouge plus", async () => {
    const { client, journal } = clientSimule({ registre: registreTest(150) });

    let pages = 0;
    for await (const _ of client.iterate({}, { taillePage: 100 })) pages += 1;

    assert.equal(pages, 2, `${pages} pages pour 150 résultats en pages de 100`);
    assert.equal(journal.curseurs[0], "*", "le premier appel doit utiliser le curseur initial");
    assert.notEqual(journal.curseurs[1], "*", "le second appel doit utiliser le curseur suivant");
  });

  test("un registre vide se termine proprement", async () => {
    const { client } = clientSimule({ registre: [] });
    let pages = 0;
    for await (const page of client.iterate({})) {
      pages += 1;
      assert.equal(page.entreprises.length, 0);
    }
    assert.equal(pages, 1);
  });

  test("maxPages arrête le parcours sans erreur", async () => {
    const { client } = clientSimule({ registre: registreTest(1000) });
    let pages = 0;
    for await (const _ of client.iterate({}, { taillePage: 100, maxPages: 3 })) pages += 1;
    assert.equal(pages, 3);
  });

  test("chaque page expose le curseur utilisé, pour une reprise exacte", async () => {
    const { client } = clientSimule({ registre: registreTest(250) });

    const curseurs: string[] = [];
    for await (const page of client.iterate({}, { taillePage: 100 })) {
      curseurs.push(page.curseurUtilise);
    }
    assert.equal(curseurs[0], "*");
    assert.equal(curseurs.length, 3);
  });

  test("la reprise depuis un curseur donne exactement la suite", async () => {
    const registre = registreTest(250);

    // Parcours complet, pour référence.
    const { client: complet } = clientSimule({ registre });
    const tous: string[] = [];
    for await (const p of complet.iterate({}, { taillePage: 100 })) {
      tous.push(...p.entreprises.map((e) => e.externalId));
    }

    // Parcours interrompu après une page, puis repris.
    const { client: partiel } = clientSimule({ registre });
    const debut: string[] = [];
    let reprise = "";
    for await (const p of partiel.iterate({}, { taillePage: 100, maxPages: 1 })) {
      debut.push(...p.entreprises.map((e) => e.externalId));
      reprise = p.curseurSuivant ?? "";
    }

    const { client: suite } = clientSimule({ registre });
    const fin: string[] = [];
    for await (const p of suite.iterate({}, { taillePage: 100, curseurInitial: reprise })) {
      fin.push(...p.entreprises.map((e) => e.externalId));
    }

    assert.deepEqual([...debut, ...fin], tous, "la reprise ne reconstitue pas le parcours complet");
  });

  test("la taille de page est plafonnée à la limite de l'API", async () => {
    const { client, journal } = clientSimule({ registre: registreTest(10) });
    for await (const _ of client.iterate({}, { taillePage: 99999 })) break;
    const nombre = new URL(journal.urls[0]).searchParams.get("nombre");
    assert.equal(nombre, String(TAILLE_PAGE_MAX));
  });

  test("la mémoire ne croît pas avec le volume : les pages sont rendues une par une", async () => {
    const { client } = clientSimule({ registre: registreTest(2000) });
    let maxParPage = 0;
    let total = 0;
    for await (const page of client.iterate({}, { taillePage: 100 })) {
      maxParPage = Math.max(maxParPage, page.entreprises.length);
      total += page.entreprises.length;
    }
    assert.equal(total, 2000);
    assert.ok(maxParPage <= 100, `une page a rendu ${maxParPage} entreprises`);
  });
});

// === ERREURS ET REPRISE =====================================================

describe("Erreurs et reprise", () => {
  test("une limite de débit (429) est réessayée puis réussit", async () => {
    const { client, journal } = clientSimule({ registre: registreTest(10), echecs: [429, 429] });
    const pages: number[] = [];
    for await (const p of client.iterate({}, { taillePage: 100 })) pages.push(p.entreprises.length);

    assert.deepEqual(pages, [10]);
    assert.ok(journal.appels >= 3, `${journal.appels} appels : les réessais n'ont pas eu lieu`);
  });

  test("une panne serveur (503) est réessayée", async () => {
    const { client } = clientSimule({ registre: registreTest(5), echecs: [503] });
    let total = 0;
    for await (const p of client.iterate({})) total += p.entreprises.length;
    assert.equal(total, 5);
  });

  test("une panne réseau est réessayée", async () => {
    const { client } = clientSimule({ registre: registreTest(5), pannesReseau: 2 });
    let total = 0;
    for await (const p of client.iterate({})) total += p.entreprises.length;
    assert.equal(total, 5);
  });

  test("une clé refusée (401) échoue immédiatement, sans réessai inutile", async () => {
    const { client, journal } = clientSimule({ registre: registreTest(5), echecs: [401] });
    await assert.rejects(
      async () => { for await (const _ of client.iterate({})) { /* vide */ } },
      (e: unknown) => e instanceof SireneError && e.status === 401 && !e.retryable,
    );
    assert.equal(journal.appels, 1, "une erreur définitive ne doit pas être réessayée");
  });

  test("un abonnement manquant (403) est expliqué clairement", async () => {
    const { client } = clientSimule({ registre: [], echecs: [403] });
    await assert.rejects(
      async () => { for await (const _ of client.iterate({})) { /* vide */ } },
      (e: unknown) => e instanceof SireneError && /abonnée/i.test(e.message),
    );
  });

  test("« aucun résultat » (404) donne une page vide, pas une erreur", async () => {
    const { client } = clientSimule({ registre: [], echecs: [404] });
    let pages = 0;
    for await (const p of client.iterate({})) { pages += 1; assert.equal(p.entreprises.length, 0); }
    assert.equal(pages, 1);
  });

  test("des réessais épuisés finissent par lever une erreur explicite", async () => {
    const { client } = clientSimule({ registre: [], echecs: [429, 429, 429, 429, 429] });
    await assert.rejects(
      async () => { for await (const _ of client.iterate({})) { /* vide */ } },
      (e: unknown) => e instanceof SireneError && e.status === 429,
    );
  });

  test("les établissements écartés sont comptés et motivés", async () => {
    const { transport } = transportSimule({
      registre: [
        { siret: "1", denomination: "VISIBLE" },
        { siret: "2", denomination: "CACHEE", statutDiffusion: "N" },
        { siret: "3", denomination: null, nom: "DUPONT", prenom: "Jean" },
      ],
    });
    const client = new SireneClient({ transport, attenteEntrePagesMs: 0 });
    const page = await client.fetchPage({});

    assert.equal(page.entreprises.length, 1);
    assert.equal(page.ecartes.length, 2, "des établissements ont disparu sans explication");
    for (const e of page.ecartes) assert.ok(e.raison.length > 10, `raison trop courte : ${e.raison}`);
  });
});

// === DEMANDE EN FRANÇAIS ====================================================

describe("Traduction d'une demande en critères", () => {
  test("un secteur curé donne ses codes NAF", () => {
    const { criteres } = criteresDepuisDemande({ secteurs: ["restaurants"] });
    assert.ok(criteres.naf!.includes("56.10A"));
  });

  test("un métier hors catalogue passe par la nomenclature NAF", () => {
    const { criteres } = criteresDepuisDemande({ secteurs: ["cordonnier"] });
    assert.ok(criteres.naf!.length > 0, "aucun code NAF pour un métier générique");
  });

  test("plusieurs secteurs se cumulent sans doublon", () => {
    const { criteres } = criteresDepuisDemande({ secteurs: ["restaurants", "hôtels", "restaurants"] });
    assert.equal(new Set(criteres.naf).size, criteres.naf!.length, "codes NAF dupliqués");
    assert.ok(criteres.naf!.length >= 3);
  });

  test("aucun secteur demandé = tous secteurs", () => {
    const { criteres } = criteresDepuisDemande({ zone: "59" });
    assert.equal(criteres.naf!.length, 0);
  });

  test("une région se déplie en départements", () => {
    const { criteres, notes } = criteresDepuisDemande({ zone: "Bretagne" });
    assert.equal(criteres.departements!.length, 4);
    assert.ok(notes.some((n) => /Bretagne/.test(n)));
  });

  test("un secteur inconnu est signalé, pas deviné", () => {
    const { criteres, notes } = criteresDepuisDemande({ secteurs: ["fabricant de fusées orbitales"] });
    assert.equal(criteres.naf!.length, 0);
    assert.ok(notes.some((n) => /non reconnu/i.test(n)));
  });

  test("une profession encadrée est signalée", () => {
    const { notes } = criteresDepuisDemande({ secteurs: ["dentistes"] });
    assert.ok(notes.some((n) => /encadrée/i.test(n)), notes.join(" | "));
  });

  test("« PME » est signalé comme critère de taille, pas comme secteur", () => {
    const { criteres, notes } = criteresDepuisDemande({ secteurs: ["PME"] });
    assert.equal(criteres.naf!.length, 0);
    assert.ok(notes.some((n) => /Précisez le métier/i.test(n)));
  });

  test("les entrepreneurs individuels sont exclus par défaut", () => {
    const { criteres } = criteresDepuisDemande({ zone: "59" });
    assert.equal(criteres.inclureEntrepreneursIndividuels, false);
  });
});

// === SOURCE =================================================================

describe("Source Sirene", () => {
  test("indisponible sans clé, et le dit précisément", () => {
    const avant = process.env.SIRENE_API_KEY;
    delete process.env.SIRENE_API_KEY;
    try {
      const a = new SireneSource().availability();
      assert.equal(a.available, false);
      assert.equal(a.missing, "SIRENE_API_KEY");
      assert.match(a.note, /portail-api\.insee\.fr/);
    } finally {
      if (avant !== undefined) process.env.SIRENE_API_KEY = avant;
    }
  });

  test("search respecte la limite demandée", async () => {
    const { transport } = transportSimule({ registre: registreTest(500) });
    const source = new SireneSource({ transport, attenteEntrePagesMs: 0 });
    const resultats = await source.search({ city: "Lille", sectors: ["restaurants"], limit: 20 });
    assert.equal(resultats.length, 20);
  });

  test("l'endpoint interrogé est bien celui de l'API Sirene", async () => {
    const { transport, journal } = transportSimule({ registre: registreTest(1) });
    const source = new SireneSource({ transport, attenteEntrePagesMs: 0 });
    await source.search({ city: "Lille", sectors: [], limit: 1 });
    assert.ok(journal.urls[0].startsWith(SIRENE_ENDPOINT), journal.urls[0]);
  });

  test("la clé API ne circule jamais dans l'URL", async () => {
    const { transport, journal } = transportSimule({ registre: registreTest(1) });
    const source = new SireneSource({ transport, apiKey: "CLE-SECRETE-TEMOIN", attenteEntrePagesMs: 0 });
    await source.search({ city: "Lille", sectors: [], limit: 1 });
    for (const url of journal.urls) {
      assert.ok(!url.includes("CLE-SECRETE-TEMOIN"), "la clé apparaît dans l'URL");
    }
  });

  test("une recherche nationale tous secteurs est possible", async () => {
    const { transport, journal } = transportSimule({ registre: registreTest(50) });
    const source = new SireneSource({ transport, attenteEntrePagesMs: 0 });
    await source.search({ city: "", sectors: [], limit: 10 });
    // Aucun filtre de ville ni d'activité : la requête reste nationale.
    assert.ok(!journal.requetes[0].includes("libelleCommune"), journal.requetes[0]);
    assert.ok(!journal.requetes[0].includes("activitePrincipale"), journal.requetes[0]);
  });
});
