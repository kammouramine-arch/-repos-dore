// ---------------------------------------------------------------------------
// CRM — bascule prospect > client, projet, taches, onboarding.
//
// « Nouveau client. Entreprise X. Offre PREMIUM. Prends le relais. »
// declenche : Client + Project + Tasks + OnboardingItems + Payment + Documents.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { OFFERS, type OfferKey } from "@/lib/constants";
import { logActivity } from "@/lib/activity";
import { tasksForOffer, onboardingForOffer } from "./blueprints";

export * from "./blueprints";

export type NewClientInput = {
  companyName: string;
  offer: OfferKey;
  contactEmail?: string;
  contactName?: string;
  contactPhone?: string;
  city?: string;
  sector?: string;
  prospectId?: string;
  withCare?: boolean;
  isDemo?: boolean;
  notes?: string;
};

export async function createClientFromProspect(input: NewClientInput) {
  const offerMeta = OFFERS[input.offer];
  if (!offerMeta) throw new Error(`Offre inconnue : ${input.offer}`);

  // Si un prospect existe, on reprend ses informations plutot que d'en inventer.
  let prospect = null;
  if (input.prospectId) {
    prospect = await prisma.prospect.findUnique({
      where: { id: input.prospectId },
      include: { primaryContact: true },
    });
  } else {
    prospect = await prisma.prospect.findFirst({
      where: { name: { contains: input.companyName } },
      include: { primaryContact: true },
    });
  }

  const contactEmail = input.contactEmail ?? prospect?.primaryContact?.email;
  if (!contactEmail) {
    throw new Error(
      `Aucune adresse email connue pour ${input.companyName}. Impossible de créer le dossier client sans un contact réel — aucune adresse ne sera inventée.`,
    );
  }

  const existing = await prisma.client.findFirst({
    where: { companyName: input.companyName, contactEmail },
  });
  if (existing) return { client: existing, project: null, created: false };

  const client = await prisma.client.create({
    data: {
      prospectId: prospect?.id,
      companyName: input.companyName,
      contactName: input.contactName,
      contactEmail,
      contactPhone: input.contactPhone ?? prospect?.phone ?? null,
      city: input.city ?? prospect?.city,
      sector: input.sector ?? prospect?.sector,
      offer: input.offer,
      offerPrice: offerMeta.price,
      status: "ONBOARDING",
      isDemo: input.isDemo ?? prospect?.isDemo ?? false,
      notes: input.notes,
    },
  });

  const project = await prisma.project.create({
    data: {
      clientId: client.id,
      name: `${input.companyName} — ${offerMeta.label}`,
      offer: input.offer,
      phase: "ONBOARDING",
      status: "ACTIVE",
    },
  });

  // Taches issues du plan de l'offre.
  const tasks = tasksForOffer(input.offer);
  await prisma.task.createMany({
    data: tasks.map((t, i) => ({
      projectId: project.id,
      title: t.title,
      description: t.description,
      category: t.category,
      phase: t.phase,
      requiresApproval: t.requiresApproval ?? false,
      waitingOnClient: t.waitingOnClient ?? false,
      position: i,
      status: t.waitingOnClient ? "BLOCKED" : "TODO",
      blockedReason: t.waitingOnClient ? "En attente des informations du client." : null,
    })),
  });

  // Informations a demander — uniquement celles utiles a cette offre.
  const onboarding = onboardingForOffer(input.offer);
  await prisma.onboardingItem.createMany({
    data: onboarding.map((o, i) => ({
      projectId: project.id,
      key: o.key,
      label: o.label,
      hint: o.hint,
      inputType: o.inputType,
      category: o.category,
      required: o.required,
      status: "MISSING",
      position: i,
    })),
  });

  // Echeance de paiement — jamais encaissee automatiquement.
  await prisma.payment.create({
    data: {
      clientId: client.id,
      label: `${offerMeta.label} — ${offerMeta.price} ${offerMeta.unit}`,
      amount: offerMeta.price,
      status: "PAYMENT_PENDING",
      note: "Aucun encaissement automatique. À enregistrer manuellement une fois reçu.",
    },
  });

  // Documents prepares en brouillon. Un contrat n'est jamais signe par l'agent.
  await prisma.document.createMany({
    data: [
      {
        clientId: client.id,
        projectId: project.id,
        type: "DEVIS",
        title: `Devis — ${offerMeta.label}`,
        status: "DRAFT",
        requiresApproval: true,
      },
      {
        clientId: client.id,
        projectId: project.id,
        type: "BRIEF",
        title: `Brief projet — ${input.companyName}`,
        status: "DRAFT",
        requiresApproval: false,
      },
      {
        clientId: client.id,
        projectId: project.id,
        type: "CONTRAT",
        title: `Contrat — ${offerMeta.label}`,
        status: "DRAFT",
        requiresApproval: true,
      },
    ],
  });

  if (input.withCare) {
    await prisma.careSubscription.create({
      data: {
        clientId: client.id,
        monthlyPrice: OFFERS.CARE.price,
        status: "ACTIVE",
        renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }

  if (prospect) {
    await prisma.prospect.update({
      where: { id: prospect.id },
      data: { status: "WON", lastInteractionAt: new Date(), nextAction: "Onboarding en cours" },
    });
    await prisma.statusEvent.create({
      data: {
        prospectId: prospect.id,
        fromStatus: prospect.status,
        toStatus: "WON",
        reason: `Devenu client — offre ${input.offer}.`,
        actor: "HUMAN",
      },
    });
  }

  await logActivity({
    actor: "AGENT",
    module: "CRM",
    action: "crm.create_client",
    entityType: "Client",
    entityId: client.id,
    summary: `Client créé : ${input.companyName} (${offerMeta.label}, ${offerMeta.price} ${offerMeta.unit}). Projet, ${tasks.length} tâche(s) et ${onboarding.length} information(s) à demander générés.`,
    details: { offer: input.offer, tasks: tasks.length, onboarding: onboarding.length },
  });

  return { client, project, created: true };
}

/** Ce qui manque pour avancer, et ce qui est debloque. */
export async function projectStatus(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      client: true,
      tasks: { orderBy: { position: "asc" } },
      onboarding: { orderBy: { position: "asc" } },
    },
  });
  if (!project) throw new Error("Projet introuvable.");

  const missing = project.onboarding.filter((o) => o.status === "MISSING" && o.required);
  const optional = project.onboarding.filter((o) => o.status === "MISSING" && !o.required);
  const done = project.tasks.filter((t) => t.status === "DONE").length;
  const blocked = project.tasks.filter((t) => t.status === "BLOCKED");

  return {
    project,
    progress: project.tasks.length ? Math.round((done / project.tasks.length) * 100) : 0,
    tasksDone: done,
    tasksTotal: project.tasks.length,
    missingRequired: missing,
    missingOptional: optional,
    blocked,
    readyToProduce: missing.length === 0,
  };
}

/** Enregistre une information recue et debloque ce qui peut l'etre. */
export async function receiveOnboardingItem(projectId: string, key: string, value: string) {
  const item = await prisma.onboardingItem.findUnique({
    where: { projectId_key: { projectId, key } },
  });
  if (!item) throw new Error(`Information « ${key} » inconnue pour ce projet.`);

  const updated = await prisma.onboardingItem.update({
    where: { id: item.id },
    data: { status: "RECEIVED", value, receivedAt: new Date() },
  });

  const status = await projectStatus(projectId);

  // Toutes les informations obligatoires recues : la production peut demarrer.
  if (status.readyToProduce) {
    await prisma.task.updateMany({
      where: { projectId, waitingOnClient: true, status: "BLOCKED" },
      data: { status: "TODO", blockedReason: null },
    });
    await prisma.project.update({ where: { id: projectId }, data: { phase: "CONTENT" } });
  }

  await logActivity({
    actor: "SYSTEM",
    module: "PROJECT",
    action: "project.onboarding_received",
    entityType: "Project",
    entityId: projectId,
    summary: `Information « ${updated.label} » reçue.${status.readyToProduce ? " Toutes les informations obligatoires sont réunies : la production peut démarrer." : ` Il manque encore ${status.missingRequired.length} information(s) obligatoire(s).`}`,
  });

  return { item: updated, readyToProduce: status.readyToProduce, missing: status.missingRequired };
}

export async function advanceProject(projectId: string) {
  const status = await projectStatus(projectId);
  const { project } = status;

  const phaseOrder = ["ONBOARDING", "CONTENT", "PRODUCTION", "QA", "DELIVERY", "DONE"];
  const currentIndex = phaseOrder.indexOf(project.phase);
  const phaseTasks = project.tasks.filter((t) => t.phase === project.phase);
  const phaseDone = phaseTasks.every((t) => t.status === "DONE" || t.status === "SKIPPED");

  if (!phaseDone) {
    return {
      advanced: false,
      phase: project.phase,
      reason: `${phaseTasks.filter((t) => t.status !== "DONE" && t.status !== "SKIPPED").length} tâche(s) restante(s) dans la phase ${project.phase}.`,
    };
  }

  if (currentIndex >= phaseOrder.length - 1) {
    return { advanced: false, phase: project.phase, reason: "Projet déjà terminé." };
  }

  const nextPhase = phaseOrder[currentIndex + 1];
  await prisma.project.update({
    where: { id: projectId },
    data: {
      phase: nextPhase,
      ...(nextPhase === "DONE" ? { status: "DONE", deliveredAt: new Date() } : {}),
    },
  });

  await logActivity({
    actor: "AGENT",
    module: "PROJECT",
    action: "project.advance",
    entityType: "Project",
    entityId: projectId,
    summary: `Projet ${project.name} : phase ${project.phase} terminée, passage en ${nextPhase}.`,
  });

  return { advanced: true, phase: nextPhase, reason: `Phase ${project.phase} terminée.` };
}
