// --- MOYENS DE CONTACT -----------------------------------------------------
import type { AuditRule } from "../types";
import { allLinks, PATTERNS, resolveUrl, snippet } from "../html";

/** 5. Telephone cliquable */
export const clickToCallRule: AuditRule = {
  id: "contact.click_to_call",
  label: "Numéro de téléphone cliquable",
  category: "CONTACT",
  order: 50,
  applicable: (ctx) => ctx.parsed.length > 0,
  notApplicableReason: () => "Aucune page récupérée.",
  run: (ctx) => {
    const hits = ctx.parsed.flatMap((p) =>
      allLinks(p)
        .filter((l) => PATTERNS.tel.test(l.href))
        .map((l) => ({ page: p, link: l })),
    );

    if (hits.length > 0) {
      const first = hits[0];
      return {
        verdict: "VERIFIED",
        confidence: "HIGH",
        isProblem: false,
        observation: `${hits.length} lien(s) téléphone cliquable(s) trouvé(s), par exemple ${first.link.href}`,
        method: `Recherche de liens <a href="tel:..."> sur ${ctx.parsed.length} page(s) analysée(s).`,
        evidence: { targetUrl: first.page.page.finalUrl, snippet: `<a href="${first.link.href}">` },
      };
    }

    const pagesList = ctx.parsed.map((p) => p.page.finalUrl).join(", ");
    return {
      verdict: "NOT_FOUND",
      confidence: "HIGH",
      isProblem: true,
      issueType: "NO_CLICK_TO_CALL",
      severity: "MEDIUM",
      title: "Numéro non cliquable depuis un mobile",
      observation: `Aucun lien de type tel: n'a été trouvé sur les ${ctx.parsed.length} page(s) analysée(s). Un visiteur sur mobile ne peut pas appeler d'un simple appui.`,
      method: `Recherche de liens <a href="tel:..."> sur : ${pagesList}`,
      evidence: { data: { pagesChecked: ctx.parsed.map((p) => p.page.finalUrl) } },
    };
  },
};

/** Email de contact affiche sur le site */
export const emailOnSiteRule: AuditRule = {
  id: "contact.email_on_site",
  label: "Adresse email affichée",
  category: "CONTACT",
  order: 51,
  applicable: (ctx) => ctx.parsed.length > 0,
  notApplicableReason: () => "Aucune page récupérée.",
  run: (ctx) => {
    const hits = ctx.parsed.flatMap((p) =>
      allLinks(p)
        .filter((l) => PATTERNS.mailto.test(l.href))
        .map((l) => ({ page: p, link: l })),
    );

    if (hits.length > 0) {
      return {
        verdict: "VERIFIED",
        confidence: "HIGH",
        isProblem: false,
        observation: `${hits.length} lien(s) mailto: trouvé(s) sur le site.`,
        method: `Recherche de liens <a href="mailto:..."> sur ${ctx.parsed.length} page(s).`,
        evidence: {
          targetUrl: hits[0].page.page.finalUrl,
          snippet: `<a href="${hits[0].link.href}">`,
        },
      };
    }

    return {
      verdict: "NOT_FOUND",
      confidence: "MEDIUM",
      isProblem: false,
      observation: `Aucun lien mailto: sur les ${ctx.parsed.length} page(s) analysée(s). L'adresse peut être affichée en texte ou protégée contre les robots — non concluant.`,
      method: `Recherche de liens <a href="mailto:..."> sur ${ctx.parsed.length} page(s).`,
      evidence: { data: { pagesChecked: ctx.parsed.length } },
    };
  },
};

/** 8. Formulaire de contact + verification que son action existe */
export const contactFormRule: AuditRule = {
  id: "contact.form",
  label: "Formulaire de contact",
  category: "CONTACT",
  order: 52,
  applicable: (ctx) => ctx.parsed.length > 0,
  notApplicableReason: () => "Aucune page récupérée.",
  run: async (ctx) => {
    const forms = ctx.parsed.flatMap((p) =>
      p.root.querySelectorAll("form").map((f) => ({ page: p, form: f })),
    );

    if (forms.length === 0) {
      return {
        verdict: "NOT_FOUND",
        confidence: "HIGH",
        isProblem: true,
        issueType: "NO_FORM",
        severity: "MEDIUM",
        title: "Aucun formulaire de contact",
        observation: `Aucune balise <form> sur les ${ctx.parsed.length} page(s) analysée(s), dont la page de contact lorsqu'elle a été trouvée.`,
        method: `Recherche de balises <form> sur : ${ctx.parsed.map((p) => p.page.finalUrl).join(", ")}`,
        evidence: { data: { pagesChecked: ctx.parsed.map((p) => p.page.finalUrl) } },
      };
    }

    // Un formulaire existe : son action pointe-t-elle vers quelque chose ?
    for (const { page, form } of forms) {
      const action = form.getAttribute("action");
      if (!action || action === "#" || action.startsWith("javascript:")) continue;

      const target = resolveUrl(action, page.page.finalUrl);
      if (!target) continue;

      const probe = await ctx.probe(target);
      if (probe.status === 404 || probe.status === 410) {
        return {
          verdict: "VERIFIED",
          confidence: "HIGH",
          isProblem: true,
          issueType: "BROKEN_FORM",
          severity: "HIGH",
          title: "Formulaire de contact cassé",
          observation: `Le formulaire de ${page.page.finalUrl} envoie vers ${target}, qui répond HTTP ${probe.status}. Les messages envoyés par ce formulaire ne parviennent nulle part.`,
          method: `Lecture de l'attribut action du <form>, puis requête HTTP sur l'URL cible.`,
          evidence: {
            targetUrl: page.page.finalUrl,
            snippet: snippet(form.toString().split(">")[0] + ">"),
            data: { formAction: target, probeStatus: probe.status },
          },
        };
      }
    }

    return {
      verdict: "VERIFIED",
      confidence: "MEDIUM",
      isProblem: false,
      observation: `${forms.length} formulaire(s) trouvé(s). Aucune cible d'envoi en erreur détectée. Le bon fonctionnement réel ne peut être confirmé sans soumettre le formulaire, ce qui n'est pas fait.`,
      method:
        "Recherche des balises <form>, lecture de leur attribut action, puis requête HTTP sur les cibles absolues.",
      evidence: {
        targetUrl: forms[0].page.page.finalUrl,
        data: { formCount: forms.length },
      },
    };
  },
};

/** 9. WhatsApp */
export const whatsappRule: AuditRule = {
  id: "contact.whatsapp",
  label: "Contact WhatsApp",
  category: "CONTACT",
  order: 53,
  applicable: (ctx) => ctx.parsed.length > 0,
  notApplicableReason: () => "Aucune page récupérée.",
  run: (ctx) => {
    const hit = ctx.parsed
      .flatMap((p) => allLinks(p).map((l) => ({ page: p, link: l })))
      .find(({ link }) => PATTERNS.whatsapp.test(link.href));

    if (hit) {
      return {
        verdict: "VERIFIED",
        confidence: "HIGH",
        isProblem: false,
        observation: `Un lien WhatsApp est présent : ${hit.link.href}`,
        method: "Recherche de liens vers wa.me / api.whatsapp.com dans les pages analysées.",
        evidence: { targetUrl: hit.page.page.finalUrl, snippet: `<a href="${hit.link.href}">` },
      };
    }

    // Absence de WhatsApp : constat factuel, PAS presente comme un defaut.
    return {
      verdict: "NOT_FOUND",
      confidence: "HIGH",
      isProblem: false,
      observation: `Aucun lien WhatsApp trouvé sur les ${ctx.parsed.length} page(s) analysée(s). C'est un constat, pas un défaut : tous les commerces n'utilisent pas WhatsApp.`,
      method: "Recherche de liens vers wa.me / api.whatsapp.com / whatsapp:// dans les pages analysées.",
      evidence: { data: { pagesChecked: ctx.parsed.length } },
    };
  },
};
