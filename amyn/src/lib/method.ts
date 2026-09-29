import type { Locale } from "./i18n/config.ts";

/**
 * La méthode AMYN — quatre étapes, reprises par l'accueil et la page
 * Méthode (qui les détaille).
 */
export const method = [
  {
    number: "01",
    title: "Comprendre",
    summary: "Votre activité, votre objectif, votre situation actuelle.",
    detail:
      "Avant de parler de solution, nous regardons comment votre entreprise fonctionne : qui sont vos clients, comment ils vous trouvent, comment une demande est traitée, ce qui vous fait perdre du temps. C'est souvent là que se trouve la vraie réponse.",
    outputs: ["Échange de découverte", "Revue de votre présence actuelle", "Objectif formulé clairement"],
  },
  {
    number: "02",
    title: "Cadrer",
    summary: "Le périmètre, les fonctionnalités, le calendrier, le devis.",
    detail:
      "Nous traduisons l'objectif en périmètre précis : ce qui sera fait, ce qui ne le sera pas, ce qui est attendu de votre part et dans quel ordre. Le devis reprend ce cadrage. Rien ne commence sans votre accord écrit.",
    outputs: ["Périmètre détaillé", "Calendrier par étapes", "Devis"],
  },
  {
    number: "03",
    title: "Concevoir",
    summary: "Design, développement, configuration.",
    detail:
      "Nous dessinons, développons et configurons par étapes, en vous montrant l'avancement régulièrement. Les choix importants sont validés avec vous au bon moment, pas découverts à la fin.",
    outputs: ["Maquettes validées", "Versions de travail", "Contenus intégrés"],
  },
  {
    number: "04",
    title: "Livrer & accompagner",
    summary: "Tests, mise en ligne, prise en main, suivi en option.",
    detail:
      "Tout est testé sur téléphone et sur ordinateur avant la mise en ligne. Nous vous remettons les accès et vous montrons comment utiliser ce qui a été construit. Un accompagnement après livraison peut être prévu au devis, si vous le souhaitez.",
    outputs: ["Tests et recette", "Mise en ligne", "Prise en main", "Suivi optionnel"],
  },
] as const;

/** Ce qui guide chaque projet — sans chiffre inventé. */
export const principles = [
  {
    title: "Une solution adaptée à l'activité",
    body: "Nous partons de votre fonctionnement réel, pas d'un modèle à remplir.",
  },
  {
    title: "Pensé d'abord pour le téléphone",
    body: "C'est là que la plupart de vos clients vous découvrent. Tout est conçu pour y être simple.",
  },
  {
    title: "Un périmètre clair",
    body: "Vous savez ce qui est inclus, ce qui ne l'est pas, et pourquoi, avant de vous engager.",
  },
  {
    title: "Une communication directe",
    body: "Vous parlez à ceux qui conçoivent et construisent votre projet.",
  },
  {
    title: "Une technologie moderne et sobre",
    body: "Des outils actuels, choisis pour être rapides, fiables et maintenables.",
  },
  {
    title: "Pas de fonctionnalité inutile",
    body: "Chaque élément doit servir vos clients ou votre équipe. Le reste n'est pas construit.",
  },
] as const;

export const methodEn = [
  {
    number: "01",
    title: "Understand",
    summary: "Your business, your goal, where you stand today.",
    detail:
      "Before talking solutions, we look at how your business actually runs: who your customers are, how they find you, how a request is handled, what wastes your time. That's usually where the real answer is.",
    outputs: ["Discovery conversation", "Review of your current presence", "A clearly stated goal"],
  },
  {
    number: "02",
    title: "Scope",
    summary: "Scope, features, timeline, quote.",
    detail:
      "We turn the goal into a precise scope: what will be done, what won't, what we need from you and in what order. The quote reflects that scope. Nothing starts without your written agreement.",
    outputs: ["Detailed scope", "Staged timeline", "Quote"],
  },
  {
    number: "03",
    title: "Build",
    summary: "Design, development, configuration.",
    detail:
      "We design, build and configure in stages, showing you progress regularly. Important decisions are made with you at the right time — not discovered at the end.",
    outputs: ["Approved designs", "Work-in-progress versions", "Content in place"],
  },
  {
    number: "04",
    title: "Launch & support",
    summary: "Testing, go-live, handover, optional follow-up.",
    detail:
      "Everything is tested on phone and desktop before going live. We hand over the access and show you how to use what we've built. Ongoing support after launch can be included in the quote, if you want it.",
    outputs: ["Testing and sign-off", "Go-live", "Handover", "Optional support"],
  },
] as const;

export const principlesEn = [
  {
    title: "Built around your business",
    body: "We start from how you actually work, not from a template to fill in.",
  },
  {
    title: "Designed for the phone first",
    body: "That's where most of your customers discover you. Everything is designed to be simple there.",
  },
  {
    title: "A clear scope",
    body: "You know what's included, what isn't, and why, before you commit.",
  },
  {
    title: "Direct communication",
    body: "You talk to the people who design and build your project.",
  },
  {
    title: "Modern, restrained technology",
    body: "Current tools, chosen for speed, reliability and easy maintenance.",
  },
  {
    title: "No pointless features",
    body: "Every element has to serve your customers or your team. Everything else doesn't get built.",
  },
] as const;

export const getMethod = (locale: Locale = "fr") => (locale === "en" ? methodEn : method);
export const getPrinciples = (locale: Locale = "fr") => (locale === "en" ? principlesEn : principles);
