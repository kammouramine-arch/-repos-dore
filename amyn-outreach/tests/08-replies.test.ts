// REPONSES — classement deterministe, tracable, avec consequences automatiques.
import { test, describe, beforeEach, after } from "node:test";
import assert from "node:assert/strict";

import { prisma } from "@/lib/db";
import { classifyReply } from "@/lib/replies/classify";
import { recordReply } from "@/lib/replies";
import { REPLY_CLASSES } from "@/lib/constants";
import { resetDatabase, seedProspect } from "./helpers";

describe("Classement des réponses", () => {
  test("le classement est déterministe", () => {
    const input = { subject: "Re: votre message", body: "Bonjour, quel est votre tarif ?" };
    assert.deepEqual(classifyReply(input), classifyReply(input));
  });

  test("la classe renvoyée appartient toujours au catalogue", () => {
    const samples = [
      "Ça m'intéresse, on peut en parler ?",
      "Combien ça coûte ?",
      "On peut se voir mardi ?",
      "Non merci",
      "Désinscrivez-moi de votre liste",
      "Recontactez-moi en septembre",
      "Delivery Status Notification (Failure)",
      "azerty qwerty",
    ];
    for (const body of samples) {
      const result = classifyReply({ subject: "Re:", body });
      assert.ok(
        (REPLY_CLASSES as readonly string[]).includes(result.classification),
        `classe hors catalogue : ${result.classification}`,
      );
    }
  });

  test("reconnaît une demande de prix", () => {
    const r = classifyReply({ subject: "Re:", body: "Bonjour, quel est votre tarif pour un site ?" });
    assert.equal(r.classification, "PRICE_REQUEST");
  });

  test("reconnaît une demande de rendez-vous", () => {
    const r = classifyReply({ subject: "Re:", body: "On peut se rencontrer mardi après-midi ?" });
    assert.equal(r.classification, "MEETING_REQUEST");
  });

  test("reconnaît un refus", () => {
    const r = classifyReply({ subject: "Re:", body: "Non merci, cela ne nous intéresse pas." });
    assert.equal(r.classification, "NOT_INTERESTED");
  });

  test("reconnaît une opposition", () => {
    for (const body of ["Désinscrivez-moi", "STOP", "Ne me contactez plus jamais"]) {
      assert.equal(classifyReply({ subject: "Re:", body }).classification, "OPT_OUT", body);
    }
  });

  test("reconnaît un rebond", () => {
    const r = classifyReply({
      subject: "Undelivered Mail Returned to Sender",
      body: "550 5.1.1 <contact@inconnu.fr>: Recipient address rejected: User unknown",
    });
    assert.equal(r.classification, "BOUNCE");
  });

  test("chaque classement conserve les expressions qui l'ont déclenché", () => {
    const r = classifyReply({ subject: "Re:", body: "Quel est votre tarif ?" });
    assert.ok(Array.isArray(r.matchedSignals));
    assert.ok(r.matchedSignals.length > 0, "aucune trace du raisonnement");
    assert.ok(r.reason.length > 5, "aucune explication du classement");
  });

  test("un texte ambigu n'est pas classé abusivement en intéressé", () => {
    const r = classifyReply({ subject: "Re:", body: "Bonjour." });
    assert.notEqual(r.classification, "INTERESTED");
  });
});

describe("Conséquences automatiques", () => {
  beforeEach(async () => { await resetDatabase(); });
  after(async () => { await prisma.$disconnect(); });

  test("une opposition ajoute l'adresse à la liste et bloque le prospect", async () => {
    const prospect = await seedProspect({ email: "contact@nonmerci.fr" });
    await recordReply({
      prospectId: prospect.id,
      fromEmail: "contact@nonmerci.fr",
      subject: "Re:",
      body: "Désinscrivez-moi de votre liste, ne me recontactez plus.",
    });

    const suppression = await prisma.suppression.findUnique({ where: { email: "contact@nonmerci.fr" } });
    assert.ok(suppression, "l'adresse n'a pas été ajoutée à la liste d'opposition");
    assert.equal(suppression!.reason, "UNSUBSCRIBED");

    const after = await prisma.prospect.findUniqueOrThrow({ where: { id: prospect.id } });
    assert.equal(after.status, "OPTOUT");
  });

  test("un rebond marque le SendLog et bloque l'adresse", async () => {
    const prospect = await seedProspect({ email: "contact@rebond.fr" });
    await prisma.sendLog.create({
      data: {
        prospectId: prospect.id,
        transport: "dry-run",
        status: "SIMULATED",
        dryRun: true,
        toEmail: "contact@rebond.fr",
        subject: "Un point sur votre site",
      },
    });

    await recordReply({
      prospectId: prospect.id,
      fromEmail: "contact@rebond.fr",
      subject: "Undelivered Mail Returned to Sender",
      body: "550 5.1.1 Recipient address rejected: User unknown",
    });

    const log = await prisma.sendLog.findFirstOrThrow({ where: { prospectId: prospect.id } });
    assert.equal(log.bounceType, "HARD");

    const suppression = await prisma.suppression.findUnique({ where: { email: "contact@rebond.fr" } });
    assert.equal(suppression?.reason, "BOUNCED");
  });

  test("la réponse enregistrée conserve les signaux en base", async () => {
    const prospect = await seedProspect({ email: "contact@signaux.fr" });
    await recordReply({
      prospectId: prospect.id,
      fromEmail: "contact@signaux.fr",
      subject: "Re:",
      body: "Quel est votre tarif ?",
    });

    const reply = await prisma.reply.findFirstOrThrow({ where: { prospectId: prospect.id } });
    const signals = JSON.parse(reply.matchedSignals ?? "[]");
    assert.ok(signals.length > 0, "les signaux ne sont pas conservés");
    assert.equal(reply.classification, "PRICE_REQUEST");
  });
});
