// --- PRESENCE LOCALE & GOOGLE ----------------------------------------------
import type { AuditRule } from "../types";
import { PATTERNS, snippet } from "../html";

/** 10. Informations locales : la ville apparait-elle sur le site ? */
export const localInfoRule: AuditRule = {
  id: "local.city_mention",
  label: "Informations locales",
  category: "LOCAL",
  order: 70,
  applicable: (ctx) => ctx.parsed.length > 0 && Boolean(ctx.prospect.city),
  notApplicableReason: (ctx) =>
    ctx.prospect.city ? "Aucune page récupérée." : "Ville du prospect inconnue.",
  run: (ctx) => {
    const city = ctx.prospect.city.toLowerCase();
    const found = ctx.combinedText.includes(city);

    if (found) {
      const idx = ctx.combinedText.indexOf(city);
      return {
        verdict: "VERIFIED",
        confidence: "HIGH",
        isProblem: false,
        observation: `La ville « ${ctx.prospect.city} » apparaît dans le contenu du site.`,
        method: `Recherche de la chaîne « ${ctx.prospect.city} » dans le texte visible de ${ctx.parsed.length} page(s).`,
        evidence: {
          targetUrl: ctx.parsed[0].page.finalUrl,
          snippet: snippet(ctx.combinedText.slice(Math.max(0, idx - 70), idx + 110)),
        },
      };
    }

    return {
      verdict: "NOT_FOUND",
      confidence: "MEDIUM",
      isProblem: true,
      issueType: "NO_LOCAL_INFO",
      severity: "MEDIUM",
      title: "Ville absente du contenu du site",
      observation: `La ville « ${ctx.prospect.city} » n'apparaît pas dans le texte visible des ${ctx.parsed.length} page(s) analysée(s). C'est un handicap pour être trouvé sur des recherches locales.`,
      method: `Recherche de la chaîne « ${ctx.prospect.city} » dans le texte visible des pages analysées.`,
      evidence: { data: { pagesChecked: ctx.parsed.map((p) => p.page.finalUrl) } },
    };
  },
};

/** Horaires d'ouverture */
export const openingHoursRule: AuditRule = {
  id: "local.opening_hours",
  label: "Horaires d'ouverture",
  category: "LOCAL",
  order: 71,
  applicable: (ctx) => ctx.parsed.length > 0,
  notApplicableReason: () => "Aucune page récupérée.",
  run: (ctx) => {
    const match = PATTERNS.openingHours.exec(ctx.combinedText);
    if (match) {
      const idx = match.index;
      return {
        verdict: "VERIFIED",
        confidence: "MEDIUM",
        isProblem: false,
        observation: `Des indications d'horaires apparaissent dans le contenu (terme relevé : « ${match[0]} »).`,
        method: "Recherche des termes horaires / ouvert / jours de la semaine dans le texte visible.",
        evidence: {
          targetUrl: ctx.parsed[0].page.finalUrl,
          snippet: snippet(ctx.combinedText.slice(Math.max(0, idx - 60), idx + 140)),
        },
      };
    }

    return {
      verdict: "NOT_FOUND",
      confidence: "MEDIUM",
      isProblem: true,
      issueType: "NO_OPENING_HOURS",
      severity: "LOW",
      title: "Aucun horaire d'ouverture affiché",
      observation: `Aucun terme lié aux horaires (horaires, ouvert, jours de la semaine) n'a été trouvé dans le texte des ${ctx.parsed.length} page(s) analysée(s).`,
      method: "Recherche des termes horaires / ouvert / lundi…dimanche dans le texte visible.",
      evidence: { data: { pagesChecked: ctx.parsed.length } },
    };
  },
};

/** Mentions legales — obligatoires en France, et principale source d'email public */
export const legalNoticeRule: AuditRule = {
  id: "local.legal_notice",
  label: "Mentions légales",
  category: "LOCAL",
  order: 72,
  applicable: (ctx) => ctx.parsed.length > 0,
  notApplicableReason: () => "Aucune page récupérée.",
  run: (ctx) => {
    const page = ctx.parsed.find((p) => /mentions|legal|cgv|cgu/i.test(p.page.finalUrl));
    if (page) {
      return {
        verdict: "VERIFIED",
        confidence: "HIGH",
        isProblem: false,
        observation: `Une page de mentions légales est accessible : ${page.page.finalUrl}`,
        method: "Recherche d'un lien contenant « mentions légales » puis récupération de la page.",
        evidence: { targetUrl: page.page.finalUrl },
      };
    }

    const linkExists = /mentions\s*l[ée]gales/i.test(ctx.combinedText);
    if (linkExists) {
      return {
        verdict: "UNVERIFIED",
        confidence: "LOW",
        isProblem: false,
        observation:
          "Le texte mentionne « mentions légales » mais la page correspondante n'a pas pu être récupérée dans la limite de pages de cet audit.",
        method: "Recherche du libellé dans le texte, puis tentative de récupération de la page.",
      };
    }

    return {
      verdict: "NOT_FOUND",
      confidence: "MEDIUM",
      isProblem: true,
      issueType: "NO_LEGAL_NOTICE",
      severity: "LOW",
      title: "Mentions légales introuvables",
      observation: `Aucune page ni lien « mentions légales » n'a été trouvé sur les ${ctx.parsed.length} page(s) analysée(s). Elles sont pourtant obligatoires pour un site professionnel en France.`,
      method: "Recherche d'un lien ou d'un libellé « mentions légales » sur les pages analysées.",
      evidence: { data: { pagesChecked: ctx.parsed.map((p) => p.page.finalUrl) } },
    };
  },
};

/** 11. Google Business — honnete sur ce qu'on ne peut pas verifier */
export const googleBusinessRule: AuditRule = {
  id: "google.business_profile",
  label: "Fiche Google Business",
  category: "GOOGLE",
  order: 80,
  applicable: () => true,
  run: (ctx) => {
    const { googleBusinessUrl, googlePlaceId } = ctx.prospect;
    const hasPlacesKey = Boolean(process.env.GOOGLE_PLACES_API_KEY);

    if (!googleBusinessUrl && !googlePlaceId) {
      return {
        verdict: "NOT_FOUND",
        confidence: "LOW",
        isProblem: false,
        observation:
          "Aucune fiche Google Business n'est référencée dans nos sources pour cette entreprise. Cela ne prouve pas qu'elle n'en a pas : sans l'API Google Places, nous ne pouvons pas le vérifier.",
        method: "Lecture des champs googleBusinessUrl / googlePlaceId de la fiche prospect.",
      };
    }

    if (!hasPlacesKey) {
      return {
        verdict: "UNVERIFIED",
        confidence: "LOW",
        isProblem: false,
        observation:
          "Une fiche Google Business est référencée, mais son contenu (photos, description, horaires, avis) n'est pas accessible : la clé GOOGLE_PLACES_API_KEY n'est pas configurée. Aucune affirmation ne sera faite sur cette fiche.",
        method:
          "Vérification de la présence de la clé GOOGLE_PLACES_API_KEY dans l'environnement. Absente : audit de la fiche non réalisable.",
        evidence: { targetUrl: googleBusinessUrl ?? undefined },
      };
    }

    return {
      verdict: "UNVERIFIED",
      confidence: "LOW",
      isProblem: false,
      observation:
        "Fiche Google Business référencée. L'analyse détaillée via l'API Places n'est pas encore branchée sur ce moteur.",
      method: "Lecture des champs de la fiche prospect.",
      evidence: { targetUrl: googleBusinessUrl ?? undefined },
    };
  },
};
