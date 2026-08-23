// ---------------------------------------------------------------------------
// Utilitaires de test.
//
// Les tests tournent sur prisma/test.db (voir scripts/run-tests.ts) et ne
// doivent effectuer AUCUN appel reseau.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import type { AuditContext, FetchedPage, ProspectInput } from "@/lib/audit/types";
import { parsePage } from "@/lib/audit/html";

/**
 * GARDE-FOU : les tests effacent la base. Ils ne doivent JAMAIS tourner sur
 * la base de travail. Lancer les tests via `npm test` (scripts/run-tests.ts),
 * qui pointe DATABASE_URL vers prisma/test.db.
 */
const DB_URL = process.env.DATABASE_URL ?? "";
if (!/test\.db/.test(DB_URL)) {
  throw new Error(
    `[AMYN] Tests interrompus : DATABASE_URL vaut « ${DB_URL} », ce n'est pas une base de test. ` +
      "Lancez « npm test » (qui isole les tests sur prisma/test.db) au lieu d'exécuter un fichier de test directement.",
  );
}

let counter = 0;
export function uid(prefix = "t"): string {
  counter += 1;
  return `${prefix}-${process.pid}-${counter}`;
}

/** Page HTTP synthetique : aucune requete reseau n'est effectuee. */
export function fakePage(overrides: Partial<FetchedPage> & { html?: string }): FetchedPage {
  const html = overrides.html ?? "<html><body></body></html>";
  return {
    requestedUrl: "https://exemple.test/",
    finalUrl: "https://exemple.test/",
    ok: true,
    status: 200,
    statusText: "OK",
    contentType: "text/html; charset=utf-8",
    html,
    bytes: Buffer.byteLength(html),
    durationMs: 120,
    redirected: false,
    headers: {},
    ...overrides,
  };
}

export function fakeProspectInput(overrides: Partial<ProspectInput> = {}): ProspectInput {
  return {
    id: uid("p"),
    name: "Entreprise Test",
    sector: "coiffeur",
    city: "Lille",
    website: "https://exemple.test",
    googleBusinessUrl: null,
    googlePlaceId: null,
    instagramUrl: null,
    phone: "0320000000",
    email: null,
    sourceLabels: ["OpenStreetMap"],
    ...overrides,
  };
}

/** Contexte d'audit entierement hors ligne. */
export function fakeContext(
  pages: FetchedPage[],
  overrides: Partial<AuditContext> = {},
): AuditContext {
  const home = pages[0] ?? null;
  const parsed = pages.filter((p) => p.ok).map(parsePage);
  const parsedHome = home && home.ok ? parsePage(home) : null;

  return {
    prospect: fakeProspectInput(),
    parsed,
    parsedHome,
    home,
    pages: pages.slice(1),
    allPages: pages,
    combinedText: parsed.map((p) => p.text).join("\n").toLowerCase(),
    siteReachable: Boolean(home?.ok),
    robotsBlocked: false,
    probe: async () => ({ status: 200, ok: true }),
    startedAt: new Date(),
    userAgent: "AmynOutreachBot/1.0 (tests)",
    ...overrides,
  };
}

/** Cree un prospect reel en base de test, avec un contact verifie si demande. */
export async function seedProspect(options: {
  name?: string;
  city?: string;
  email?: string | null;
  isDemo?: boolean;
  status?: string;
  website?: string | null;
} = {}) {
  const name = options.name ?? uid("Entreprise");
  const prospect = await prisma.prospect.create({
    data: {
      name,
      sector: "coiffeur",
      city: options.city ?? "Lille",
      website: options.website === undefined ? "https://exemple.test" : options.website,
      status: options.status ?? "FOUND",
      isDemo: options.isDemo ?? false,
    },
  });

  await prisma.source.create({
    data: {
      prospectId: prospect.id,
      kind: "OSM",
      label: "OpenStreetMap",
      url: "https://www.openstreetmap.org/",
      note: uid("osm"),
    },
  });

  if (options.email) {
    const contact = await prisma.contact.create({
      data: {
        prospectId: prospect.id,
        email: options.email,
        isGeneric: true,
        discoveryMethod: "WEBSITE_CONTACT",
        sourceUrl: "https://exemple.test/contact",
        sourceSnippet: `Nous écrire : ${options.email}`,
        validationStatus: "SYNTAX_OK",
      },
    });
    await prisma.prospect.update({
      where: { id: prospect.id },
      data: { primaryContactId: contact.id },
    });
  }

  return prisma.prospect.findUniqueOrThrow({
    where: { id: prospect.id },
    include: { primaryContact: true },
  });
}

/** Cree un probleme PROUVE (verification VERIFIED + Issue liee). */
export async function seedProvenIssue(prospectId: string, type = "NO_HTTPS") {
  const run = await prisma.auditRun.create({
    data: {
      prospectId,
      status: "COMPLETE",
      userAgent: "AmynOutreachBot/1.0 (tests)",
      rulesRun: 1,
      startedAt: new Date(),
      finishedAt: new Date(),
    },
  });
  const check = await prisma.auditCheck.create({
    data: {
      prospectId,
      auditRunId: run.id,
      ruleId: "sec.https",
      ruleLabel: "HTTPS",
      category: "SECURITE",
      verdict: "VERIFIED",
      confidence: "HIGH",
      isProblem: true,
      observation: "La page d'accueil répond en http:// et non en https://.",
      method: "Requête HTTP GET unique sur l'URL d'accueil.",
      targetUrl: "http://exemple.test/",
      evidenceSnippet: "HTTP/1.1 200 OK",
    },
  });
  return prisma.issue.create({
    data: {
      prospectId,
      auditCheckId: check.id,
      ruleId: "sec.https",
      type,
      severity: "HIGH",
      confidence: "HIGH",
      title: "Le site n'est pas en HTTPS",
      summary: check.observation,
      evidenceUrl: check.targetUrl,
      evidenceSnippet: check.evidenceSnippet,
      evidenceNote: check.method,
    },
  });
}

export async function seedDraft(prospectId: string, options: { campaignId?: string; issueIds?: string[] } = {}) {
  return prisma.emailDraft.create({
    data: {
      prospectId,
      campaignId: options.campaignId,
      subject: "Un point sur votre site",
      body: [
        "Bonjour,",
        "",
        "En consultant votre site, j'ai constaté qu'il répond en http:// et non en https://.",
        "",
        "Si le sujet vous intéresse, je peux vous en dire plus.",
        "",
        "Amine — AMYN, Web & Growth, Lille",
        "contact@amyn.agency",
        "",
        "Répondez STOP pour ne plus recevoir de message de ma part.",
      ].join("\n"),
      citedIssueIds: JSON.stringify(options.issueIds ?? []),
      isActive: true,
      generator: "template",
      verificationPassed: true,
    },
  });
}

/** Vide toutes les tables entre deux suites. */
export async function resetDatabase() {
  await prisma.$transaction([
    prisma.careEvent.deleteMany(),
    prisma.careSubscription.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.document.deleteMany(),
    prisma.onboardingItem.deleteMany(),
    prisma.task.deleteMany(),
    prisma.project.deleteMany(),
    prisma.client.deleteMany(),
    prisma.reply.deleteMany(),
    prisma.sendLog.deleteMany(),
    prisma.emailDraft.deleteMany(),
    prisma.campaignMember.deleteMany(),
    prisma.campaign.deleteMany(),
    prisma.suppression.deleteMany(),
    prisma.issue.deleteMany(),
    prisma.auditCheck.deleteMany(),
    prisma.auditRun.deleteMany(),
    prisma.statusEvent.deleteMany(),
    prisma.source.deleteMany(),
    prisma.agentAction.deleteMany(),
    prisma.agentRun.deleteMany(),
    prisma.activityLog.deleteMany(),
    prisma.setting.deleteMany(),
    prisma.imapSyncState.deleteMany(),
    prisma.jobRun.deleteMany(),
    prisma.missionStep.deleteMany(),
    prisma.mission.deleteMany(),
  ]);
  // Les contacts referencent les prospects et inversement : on casse le lien.
  await prisma.prospect.updateMany({ data: { primaryContactId: null } });
  await prisma.contact.deleteMany();
  await prisma.prospect.deleteMany();
}
