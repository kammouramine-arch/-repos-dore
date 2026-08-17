// --- TECHNIQUE & SEO DE BASE ----------------------------------------------
import type { AuditRule } from "../types";
import { allLinks, isInternal, PATTERNS, rawSnippetAround, resolveUrl, snippet } from "../html";

/** Mesure reelle du temps de reponse. Toujours chiffree et datee. */
export const performanceRule: AuditRule = {
  id: "tech.response_time",
  label: "Temps de réponse mesuré",
  category: "TECHNIQUE",
  order: 90,
  applicable: (ctx) => Boolean(ctx.home?.ok),
  notApplicableReason: () => "Le site n'a pas répondu.",
  run: (ctx) => {
    const home = ctx.home!;
    const seconds = (home.durationMs / 1000).toFixed(2);
    const kb = Math.round(home.bytes / 1024);
    const measuredAt = ctx.startedAt.toISOString();

    // Formulation imposee : la mesure, sa date, sa methode. Jamais de
    // "vous perdez des clients" : rien ne le prouve.
    const factual = `Page d'accueil chargée en ${seconds} s (${home.durationMs} ms), ${kb} Ko de HTML, mesuré le ${measuredAt} depuis le serveur d'audit AMYN via une requête HTTP GET unique, sans exécution de JavaScript ni chargement des images.`;

    if (home.durationMs > 3000) {
      return {
        verdict: "VERIFIED",
        confidence: "MEDIUM",
        isProblem: true,
        issueType: "SLOW_SITE",
        severity: "MEDIUM",
        title: `Temps de réponse mesuré à ${seconds} s`,
        observation: `${factual} Cette mesure ne porte que sur le document HTML : le temps réellement perçu par un visiteur peut différer.`,
        method:
          "Requête HTTP GET unique sur la page d'accueil, chronométrée côté serveur d'audit. Aucune simulation de navigateur.",
        evidence: {
          targetUrl: home.finalUrl,
          data: { durationMs: home.durationMs, bytes: home.bytes, measuredAt },
        },
      };
    }

    if (home.bytes > 1_500_000) {
      return {
        verdict: "VERIFIED",
        confidence: "MEDIUM",
        isProblem: true,
        issueType: "HEAVY_PAGE",
        severity: "LOW",
        title: `Document HTML de ${kb} Ko`,
        observation: factual,
        method: "Mesure de la taille du document HTML renvoyé par la requête GET.",
        evidence: {
          targetUrl: home.finalUrl,
          data: { durationMs: home.durationMs, bytes: home.bytes, measuredAt },
        },
      };
    }

    return {
      verdict: "VERIFIED",
      confidence: "HIGH",
      isProblem: false,
      observation: factual,
      method:
        "Requête HTTP GET unique sur la page d'accueil, chronométrée côté serveur d'audit.",
      evidence: {
        targetUrl: home.finalUrl,
        data: { durationMs: home.durationMs, bytes: home.bytes, measuredAt },
      },
    };
  },
};

/** Balise <title> */
export const titleRule: AuditRule = {
  id: "tech.title",
  label: "Balise titre",
  category: "TECHNIQUE",
  order: 91,
  applicable: (ctx) => Boolean(ctx.parsedHome),
  notApplicableReason: () => "Page d'accueil non récupérée.",
  run: (ctx) => {
    const home = ctx.parsedHome!;
    const title = home.root.querySelector("title")?.text?.trim() ?? "";

    if (!title) {
      return {
        verdict: "VERIFIED",
        confidence: "HIGH",
        isProblem: true,
        issueType: "MISSING_TITLE",
        severity: "MEDIUM",
        title: "Balise <title> absente ou vide",
        observation:
          "La page d'accueil n'a pas de balise <title> exploitable. C'est le texte affiché dans l'onglet du navigateur et le titre bleu dans les résultats Google.",
        method: "Lecture de la balise <title> dans le <head> de la page d'accueil.",
        evidence: { targetUrl: home.page.finalUrl },
      };
    }

    return {
      verdict: "VERIFIED",
      confidence: "HIGH",
      isProblem: false,
      observation: `Titre de la page d'accueil : « ${title} » (${title.length} caractères).`,
      method: "Lecture de la balise <title> dans le <head>.",
      evidence: { targetUrl: home.page.finalUrl, snippet: `<title>${snippet(title, 120)}</title>` },
    };
  },
};

/** Meta description */
export const metaDescriptionRule: AuditRule = {
  id: "tech.meta_description",
  label: "Meta description",
  category: "TECHNIQUE",
  order: 92,
  applicable: (ctx) => Boolean(ctx.parsedHome),
  notApplicableReason: () => "Page d'accueil non récupérée.",
  run: (ctx) => {
    const home = ctx.parsedHome!;
    const meta = home.root.querySelector('meta[name="description"]');
    const content = meta?.getAttribute("content")?.trim() ?? "";

    if (!content) {
      return {
        verdict: "NOT_FOUND",
        confidence: "HIGH",
        isProblem: true,
        issueType: "MISSING_META_DESCRIPTION",
        severity: "LOW",
        title: "Meta description absente",
        observation:
          "Aucune balise <meta name=\"description\"> renseignée sur la page d'accueil. Google compose alors lui-même le texte affiché sous le titre dans ses résultats.",
        method: 'Lecture de <meta name="description"> dans le <head> de la page d\'accueil.',
        evidence: { targetUrl: home.page.finalUrl },
      };
    }

    return {
      verdict: "VERIFIED",
      confidence: "HIGH",
      isProblem: false,
      observation: `Meta description présente (${content.length} caractères).`,
      method: 'Lecture de <meta name="description"> dans le <head>.',
      evidence: { targetUrl: home.page.finalUrl, snippet: snippet(content, 180) },
    };
  },
};

/** Liens internes casses — verifies un par un */
export const brokenLinksRule: AuditRule = {
  id: "tech.broken_links",
  label: "Liens cassés",
  category: "TECHNIQUE",
  order: 93,
  applicable: (ctx) => Boolean(ctx.parsedHome),
  notApplicableReason: () => "Page d'accueil non récupérée.",
  run: async (ctx) => {
    const home = ctx.parsedHome!;
    const base = home.page.finalUrl;
    const MAX = 8; // on reste poli : on ne teste pas des centaines de liens

    const candidates = Array.from(
      new Set(
        allLinks(home)
          .map((l) => resolveUrl(l.href, base))
          .filter((u): u is string => Boolean(u))
          .filter((u) => u.startsWith("http") && isInternal(u, base))
          .filter((u) => u !== base),
      ),
    ).slice(0, MAX);

    if (candidates.length === 0) {
      return {
        verdict: "UNVERIFIED",
        confidence: "LOW",
        isProblem: false,
        observation: "Aucun lien interne exploitable trouvé sur la page d'accueil : rien à tester.",
        method: "Extraction des liens internes de la page d'accueil.",
      };
    }

    const broken: Array<{ url: string; status: number }> = [];
    for (const url of candidates) {
      const probe = await ctx.probe(url);
      if (probe.status === 404 || probe.status === 410) broken.push({ url, status: probe.status });
    }

    if (broken.length > 0) {
      return {
        verdict: "VERIFIED",
        confidence: "HIGH",
        isProblem: true,
        issueType: "BROKEN_LINKS",
        severity: "MEDIUM",
        title: `${broken.length} lien(s) cassé(s)`,
        observation: `Sur ${candidates.length} lien(s) internes testés depuis la page d'accueil, ${broken.length} renvoient une erreur : ${broken.map((b) => `${b.url} (${b.status})`).join(", ")}`,
        method: `Requête HTTP HEAD (puis GET si HEAD refusé) sur ${candidates.length} lien(s) internes de la page d'accueil.`,
        evidence: { targetUrl: base, data: { tested: candidates.length, broken } },
      };
    }

    return {
      verdict: "VERIFIED",
      confidence: "MEDIUM",
      isProblem: false,
      observation: `${candidates.length} lien(s) interne(s) testé(s) depuis la page d'accueil, aucun en erreur 404/410.`,
      method: "Requête HTTP HEAD (puis GET si HEAD refusé) sur les liens internes de la page d'accueil.",
      evidence: { targetUrl: base, data: { tested: candidates.length, broken: 0 } },
    };
  },
};

/** Technologie obsolete / contenu date */
export const legacyTechRule: AuditRule = {
  id: "tech.legacy",
  label: "Technologie ou contenu daté",
  category: "TECHNIQUE",
  order: 94,
  applicable: (ctx) => Boolean(ctx.parsedHome),
  notApplicableReason: () => "Page d'accueil non récupérée.",
  run: (ctx) => {
    const home = ctx.parsedHome!;
    const html = home.page.html;
    const findings: string[] = [];
    const evidence: string[] = [];

    const jq = PATTERNS.jqueryVersion.exec(html);
    if (jq && Number(jq[1]) < 3) {
      findings.push(`jQuery ${jq[1]}.${jq[2]}${jq[3] ? `.${jq[3]}` : ""}`);
      evidence.push(jq[0]);
    }

    if (PATTERNS.flash.test(html)) {
      findings.push("contenu Flash (technologie abandonnée depuis 2020)");
      const s = rawSnippetAround(html, PATTERNS.flash);
      if (s) evidence.push(s);
    }

    if (PATTERNS.documentWrite.test(html)) {
      findings.push("document.write()");
    }

    const currentYear = new Date().getFullYear();
    const copy = PATTERNS.copyrightYear.exec(html);
    if (copy) {
      const year = Number(copy[1]);
      if (year > 1990 && year < currentYear - 1) {
        findings.push(`mention de copyright arrêtée en ${year}`);
        evidence.push(copy[0]);
      }
    }

    if (findings.length === 0) {
      return {
        verdict: "VERIFIED",
        confidence: "MEDIUM",
        isProblem: false,
        observation:
          "Aucun marqueur d'obsolescence relevé sur la page d'accueil (pas de jQuery ancien, pas de Flash, copyright à jour ou absent).",
        method:
          "Recherche dans le HTML brut : version de jQuery, balises Flash, document.write, année de copyright.",
        evidence: { targetUrl: home.page.finalUrl },
      };
    }

    return {
      verdict: "VERIFIED",
      confidence: "HIGH",
      isProblem: true,
      issueType: "OUTDATED_SITE",
      severity: findings.length > 1 ? "HIGH" : "MEDIUM",
      title: "Site techniquement daté",
      observation: `Marqueurs relevés dans le code de la page d'accueil : ${findings.join(" ; ")}.`,
      method:
        "Recherche dans le HTML brut : version de jQuery, balises Flash, document.write, année de copyright.",
      evidence: {
        targetUrl: home.page.finalUrl,
        snippet: evidence.length ? snippet(evidence.join("\n"), 260) : undefined,
        data: { markers: findings },
      },
    };
  },
};
