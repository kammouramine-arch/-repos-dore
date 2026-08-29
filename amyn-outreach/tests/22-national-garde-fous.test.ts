// ---------------------------------------------------------------------------
// LA PROSPECTION NATIONALE NE CONTOURNE AUCUN GARDE-FOU
//
// C'est le test qui compte le plus de ce lot. Ouvrir la prospection à la
// France entière multiplie le volume par plusieurs milliers ; si un seul
// chemin permettait de sauter l'approbation, l'opposition ou le plafond, ce
// n'est plus un défaut, c'est une campagne de spam nationale.
//
// L'approche est délibérée : plutôt que de vérifier que le balayage « pense »
// à appeler les contrôles, on vérifie qu'il n'a AUCUN moyen de les atteindre.
// Un balayage qui ne sait pas approuver ne peut pas mal approuver.
// ---------------------------------------------------------------------------

import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import { planTerritories } from "@/lib/territory";
import { sweepTerritory } from "@/lib/territory/sweep";
import { jobSweepTerritories } from "@/lib/scheduler/jobs";
import { runComplianceChecks, addToSuppressionList } from "@/lib/campaign/compliance";
import { getPolicy } from "@/lib/policy";
import { AnnuaireClient } from "@/lib/research/annuaire/client";
import { annuaireSimule, registreTest, type UniteSimulee } from "./annuaire-simule";
import {
  resetDatabase, seedProspect, seedProvenIssue, seedDraft, codeSansCommentaires,
} from "./helpers";

const racine = resolve(import.meta.dirname, "..");
const sansAttente = { attendre: async () => {}, delaiEntrePagesMs: 0 };

function clientAvec(registre: UniteSimulee[]) {
  const sim = annuaireSimule({ registre });
  return new AnnuaireClient({ transport: sim.transport, ...sansAttente });
}

async function territoireBalaye(registre: UniteSimulee[]) {
  await planTerritories({ zones: ["59"], secteurs: ["restaurant"] });
  const t = await prisma.territory.findFirstOrThrow();
  await sweepTerritory(t.id, { annuaire: clientAvec(registre), maxPages: 5 });
  return t;
}

before(async () => { await resetDatabase(); });
beforeEach(async () => { await resetDatabase(); });

describe("Le balayage national n'atteint jamais l'envoi", () => {
  test("aucun module de balayage n'importe le module d'envoi", () => {
    for (const fichier of [
      "lib/territory/index.ts",
      "lib/territory/sweep.ts",
      "lib/research/annuaire/client.ts",
      "lib/research/annuaire/index.ts",
    ]) {
      const source = codeSansCommentaires(readFileSync(resolve(racine, fichier), "utf-8"));
      assert.doesNotMatch(source, /from "@\/lib\/campaign\/send"/, `${fichier} importe l'envoi`);
      assert.doesNotMatch(source, /sendOne|runCampaign|sendTestEmail/, `${fichier} peut envoyer`);
    }
  });

  test("aucun module de balayage ne sait approuver un email", () => {
    for (const fichier of ["lib/territory/index.ts", "lib/territory/sweep.ts"]) {
      const source = codeSansCommentaires(readFileSync(resolve(racine, fichier), "utf-8"));
      assert.doesNotMatch(source, /approvedAt/, `${fichier} touche à l'approbation`);
      assert.doesNotMatch(source, /approveCampaignMembers/, `${fichier} approuve des envois`);
    }
  });

  test("un balayage complet ne produit ni brouillon, ni envoi, ni approbation", async () => {
    await territoireBalaye(registreTest(50));

    assert.equal(await prisma.prospect.count(), 50, "les prospects devraient être découverts");
    assert.equal(await prisma.emailDraft.count(), 0, "un email a été rédigé par le balayage");
    assert.equal(await prisma.sendLog.count(), 0, "un envoi a été enregistré par le balayage");
    assert.equal(await prisma.campaign.count(), 0, "une campagne a été créée par le balayage");
  });

  test("les prospects découverts naissent au statut FOUND, jamais READY", async () => {
    await territoireBalaye(registreTest(20));
    const pretsAPartir = await prisma.prospect.count({
      where: { status: { in: ["READY", "CONTACTED"] } },
    });
    assert.equal(pretsAPartir, 0, "un prospect découvert était déjà prêt à être contacté");
  });

  test("aucun prospect découvert n'est qualifié d'office", async () => {
    await territoireBalaye(registreTest(20));
    const qualifies = await prisma.prospect.count({ where: { qualification: "QUALIFIED" } });
    assert.equal(qualifies, 0, "le balayage a qualifié des prospects sans preuve");
  });

  test("le job de balayage n'envoie rien non plus", async () => {
    await planTerritories({ zones: ["59"], secteurs: ["restaurant"] });
    await jobSweepTerritories({ maxTerritories: 1, maxPages: 1 });
    assert.equal(await prisma.sendLog.count(), 0);
    assert.equal(await prisma.emailDraft.count(), 0);
  });
});

describe("L'opposition reste absolue, quel que soit le volume", () => {
  test("une adresse en opposition est refusée même sur un prospect découvert nationalement", async () => {
    const t = await territoireBalaye(registreTest(3));
    const prospect = await prisma.prospect.findFirstOrThrow({ where: { territoryId: t.id } });

    const contact = await prisma.contact.create({
      data: {
        prospectId: prospect.id,
        email: "stop@exemple.fr",
        isGeneric: true,
        discoveryMethod: "WEBSITE_CONTACT",
        sourceUrl: "https://exemple.fr/contact",
        validationStatus: "SYNTAX_OK",
        isPrimary: true,
      },
    });
    await prisma.prospect.update({
      where: { id: prospect.id },
      data: { primaryContactId: contact.id },
    });
    const issue = await seedProvenIssue(prospect.id);
    const draft = await seedDraft(prospect.id, { issueIds: [issue.id] });

    await addToSuppressionList({ email: "stop@exemple.fr", reason: "UNSUBSCRIBED" });

    const rapport = await runComplianceChecks({
      prospectId: prospect.id,
      draftId: draft.id,
      step: 0,
    });
    const optOut = rapport.checks.find((c) => c.name === "CHECK_OPT_OUT");
    assert.equal(optOut?.passed, false, "une adresse en opposition a passé le contrôle");
    assert.equal(rapport.allowed, false);
  });

  test("la liste d'opposition n'est jamais vidée par un balayage", async () => {
    await addToSuppressionList({ email: "stop@exemple.fr", reason: "UNSUBSCRIBED" });
    await territoireBalaye(registreTest(10));
    assert.equal(await prisma.suppression.count(), 1, "le balayage a effacé une opposition");
  });

  test("aucun module de balayage ne sait supprimer une opposition", () => {
    for (const fichier of ["lib/territory/index.ts", "lib/territory/sweep.ts"]) {
      const source = codeSansCommentaires(readFileSync(resolve(racine, fichier), "utf-8"));
      assert.doesNotMatch(source, /suppression\.delete/, `${fichier} peut lever une opposition`);
    }
  });
});

describe("Les contrôles avant envoi restent intacts", () => {
  test("un prospect national sans email vérifiable ne passe pas", async () => {
    const t = await territoireBalaye(registreTest(2));
    const prospect = await prisma.prospect.findFirstOrThrow({ where: { territoryId: t.id } });
    const issue = await seedProvenIssue(prospect.id);
    const draft = await seedDraft(prospect.id, { issueIds: [issue.id] });

    const rapport = await runComplianceChecks({
      prospectId: prospect.id,
      draftId: draft.id,
      step: 0,
    });
    assert.equal(rapport.allowed, false);
    const email = rapport.checks.find((c) => c.name === "CHECK_EMAIL_PRESENT");
    assert.equal(email?.passed, false, "un prospect sans email a passé le contrôle");
  });

  test("un email non approuvé est refusé", async () => {
    const prospect = await seedProspect({ email: "contact@exemple.fr", status: "READY" });
    const issue = await seedProvenIssue(prospect.id);
    const draft = await seedDraft(prospect.id, { issueIds: [issue.id] });

    const rapport = await runComplianceChecks({
      prospectId: prospect.id,
      draftId: draft.id,
      step: 0,
    });
    const approbation = rapport.checks.find((c) => c.name === "CHECK_APPROVAL");
    assert.equal(approbation?.passed, false, "un email non approuvé a passé le contrôle");
  });

  test("le plafond quotidien s'applique aux prospects nationaux comme aux autres", async () => {
    const policy = await getPolicy();
    assert.ok(policy.dailyLimit > 0, "le plafond quotidien a disparu");
    assert.ok(policy.minDelaySeconds > 0, "le délai minimum a disparu");
    assert.ok(policy.maxFollowUps >= 0, "la limite de relances a disparu");
    assert.equal(policy.autoReplyEnabled, false, "les réponses partiraient sans validation");
    assert.ok(policy.recontactCooldownDays > 0, "le délai de recontact a disparu");
  });
});

describe("Le mode simulation reste actif", () => {
  test("DRY_RUN est vrai pendant toute la suite", () => {
    assert.equal(config.dryRun, true, "les tests tournent hors mode simulation");
  });

  test("le balayage ne touche jamais à la configuration d'envoi", () => {
    for (const fichier of [
      "lib/territory/index.ts",
      "lib/territory/sweep.ts",
      "lib/research/annuaire/client.ts",
      "lib/reporting/national.ts",
    ]) {
      const source = codeSansCommentaires(readFileSync(resolve(racine, fichier), "utf-8"));
      assert.doesNotMatch(source, /DRY_RUN\s*=/, `${fichier} modifie DRY_RUN`);
      assert.doesNotMatch(source, /process\.env\.DRY_RUN\s*=/, `${fichier} force DRY_RUN`);
      assert.doesNotMatch(source, /setPolicy/, `${fichier} modifie la politique d'envoi`);
    }
  });
});

describe("Traçabilité", () => {
  test("chaque entreprise découverte garde sa source", async () => {
    await territoireBalaye(registreTest(10));
    const sansSource = await prisma.prospect.count({ where: { sources: { none: {} } } });
    assert.equal(sansSource, 0, "des prospects sans source d'origine");
  });

  test("chaque découverte laisse une trace de changement de statut", async () => {
    await territoireBalaye(registreTest(5));
    const evenements = await prisma.statusEvent.count({ where: { toStatus: "FOUND" } });
    assert.equal(evenements, 5);
  });

  test("le balayage est journalisé", async () => {
    await territoireBalaye(registreTest(5));
    const traces = await prisma.activityLog.count({ where: { action: "territory.sweep" } });
    assert.ok(traces >= 1, "aucun journal du balayage");
  });

  test("aucune adresse email n'est inventée à la découverte", async () => {
    await territoireBalaye(registreTest(20));
    assert.equal(await prisma.contact.count(), 0, "des contacts ont été fabriqués sans source");
  });
});

describe("Idempotence des jobs", () => {
  test("le job de balayage lancé deux fois dans la même minute ne travaille qu'une fois", async () => {
    await planTerritories({ zones: ["59"], secteurs: ["restaurant"] });

    const premier = await jobSweepTerritories({ maxTerritories: 1, maxPages: 1 });
    const second = await jobSweepTerritories({ maxTerritories: 1, maxPages: 1 });

    assert.equal(premier.skipped, false);
    assert.equal(second.skipped, true, "le verrou du job n'a pas tenu");
    assert.equal(second.itemsChanged, 0);
  });

  test("le verrou survit à un redémarrage : il est en base, pas en mémoire", async () => {
    await planTerritories({ zones: ["59"], secteurs: ["restaurant"] });
    await jobSweepTerritories({ maxTerritories: 1, maxPages: 1 });

    const verrous = await prisma.jobRun.count({ where: { job: "sweep-territories" } });
    assert.equal(verrous, 1);
  });
});
