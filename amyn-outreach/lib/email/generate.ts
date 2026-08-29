// ---------------------------------------------------------------------------
// GENERATION D'EMAILS
//
// Deux generateurs, meme contrat :
//   • "template" — deterministe, sans cle API, fonctionne immediatement.
//     L'email est construit A PARTIR des Issue prouvees : un prospect avec un
//     formulaire casse et un prospect sans site recoivent des emails
//     structurellement differents.
//   • "claude"   — via l'API Anthropic quand ANTHROPIC_API_KEY est presente.
//     Le modele ne recoit QUE les faits prouves, et sa sortie passe par la
//     meme verification que le mode template.
//
// Dans les deux cas : verifyEmail() a le dernier mot.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import { offerMeta } from "@/lib/constants";
import { logActivity } from "@/lib/activity";
import { getAngle } from "./angles";
import { verifyEmail, catalogNumbers, numbersFromEvidence, type VerificationResult } from "./verify";

export type GeneratedEmail = {
  subject: string;
  body: string;
  citedIssueIds: string[];
  generator: "template" | "claude";
  model?: string;
  verification: VerificationResult;
};

const SIGNATURE_LINES = (senderEmail: string) => [
  "",
  "Amyn",
  "AMYN — Web & Growth, Lille",
  senderEmail,
  "",
  "Si vous ne souhaitez pas recevoir d'autre message de ma part, répondez simplement",
  "« STOP » : je vous retire immédiatement de ma liste et ne vous recontacte plus.",
];

type IssueForEmail = {
  id: string;
  type: string;
  severity: string;
  title: string;
  summary: string;
  evidenceUrl: string | null;
  evidenceSnippet?: string | null;
  evidenceNote?: string | null;
};

/** Un email cite au plus trois constats. Au-dela, il se lit comme un audit. */
export const MAX_OBSERVATIONS = 3;

/**
 * Choisit 1 a 3 problemes reellement constates, du plus fort au plus faible.
 *
 * DEUX EXIGENCES. Chaque constat retenu doit venir d'une Issue prouvee — il
 * n'existe aucun chemin permettant d'en fabriquer une. Et deux constats
 * retenus ne peuvent pas partager le meme angle : repeter « votre site est
 * lent » sous trois formulations n'apporte rien et sonne faux.
 */
export function selectIssues(issues: IssueForEmail[]): IssueForEmail[] {
  const withAngle = issues.filter((i) => getAngle(i.type));
  if (withAngle.length === 0) return [];

  const severityRank: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  const sorted = [...withAngle].sort((a, b) => {
    const sev = (severityRank[a.severity] ?? 3) - (severityRank[b.severity] ?? 3);
    if (sev !== 0) return sev;
    return (getAngle(a.type)?.priority ?? 99) - (getAngle(b.type)?.priority ?? 99);
  });

  const retenus: IssueForEmail[] = [];
  const anglesPris = new Set<number>();

  for (const issue of sorted) {
    const angle = getAngle(issue.type)!;
    if (anglesPris.has(angle.priority)) continue;
    retenus.push(issue);
    anglesPris.add(angle.priority);
    if (retenus.length >= MAX_OBSERVATIONS) break;
  }

  return retenus;
}

/**
 * Presentation d'AMYN, adaptee a la geographie du prospect.
 *
 * POURQUOI CE N'EST PAS UN DETAIL. La formule d'origine annoncait « les
 * commerces de la metropole lilloise » a tout le monde. Tant que la
 * prospection se limitait a Lille, c'etait vrai. A l'echelle nationale, c'est
 * faux pour un commercant de Marseille — et une premiere phrase fausse
 * disqualifie tout le message. AMYN est bien a Lille : on le dit, sans
 * pretendre etre du quartier de quelqu'un qui ne l'est pas.
 */
function presentation(prospect: {
  city: string;
  departement?: string | null;
  postalCode?: string | null;
}): string {
  // Le departement peut manquer sur les prospects importes avant son ajout :
  // le code postal le donne alors sans rien deviner.
  const departement = prospect.departement ?? prospect.postalCode?.slice(0, 2) ?? null;
  const metropoleLilloise = departement === "59" || departement === "62";

  return metropoleLilloise
    ? "Je suis Amyn, je crée des sites pour les commerces et petites entreprises des Hauts-de-France."
    : "Je suis Amyn, je crée des sites pour les commerces et petites entreprises. " +
        "Je suis basé à Lille et je travaille à distance partout en France.";
}

function buildTemplateEmail(
  prospect: {
    name: string;
    city: string;
    sector: string;
    departement?: string | null;
    postalCode?: string | null;
  },
  selected: IssueForEmail[],
  offerKey: string | null,
  senderEmail: string,
  step: number,
): { subject: string; body: string } {
  const ctx = {
    company: prospect.name,
    city: prospect.city,
    sector: prospect.sector,
    offer: offerKey as never,
  };

  const primary = selected[0];
  const primaryAngle = getAngle(primary.type)!;
  const offer = offerMeta(offerKey);

  const subject =
    step === 0
      ? primaryAngle.subject({ ...ctx, evidenceUrl: primary.evidenceUrl })
      : `Re : ${primaryAngle.subject({ ...ctx, evidenceUrl: primary.evidenceUrl })}`;

  const lines: string[] = ["Bonjour,", ""];

  if (step === 0) {
    lines.push(
      `Je suis tombé sur ${prospect.name} en cherchant un ${prospect.sector.toLowerCase()} à ${prospect.city}, et ${primaryAngle.observation({ ...ctx, evidenceUrl: primary.evidenceUrl })}.`,
      "",
      primaryAngle.consequence({ ...ctx, evidenceUrl: primary.evidenceUrl }),
    );

    if (selected[1]) {
      const secondAngle = getAngle(selected[1].type)!;
      lines.push(
        "",
        `J'ai aussi noté que ${secondAngle.observation({ ...ctx, evidenceUrl: selected[1].evidenceUrl })}.`,
      );
    }

    if (selected[2]) {
      const troisiemeAngle = getAngle(selected[2].type)!;
      lines.push(
        "",
        `Dernier point : ${troisiemeAngle.observation({ ...ctx, evidenceUrl: selected[2].evidenceUrl })}.`,
      );
    }

    lines.push("", presentation(prospect));

    if (offer) {
      lines.push(
        `Pour une situation comme la vôtre, je pense à mon offre ${offer.label} à ${offer.price} ${offer.unit}.`,
      );
    }

    lines.push(
      "",
      "Si le sujet vous intéresse, je peux vous montrer concrètement ce que cela donnerait.",
      "Sinon, dites-le moi et je n'insiste pas.",
    );
  } else {
    lines.push(
      `Je me permets de revenir vers vous au sujet de ${prospect.name}.`,
      "",
      `Mon message précédent portait sur un point précis : ${primaryAngle.observation({ ...ctx, evidenceUrl: primary.evidenceUrl })}.`,
      "",
      "Si ce n'est pas un sujet pour vous en ce moment, aucun problème — dites-le moi",
      "et j'arrête là.",
    );
  }

  lines.push(...SIGNATURE_LINES(senderEmail));
  return { subject, body: lines.join("\n") };
}

/** Chiffres autorises : grille AMYN, annee courante, et mesures prouvees. */
function allowedNumbers(evidenceTexts: Array<string | null | undefined> = []): number[] {
  return [...catalogNumbers(), ...numbersFromEvidence(evidenceTexts)];
}

export async function generateEmail(
  prospectId: string,
  options: { campaignId?: string; step?: number; generator?: "template" | "claude" } = {},
): Promise<GeneratedEmail & { draftId?: string }> {
  const prospect = await prisma.prospect.findUnique({
    where: { id: prospectId },
    include: {
      issues: {
        select: { id: true, type: true, severity: true, title: true, summary: true, evidenceUrl: true, evidenceSnippet: true, evidenceNote: true },
      },
      primaryContact: true,
    },
  });
  if (!prospect) throw new Error(`Prospect introuvable : ${prospectId}`);

  const selected = selectIssues(prospect.issues);
  if (selected.length === 0) {
    throw new Error(
      `Aucun problème exploitable pour ${prospect.name}. Un email ne peut pas être rédigé sans constat prouvé.`,
    );
  }

  const step = options.step ?? 0;
  const senderEmail = config.from.email;
  const useClaude =
    (options.generator ?? (process.env.ANTHROPIC_API_KEY ? "claude" : "template")) === "claude" &&
    Boolean(process.env.ANTHROPIC_API_KEY);

  let subject: string;
  let body: string;
  let generator: "template" | "claude" = "template";
  let model: string | undefined;

  if (useClaude) {
    try {
      const { generateWithClaude } = await import("./claude");
      const result = await generateWithClaude({
        prospect: { name: prospect.name, city: prospect.city, sector: prospect.sector },
        issues: selected,
        offerKey: prospect.recommendedOffer,
        senderEmail,
        step,
      });
      subject = result.subject;
      body = result.body;
      generator = "claude";
      model = result.model;
    } catch (err) {
      // Bascule silencieuse mais JOURNALISEE sur le generateur template :
      // le systeme continue de fonctionner sans dependance externe.
      await logActivity({
        actor: "SYSTEM",
        module: "EMAIL",
        action: "email.generate.fallback",
        entityType: "Prospect",
        entityId: prospectId,
        summary: `Génération Claude indisponible (${(err as Error).message}). Bascule sur le générateur template.`,
        level: "WARN",
      });
      const built = buildTemplateEmail(prospect, selected, prospect.recommendedOffer, senderEmail, step);
      subject = built.subject;
      body = built.body;
    }
  } else {
    const built = buildTemplateEmail(prospect, selected, prospect.recommendedOffer, senderEmail, step);
    subject = built.subject;
    body = built.body;
  }

  const verification = verifyEmail({
    subject,
    body,
    citedIssueIds: selected.map((i) => i.id),
    knownIssueIds: prospect.issues.map((i) => i.id),
    allowedNumbers: allowedNumbers(selected.flatMap((i) => [i.summary, i.evidenceSnippet, i.evidenceNote])),
    companyName: prospect.name,
    senderEmail,
  });

  await prisma.emailDraft.updateMany({
    where: { prospectId, isActive: true, sequenceStep: step },
    data: { isActive: false },
  });

  const draft = await prisma.emailDraft.create({
    data: {
      prospectId,
      campaignId: options.campaignId,
      kind: step === 0 ? "INITIAL" : `FOLLOWUP_${step}`,
      sequenceStep: step,
      subject,
      body,
      citedIssueIds: JSON.stringify(selected.map((i) => i.id)),
      generator,
      model,
      verificationPassed: verification.passed,
      verificationNotes: [
        ...verification.problems.map((p) => `PROBLÈME : ${p}`),
        ...verification.warnings.map((w) => `Remarque : ${w}`),
      ].join("\n") || "Vérification passée sans remarque.",
      isActive: true,
    },
  });

  // Le prospect ne passe READY que si tout est reuni : preuve, contact, verification.
  if (
    verification.passed &&
    prospect.primaryContactId &&
    ["AUDITED", "RESEARCHED"].includes(prospect.status)
  ) {
    await prisma.prospect.update({ where: { id: prospectId }, data: { status: "READY" } });
    await prisma.statusEvent.create({
      data: {
        prospectId,
        fromStatus: prospect.status,
        toStatus: "READY",
        reason: "Email rédigé et vérifié, contact public disponible.",
        actor: "SYSTEM",
      },
    });
  }

  await logActivity({
    actor: "SYSTEM",
    module: "EMAIL",
    action: "email.generate",
    entityType: "Prospect",
    entityId: prospectId,
    summary: `Email ${step === 0 ? "initial" : `de relance ${step}`} généré pour ${prospect.name} (${generator}) — vérification ${verification.passed ? "réussie" : "ÉCHOUÉE"}.`,
    details: { citedIssues: selected.map((i) => i.type), verification },
    level: verification.passed ? "INFO" : "WARN",
  });

  return { subject, body, citedIssueIds: selected.map((i) => i.id), generator, model, verification, draftId: draft.id };
}
