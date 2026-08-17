// CRM — un client signe genere un projet complet, sans rien inventer
// et sans rien signer ni encaisser automatiquement.
import { test, describe, beforeEach, after } from "node:test";
import assert from "node:assert/strict";

import { prisma } from "@/lib/db";
import {
  createClientFromProspect,
  projectStatus,
  receiveOnboardingItem,
  advanceProject,
  tasksForOffer,
  onboardingForOffer,
} from "@/lib/crm";
import { OFFERS } from "@/lib/constants";
import { resetDatabase, seedProspect } from "./helpers";

describe("Modèles de production", () => {
  test("chaque offre a un plan de tâches et une checklist d'onboarding", () => {
    for (const offer of ["ESSENTIAL", "PREMIUM", "ULTIMATE"] as const) {
      const tasks = tasksForOffer(offer);
      const onboarding = onboardingForOffer(offer);
      assert.ok(tasks.length > 0, `${offer} sans tâche`);
      assert.ok(onboarding.length > 0, `${offer} sans onboarding`);
      for (const t of tasks) {
        assert.ok(t.title.length > 0);
        assert.ok(t.phase.length > 0);
      }
    }
  });

  test("une offre supérieure contient au moins autant de travail", () => {
    assert.ok(tasksForOffer("PREMIUM").length >= tasksForOffer("ESSENTIAL").length);
    assert.ok(tasksForOffer("ULTIMATE").length >= tasksForOffer("PREMIUM").length);
  });

  test("les clés d'onboarding sont uniques par offre", () => {
    for (const offer of ["ESSENTIAL", "PREMIUM", "ULTIMATE"] as const) {
      const keys = onboardingForOffer(offer).map((o) => o.key);
      assert.equal(new Set(keys).size, keys.length, `clés dupliquées pour ${offer}`);
    }
  });
});

describe("Création d'un client", () => {
  beforeEach(async () => { await resetDatabase(); });
  after(async () => { await prisma.$disconnect(); });

  test("crée client, projet, tâches, onboarding, documents et échéancier", async () => {
    const result = await createClientFromProspect({
      companyName: "Studio Nord",
      offer: "PREMIUM",
      contactEmail: "contact@studio-nord.fr",
    });
    assert.equal(result.created, true);
    assert.equal(result.client.offer, "PREMIUM");
    assert.equal(result.client.offerPrice, OFFERS.PREMIUM.price);

    const projectId = result.project!.id;
    const [tasks, onboarding, documents, payments] = await Promise.all([
      prisma.task.count({ where: { projectId } }),
      prisma.onboardingItem.count({ where: { projectId } }),
      prisma.document.findMany({ where: { clientId: result.client.id } }),
      prisma.payment.findMany({ where: { clientId: result.client.id } }),
    ]);

    assert.ok(tasks > 0, "aucune tâche créée");
    assert.ok(onboarding > 0, "aucune information à demander");
    assert.ok(documents.length >= 3, "documents de départ manquants");
    assert.ok(payments.length >= 1, "aucun échéancier");
  });

  test("aucun document n'est signé ni approuvé automatiquement", async () => {
    const result = await createClientFromProspect({
      companyName: "Studio Sud",
      offer: "ESSENTIAL",
      contactEmail: "contact@studio-sud.fr",
    });
    const documents = await prisma.document.findMany({ where: { clientId: result.client.id } });

    for (const doc of documents) {
      assert.notEqual(doc.status, "SIGNED", `${doc.type} signé sans validation humaine`);
      assert.equal(doc.approvedAt, null, `${doc.type} approuvé automatiquement`);
    }
    const contract = documents.find((d) => d.type === "CONTRAT");
    assert.ok(contract, "aucun contrat généré");
    assert.equal(contract!.requiresApproval, true);
  });

  test("aucun paiement n'est encaissé automatiquement", async () => {
    const result = await createClientFromProspect({
      companyName: "Studio Est",
      offer: "ULTIMATE",
      contactEmail: "contact@studio-est.fr",
    });
    const payments = await prisma.payment.findMany({ where: { clientId: result.client.id } });
    for (const p of payments) {
      assert.equal(p.status, "PAYMENT_PENDING", "un paiement a été marqué encaissé sans intervention");
      assert.equal(p.paidAt, null);
    }
  });

  test("reprend les informations du prospect au lieu d'en inventer", async () => {
    const prospect = await seedProspect({
      name: "Salon Vérifié",
      city: "Roubaix",
      email: "contact@salon-verifie.fr",
    });
    const result = await createClientFromProspect({
      companyName: prospect.name,
      offer: "PREMIUM",
      prospectId: prospect.id,
    });

    assert.equal(result.client.contactEmail, "contact@salon-verifie.fr");
    assert.equal(result.client.city, "Roubaix");
    assert.equal(result.client.prospectId, prospect.id);
  });

  test("refuse de créer un dossier client sans email réel plutôt que d'en inventer", async () => {
    const prospect = await seedProspect({ name: "Salon Sans Email", email: null });
    await assert.rejects(
      () =>
        createClientFromProspect({
          companyName: prospect.name,
          offer: "ESSENTIAL",
          prospectId: prospect.id,
        }),
      /aucune adresse ne sera inventée/i,
    );
  });

  test("refuse une offre inconnue", async () => {
    await assert.rejects(
      () => createClientFromProspect({ companyName: "X", offer: "GRATUIT" as never }),
      /Offre inconnue/,
    );
  });

  test("ne crée pas deux fois le même client", async () => {
    await createClientFromProspect({
      companyName: "Studio Unique",
      offer: "PREMIUM",
      contactEmail: "contact@studio-unique.fr",
    });
    const again = await createClientFromProspect({
      companyName: "Studio Unique",
      offer: "PREMIUM",
      contactEmail: "contact@studio-unique.fr",
    });

    assert.equal(again.created, false);
  });
});

describe("Onboarding et avancement", () => {
  beforeEach(async () => { await resetDatabase(); });

  test("le projet démarre bloqué tant que les informations manquent", async () => {
    const result = await createClientFromProspect({
      companyName: "Studio Ouest",
      offer: "ESSENTIAL",
      contactEmail: "contact@studio-ouest.fr",
    });
    const status = await projectStatus(result.project!.id);
    assert.ok(status.missingRequired.length > 0);
    assert.equal(status.readyToProduce, false);
  });

  test("une information reçue est enregistrée avec sa valeur", async () => {
    const result = await createClientFromProspect({
      companyName: "Studio Centre",
      offer: "ESSENTIAL",
      contactEmail: "contact@studio-centre.fr",
    });
    const projectId = result.project!.id;
    const first = await prisma.onboardingItem.findFirstOrThrow({
      where: { projectId, required: true },
      orderBy: { position: "asc" },
    });

    const received = await receiveOnboardingItem(projectId, first.key, "Valeur fournie par le client");
    assert.equal(received.item.status, "RECEIVED");
    assert.equal(received.item.value, "Valeur fournie par le client");
  });

  test("la production démarre quand toutes les informations obligatoires sont là", async () => {
    const result = await createClientFromProspect({
      companyName: "Studio Complet",
      offer: "ESSENTIAL",
      contactEmail: "contact@studio-complet.fr",
    });
    const projectId = result.project!.id;
    const required = await prisma.onboardingItem.findMany({ where: { projectId, required: true } });

    for (const item of required) {
      await receiveOnboardingItem(projectId, item.key, `valeur ${item.key}`);
    }

    const status = await projectStatus(projectId);
    assert.equal(status.readyToProduce, true);
    const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    assert.notEqual(project.phase, "ONBOARDING");
  });

  test("un projet n'avance pas tant que sa phase n'est pas terminée", async () => {
    const result = await createClientFromProspect({
      companyName: "Studio Bloqué",
      offer: "ESSENTIAL",
      contactEmail: "contact@studio-bloque.fr",
    });
    const outcome = await advanceProject(result.project!.id);
    assert.equal(outcome.advanced, false);
    assert.ok(outcome.reason.length > 5, "aucune raison donnée");
  });

  test("une information inconnue est refusée plutôt qu'inventée", async () => {
    const result = await createClientFromProspect({
      companyName: "Studio Inconnu",
      offer: "ESSENTIAL",
      contactEmail: "contact@studio-inconnu.fr",
    });
    await assert.rejects(() => receiveOnboardingItem(result.project!.id, "cle_inexistante", "x"));
  });
});
