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
