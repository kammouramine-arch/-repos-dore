// ---------------------------------------------------------------------------
// RECHERCHE ET VÉRIFICATION DU SITE OFFICIEL
//
// L'erreur que ces tests existent pour empêcher : attribuer à une entreprise
// le site d'un homonyme. « Boulangerie Dupont » existe dans trois cents
// communes ; boulangerie-dupont.fr appartient à l'une d'elles. Écrire aux
// deux cent quatre-vingt-dix-neuf autres pour commenter ce site détruirait
// le message et la crédibilité d'AMYN en une phrase.
//
// Aucun test ne touche le réseau : le récupérateur est injecté.
// ---------------------------------------------------------------------------

import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { prisma } from "@/lib/db";
import { candidatsDomaine, motsSignifiants } from "@/lib/site/candidates";
import { verifierAppartenance, estUnParking, normaliserTexte } from "@/lib/site/verify";
import { discoverWebsite } from "@/lib/site/discover";
import type { FetchedPage } from "@/lib/audit/types";
import { resetDatabase, fakePage, uid } from "./helpers";

/** Sert des pages selon l'hôte demandé. Tout le reste échoue en DNS. */
function recuperateurSimule(pages: Record<string, string>) {
  const appels: string[] = [];
  const recuperateur = async (url: string): Promise<FetchedPage> => {
    appels.push(url);
    // L'URL exacte prime sur l'hôte : sinon une page interne (mentions
    // légales) recevrait le contenu de la page d'accueil, et le test
    // vérifierait le contraire de ce qu'il croit.
    const hote = new URL(url).hostname;
    const html = pages[url] ?? pages[url.replace(/\/$/, "")] ?? pages[hote];
    if (!html) {
      return fakePage({
        requestedUrl: url, finalUrl: url, ok: false, status: 0,
        errorCode: "ENOTFOUND", html: "",
      });
    }
    return fakePage({ requestedUrl: url, finalUrl: url, ok: true, status: 200, html });
  };
  return { recuperateur, appels };
}

async function prospectSansSite(options: {
  nom?: string; siret?: string; postalCode?: string; city?: string; phone?: string;
} = {}) {
  return prisma.prospect.create({
    data: {
      name: options.nom ?? uid("Boulangerie Dupont"),
      sector: "Boulangerie",
      city: options.city ?? "Lille",
      postalCode: options.postalCode ?? "59000",
      siret: options.siret ?? null,
      siren: options.siret ? options.siret.slice(0, 9) : null,
      phone: options.phone ?? null,
      website: null,
      websiteStatus: "UNKNOWN",
    },
  });
}

before(async () => { await resetDatabase(); });
beforeEach(async () => { await resetDatabase(); });

describe("Candidats de domaine", () => {
  test("la forme juridique et les mots vides sont retirés", () => {
    assert.deepEqual(motsSignifiants("SARL Le Fournil de la Gare"), ["fournil", "gare"]);
  });

  test("un nom produit des candidats plausibles en .fr et .com", () => {
    const c = candidatsDomaine("Boulangerie Dupont").map((x) => x.domaine);
    assert.ok(c.includes("boulangeriedupont.fr"));
    assert.ok(c.includes("boulangeriedupont.com"));
  });

  test("un nom trop court ne produit rien : il ne discriminerait rien", () => {
    assert.deepEqual(candidatsDomaine("Bar"), []);
    assert.deepEqual(candidatsDomaine("SARL"), []);
  });

  test("le nombre de candidats reste borné : on ne martèle pas le web", () => {
    const c = candidatsDomaine("Grande Boulangerie Patisserie Chocolaterie Dupont Freres");
    assert.ok(c.length <= 6, `${c.length} candidats générés`);
  });
});

describe("Preuve d'appartenance", () => {
  const entreprise = {
    nom: "Boulangerie Dupont",
    siret: "12345678900011",
    siren: "123456789",
    postalCode: "59000",
    city: "Lille",
    phone: "0320123456",
  };

  test("un SIREN sur la page prouve l'appartenance", () => {
    const v = verifierAppartenance(entreprise, "Mentions légales — SIREN 123 456 789 — RCS Lille");
    assert.equal(v.statut, "CONFIRMED");
    assert.ok(v.preuves.some((p) => p.kind === "SIREN"));
  });

  test("un SIRET écrit avec des espaces est reconnu", () => {
    const v = verifierAppartenance(entreprise, "SIRET : 123 456 789 000 11");
    assert.equal(v.statut, "CONFIRMED");
  });

  test("le nom seul ne prouve RIEN — c'est la signature de l'homonyme", () => {
    const v = verifierAppartenance(entreprise, "Bienvenue à la Boulangerie Dupont, votre artisan");
    assert.equal(v.statut, "UNCONFIRMED", "un homonyme a été accepté");
  });

  test("nom + code postal prouvent l'appartenance", () => {
    const v = verifierAppartenance(entreprise, "Boulangerie Dupont — 12 rue de la Paix, 59000 Lille");
    assert.equal(v.statut, "CONFIRMED");
  });

  test("nom + téléphone prouvent l'appartenance", () => {
    const v = verifierAppartenance(entreprise, "Boulangerie Dupont — appelez-nous au 03 20 12 34 56");
    assert.equal(v.statut, "CONFIRMED");
  });

  test("FAUX DOMAINE : un homonyme d'une autre ville est refusé", () => {
    const v = verifierAppartenance(
      entreprise,
      "Boulangerie Dupont — 5 avenue des Fleurs, 33000 Bordeaux — 05 56 00 00 00",
    );
    assert.equal(v.statut, "UNCONFIRMED", "le site d'un homonyme bordelais a été accepté");
    assert.match(v.raison, /non prouvée/);
  });

  test("FAUX DOMAINE : une entreprise sans rapport est refusée", () => {
    const v = verifierAppartenance(entreprise, "Cabinet dentaire du Centre — 59000 Lille");
    assert.equal(v.statut, "UNCONFIRMED");
  });

  test("la commune seule ne suffit pas : un homonyme du quartier reste possible", () => {
    const v = verifierAppartenance(
      { ...entreprise, postalCode: null },
      "Bienvenue chez Boulangerie Dupont à Lille",
    );
    assert.equal(v.statut, "UNCONFIRMED");
    assert.match(v.raison, /homonyme/);
  });

  test("un domaine à vendre n'est le site de personne", () => {
    const v = verifierAppartenance(entreprise, "Ce domaine est à vendre. Contactez le registrar.");
    assert.equal(v.statut, "UNCONFIRMED");
    assert.match(v.raison, /vendre|site de personne/i);
  });

  test("une page par défaut de serveur est reconnue comme telle", () => {
    assert.ok(estUnParking(normaliserTexte("Apache2 Ubuntu Default Page")));
    assert.ok(estUnParking(normaliserTexte("Welcome to nginx!")));
    assert.ok(estUnParking(normaliserTexte("Site en construction")));
  });

  test("chaque preuve porte l'extrait qui la démontre", () => {
    const v = verifierAppartenance(entreprise, "Nos mentions légales — SIREN 123456789 — merci");
    for (const p of v.preuves) {
      assert.ok(p.extrait.length > 0, `preuve ${p.kind} sans extrait`);
    }
  });
});

describe("Recherche du site, de bout en bout", () => {
  test("un site prouvé est enregistré, avec sa source", async () => {
    const p = await prospectSansSite({ nom: "Boulangerie Dupont", siret: "12345678900011" });
    const { recuperateur } = recuperateurSimule({
      "boulangeriedupont.fr": "<html><body>Boulangerie Dupont — SIREN 123456789 — 59000 Lille</body></html>",
    });

    const r = await discoverWebsite(p.id, { recuperateur, verifierRobots: false });
    assert.equal(r.statut, "CONFIRMED");

    const apres = await prisma.prospect.findUniqueOrThrow({ where: { id: p.id } });
    assert.ok(apres.website?.includes("boulangeriedupont.fr"));
    assert.equal(apres.websiteStatus, "CONFIRMED");

    const source = await prisma.source.findFirst({ where: { prospectId: p.id, kind: "WEBSITE" } });
    assert.ok(source, "aucune source enregistrée pour le site trouvé");
  });

  test("UN SITE NON PROUVÉ N'EST JAMAIS ENREGISTRÉ", async () => {
    const p = await prospectSansSite({ nom: "Boulangerie Dupont", postalCode: "59000" });
    const { recuperateur } = recuperateurSimule({
      // Le site d'un homonyme bordelais : il répond, il porte le nom, mais
      // ce n'est pas la même entreprise.
      "boulangeriedupont.fr": "<html><body>Boulangerie Dupont — 33000 Bordeaux</body></html>",
    });

    const r = await discoverWebsite(p.id, { recuperateur, verifierRobots: false });
    assert.equal(r.statut, "UNCONFIRMED");

    const apres = await prisma.prospect.findUniqueOrThrow({ where: { id: p.id } });
    assert.equal(apres.website, null, "un site non prouvé a été écrit dans la fiche");
    assert.equal(apres.websiteStatus, "UNCONFIRMED");
  });

  test("aucun domaine ne répond : l'entreprise est notée sans site", async () => {
    const p = await prospectSansSite({ nom: "Boulangerie Dupont" });
    const { recuperateur } = recuperateurSimule({});

    const r = await discoverWebsite(p.id, { recuperateur, verifierRobots: false });
    assert.equal(r.statut, "NOT_FOUND");
    assert.equal((await prisma.prospect.findUniqueOrThrow({ where: { id: p.id } })).website, null);
  });

  test("« sans site » et « site non prouvé » sont deux constats différents", async () => {
    const a = await prospectSansSite({ nom: "Alpha Menuiserie Nord" });
    const b = await prospectSansSite({ nom: "Beta Menuiserie Sud" });

    const rA = await discoverWebsite(a.id, { recuperateur: recuperateurSimule({}).recuperateur, verifierRobots: false });
    const rB = await discoverWebsite(b.id, {
      recuperateur: recuperateurSimule({
        "betamenuiseriesud.fr": "<html><body>Menuiserie — 75000 Paris</body></html>",
      }).recuperateur,
      verifierRobots: false,
    });

    assert.equal(rA.statut, "NOT_FOUND");
    assert.equal(rB.statut, "UNCONFIRMED");
  });

  test("les mentions légales sont consultées pour y trouver le SIREN", async () => {
    const p = await prospectSansSite({ nom: "Menuiserie Lambert", siret: "98765432100022" });
    const { recuperateur, appels } = recuperateurSimule({
      "menuiserielambert.fr":
        '<html><body>Menuiserie Lambert<a href="/mentions-legales">Mentions légales</a></body></html>',
      "https://menuiserielambert.fr/mentions-legales":
        "<html><body>SIREN 987654321 — RCS Lille</body></html>",
    });

    const r = await discoverWebsite(p.id, { recuperateur, verifierRobots: false });
    assert.equal(r.statut, "CONFIRMED", r.raison);
    assert.ok(appels.some((u) => u.includes("mentions-legales")), "les mentions légales n'ont pas été lues");
  });

  test("un site déjà fourni par la source n'est pas re-deviné", async () => {
    const p = await prisma.prospect.create({
      data: {
        name: uid("Salon"), sector: "Coiffure", city: "Lille",
        website: "https://exemple.test", websiteStatus: "UNKNOWN",
      },
    });
    const { recuperateur, appels } = recuperateurSimule({});

    const r = await discoverWebsite(p.id, { recuperateur, verifierRobots: false });
    assert.equal(r.statut, "PROVIDED");
    assert.equal(appels.length, 0, "des requêtes ont été faites alors que le site était connu");
  });

  test("chaque candidat rejeté garde la raison de son rejet", async () => {
    const p = await prospectSansSite({ nom: "Boulangerie Dupont" });
    const { recuperateur } = recuperateurSimule({});
    const r = await discoverWebsite(p.id, { recuperateur, verifierRobots: false });

    assert.ok(r.candidats.length > 0);
    for (const c of r.candidats) {
      assert.ok(c.issue.length > 0, `${c.domaine} rejeté sans raison`);
    }

    const apres = await prisma.prospect.findUniqueOrThrow({ where: { id: p.id } });
    const preuve = JSON.parse(apres.websiteEvidence ?? "{}");
    assert.ok(Array.isArray(preuve.candidats), "la démarche n'est pas conservée");
  });

  test("un code d'erreur réseau non textuel ne fait pas planter la recherche", async () => {
    // Régression : `errorCode` est déclaré comme une chaîne mais la couche
    // réseau y met parfois un code numérique. Tout appelant qui faisait
    // confiance à la déclaration plantait sur une simple erreur DNS — et le
    // prospect concerné revenait à chaque tour du worker.
    const p = await prospectSansSite({ nom: "Menuiserie Fantome" });
    const recuperateur = async (url: string): Promise<FetchedPage> =>
      fakePage({
        requestedUrl: url, finalUrl: url, ok: false, status: 0, html: "",
        errorCode: -3008 as unknown as string,
      });

    const r = await discoverWebsite(p.id, { recuperateur, verifierRobots: false });
    assert.equal(r.statut, "NOT_FOUND");
    assert.ok(r.candidats.length > 0);
  });

  test("un nom inexploitable ne déclenche aucune requête", async () => {
    const p = await prospectSansSite({ nom: "SA" });
    const { recuperateur, appels } = recuperateurSimule({});
    const r = await discoverWebsite(p.id, { recuperateur, verifierRobots: false });

    assert.equal(r.statut, "NOT_FOUND");
    assert.equal(appels.length, 0);
  });
});
