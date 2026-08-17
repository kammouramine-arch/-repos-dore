// --- CONVERSION ------------------------------------------------------------
import type { AuditRule } from "../types";
import { allLinks, PATTERNS } from "../html";

/** 7. Systeme de reservation / prise de rendez-vous */
export const bookingRule: AuditRule = {
  id: "conversion.booking",
  label: "Réservation / prise de rendez-vous",
  category: "CONVERSION",
  order: 60,
  applicable: (ctx) => ctx.parsed.length > 0,
  notApplicableReason: () => "Aucune page récupérée.",
  run: (ctx) => {
    const links = ctx.parsed.flatMap((p) => allLinks(p).map((l) => ({ page: p, link: l })));

    // Preuve forte : lien vers une plateforme de reservation identifiee.
    const platform = links.find(({ link }) => PATTERNS.socialBooking.test(link.href));
    if (platform) {
      return {
        verdict: "VERIFIED",
        confidence: "HIGH",
        isProblem: false,
        observation: `Un système de réservation en ligne est branché : ${platform.link.href}`,
        method: "Recherche de liens vers des plateformes de réservation connues (Planity, Treatwell, TheFork, Zenchef, Doctolib, Booksy…).",
        evidence: { targetUrl: platform.page.page.finalUrl, snippet: `<a href="${platform.link.href}">` },
      };
    }

    // Preuve plus faible : libelle evoquant la reservation.
    const wording = links.find(
      ({ link }) => PATTERNS.booking.test(link.text) || PATTERNS.booking.test(link.href),
    );
    if (wording) {
      return {
        verdict: "VERIFIED",
        confidence: "MEDIUM",
        isProblem: false,
        observation: `Un lien évoquant la réservation existe : « ${wording.link.text || wording.link.href} ». La destination n'a pas été ouverte, donc le fonctionnement réel n'est pas confirmé.`,
        method: "Recherche de liens dont le texte ou l'URL contient réserver / réservation / rendez-vous / booking.",
        evidence: { targetUrl: wording.page.page.finalUrl, snippet: `<a href="${wording.link.href}">${wording.link.text}</a>` },
      };
    }

    return {
      verdict: "NOT_FOUND",
      confidence: "HIGH",
      isProblem: true,
      issueType: "NO_BOOKING",
      severity: "MEDIUM",
      title: "Aucune réservation en ligne",
      observation: `Aucun lien de réservation ni de prise de rendez-vous n'a été trouvé sur les ${ctx.parsed.length} page(s) analysée(s). Les clients doivent appeler pendant les heures d'ouverture.`,
      method: "Recherche de liens vers des plateformes de réservation connues et de libellés « réserver / rendez-vous / booking ».",
      evidence: { data: { pagesChecked: ctx.parsed.map((p) => p.page.finalUrl) } },
    };
  },
};

/** 6. Appel a l'action : au moins UN moyen d'agir sur la page d'accueil */
export const ctaRule: AuditRule = {
  id: "conversion.cta",
  label: "Appel à l'action",
  category: "CONVERSION",
  order: 61,
  applicable: (ctx) => Boolean(ctx.parsedHome),
  notApplicableReason: () => "Page d'accueil non récupérée.",
  run: (ctx) => {
    const home = ctx.parsedHome!;
    const links = allLinks(home);

    const actions = {
      tel: links.filter((l) => PATTERNS.tel.test(l.href)).length,
      mailto: links.filter((l) => PATTERNS.mailto.test(l.href)).length,
      whatsapp: links.filter((l) => PATTERNS.whatsapp.test(l.href)).length,
      booking: links.filter((l) => PATTERNS.booking.test(l.href) || PATTERNS.booking.test(l.text)).length,
      forms: home.root.querySelectorAll("form").length,
      contactLink: links.filter((l) => /contact/i.test(l.href) || /contact/i.test(l.text)).length,
    };
    const total = Object.values(actions).reduce((a, b) => a + b, 0);

    if (total === 0) {
      return {
        verdict: "VERIFIED",
        confidence: "HIGH",
        isProblem: true,
        issueType: "NO_CLEAR_CTA",
        severity: "HIGH",
        title: "Aucun moyen d'agir sur la page d'accueil",
        observation:
          "La page d'accueil ne contient aucun élément permettant de passer à l'action : ni lien téléphone, ni email, ni WhatsApp, ni formulaire, ni lien de réservation, ni lien vers une page contact.",
        method:
          "Comptage sur la page d'accueil des liens tel:, mailto:, WhatsApp, réservation, des balises <form> et des liens « contact ».",
        evidence: { targetUrl: home.page.finalUrl, data: actions },
      };
    }

    return {
      verdict: "VERIFIED",
      confidence: "HIGH",
      isProblem: false,
      observation: `${total} élément(s) d'action détecté(s) sur la page d'accueil (téléphone : ${actions.tel}, email : ${actions.mailto}, WhatsApp : ${actions.whatsapp}, réservation : ${actions.booking}, formulaires : ${actions.forms}, liens contact : ${actions.contactLink}).`,
      method:
        "Comptage sur la page d'accueil des liens tel:, mailto:, WhatsApp, réservation, des balises <form> et des liens « contact ».",
      evidence: { targetUrl: home.page.finalUrl, data: actions },
    };
  },
};
