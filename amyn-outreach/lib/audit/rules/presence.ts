// --- PRESENCE & ACCESSIBILITE ----------------------------------------------
import type { AuditRule } from "../types";

/** 1. Le prospect a-t-il un site referencé dans nos sources ? */
export const websitePresence: AuditRule = {
  id: "website.presence",
  label: "Présence d'un site web",
  category: "PRESENCE",
  order: 10,
  applicable: () => true,
  run: (ctx) => {
    const { website, googleBusinessUrl, sourceLabels } = ctx.prospect;
    const sources = sourceLabels.length
      ? sourceLabels.join(" ; ")
      : "aucune source enregistrée";

    if (website) {
      return {
        verdict: "VERIFIED",
        confidence: "HIGH",
        isProblem: false,
        observation: `Un site est référencé pour cette entreprise : ${website}`,
        method: `Lecture du champ « site web » de la fiche prospect. Sources consultées : ${sources}.`,
        evidence: { targetUrl: website, data: { sourceCount: sourceLabels.length } },
      };
    }

    // Formulation prudente : on constate l'absence DANS NOS SOURCES,
    // pas l'absence absolue de site sur Internet.
    return {
      verdict: "VERIFIED",
      confidence: googleBusinessUrl ? "MEDIUM" : "LOW",
      isProblem: true,
      issueType: "NO_WEBSITE",
      severity: "HIGH",
      title: "Aucun site web dans les sources consultées",
      observation:
        "Aucune adresse de site web n'est renseignée dans les sources collectées pour cette entreprise." +
        (googleBusinessUrl
          ? " La fiche Google Business est connue mais ne référence aucun site."
          : ""),
      method: `Lecture du champ « site web » de la fiche prospect (valeur vide). Sources consultées : ${sources}.`,
      evidence: {
        targetUrl: googleBusinessUrl ?? undefined,
        data: { websiteField: null, sourcesChecked: sourceLabels },
      },
    };
  },
};

/** 2. Le site répond-il ? */
export const siteReachable: AuditRule = {
  id: "site.reachable",
  label: "Site accessible",
  category: "ACCESSIBILITE",
  order: 20,
  applicable: (ctx) => Boolean(ctx.prospect.website),
  notApplicableReason: () => "Aucun site à tester : le champ site web est vide.",
  run: (ctx) => {
    const home = ctx.home;
    if (!home) {
      return {
        verdict: "UNVERIFIED",
        confidence: "LOW",
        isProblem: false,
        observation: "La page d'accueil n'a pas pu être récupérée pour une raison inconnue.",
        method: "Requête HTTP GET sur l'URL du site.",
      };
    }

    if (home.errorCode) {
      return {
        verdict: "VERIFIED",
        confidence: "HIGH",
        isProblem: true,
        issueType: "SITE_UNREACHABLE",
        severity: "HIGH",
        title: "Site inaccessible",
        observation: `Le site n'a pas répondu : ${home.error} (code ${home.errorCode}). Tentative de ${home.durationMs} ms.`,
        method: `Requête HTTP GET sur ${home.requestedUrl}, délai d'attente ${15000} ms.`,
        evidence: {
          targetUrl: home.requestedUrl,
          snippet: `${home.errorCode} — ${home.error}`,
          data: { errorCode: home.errorCode, durationMs: home.durationMs },
        },
      };
    }

    if (!home.ok) {
      return {
        verdict: "VERIFIED",
        confidence: "HIGH",
        isProblem: true,
        issueType: "SITE_UNREACHABLE",
        severity: "HIGH",
        title: `Le site répond en erreur ${home.status}`,
        observation: `La page d'accueil renvoie le code HTTP ${home.status} (${home.statusText}) en ${home.durationMs} ms.`,
        method: `Requête HTTP GET sur ${home.requestedUrl}.`,
        evidence: {
          targetUrl: home.finalUrl,
          snippet: `HTTP ${home.status} ${home.statusText}`,
          data: { status: home.status, durationMs: home.durationMs },
        },
      };
    }

    return {
      verdict: "VERIFIED",
      confidence: "HIGH",
      isProblem: false,
      observation: `Le site répond correctement : HTTP ${home.status} en ${home.durationMs} ms, ${home.bytes} octets reçus.${home.redirected ? ` Redirection vers ${home.finalUrl}.` : ""}`,
      method: `Requête HTTP GET sur ${home.requestedUrl}, mesure du temps de réponse total côté serveur d'audit.`,
      evidence: {
        targetUrl: home.finalUrl,
        data: {
          status: home.status,
          durationMs: home.durationMs,
          bytes: home.bytes,
          redirected: home.redirected,
        },
      },
    };
  },
};

/** 3. HTTPS */
export const httpsRule: AuditRule = {
  id: "site.https",
  label: "Connexion sécurisée (HTTPS)",
  category: "SECURITE",
  order: 30,
  applicable: (ctx) => Boolean(ctx.home?.ok),
  notApplicableReason: () => "Le site n'a pas répondu : impossible de vérifier le protocole.",
  run: (ctx) => {
    const home = ctx.home!;
    const finalIsHttps = home.finalUrl.startsWith("https://");

    if (finalIsHttps) {
      return {
        verdict: "VERIFIED",
        confidence: "HIGH",
        isProblem: false,
        observation: `Le site est servi en HTTPS. URL finale après redirections : ${home.finalUrl}`,
        method: "Lecture du protocole de l'URL finale après suivi des redirections.",
        evidence: { targetUrl: home.finalUrl, data: { scheme: "https" } },
      };
    }

    return {
      verdict: "VERIFIED",
      confidence: "HIGH",
      isProblem: true,
      issueType: "NO_HTTPS",
      severity: "HIGH",
      title: "Site sans HTTPS",
      observation: `Après suivi des redirections, le site reste servi en HTTP non chiffré : ${home.finalUrl}. Les navigateurs affichent « Non sécurisé » sur ce type d'adresse.`,
      method: "Lecture du protocole de l'URL finale après suivi des redirections.",
      evidence: { targetUrl: home.finalUrl, data: { scheme: "http" } },
    };
  },
};
