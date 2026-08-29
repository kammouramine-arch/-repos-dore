// ---------------------------------------------------------------------------
// ANNUAIRE DES ENTREPRISES — source nationale publique
//
// Tout est simulé : aucun test n'appelle le réseau.
// ---------------------------------------------------------------------------

import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  AnnuaireClient,
  AnnuaireError,
  buildAnnuaireUrl,
  toRawBusiness,
  libelleNaf,
  PROFONDEUR_MAX,
  TAILLE_PAGE_MAX,
} from "@/lib/research/annuaire/client";
import { AnnuaireSource, criteresAnnuaire } from "@/lib/research/annuaire/index";
import { annuaireSimule, registreTest, unite } from "./annuaire-simule";
import { resetDatabase } from "./helpers";

const sansAttente = { attendre: async () => {}, delaiEntrePagesMs: 0 };

before(async () => { await resetDatabase(); });
beforeEach(async () => { await resetDatabase(); });

describe("Annuaire — construction de la requête", () => {
  test("un département devient un filtre départemental, pas une recherche texte", () => {
    const url = buildAnnuaireUrl({ departements: ["59"] }, 1, 25);
    const params = new URL(url).searchParams;
    assert.equal(params.get("departement"), "59");
    assert.equal(params.get("q"), null);
  });

  test("plusieurs activités passent dans une seule requête", () => {
    const url = buildAnnuaireUrl({ naf: ["56.10A", "96.02A"] }, 1, 25);
    assert.equal(new URL(url).searchParams.get("activite_principale"), "56.10A,96.02A");
  });

  test("les entrepreneurs individuels sont exclus par défaut", () => {
    const params = new URL(buildAnnuaireUrl({}, 1, 25)).searchParams;
    assert.equal(params.get("est_entrepreneur_individuel"), "false");
  });

  test("les inclure est un choix explicite, jamais un défaut", () => {
    const params = new URL(
      buildAnnuaireUrl({ inclureEntrepreneursIndividuels: true }, 1, 25),
    ).searchParams;
    assert.equal(params.get("est_entrepreneur_individuel"), null);
  });

  test("la taille de page est bornée à ce que l'API accepte", () => {
    const params = new URL(buildAnnuaireUrl({}, 1, 500)).searchParams;
    assert.equal(params.get("per_page"), String(TAILLE_PAGE_MAX));
  });

  test("demander les établissements fermés n'est pas écrasé en silence", () => {
    const params = new URL(buildAnnuaireUrl({ actifsSeulement: false }, 1, 25)).searchParams;
    assert.equal(params.get("etat_administratif"), null);
  });
});

describe("Annuaire — conversion", () => {
  test("un établissement diffusible devient un prospect avec son SIRET", () => {
    const r = toRawBusiness(unite({ siren: "123456789", siret: "12345678900011", nom: "Chez Paul" }));
    assert.ok("business" in r);
    assert.equal(r.business.siret, "12345678900011");
    assert.equal(r.business.name, "Chez Paul");
    assert.equal(r.business.departement, "59");
  });

  test("une unité non diffusible est écartée, avec son motif", () => {
    const r = toRawBusiness(
      unite({ siren: "1", siret: "11111111111111", nom: "Discrète", statutDiffusion: "N" }),
    );
    assert.ok("ecarte" in r);
    assert.match(r.ecarte, /diffusible/);
  });

  test("un entrepreneur individuel est écarté par défaut", () => {
    const r = toRawBusiness(
      unite({ siren: "2", siret: "22222222222222", nom: "JEAN DUPONT", natureJuridique: "1000" }),
    );
    assert.ok("ecarte" in r);
    assert.match(r.ecarte, /donnée personnelle/);
  });

  test("inclus sur demande explicite, il porte le marqueur personne physique", () => {
    const r = toRawBusiness(
      unite({ siren: "2", siret: "22222222222222", nom: "JEAN DUPONT", natureJuridique: "1000" }),
      { inclureEntrepreneursIndividuels: true },
    );
    assert.ok("business" in r);
    assert.equal(r.business.personnePhysique, true);
  });

  test("l'enseigne prime sur la raison sociale — c'est le nom que le public connaît", () => {
    const r = toRawBusiness(
      unite({ siren: "3", siret: "33333333333333", nom: "SARL MARTIN ET FILS", enseignes: ["Le Fournil"] }),
    );
    assert.ok("business" in r);
    assert.equal(r.business.name, "Le Fournil");
  });

  test("aucun site web n'est inventé : la source n'en publie pas", () => {
    const r = toRawBusiness(unite({ siren: "4", siret: "44444444444444", nom: "Test" }));
    assert.ok("business" in r);
    assert.equal(r.business.website, undefined);
  });

  test("une adresse nulle ne fait pas échouer la conversion", () => {
    const r = toRawBusiness(unite({ siren: "5", siret: "55555555555555", nom: "Test", adresse: null }));
    assert.ok("business" in r);
    assert.equal(r.business.address, undefined);
  });

  test("un code NAF devient un libellé de secteur lisible", () => {
    assert.equal(libelleNaf("56.10A"), "Restauration");
    assert.match(libelleNaf(null), /non précisée/);
  });
});

describe("Annuaire — l'activité se filtre sur l'unité, pas sur l'établissement", () => {
  // Comportement mesuré contre l'API réelle : demander « restauration » dans
  // le Nord ramenait aussi des sièges sociaux et de l'immobilier, parce que
  // le filtre porte sur l'unité légale. Ces tests figent la correction.

  test("l'établissement qui exerce vraiment l'activité demandée est préféré", () => {
    const r = toRawBusiness(
      unite({
        siren: "111111111",
        siret: "11111111111111",
        nom: "Groupe Restauration",
        naf: "56.10A",
        nafEtablissement: "70.10Z", // le siège : activité de siège social
        autresEtablissements: [{ siret: "11111111100022", naf: "56.10A" }],
      }),
      { nafDemandes: ["56.10A"] },
    );
    assert.ok("business" in r);
    assert.equal(r.business.siret, "11111111100022", "le siège social a été retenu à la place du restaurant");
  });

  test("un établissement hors cible est écarté, avec son activité réelle en motif", () => {
    const r = toRawBusiness(
      unite({
        siren: "222222222",
        siret: "22222222222222",
        nom: "Entrepôt du Groupe",
        naf: "56.10A",
        nafEtablissement: "52.10B",
      }),
      { nafDemandes: ["56.10A"] },
    );
    assert.ok("ecarte" in r);
    assert.match(r.ecarte, /hors cible/);
    assert.match(r.ecarte, /52\.10B/, "le motif devrait nommer l'activité constatée");
  });

  test("sans activité demandée, rien n'est écarté pour ce motif", () => {
    const r = toRawBusiness(
      unite({ siren: "3", siret: "33333333333333", nom: "X", nafEtablissement: "52.10B" }),
    );
    assert.ok("business" in r);
  });

  test("une activité absente ne fait pas écarter : on ne devine pas", () => {
    const brut = unite({ siren: "4", siret: "44444444444444", nom: "Y" });
    brut.siege.activite_principale = null;
    brut.matching_etablissements[0].activite_principale = null;

    const r = toRawBusiness(brut, { nafDemandes: ["56.10A"] });
    assert.ok("business" in r, "un établissement sans activité connue a été écarté");
  });

  test("la géographie prime sur l'activité : jamais un prospect hors zone", () => {
    const r = toRawBusiness(
      unite({
        siren: "555555555",
        siret: "55555555555555",
        nom: "Chaîne Nationale",
        naf: "56.10A",
        nafEtablissement: "56.10A",
        departement: "59",
      }),
      { nafDemandes: ["56.10A"] },
    );
    assert.ok("business" in r);
    assert.equal(r.business.departement, "59");
  });
});

describe("Annuaire — pagination", () => {
  test("250 entreprises sont servies en pages successives, sans perte ni doublon", async () => {
    const sim = annuaireSimule({ registre: registreTest(250) });
    const client = new AnnuaireClient({ transport: sim.transport, ...sansAttente });

    const vus = new Set<string>();
    let pages = 0;
    for await (const page of client.iterate({}, { parPage: 25 })) {
      pages += 1;
      for (const e of page.entreprises) {
        assert.ok(!vus.has(e.siret!), `SIRET ${e.siret} servi deux fois`);
        vus.add(e.siret!);
      }
    }

    assert.equal(pages, 10);
    assert.equal(vus.size, 250);
  });

  test("la mémoire ne grandit pas avec le volume : les pages sont rendues une par une", async () => {
    const sim = annuaireSimule({ registre: registreTest(500) });
    const client = new AnnuaireClient({ transport: sim.transport, ...sansAttente });

    let maxSimultane = 0;
    for await (const page of client.iterate({}, { parPage: 25 })) {
      maxSimultane = Math.max(maxSimultane, page.entreprises.length);
    }
    assert.ok(maxSimultane <= 25, `${maxSimultane} entreprises tenues en mémoire d'un coup`);
  });

  test("la reprise depuis une page redonne exactement la suite", async () => {
    const registre = registreTest(120);

    const complet = annuaireSimule({ registre });
    const clientA = new AnnuaireClient({ transport: complet.transport, ...sansAttente });
    const tout: string[] = [];
    for await (const p of clientA.iterate({}, { parPage: 25 })) {
      tout.push(...p.entreprises.map((e) => e.siret!));
    }

    // Interruption après deux pages, puis reprise à la troisième.
    const partiel = annuaireSimule({ registre });
    const clientB = new AnnuaireClient({ transport: partiel.transport, ...sansAttente });
    const avant: string[] = [];
    for await (const p of clientB.iterate({}, { parPage: 25, maxPages: 2 })) {
      avant.push(...p.entreprises.map((e) => e.siret!));
    }

    const reprise = annuaireSimule({ registre });
    const clientC = new AnnuaireClient({ transport: reprise.transport, ...sansAttente });
    const apres: string[] = [];
    for await (const p of clientC.iterate({}, { parPage: 25, pageDepart: 3 })) {
      apres.push(...p.entreprises.map((e) => e.siret!));
    }

    assert.deepEqual([...avant, ...apres], tout, "la reprise ne reconstitue pas le parcours complet");
  });

  test("un territoire trop grand est signalé saturé, jamais déclaré terminé", async () => {
    const sim = annuaireSimule({ registre: registreTest(50), totalForce: 10_000 });
    const client = new AnnuaireClient({ transport: sim.transport, ...sansAttente });
    const page = await client.fetchPage({}, 1, 25);
    assert.equal(page.sature, true);
  });

  test("la profondeur maximale est refusée avant même d'appeler l'API", async () => {
    const sim = annuaireSimule({ registre: registreTest(10) });
    const client = new AnnuaireClient({ transport: sim.transport, ...sansAttente });

    await assert.rejects(
      () => client.fetchPage({}, PROFONDEUR_MAX / 25 + 1, 25),
      (e: AnnuaireError) => {
        assert.match(e.message, /subdivis/);
        return true;
      },
    );
    assert.equal(sim.appels.length, 0, "l'API a été appelée alors que la requête était impossible");
  });
});

describe("Annuaire — erreurs", () => {
  test("un 429 est réessayé, puis la page arrive", async () => {
    const sim = annuaireSimule({ registre: registreTest(5), echecs: [429] });
    const client = new AnnuaireClient({ transport: sim.transport, ...sansAttente });
    const page = await client.fetchPage({}, 1, 25);
    assert.equal(page.entreprises.length, 5);
    assert.equal(sim.appels.length, 2);
  });

  test("un 503 est réessayé", async () => {
    const sim = annuaireSimule({ registre: registreTest(3), echecs: [503, 503] });
    const client = new AnnuaireClient({ transport: sim.transport, ...sansAttente });
    const page = await client.fetchPage({}, 1, 25);
    assert.equal(page.entreprises.length, 3);
  });

  test("une coupure réseau est réessayée", async () => {
    const sim = annuaireSimule({ registre: registreTest(3), pannesReseau: 2 });
    const client = new AnnuaireClient({ transport: sim.transport, ...sansAttente });
    const page = await client.fetchPage({}, 1, 25);
    assert.equal(page.entreprises.length, 3);
  });

  test("un 400 n'est PAS réessayé : marteler une requête invalide ne la corrige pas", async () => {
    const sim = annuaireSimule({ registre: registreTest(3), echecs: [400] });
    const client = new AnnuaireClient({ transport: sim.transport, ...sansAttente });
    await assert.rejects(() => client.fetchPage({}, 1, 25));
    assert.equal(sim.appels.length, 1, "la requête invalide a été rejouée");
  });

  test("après épuisement des tentatives, l'échec est explicite", async () => {
    const sim = annuaireSimule({ registre: registreTest(3), echecs: [503, 503, 503, 503, 503] });
    const client = new AnnuaireClient({ transport: sim.transport, maxTentatives: 3, ...sansAttente });
    await assert.rejects(
      () => client.fetchPage({}, 1, 25),
      (e: AnnuaireError) => {
        assert.equal(e.status, 503);
        assert.equal(e.retryable, true);
        return true;
      },
    );
  });
});

describe("Annuaire — traduction d'une demande en français", () => {
  test("« restaurants dans le 59 » devient un filtre NAF + département", () => {
    const { criteres } = criteresAnnuaire({ secteurs: ["restaurant"], zone: "59" });
    assert.deepEqual(criteres.departements, ["59"]);
    assert.ok(criteres.naf!.length > 0);
  });

  test("une région est traduite en tous ses départements", () => {
    const { criteres } = criteresAnnuaire({ zone: "Hauts-de-France" });
    assert.ok(criteres.departements!.length >= 5);
    assert.ok(criteres.departements!.includes("59"));
  });

  test("aucun secteur demandé = tous les secteurs, sans liste fermée", () => {
    const { criteres } = criteresAnnuaire({ zone: "59" });
    assert.deepEqual(criteres.naf, []);
  });

  test("un métier absent du catalogue passe quand même par la nomenclature NAF", () => {
    const { criteres } = criteresAnnuaire({ secteurs: ["ébéniste"] });
    assert.ok(criteres.naf!.length > 0, "un métier non catalogué devrait retomber sur NAF");
  });

  test("un département inexistant est écarté plutôt que transmis à l'API", () => {
    const { criteres, notes } = criteresAnnuaire({ departements: ["99"] });
    assert.deepEqual(criteres.departements, []);
    assert.ok(notes.some((n) => /99/.test(n)));
  });
});

describe("Annuaire — disponibilité", () => {
  test("la source est utilisable sans aucune clé", () => {
    assert.equal(new AnnuaireSource().availability().available, true);
  });

  test("une recherche bornée respecte la limite demandée", async () => {
    const sim = annuaireSimule({ registre: registreTest(100) });
    const source = new AnnuaireSource({ transport: sim.transport, ...sansAttente });
    const resultats = await source.search({ city: "", sectors: [], limit: 10 });
    assert.equal(resultats.length, 10);
  });
});
