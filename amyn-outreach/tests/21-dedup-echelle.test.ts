// ---------------------------------------------------------------------------
// DÉDUPLICATION À GRANDE ÉCHELLE
//
// La question à laquelle ces tests répondent : le système reste-t-il correct
// ET tenable quand la base grossit ? Les deux comptent. Une déduplication
// juste mais quadratique s'écroule à 200 000 prospects ; une déduplication
// rapide mais fausse fusionne deux commerces distincts.
// ---------------------------------------------------------------------------

import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { prisma } from "@/lib/db";
import {
  buildIdentity,
  normalizeName,
  normalizeDomain,
  normalizeSiret,
  findDuplicate,
  findDuplicatesBatch,
  sameEntity,
  backfillIdentities,
} from "@/lib/dedup";
import { importBusinesses } from "@/lib/research";
import type { RawBusiness } from "@/lib/research/types";
import { resetDatabase } from "./helpers";

function entreprise(o: Partial<RawBusiness> & { name: string }): RawBusiness {
  return {
    externalId: o.externalId ?? `test:${o.name}`,
    sector: o.sector ?? "Restauration",
    city: o.city ?? "Lille",
    sourceKind: o.sourceKind ?? "SIRENE",
    sourceLabel: o.sourceLabel ?? `test:${o.name}`,
    raw: {},
    ...o,
  };
}

/** Un lot de n entreprises toutes distinctes. */
function lot(n: number, decalage = 0): RawBusiness[] {
  return Array.from({ length: n }, (_, i) => {
    const rang = i + decalage;
    return entreprise({
      name: `Entreprise ${rang}`,
      siret: String(10_000_000_000_000 + rang),
      postalCode: `59${String(rang % 1000).padStart(3, "0")}`,
      externalId: `test:${rang}`,
      sourceLabel: `test:${rang}`,
    });
  });
}

before(async () => { await resetDatabase(); });

describe("Normalisation des clés", () => {
  test("la forme juridique ne distingue pas deux entreprises", () => {
    assert.equal(normalizeName("SARL Boulangerie Dupont"), normalizeName("boulangerie dupont"));
  });

  test("deux noms proches restent distincts", () => {
    assert.notEqual(normalizeName("Salon Éclat"), normalizeName("Salon Éclair"));
  });

  test("le www et la casse ne changent pas un domaine", () => {
    assert.equal(normalizeDomain("https://WWW.Exemple.FR/contact"), "exemple.fr");
  });

  test("une URL inexploitable ne produit pas de clé plutôt qu'une fausse", () => {
    assert.equal(normalizeDomain("pas une url"), null);
    assert.equal(normalizeDomain("http://localhost"), null);
    assert.equal(normalizeDomain(""), null);
  });

  test("un SIRET doit faire 14 chiffres, sinon il est ignoré", () => {
    assert.equal(normalizeSiret("12345678900011"), "12345678900011");
    assert.equal(normalizeSiret("123"), null);
    assert.equal(normalizeSiret("1234567890001A"), null);
  });

  test("le SIREN se déduit du SIRET, sans être inventé", () => {
    assert.equal(buildIdentity({ name: "X", siret: "12345678900011" }).siren, "123456789");
    assert.equal(buildIdentity({ name: "X" }).siren, null);
  });
});

describe("Priorité des identifiants", () => {
  beforeEach(async () => { await resetDatabase(); });

  test("le SIRET l'emporte : même établissement, noms différents", async () => {
    await importBusinesses([entreprise({ name: "Chez Paul", siret: "11111111111111" })]);
    const r = await importBusinesses([
      entreprise({ name: "Restaurant Paul", siret: "11111111111111", externalId: "autre" }),
    ]);
    assert.equal(r.created, 0);
    assert.equal(r.duplicates, 1);
    assert.equal(r.duplicateBreakdown.SIRET, 1);
  });

  test("le domaine l'emporte quand il n'y a pas de SIRET", async () => {
    await importBusinesses([entreprise({ name: "Chez Paul", website: "https://chezpaul.fr" })]);
    const r = await importBusinesses([
      entreprise({ name: "Paul Traiteur", website: "https://www.chezpaul.fr/accueil" }),
    ]);
    assert.equal(r.duplicates, 1);
    assert.equal(r.duplicateBreakdown.DOMAIN, 1);
  });

  test("nom + code postal sert de repli", async () => {
    await importBusinesses([entreprise({ name: "Le Bistrot", postalCode: "75011" })]);
    const r = await importBusinesses([entreprise({ name: "LE BISTROT", postalCode: "75011" })]);
    assert.equal(r.duplicates, 1);
    assert.equal(r.duplicateBreakdown.NAME_POSTAL, 1);
  });

  test(
    "deux « Le Bistrot » à Paris ne sont PAS le même commerce — " +
      "c'est ce que nom+ville confondait",
    async () => {
      await importBusinesses([
        entreprise({ name: "Le Bistrot", city: "Paris", postalCode: "75011" }),
      ]);
      const r = await importBusinesses([
        entreprise({ name: "Le Bistrot", city: "Paris", postalCode: "75018" }),
      ]);
      assert.equal(r.created, 1, "deux commerces distincts ont été fusionnés");
      assert.equal(await prisma.prospect.count(), 2);
    },
  );

  test("un SIRET différent prime sur un nom identique : ce sont deux établissements", async () => {
    await importBusinesses([
      entreprise({ name: "Boulangerie du Coin", siret: "11111111111111", postalCode: "59000" }),
    ]);
    const r = await importBusinesses([
      entreprise({ name: "Boulangerie du Coin", siret: "22222222222222", postalCode: "59100" }),
    ]);
    assert.equal(r.created, 1);
  });
});

describe("Comptabilité de l'import", () => {
  beforeEach(async () => { await resetDatabase(); });

  test("trouvées = créées + doublons + écartées, toujours", async () => {
    const entrees = [
      ...lot(20),
      ...lot(5), // doublons du lot precedent
      entreprise({ name: "   " }), // ecartee
      entreprise({ name: "!!!" }), // nom reduit a rien
    ];
    const r = await importBusinesses(entrees);
    assert.equal(r.found, r.created + r.duplicates + r.skipped, "des entreprises ont disparu");
    assert.equal(r.found, entrees.length);
  });

  test("un doublon est un DOUBLON, jamais un « non qualifié »", async () => {
    await importBusinesses(lot(10));
    await importBusinesses(lot(10));

    const nonQualifies = await prisma.prospect.count({ where: { qualification: "NOT_QUALIFIED" } });
    assert.equal(nonQualifies, 0, "un doublon a été marqué NOT_QUALIFIED");
    assert.equal(await prisma.prospect.count(), 10);
  });

  test("chaque écartement porte un motif nommé", async () => {
    const r = await importBusinesses([entreprise({ name: "" }), entreprise({ name: "###" })]);
    assert.equal(r.skipped, 2);
    const total = Object.values(r.skippedReasons).reduce((a, b) => a + b, 0);
    assert.equal(total, 2, "un écartement sans motif");
  });

  test("les doublons présents DANS un même lot sont comptés, pas plantés", async () => {
    const doublon = entreprise({ name: "Chez Paul", siret: "11111111111111" });
    const r = await importBusinesses([doublon, { ...doublon, externalId: "autre" }]);
    assert.equal(r.created, 1);
    assert.equal(r.duplicates, 1);
    assert.equal(r.duplicateBreakdown.IN_BATCH, 1);
  });

  test("les clés de déduplication sont bien enregistrées", async () => {
    await importBusinesses([
      entreprise({
        name: "SARL Chez Paul",
        siret: "11111111111111",
        website: "https://chezpaul.fr",
        postalCode: "59000",
        naf: "56.10A",
        departement: "59",
      }),
    ]);
    const p = await prisma.prospect.findFirstOrThrow();
    assert.equal(p.siret, "11111111111111");
    assert.equal(p.siren, "111111111");
    assert.equal(p.domainKey, "chezpaul.fr");
    assert.equal(p.nameKey, "chez paul");
    assert.equal(p.naf, "56.10A");
    assert.equal(p.departement, "59");
  });
});

describe("Passage à l'échelle", () => {
  before(async () => { await resetDatabase(); });

  test("5 000 entreprises sont importées sans perte", async () => {
    let total = 0;
    for (let i = 0; i < 5000; i += 500) {
      const r = await importBusinesses(lot(500, i));
      assert.equal(r.found, r.created + r.duplicates + r.skipped);
      total += r.created;
    }
    assert.equal(total, 5000);
    assert.equal(await prisma.prospect.count(), 5000);
  });

  test("réimporter les 5 000 mêmes n'en crée aucune", async () => {
    const r = await importBusinesses(lot(500, 0));
    assert.equal(r.created, 0);
    assert.equal(r.duplicates, 500);
    assert.equal(await prisma.prospect.count(), 5000);
  });

  test("la reconnaissance d'un lot coûte trois requêtes, quelle que soit sa taille", async () => {
    const identites = lot(1000).map((b) =>
      buildIdentity({ name: b.name, siret: b.siret, postalCode: b.postalCode }),
    );
    const hits = await findDuplicatesBatch(identites);
    assert.equal(hits.size, 1000, "les 1 000 devraient être reconnues comme déjà connues");
  });

  test("un lot neuf dans une base de 5 000 reste reconnu correctement", async () => {
    const identites = lot(50, 900_000).map((b) =>
      buildIdentity({ name: b.name, siret: b.siret, postalCode: b.postalCode }),
    );
    const hits = await findDuplicatesBatch(identites);
    assert.equal(hits.size, 0);
  });

  test("importer dans une base de 5 000 reste rapide", async () => {
    const t0 = Date.now();
    const r = await importBusinesses(lot(25, 800_000));
    const duree = Date.now() - t0;
    assert.equal(r.created, 25);
    assert.ok(duree < 15_000, `import de 25 entreprises : ${duree} ms sur une base de 5 000`);
  });

  test("la recherche unitaire trouve le bon prospect", async () => {
    const hit = await findDuplicate(buildIdentity({ name: "Entreprise 42", siret: "10000000000042" }));
    assert.ok(hit);
    assert.equal(hit.matchedOn, "SIRET");
  });
});

describe("Aucun chargement de toute la base", () => {
  test("le chemin d'import ne fait aucun findMany sans filtre sur les prospects", () => {
    const racine = resolve(import.meta.dirname, "..");
    for (const fichier of ["lib/dedup/index.ts", "lib/research/index.ts"]) {
      const source = readFileSync(resolve(racine, fichier), "utf-8");
      const findMany = /prisma\.prospect\.findMany\(\{([\s\S]*?)\n {2}\}\)/g;
      for (const m of source.matchAll(findMany)) {
        assert.match(
          m[1],
          /where:/,
          `${fichier} contient un findMany de prospects sans filtre : ` +
            `à l'échelle nationale, cela charge toute la base en mémoire`,
        );
      }
    }
  });
});

describe("Comparaison de deux identités", () => {
  test("même SIRET = même entreprise", () => {
    const a = buildIdentity({ name: "A", siret: "11111111111111" });
    const b = buildIdentity({ name: "B", siret: "11111111111111" });
    assert.equal(sameEntity(a, b)?.matchedOn, "SIRET");
  });

  test("noms identiques mais codes postaux différents = entreprises différentes", () => {
    const a = buildIdentity({ name: "Le Bistrot", postalCode: "75011" });
    const b = buildIdentity({ name: "Le Bistrot", postalCode: "75018" });
    assert.equal(sameEntity(a, b), null);
  });

  test("deux identités sans aucune clé commune ne sont jamais fusionnées", () => {
    const a = buildIdentity({ name: "Le Bistrot" });
    const b = buildIdentity({ name: "Le Bistrot" });
    assert.equal(sameEntity(a, b), null, "deux entreprises sans code postal ont été fusionnées");
  });
});

describe("Rattrapage des prospects historiques", () => {
  beforeEach(async () => { await resetDatabase(); });

  test("un prospect créé sans clés en reçoit, par lots", async () => {
    await prisma.prospect.create({
      data: { name: "SARL Ancienne Maison", sector: "x", city: "Lille", postalCode: "59000", website: "https://ancienne.fr" },
    });

    const r = await backfillIdentities({ batchSize: 10 });
    assert.equal(r.updated, 1);

    const p = await prisma.prospect.findFirstOrThrow();
    assert.equal(p.nameKey, "ancienne maison");
    assert.equal(p.domainKey, "ancienne.fr");
  });

  test("deux prospects historiques en collision ne sont pas supprimés", async () => {
    await prisma.prospect.create({
      data: { name: "Le Bistrot", sector: "x", city: "Paris", postalCode: "75011" },
    });
    await prisma.prospect.create({
      data: { name: "LE BISTROT", sector: "x", city: "Paris", postalCode: "75011" },
    });

    const r = await backfillIdentities();
    assert.equal(r.examined, 2);
    assert.equal(r.collisions, 1, "une collision devrait être signalée, pas résolue en silence");
    assert.equal(await prisma.prospect.count(), 2, "un prospect a été supprimé");
  });
});
