// --- MOBILE ----------------------------------------------------------------
import type { AuditRule } from "../types";
import { PATTERNS, rawSnippetAround } from "../html";

/** 4. Viewport / responsive — verifiable statiquement, sans rendu. */
export const viewportRule: AuditRule = {
  id: "mobile.viewport",
  label: "Adaptation mobile (viewport)",
  category: "MOBILE",
  order: 40,
  applicable: (ctx) => Boolean(ctx.parsedHome),
  notApplicableReason: () => "Page d'accueil non récupérée : impossible d'analyser le HTML.",
  run: (ctx) => {
    const home = ctx.parsedHome!;
    const meta = home.root.querySelector('meta[name="viewport"]');

    if (meta) {
      const content = meta.getAttribute("content") ?? "";
      return {
        verdict: "VERIFIED",
        confidence: "HIGH",
        isProblem: false,
        observation: `La page déclare une balise viewport : content="${content}". Le site est prévu pour s'adapter aux écrans mobiles.`,
        method: 'Recherche de <meta name="viewport"> dans le <head> de la page d\'accueil.',
        evidence: {
          targetUrl: home.page.finalUrl,
          snippet: meta.toString().slice(0, 200),
        },
      };
    }

    // Preuve complementaire : largeur fixe en pixels.
    const fixed = rawSnippetAround(home.page.html, PATTERNS.fixedWidth);

    return {
      verdict: "VERIFIED",
      confidence: "HIGH",
      isProblem: true,
      issueType: "NOT_MOBILE_FRIENDLY",
      severity: "HIGH",
      title: "Page non adaptée au mobile",
      observation:
        "Aucune balise <meta name=\"viewport\"> n'est présente dans le HTML de la page d'accueil. Sans elle, les navigateurs mobiles affichent la page en version bureau réduite." +
        (fixed ? " Une largeur fixe en pixels a également été relevée." : ""),
      method:
        'Analyse du HTML de la page d\'accueil : recherche de <meta name="viewport"> et de largeurs fixes en pixels.',
      evidence: {
        targetUrl: home.page.finalUrl,
        snippet: fixed ?? undefined,
        data: { viewportMeta: false, fixedWidthFound: Boolean(fixed) },
      },
    };
  },
};
