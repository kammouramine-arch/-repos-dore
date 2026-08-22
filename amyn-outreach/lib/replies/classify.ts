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

import { REPLY_META, type ReplyClass } from "@/lib/constants";

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
      // Formulations anglaises : les boutons de desinscription des clients mail
      // les emploient meme dans des messages en francais.
      /\bunsubscribe\b/i,
      /\bremove me\b/i,
      /\bopt[- ]?out\b/i,
      /\btake me off\b/i,
      /\bdo not (contact|email|mail) me\b/i,
      /\bstop (emailing|contacting|mailing) me\b/i,
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
      /appelez[- ]moi(?!\s+(dans|en|apr[èe]s|plus tard|ult[ée]rieurement))/i,
      // « rappelez-moi dans six mois » est un report, pas un rendez-vous :
      // on refuse de matcher quand un delai suit.
      /rappelez[- ]moi(?!\s+(dans|en|apr[èe]s|plus tard|ult[ée]rieurement|peut[- ]?[êe]tre dans))/i,
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
    // Message clairement hostile, juridique ou hors sujet commercial : il ne
    // doit surtout pas etre traite par un automatisme.
    cls: "NEEDS_HUMAN",
    priority: 7,
    patterns: [
      /\b(avocat|juridique|mise en demeure|poursuite|plainte)\b/i,
      /\b(cnil|mise en conformit[ée])\b/i,
      /(d'o[uù]|comment) (avez[- ]vous|vous [êe]tes[- ]vous) (eu|obtenu|procur[ée]) (mon|mes|nos|notre)/i,
      /\b(harc[èe]lement|inadmissible|scandaleux|honteux)\b/i,
      /supprimez (toutes |l'ensemble de |)(mes|nos) donn[ée]es/i,
      /droit (d'acc[èe]s|a l'effacement|à l'effacement)/i,
      /\berreur de destinataire\b/i,
      /(je ne suis pas|ce n'est pas) (le |la |)(bon|bonne) (interlocuteur|interlocutrice|personne)/i,
    ],
  },
  {
    cls: "QUESTION",
    priority: 8,
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
  {
    // Ton favorable sans engagement explicite : « merci, c'est bien vu ».
    // On ne le compte PAS comme un prospect interesse : on ne surinterprete pas.
    cls: "POSITIVE",
    priority: 9,
    patterns: [
      // « merci » seul est une formule de politesse, presente aussi bien dans
      // « merci beaucoup ! » que dans « merci mais non merci ». Ce n'est PAS
      // un signe favorable : seules les formulations qui portent reellement un
      // jugement positif comptent ici.
      /c'est (gentil|sympa|aimable|bien vu|not[ée]|utile)/i,
      /\bbonne (initiative|d[ée]marche|remarque|analyse)\b/i,
      /je (prends|garde) (bonne |)note/i,
      /\b(c'est |tr[èe]s |plut[ôo]t |assez |)int[ée]ressant\b/i,
      /\bbravo\b/i,
      /\bpertinent\b/i,
      /vous avez raison/i,
    ],
  },
  {
    // Ton defavorable sans refus explicite de l'offre.
    cls: "NEGATIVE",
    priority: 10,
    patterns: [
      /\b(d[ée]sol[ée]|malheureusement)\b/i,
      /\bpas (le temps|disponible|possible)\b/i,
      /\bce n'est pas (le moment|opportun)\b/i,
      /\bnous ne (souhaitons|voulons) pas\b/i,
      /\bje passe\b/i,
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
      classification: "UNKNOWN",
      confidence: "LOW",
      matchedSignals: [],
      reason:
        "Aucune expression reconnue. Classée UNKNOWN : elle sera lue par un humain plutôt qu'interprétée au hasard.",
    };
  }

  matches.sort((a, b) => a.rule.priority - b.rule.priority);
  const best = matches[0];
  const distinct = [...new Set(matches.map((m) => m.rule.cls))];

  // -------------------------------------------------------------------------
  // PRIORITE ABSOLUE : opposition et rebond.
  //
  // Ces deux classements protegent le destinataire et la reputation du
  // domaine. Ils ne sont JAMAIS degrades par la regle d'ambiguite ci-dessous :
  // dans le doute, on protege.
  // -------------------------------------------------------------------------
  if (best.rule.cls === "OPT_OUT" || best.rule.cls === "BOUNCE") {
    return {
      classification: best.rule.cls,
      confidence: "HIGH",
      matchedSignals: best.signals,
      reason:
        `Classée ${best.rule.cls} sur ${best.signals.length} expression(s) reconnue(s) : ` +
        `${best.signals.map((x) => `« ${x} »`).join(", ")}. ` +
        (best.rule.cls === "OPT_OUT"
          ? "L'opposition est prioritaire sur tout autre classement."
          : "Le rebond est prioritaire sur tout autre classement."),
    };
  }

  // -------------------------------------------------------------------------
  // AMBIGUITE : on ne tranche pas au hasard.
  //
  // L'ambiguite n'est PAS le nombre de categories reconnues. « Ça m'intéresse,
  // quel est votre tarif ? » en declenche trois — toutes favorables, et toutes
  // d'accord entre elles : c'est un signal net, pas un doute.
  //
  // Le vrai doute, c'est le CONFLIT DE SENS : des expressions favorables ET
  // defavorables dans le meme message, sans qu'un camp l'emporte nettement.
  // Dans ce cas on ne choisit pas : NEEDS_HUMAN.
  // -------------------------------------------------------------------------
  const opposing = matches.filter(
    (m) => REPLY_META[m.rule.cls].positive !== REPLY_META[best.rule.cls].positive,
  );
  const bestStrength = best.signals.length;
  const opposingStrength = Math.max(0, ...opposing.map((m) => m.signals.length));

  // Conflit non tranche : le camp adverse est aussi fourni que le camp retenu.
  if (opposing.length > 0 && opposingStrength >= bestStrength) {
    return {
      classification: "NEEDS_HUMAN",
      confidence: "LOW",
      matchedSignals: matches.flatMap((m) => m.signals).slice(0, 6),
      reason:
        `Message contradictoire : des expressions favorables (${best.rule.cls}) et défavorables ` +
        `(${opposing.map((m) => m.rule.cls).join(", ")}) coexistent sans qu'aucune ne l'emporte. ` +
        "Le message doit être lu par un humain plutôt qu'interprété.",
    };
  }

  const agreeing = distinct.filter(
    (c) => REPLY_META[c].positive === REPLY_META[best.rule.cls].positive,
  );
  const confidence: Classification["confidence"] =
    bestStrength >= 2 || agreeing.length >= 2 ? "HIGH" : opposing.length > 0 ? "MEDIUM" : "MEDIUM";

  return {
    classification: best.rule.cls,
    confidence,
    matchedSignals: best.signals,
    reason:
      `Classée ${best.rule.cls} sur ${best.signals.length} expression(s) reconnue(s) : ` +
      `${best.signals.map((x) => `« ${x} »`).join(", ")}.` +
      (agreeing.length > 1 ? ` Lectures concordantes : ${agreeing.join(", ")}.` : "") +
      (opposing.length > 0
        ? ` Une expression allant dans l'autre sens a été relevée (${opposing[0].rule.cls}) mais reste minoritaire.`
        : ""),
  };
}
