// ---------------------------------------------------------------------------
// SCORING DES PROSPECTS
//
// Trois scores independants, puis un score global.
// Chaque point attribue est JUSTIFIE et conserve dans scoreRationale.
//
// CE QUE LE SCORE NE FAIT PAS :
//   • il ne pretend jamais connaitre le chiffre d'affaires d'une entreprise
//   • il ne devine pas sa capacite a investir
//   • il n'utilise que des faits verifies presents en base
// Une donnee absente ne penalise pas : elle est simplement neutre et signalee.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { SECTORS, resolveSector } from "@/lib/research/sectors";
import { SEVERITY_META, type OfferKey } from "@/lib/constants";

export type ScoreComponent = {
  label: string;
  points: number;
  max: number;
  reason: string;
};

export type ScoreBreakdown = {
  fitScore: number;
  auditScore: number;
  contactScore: number;
  overallScore: number;
  fit: ScoreComponent[];
  audit: ScoreComponent[];
  contact: ScoreComponent[];
  recommendedOffer: OfferKey | null;
  offerRationale: string;
  unknowns: string[];
};

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scale(components: ScoreComponent[]): number {
  const max = components.reduce((s, c) => s + c.max, 0);
  if (max === 0) return 0;
  const total = components.reduce((s, c) => s + c.points, 0);
  return clamp((total / max) * 100);
}

type ProspectForScoring = {
  sector: string;
  city: string;
  website: string | null;
  phone: string | null;
  googleBusinessUrl: string | null;
  instagramUrl: string | null;
  auditStatus: string;
  issues: Array<{ type: string; severity: string; confidence: string }>;
  contacts: Array<{ isGeneric: boolean; discoveryMethod: string; validationStatus: string }>;
};

export function computeScore(p: ProspectForScoring): ScoreBreakdown {
  const unknowns: string[] = [];

  // --- FIT : adequation au marche AMYN ------------------------------------
  const fit: ScoreComponent[] = [];
  const sector = resolveSector(p.sector);

  fit.push(
    sector
      ? {
          label: "Secteur ciblé",
          points: 25,
          max: 25,
          reason: `« ${p.sector} » fait partie des secteurs travaillés par AMYN (${sector.def.label}).`,
        }
      : {
          label: "Secteur ciblé",
          points: 10,
          max: 25,
          reason: `« ${p.sector} » ne fait pas partie des secteurs de référence AMYN. Non disqualifiant.`,
        },
  );

  const isLocalPriority = /lille|roubaix|tourcoing|villeneuve|marcq|lambersart|wasquehal|croix|hem|la madeleine/i.test(
    p.city,
  );
  fit.push({
    label: "Zone géographique",
    points: isLocalPriority ? 20 : 12,
    max: 20,
    reason: isLocalPriority
      ? `${p.city} est dans la métropole lilloise : zone prioritaire.`
      : `${p.city} est hors métropole lilloise : zone secondaire.`,
  });

  const bookingRelevant = sector?.def.bookingRelevant ?? false;
  fit.push({
    label: "Pertinence de l'offre",
    points: bookingRelevant ? 15 : 10,
    max: 15,
    reason: bookingRelevant
      ? "Secteur où la réservation en ligne apporte une valeur directe : les offres Premium et Ultimate sont pertinentes."
      : "Secteur où la vitrine prime sur la réservation : l'offre Essential est généralement adaptée.",
  });

  const digitalSignals = [p.website, p.googleBusinessUrl, p.instagramUrl, p.phone].filter(Boolean).length;
  fit.push({
    label: "Signaux d'activité",
    points: Math.min(digitalSignals * 5, 20),
    max: 20,
    reason: `${digitalSignals} signal(aux) de présence relevé(s) sur 4 (site, fiche Google, Instagram, téléphone). Une entreprise joignable est une entreprise en activité.`,
  });

  if (digitalSignals === 0) {
    unknowns.push("Aucun signal de présence : l'activité réelle de cette entreprise n'est pas confirmée.");
  }
  unknowns.push(
    "Le chiffre d'affaires et la capacité d'investissement ne sont pas connus : ils n'entrent pas dans le score.",
  );

  // --- AUDIT : problemes prouves ------------------------------------------
  const audit: ScoreComponent[] = [];

  if (p.auditStatus === "PENDING") {
    audit.push({
      label: "Audit",
      points: 0,
      max: 60,
      reason: "Aucun audit réalisé : aucun problème ne peut être affirmé.",
    });
    unknowns.push("Audit non réalisé : le score d'audit est nul par défaut, pas par constat.");
  } else {
    const weighted = p.issues.reduce(
      (sum, i) => sum + (SEVERITY_META[i.severity]?.weight ?? 1) * (i.confidence === "HIGH" ? 1 : 0.7),
      0,
    );
    audit.push({
      label: "Problèmes prouvés",
      points: Math.min(Math.round(weighted * 5), 40),
      max: 40,
      reason:
        p.issues.length === 0
          ? "Aucun problème prouvé lors de l'audit : peu d'accroche commerciale factuelle."
          : `${p.issues.length} problème(s) prouvé(s), pondérés par gravité et niveau de confiance.`,
    });

    const highSeverity = p.issues.filter((i) => i.severity === "HIGH").length;
    audit.push({
      label: "Problèmes majeurs",
      points: Math.min(highSeverity * 10, 20),
      max: 20,
      reason: `${highSeverity} problème(s) de gravité élevée. Ce sont eux qui rendent un email pertinent.`,
    });

    if (p.auditStatus === "INCOMPLETE" || p.auditStatus === "BLOCKED_BY_ROBOTS") {
      unknowns.push(
        `Audit ${p.auditStatus} : une partie du site n'a pas pu être analysée. Le score d'audit est donc plancher, pas définitif.`,
      );
    }
  }

  // --- CONTACT : qualite du moyen de contact -------------------------------
  const contact: ScoreComponent[] = [];
  const usable = p.contacts.filter((c) => c.validationStatus === "SYNTAX_OK");

  if (usable.length === 0) {
    contact.push({
      label: "Email public",
      points: 0,
      max: 50,
      reason: "Aucun email professionnel public trouvé. Le prospect ne peut pas être contacté.",
    });
  } else {
    const best = usable.find((c) => c.discoveryMethod === "LEGAL_NOTICE") ?? usable[0];
    const methodPoints: Record<string, number> = {
      LEGAL_NOTICE: 50,
      WEBSITE_CONTACT: 45,
      WEBSITE_MAILTO: 40,
      GOOGLE_BUSINESS: 35,
      INSTAGRAM_BIO: 25,
      MANUAL: 30,
    };
    contact.push({
      label: "Email public",
      points: methodPoints[best.discoveryMethod] ?? 30,
      max: 50,
      reason: `Email trouvé via ${best.discoveryMethod}. Plus la source est officielle, plus la fiabilité est élevée.`,
    });
    contact.push({
      label: "Type d'adresse",
      points: best.isGeneric ? 30 : 20,
      max: 30,
      reason: best.isGeneric
        ? "Adresse générique (contact@, info@) : régime RGPD plus souple, ce n'est pas une donnée personnelle."
        : "Adresse nominative : donnée personnelle, information et droit d'opposition obligatoires.",
    });
  }

  contact.push({
    label: "Canal secondaire",
    points: p.phone ? 20 : 0,
    max: 20,
    reason: p.phone ? "Un téléphone est disponible en secours." : "Aucun téléphone connu.",
  });

  const fitScore = scale(fit);
  const auditScore = scale(audit);
  const contactScore = scale(contact);
  // Pondération : sans contact, rien n'est possible ; sans problème prouvé, rien à dire.
  const overallScore = clamp(fitScore * 0.3 + auditScore * 0.35 + contactScore * 0.35);

  const { offer, rationale } = recommendOffer(p, sector?.def.bookingRelevant ?? false);

  return {
    fitScore,
    auditScore,
    contactScore,
    overallScore,
    fit,
    audit,
    contact,
    recommendedOffer: offer,
    offerRationale: rationale,
    unknowns,
  };
}

function recommendOffer(
  p: ProspectForScoring,
  bookingRelevant: boolean,
): { offer: OfferKey | null; rationale: string } {
  if (p.auditStatus === "PENDING") {
    return { offer: null, rationale: "Aucune recommandation sans audit : ce serait une supposition." };
  }

  const types = new Set(p.issues.map((i) => i.type));

  if (types.has("NO_WEBSITE")) {
    return {
      offer: "ESSENTIAL",
      rationale:
        "Aucun site web constaté. Une vitrine professionnelle avec prise de contact directe couvre le besoin sans le sur-dimensionner.",
    };
  }

  const heavyProblems = [
    "OUTDATED_SITE",
    "NOT_MOBILE_FRIENDLY",
    "BROKEN_FORM",
    "SITE_UNREACHABLE",
    "NO_HTTPS",
  ].filter((t) => types.has(t)).length;

  const conversionGaps = ["NO_BOOKING", "NO_FORM", "NO_CLEAR_CTA", "NO_CLICK_TO_CALL"].filter((t) =>
    types.has(t),
  ).length;

  const localGaps = ["NO_LOCAL_INFO", "MISSING_TITLE", "MISSING_META_DESCRIPTION", "GBP_INCOMPLETE"].filter(
    (t) => types.has(t),
  ).length;

  if (heavyProblems >= 2 && conversionGaps >= 2 && localGaps >= 2) {
    return {
      offer: "ULTIMATE",
      rationale: `Refonte complète justifiée : ${heavyProblems} problème(s) technique(s) majeur(s), ${conversionGaps} manque(s) de conversion et ${localGaps} faiblesse(s) de présence locale, tous constatés lors de l'audit.`,
    };
  }

  if (conversionGaps >= 1 || heavyProblems >= 1 || (bookingRelevant && types.has("NO_BOOKING"))) {
    return {
      offer: "PREMIUM",
      rationale: `Site existant mais perfectible : ${heavyProblems} problème(s) technique(s) et ${conversionGaps} manque(s) de conversion constatés. La refonte avec réservation et SEO local correspond au besoin.`,
    };
  }

  return {
    offer: "ESSENTIAL",
    rationale:
      "Peu de problèmes majeurs constatés. Une remise à niveau de la vitrine reste la proposition la plus honnête.",
  };
}

/** Calcule et enregistre le score d'un prospect. */
export async function scoreProspect(prospectId: string): Promise<ScoreBreakdown> {
  const prospect = await prisma.prospect.findUnique({
    where: { id: prospectId },
    include: {
      issues: { select: { type: true, severity: true, confidence: true } },
      contacts: { select: { isGeneric: true, discoveryMethod: true, validationStatus: true } },
    },
  });
  if (!prospect) throw new Error(`Prospect introuvable : ${prospectId}`);

  const breakdown = computeScore(prospect);
  const offer = breakdown.recommendedOffer;

  await prisma.prospect.update({
    where: { id: prospectId },
    data: {
      fitScore: breakdown.fitScore,
      auditScore: breakdown.auditScore,
      contactScore: breakdown.contactScore,
      overallScore: breakdown.overallScore,
      scoreRationale: JSON.stringify({
        fit: breakdown.fit,
        audit: breakdown.audit,
        contact: breakdown.contact,
        unknowns: breakdown.unknowns,
      }),
      scoredAt: new Date(),
      ...(offer
        ? {
            recommendedOffer: offer,
            recommendedPrice: (await import("@/lib/constants")).OFFERS[offer].price,
            offerRationale: breakdown.offerRationale,
          }
        : {}),
    },
  });

  await logActivity({
    actor: "SYSTEM",
    module: "SCORING",
    action: "scoring.compute",
    entityType: "Prospect",
    entityId: prospectId,
    summary: `Score de ${prospect.name} : global ${breakdown.overallScore} (fit ${breakdown.fitScore}, audit ${breakdown.auditScore}, contact ${breakdown.contactScore}).`,
    details: { breakdown: { fit: breakdown.fit, audit: breakdown.audit, contact: breakdown.contact } },
  });

  return breakdown;
}

export { SECTORS };
