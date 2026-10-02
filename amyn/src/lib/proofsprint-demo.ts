import type { Locale } from "./i18n/config.ts";
import { evidence, type DemoResponse, type EvidenceStatus } from "./proofsprint-demo-data.ts";

/**
 * Démonstration ProofSprint — textes de la page, calcul et fichiers
 * téléchargeables.
 *
 * Les textes reprennent ceux du paquet fourni (index.html, 2 octobre 2026),
 * adaptés au site. Règles :
 * - la démonstration est fictive et le dit partout ;
 * - « Sourcée » ne veut jamais dire « validée par un client » ;
 * - les réponses négatives et les preuves manquantes restent visibles ;
 * - le calculateur ne compte que la capacité libérée (heures × coût ×
 *   part attribuable), jamais un chiffre d'affaires ni un taux de
 *   signature ; le résultat négatif reste affiché ;
 * - l'exemple ne valide pas le prix de 12 500 €.
 */

export { evidence };
export type { DemoResponse, EvidenceStatus };

/** Prix du forfait ProofSprint, utilisé par le calculateur. */
export const DEMO_FEE_EUR = 12500;

export const STATUSES: EvidenceStatus[] = ["supported", "review", "missing"];

const fr = {
  meta: {
    title: "Exemple ProofSprint — dossier de preuves fictif",
    description:
      "Un dossier ProofSprint complet et fictif : 20 questions d'acheteur, 8 documents sources, réponses traçables, preuves manquantes, synthèse de déploiement et calculateur transparent.",
  },
  crumb: "Exemple",
  anchor: { matrix: "matrice", sources: "sources", calculator: "calculateur" },
  label: "ProofSprint · Exemple fictif · 2 octobre 2026",
  title: "Examinez le travail derrière l'offre.",
  intro:
    "Examinez un exemple complet : 20 questions d’un acheteur, 8 documents sources fictifs, une matrice de réponses traçables, une synthèse de déploiement et un registre des preuves manquantes. Cliquez sur une référence pour consulter l’extrait exact. Cet exemple illustre notre méthode ; il ne constitue pas un résultat client ni une preuve d’économie réalisée.",
  noticeTitle: "Démonstration fictive",
  notice:
    "Documents produit, demandes et chiffres inventés pour cet exemple. Aucune validation client réelle, certification, économie mesurée ou vente n’est revendiquée.",
  publicNotice:
    "Page publique, sans contrôle d’accès : elle ne contient aucune information confidentielle et ne sert pas d’espace sécurisé pour des documents clients.",
  languageNote:
    "Le site présente cet exemple en français et en anglais ; un ProofSprint standard est livré dans une seule langue.",
  backToOffer: "Revenir à l’offre ProofSprint",
  contact: "Parlons de votre dossier",
  overview: {
    label: "Vue d’ensemble",
    title: "Des documents dispersés à un dossier vérifiable",
    before: ["Avant", "Huit documents dispersés ; objectifs provisoires mêlés aux engagements ; certificats manquants."],
    after: ["Après", "Vingt réponses traçables ; limites explicites ; synthèse de mise en œuvre et actions de relecture attribuées."],
    unproven: ["Ce qui reste non démontré", "Conformité produit, temps réellement économisé, validation client et rentabilité commerciale."],
  },
  status: {
    supported: "Sourcée sur document fictif",
    review: "Relecture expert requise",
    missing: "Preuve manquante",
  } as Record<EvidenceStatus, string>,
  matrix: {
    label: "Matrice de réponses",
    note: "20 questions reliées à huit documents. « Sourcée » signifie étayée par ce texte fictif ; cela ne signifie pas validée par un expert réel. Les réponses négatives restent visibles.",
    filter: "État de la preuve",
    all: "Toutes les questions",
    shown: (n: number) => `${n} question${n > 1 ? "s" : ""} affichée${n > 1 ? "s" : ""}`,
    caption: "Matrice de réponses de la démonstration fictive",
    cols: ["ID", "Question de l’acheteur", "Réponse proposée", "Source et état"],
    noSource: "Aucune source fournie",
    openSource: (id: string) => `Ouvrir l’extrait de la source ${id}`,
    download: "Télécharger la matrice (CSV)",
  },
  sources: {
    label: "Sources originales",
    note: "Chaque citation mène à l’extrait exact et à sa section. Ces sources sont fictives, pas des preuves concernant un produit réel.",
    fictional: "Source fictive. Aucune validation réelle obtenue.",
    download: "Télécharger les sources (TXT)",
    backToMatrix: "Retour à la matrice",
  },
  room: {
    label: "Synthèse de l’espace acheteur",
    items: [
      ["Adéquation", "Circuits Enterprise et SSO SAML décrits. SCIM et support 24 h/24 non inclus."],
      ["Preuves", "Douze réponses sourcées ; cinq à relire ; trois sans preuve. Aucune certification revendiquée."],
      ["Déploiement", "Pilote estimé à quatre semaines ; sponsor et administrateur identité côté client ; migration historique exclue."],
      ["Économie", "Coût logiciel illustratif de première année : 60 000 €. Situation initiale absente ; ROI acheteur non calculable."],
      ["Questions ouvertes", "Tests de reprise, exceptions de suppression, sous-traitants, certificats et preuves SAP non résolus."],
      ["Décision", "Pas de recommandation de signature avant résolution des exigences obligatoires et validations expertes."],
    ] as [string, string][],
  },
  plan: {
    label: "Mise en œuvre et questions ouvertes",
    pilotTitle: "Dépendances du pilote",
    pilot:
      "Éditeur : configurer espace et SAML. Client : approuver le pilote, fournir administrateur identité et jeu de test. Ensemble : fixer les critères de succès. Quatre semaines est une estimation source, pas une promesse de livraison ProofSprint.",
    owners:
      "Responsable requis : expert sécurité/confidentialité pour Q13–16 et Q18–19 ; responsable commercial pour Q17 ; intégration pour Q20. Échéances à convenir avec le client réel.",
  },
  calc: {
    label: "Le service est-il économiquement pertinent ?",
    note: "Ce calculateur évalue la capacité de préparation commerciale potentiellement libérée par ProofSprint. Il est distinct du ROI du logiciel pour l’acheteur fictif, dont la situation initiale n’a pas été fournie. Toutes les entrées ci-dessous sont des hypothèses.",
    inputs: "Vos hypothèses",
    assumption: "Hypothèse",
    hours: "Heures réellement évitées",
    rate: "Coût horaire complet (€)",
    share: "Part attribuable (%)",
    formula:
      "Valeur de capacité = heures × coût horaire × part attribuable. Valeur nette = capacité − forfait de 12 500 €.",
    capacity: "Valeur de capacité illustrative",
    net: "Valeur nette illustrative",
    breakEven: (h: string) => `Seuil d’équilibre : ${h} heures réellement évitées.`,
    noBreakEven: "Pas de seuil fini avec une valeur horaire attribuée nulle.",
    interpretation: "Interprétation",
    below: "Avec ces hypothèses, la capacité libérée ne couvre pas le forfait.",
    above: "Avec ces hypothèses, la capacité couvre le forfait. C’est un scénario, pas un résultat mesuré.",
    caveat:
      "Le temps libéré n’est pas automatiquement une économie de trésorerie. Aucun taux de signature accru ni chiffre d’affaires n’est inclus. Ne pas compter deux fois le même bénéfice.",
  },
  accept: {
    label: "Contrôles de remise et d’acceptation",
    items: [
      "Recenser chaque question et conserver les réponses négatives.",
      "Faire vérifier actualité, pertinence et affirmations par les experts habilités ; enregistrer leur validation réelle.",
      "Résoudre les manques obligatoires ou convenir de leur exclusion. Une réponse sourcée n’est pas automatiquement validée.",
      "Convenir des transferts sécurisés, hébergement, permissions et traitement des informations avant le travail réel. Cet exemple public n’a pas de contrôle d’accès.",
      "Obtenir l’acceptation expresse des livrables convenus. Cet exemple n’a aucune acceptation client ni chiffre d’affaires.",
    ],
  },
  closing: {
    label: "Et pour votre dossier ?",
    title: "Un exemple ne valide pas un prix.",
    priceNote:
      "Cet exemple montre un dossier concret, assemblé et vérifiable. Il ne prouve pas que 12 500 € est un prix validé par le marché ni pertinent pour votre projet. Confirmer périmètre, charge réelle, accès aux experts et intérêt économique avant d’accepter un prix.",
  },
  footer: "AMYN · Exemple fictif uniquement · Aucun document client confidentiel · Validation client requise avant toute remise réelle à un acheteur.",
  files: { matrix: "proofsprint-exemple-matrice.csv", sources: "proofsprint-exemple-sources.txt" },
  csv: {
    header: ["ID", "Question de l’acheteur", "Réponse proposée", "Source", "Section", "Extrait exact de la source", "État de la preuve", "Validation client"],
    approval: "Non obtenue — démonstration fictive",
    sourcesHeader: "DÉMONSTRATION FICTIVE — AUCUN DOCUMENT CLIENT",
  },
};

export type DemoCopy = typeof fr;

const en: DemoCopy = {
  meta: {
    title: "ProofSprint example — fictional evidence pack",
    description:
      "A complete, fictional ProofSprint pack: 20 buyer questions, 8 source documents, traceable answers, missing evidence, an implementation summary and a transparent calculator.",
  },
  crumb: "Example",
  anchor: { matrix: "matrix", sources: "sources", calculator: "calculator" },
  label: "ProofSprint · Fictional example · 2 October 2026",
  title: "Inspect the work behind the offer.",
  intro:
    "Inspect a worked example: 20 buyer questions, eight fictional source documents, a traceable response matrix, an implementation summary and an evidence-gap register. Click a citation to inspect the exact excerpt. This example demonstrates our method; it is not a client result or evidence of measured savings.",
  noticeTitle: "Fictional demonstration",
  notice:
    "All product documents, requirements and numbers are invented for this example. No real client approval, certification, measured saving or sales result is claimed.",
  publicNotice:
    "Public page with no access control: it contains no confidential information and is not a secure room for client documents.",
  languageNote:
    "This website shows the example in English and French; a standard ProofSprint is delivered in one language.",
  backToOffer: "Back to the ProofSprint offer",
  contact: "Discuss your deal",
  overview: {
    label: "Overview",
    title: "From scattered documents to a reviewable dossier",
    before: ["Before", "Eight disconnected documents; draft objectives mixed with commitments; missing certificates."],
    after: ["After", "Twenty traceable answers; explicit limitations; an implementation summary and assigned review actions."],
    unproven: ["What remains unproven", "Product compliance, actual time saved, client approval and commercial return."],
  },
  status: {
    supported: "Supported by fictional source",
    review: "Expert review required",
    missing: "Evidence missing",
  },
  matrix: {
    label: "Response matrix",
    note: "20 questions mapped to eight documents. “Supported” means the answer is supported by this fictional text; it does not mean a real expert has approved it. Negative answers remain visible.",
    filter: "Evidence status",
    all: "All questions",
    shown: (n: number) => `${n} question${n === 1 ? "" : "s"} shown`,
    caption: "Response matrix of the fictional demonstration",
    cols: ["ID", "Buyer question", "Proposed answer", "Source and status"],
    noSource: "No source supplied",
    openSource: (id: string) => `Open the excerpt from source ${id}`,
    download: "Download the matrix (CSV)",
  },
  sources: {
    label: "Original sources",
    note: "Every citation leads to the exact excerpt and section. These are authored fictional inputs, not third-party evidence about a real product.",
    fictional: "Fictional source. No real owner approval obtained.",
    download: "Download the sources (TXT)",
    backToMatrix: "Back to the matrix",
  },
  room: {
    label: "Buyer room overview",
    items: [
      ["Fit", "Enterprise workflows and SAML SSO are described. SCIM and 24/7 support are not included."],
      ["Evidence", "Twelve answers supported; five need review; three lack evidence. No certification claim is released."],
      ["Implementation", "Four-week pilot estimate; customer sponsor and identity administrator; historical migration excluded."],
      ["Economics", "Software year-one illustrative cost: €60,000. Buyer benefit baseline missing; buyer ROI cannot yet be calculated."],
      ["Open questions", "Recovery tests, deletion exceptions, subprocessors, certificates and SAP evidence remain unresolved."],
      ["Decision", "No recommendation to sign until the buyer’s mandatory requirements and relevant expert approvals are resolved."],
    ],
  },
  plan: {
    label: "Implementation and open questions",
    pilotTitle: "Pilot dependencies",
    pilot:
      "Vendor: configure workspace and SAML. Customer: approve pilot scope, provide identity administrator and a test dataset. Joint: agree success criteria before launch. Four weeks is an input estimate, not a ProofSprint delivery promise.",
    owners:
      "Required owner: security/privacy expert for Q13–16 and Q18–19; commercial owner for Q17; integration lead for Q20. Due dates must be agreed with the real client.",
  },
  calc: {
    label: "Is the service economically worthwhile?",
    note: "This calculator evaluates possible proposal-preparation capacity released by ProofSprint. It is separate from the fictional software’s buyer ROI, for which no benefit baseline has been provided. All inputs below are assumptions.",
    inputs: "Your assumptions",
    assumption: "Assumption",
    hours: "Hours genuinely avoided",
    rate: "Fully loaded hourly cost (€)",
    share: "Attributable share (%)",
    formula:
      "Capacity value = hours × hourly cost × attributable share. Net value = capacity value − €12,500 service fee.",
    capacity: "Illustrative capacity value",
    net: "Net illustrative value",
    breakEven: (h: string) => `Break-even: ${h} genuinely avoided hours.`,
    noBreakEven: "No finite break-even at zero attributed hourly value.",
    interpretation: "Interpretation",
    below: "On these assumptions, capacity value alone does not cover the fee.",
    above: "On these assumptions, capacity value covers the fee. This is a scenario, not a measured outcome.",
    caveat:
      "Released staff time is not automatically cash saved. No increased win rate or deal revenue is included. Avoid counting the same benefit twice.",
  },
  accept: {
    label: "Release and acceptance checklist",
    items: [
      "Account for every buyer question and preserve negative answers.",
      "Have authorized experts verify source currency, relevance and each proposed claim; record their real sign-off.",
      "Resolve mandatory gaps or explicitly agree their exclusion. No source-backed answer is automatically client-approved.",
      "Agree secure source transfer, hosting, permissions and confidential-material handling before real work. This public sample has no access control.",
      "Obtain express client acceptance of the agreed deliverables. This sample has no client acceptance or revenue.",
    ],
  },
  closing: {
    label: "And for your deal?",
    title: "An example does not validate a price.",
    priceNote:
      "This example proves that a concrete dossier can be assembled and inspected. It does not prove that €12,500 is market-validated or worthwhile for your project. Confirm scope, actual workload, expert access and economic fit before agreeing a price.",
  },
  footer: "AMYN · Synthetic sample only · No confidential client material · Client sign-off required before any real buyer release.",
  files: { matrix: "proofsprint-example-matrix.csv", sources: "proofsprint-example-sources.txt" },
  csv: {
    header: ["ID", "Buyer question", "Proposed answer", "Source", "Section", "Exact source excerpt", "Evidence status", "Client approval"],
    approval: "Not obtained — fictional demonstration",
    sourcesHeader: "FICTIONAL DEMONSTRATION — NO CLIENT DOCUMENTS",
  },
};

const copy: Record<Locale, DemoCopy> = { fr, en };
export const getDemo = (locale: Locale): DemoCopy => copy[locale];

export const countByStatus = (status: EvidenceStatus) =>
  evidence.responses.filter((r) => r.status === status).length;

/* ---------------------------------------------------------------------------
   Calculateur — capacité libérée, rien d'autre.
   --------------------------------------------------------------------------- */

export const CALC_LIMITS = { hours: 10000, rate: 10000, share: 100 } as const;
export const CALC_DEFAULTS = { hours: 60, rate: 150, share: 100 } as const;

const clamp = (value: number, max: number) => (Number.isFinite(value) ? Math.min(max, Math.max(0, value)) : 0);

/**
 * Valeur de capacité = heures × coût horaire × part attribuable ;
 * valeur nette = capacité − forfait. Le seuil d'équilibre n'existe que si
 * la valeur horaire attribuée est positive (pas de division par zéro).
 */
export function computeCapacity(input: { hours: number; rate: number; share: number }, fee = DEMO_FEE_EUR) {
  const hours = clamp(input.hours, CALC_LIMITS.hours);
  const rate = clamp(input.rate, CALC_LIMITS.rate);
  const share = clamp(input.share, CALC_LIMITS.share) / 100;
  const hourly = rate * share;
  const capacity = hours * hourly;
  return {
    capacity,
    net: capacity - fee,
    breakEvenHours: hourly > 0 ? fee / hourly : null,
    coversFee: capacity >= fee,
  };
}

/* ---------------------------------------------------------------------------
   Fichiers téléchargeables (générés au build, voir app/…/route.ts)
   --------------------------------------------------------------------------- */

const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;

/**
 * Matrice au format CSV : UTF-8 avec BOM (accents lisibles dans Excel),
 * champs entre guillemets, fins de ligne CRLF.
 */
export function matrixCsv(locale: Locale): string {
  const t = getDemo(locale);
  const quote = (ids: string[]) =>
    ids.map((id) => evidence.sources.find((s) => s.id === id)?.quote[locale] ?? "").join(" | ");
  const section = (ids: string[]) =>
    ids.map((id) => evidence.sources.find((s) => s.id === id)?.section ?? "").join(";");
  const rows = [
    t.csv.header,
    ...evidence.responses.map((r) => [
      r.id,
      r.question[locale],
      r.answer[locale],
      r.source_ids.join(";"),
      section(r.source_ids),
      quote(r.source_ids),
      t.status[r.status],
      t.csv.approval,
    ]),
  ];
  return "﻿" + rows.map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";
}

/** Les huit documents sources, en texte brut (UTF-8 avec BOM, CRLF). */
export function sourcesText(locale: Locale): string {
  const t = getDemo(locale);
  const blocks = evidence.sources.map((s) =>
    [`${s.id} — ${s.title[locale]}`, `Section ${s.section}`, s.quote[locale]].join("\r\n"),
  );
  return "﻿" + [t.csv.sourcesHeader, evidence.scenario[locale], ...blocks].join("\r\n\r\n") + "\r\n";
}

/** Adresses des fichiers téléchargeables, dans la langue de la page. */
export function demoFiles(locale: Locale) {
  const base = locale === "fr" ? "/proofsprint/exemple" : "/en/proofsprint/example";
  return {
    matrix: `${base}/${locale === "fr" ? "matrice.csv" : "matrix.csv"}`,
    sources: `${base}/sources.txt`,
  };
}
