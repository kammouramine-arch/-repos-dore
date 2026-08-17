// ---------------------------------------------------------------------------
// CLASSIFICATION DES REPONSES
//
// Deterministe, sans appel externe : chaque classement est justifie par les
// expressions qui l'ont declenche (matchedSignals). On peut toujours dire
// POURQUOI une reponse a ete classee ainsi.
//
// L'opposition (OPT_OUT) est prioritaire sur tout le reste : dans le doute,
// on protege le destinataire.
// ---------------------------------------------------------------------------

import type { ReplyClass } from "@/lib/constants";

type Rule = {
  cls: ReplyClass;
  /** Plus bas = evalue en premier. */
  priority: number;
  patterns: RegExp[];
};

const RULES: Rule[] = [
  {
    cls: "OPT_OUT",
    priority: 0,
    patterns: [
      /\bstop\b/i,
      /ne (plus|pas) (me |nous )?(contacter|ecrire|solliciter|envoyer)/i,
      /ne (me |nous )?(contactez|[ée]crivez|sollicitez|recontactez) plus/i,
      /plus (jamais |)de (mail|message|courriel)/i,
      /d[ée]sinscri(re|vez|s)/i,
      /d[ée]sabonn/i,
      /retirez[- ]moi/i,
      /supprimez? (mon|mes|notre) (adresse|coordonn[ée]es|donn[ée]es)/i,
      /je m'oppose/i,
      /arr[êe]tez de m'/i,
      /spam/i,
      /\brgpd\b/i,
    ],
  },
  {
    cls: "BOUNCE",
    priority: 1,
    patterns: [
      /mail(er)?[- ]daemon/i,
      /delivery status notification/i,
      /undeliverable|undelivered/i,
      /adresse (introuvable|inexistante|inconnue)/i,
      /user unknown|recipient not found|mailbox (unavailable|full)/i,
      /550[- ]5\.\d\.\d/i,
      /message (n'a pas pu|could not be delivered)/i,
    ],
  },
  {
    cls: "MEETING_REQUEST",
    priority: 2,
    patterns: [
      /appelez[- ]moi/i,
      /rappelez[- ]moi/i,
      /on (peut|pourrait) (se voir|se rencontrer|en discuter|s'appeler)/i,
      /prendre? (un )?(rendez[- ]vous|rdv)/i,
      /disponible (lundi|mardi|mercredi|jeudi|vendredi|demain|cette semaine)/i,
      /quand [êe]tes[- ]vous (dispo|disponible)/i,
      /passer? (me voir|nous voir|[àa] l'atelier|au salon)/i,
      /mon num[ée]ro (est|:)/i,
    ],
  },
  {
    cls: "PRICE_REQUEST",
    priority: 3,
    patterns: [
      /combien (ca|ça|cela) (coute|coûte)/i,
      /quel(s|le|les)? (est |sont |)(le |la |les |votre |vos |)?(prix|tarif|tarifs|budget|co[uû]ts?)/i,
      /vos (prix|tarifs)/i,
      /(un |)devis/i,
      /c'est (a|à) combien/i,
      /\bbudget\b/i,
      /combien pour/i,
    ],
  },
  {
    cls: "INTERESTED",
    priority: 4,
    patterns: [
      /(ca|ça|cela) m'?int[ée]resse/i,
      /je suis int[ée]ress[ée]/i,
      /\boui\b.{0,30}(int[ée]ress|volontiers|avec plaisir)/i,
      /pourquoi pas/i,
      /d'accord pour/i,
      /allons[- ]y/i,
      /je veux bien (en savoir|voir|discuter)/i,
      /dites[- ]m'en (plus|davantage)/i,
      /votre proposition m'/i,
    ],
  },
  {
    cls: "NOT_INTERESTED",
    priority: 5,
    patterns: [
      /pas int[ée]ress[ée]/i,
      /(ca|ça) ne m'?int[ée]resse pas/i,
      /non merci/i,
      /nous (avons|sommes) d[ée]j[àa] (equip|servi|accompagn|un presta)/i,
      /on a d[ée]j[àa] (un|une|quelqu'un)/i,
      /pas (de |)besoin/i,
      /nous ne sommes pas int[ée]ress/i,
      /sans suite/i,
    ],
  },
  {
    cls: "LATER",
    priority: 6,
    patterns: [
      /plus tard/i,
      /(recontactez|revenez|rappelez)[- ]?(moi|nous)? (dans|en|apr[èe]s)/i,
      /pas (pour le moment|maintenant|d'actualit[ée])/i,
      /l'ann[ée]e prochaine/i,
      /dans (quelques |un |deux |trois |\d+ )?(semaines?|mois)/i,
      /on verra (ca|ça) (plus tard|apr[èe]s)/i,
      /trop t[ôo]t/i,
    ],
  },
  {
    cls: "QUESTION",
    priority: 7,
    patterns: [
      /\?\s*$/m,
      /pouvez[- ]vous (me |nous |)(pr[ée]ciser|expliquer|dire|envoyer)/i,
      /qu'est[- ]ce que/i,
      /comment (ca|ça) (marche|fonctionne)/i,
      /qui [êe]tes[- ]vous/i,
      /d'o[uù] (vient|tenez[- ]vous)/i,
      /quel(le|s|les)? (d[ée]lai|garantie|d[ée]marche)/i,
    ],
  },
];

export type Classification = {
  classification: ReplyClass;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  matchedSignals: string[];
  reason: string;
};

export function classifyReply(input: { subject: string; body: string }): Classification {
  const text = `${input.subject}\n${input.body}`;
  const matches: Array<{ rule: Rule; signals: string[] }> = [];

  for (const rule of RULES) {
    const signals: string[] = [];
    for (const pattern of rule.patterns) {
      const m = pattern.exec(text);
      if (m) signals.push(m[0].trim().slice(0, 80));
    }
    if (signals.length > 0) matches.push({ rule, signals });
  }

  if (matches.length === 0) {
    return {
      classification: "OTHER",
      confidence: "LOW",
      matchedSignals: [],
      reason:
        "Aucune expression reconnue. Classée OTHER : à lire manuellement plutôt que d'être interprétée.",
    };
  }

  matches.sort((a, b) => a.rule.priority - b.rule.priority);
  const best = matches[0];

  // Plusieurs categories differentes = ambiguite : on baisse la confiance.
  const distinct = new Set(matches.map((m) => m.rule.cls));
  const confidence: Classification["confidence"] =
    best.signals.length >= 2 && distinct.size === 1
      ? "HIGH"
      : distinct.size > 2
        ? "LOW"
        : "MEDIUM";

  return {
    classification: best.rule.cls,
    confidence,
    matchedSignals: best.signals,
    reason: `Classée ${best.rule.cls} sur ${best.signals.length} expression(s) reconnue(s) : ${best.signals.map((s) => `« ${s} »`).join(", ")}.${distinct.size > 1 ? ` D'autres catégories possibles : ${[...distinct].slice(1).join(", ")}.` : ""}`,
  };
}
