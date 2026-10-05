import type { Locale } from "./config.ts";

/**
 * Textes des pages, dans les deux langues.
 *
 * Le français est la référence : le type de l'anglais en découle, donc une
 * clé oubliée en anglais est une erreur de compilation — il ne peut pas
 * rester de texte français égaré dans la version anglaise.
 *
 * Les contenus longs et structurés vivent ailleurs : services, réalisations,
 * FAQ et méthode dans `src/lib/*` ; pages légales dans `src/views/legal`.
 */

type Line = { text?: string; accent?: string };

const fr = {
  meta: {
    title: "AMYN — Revenue OS, automatisation commerciale et produits digitaux sur mesure",
    description:
      "AMYN conçoit et installe Revenue OS, l'infrastructure qui capte vos demandes, les qualifie, automatise les relances et aide votre équipe à conclure — ainsi que des sites, applications et outils digitaux sur mesure.",
    shareDescription:
      "Faites de votre entreprise un moteur de revenus. AMYN conçoit et installe Revenue OS.",
    shareAlt: "AMYN — Revenue OS et produits digitaux sur mesure",
    tagline:
      "Revenue OS, sites, applications et automatisation : des systèmes conçus autour de votre façon de vendre, pour transformer plus de demandes en clients.",
  },
  common: {
    home: "Accueil",
    homeAria: "accueil",
    breadcrumb: "Fil d'Ariane",
    skip: "Aller au contenu",
    discover: "Découvrir",
    or: "ou",
    studio: "Studio digital — France",
  },
  legalNav: {
    legalNotice: "Mentions légales",
    privacy: "Confidentialité",
    cookies: "Cookies",
    terms: "Conditions des services",
  },
  footer: { revenue: "Revenue OS", services: "Capacités", studio: "Studio", info: "Informations" },

  hero: {
    /* Repères du décor, en fond : décoratifs, jamais des liens. */
    landmarks: ["Expérience", "Analytique", "Automatisation", "Croissance"],
  },
  home: {
    services: {
      label: "Services",
      title: [{ text: "Sept façons" }, { text: "de mieux", accent: "travailler." }] as Line[],
      note: "Chaque projet est cadré et chiffré sur devis.",
    },
    firstLook: {
      label: "Premier aperçu",
      title: [{ text: "Avant la confiance," }, { accent: "la preuve." }] as Line[],
      lead: "Montrez-nous votre entreprise. Nous vous montrons d'abord ce que nous changerions — sans engagement.",
      steps: [
        { title: "Vous nous montrez", body: "Votre site, votre fiche Google ou simplement ce qui coince." },
        { title: "Nous regardons", body: "Nous repérons ce qui peut vraiment être amélioré." },
        { title: "On vous montre", body: "Une première piste concrète. Vous décidez ensuite." },
      ],
      outputs: [
        "Une direction de page d'accueil",
        "Une courte analyse de votre site",
        "Une piste pour vos réservations",
        "Une idée pour vos demandes et devis",
      ],
      outputsAria: "Exemples de premier aperçu",
      outreach: "Vous avez reçu un message d'AMYN ?",
    },
    work: {
      label: "Réalisations",
      title: [{ text: "Des concepts" }, { text: "qui se", accent: "voient." }] as Line[],
    },
    testimonials: {
      label: "Ils en parlent",
      title: [{ text: "Ce sont eux qui" }, { text: "en parlent le", accent: "mieux." }] as Line[],
      region: "Témoignages",
      slide: "Témoignage",
      of: "sur",
      previous: "Témoignage précédent",
      next: "Témoignage suivant",
      goTo: "Afficher le témoignage",
      draft: "Brouillon interne — témoignages non vérifiés, jamais publiés en production",
      draftShort: "Brouillon",
      verified: "Témoignage vérifié",
      source: "Source :",
      rating: "Note",
      outOf: "sur 5",
    },
    faq: {
      label: "FAQ",
      title: [{ text: "Questions" }, { accent: "fréquentes." }] as Line[],
      notHere: "Une question qui n'est pas ici ?",
      write: "Écrivez-nous",
      direct: "ou directement à",
    },
    final: {
      label: "Commencer",
      title: [{ text: "Montrez-nous" }, { text: "votre", accent: "entreprise." }] as Line[],
      lead: "On vous montre d'abord ce que nous changerions.",
    },
  },

  servicesPage: {
    metaTitle: "Capacités : sites web, applications, outils digitaux",
    metaDescription:
      "Au-delà de Revenue OS : sites web, suivi des demandes et des devis, applications mobiles, réservation en ligne, fiche Google Business, onboarding client, portfolio : les sept services d'AMYN, sur devis.",
    label: "Capacités · Sur devis",
    title: [{ text: "Ce que nous" }, { accent: "construisons." }] as Line[],
    lead: "Du site à l'application, des outils qui servent vraiment. Souvent combinés, toujours cadrés sur devis.",
    navAria: "Aller à un service",
  },
  service: {
    problem: "Le problème",
    recognise: "Vous vous reconnaissez ?",
    answer: "Notre réponse",
    includes: "Ce que cela peut inclure, selon votre projet",
    forWho: "Pour qui",
    forWhoTitle: [{ text: "Des exemples," }, { accent: "pas des limites." }] as Line[],
    forWhoBody:
      "Ces situations sont des exemples. Si votre activité n'y figure pas, c'est justement ce que nous regardons en premier.",
    process: "Déroulement",
    processTitle: [{ text: "Comment se passe" }, { accent: "ce type de projet." }] as Line[],
    scope: "Ce qui fait varier le devis",
    scopeBody:
      "Chaque projet est cadré selon vos besoins, vos objectifs et les fonctionnalités nécessaires. Le devis détaille ce qui est inclus avant tout engagement.",
    limits: "Ce que nous ne promettons pas",
    related: "Souvent associé à",
  },

  workPage: {
    metaTitle: "Réalisations",
    metaDescription:
      "Concepts de sites, de réservation, de suivi des demandes et d'accueil client créés par AMYN pour six métiers. Des démonstrations, présentées comme telles.",
    label: "Concepts · Démonstrations",
    title: [{ text: "Six métiers." }, { accent: "Six univers." }] as Line[],
    lead: "Chaque concept part d'un métier et d'un vrai problème. Le site, et l'outil qui l'accompagne.",
    noResults: "Aucun résultat n'est cité.",
  },
  project: {
    caseStudy: "Étude de cas",
    caseTitle: [{ text: "Le point de départ," }, { accent: "et la direction." }] as Line[],
    context: "Contexte",
    problem: "Problème",
    direction: "Direction",
    featuresAria: "Fonctionnalités",
    servicesAria: "Services mobilisés",
    screens: "Écrans du projet",
    next: "Concept suivant",
  },

  methodPage: {
    metaTitle: "Méthode",
    metaDescription:
      "Comprendre, cadrer, concevoir, livrer et accompagner : la méthode AMYN, étape par étape, avec un périmètre et un devis clairs avant tout engagement.",
    label: "Méthode",
    title: [{ text: "Un projet clair," }, { accent: "du début à la fin." }] as Line[],
    lead: "Quatre étapes, toujours dans le même ordre. Vous savez à chaque instant où en est votre projet.",
    step: "Étape",
    outputs: "Ce qui en sort",
    firstLookBefore: "Selon le projet, cette étape peut commencer par un",
    firstLookLink: "premier aperçu",
    firstLookAfter: ": une piste concrète, avant toute prestation payante.",
    commitments: "Nos engagements",
    commitmentsTitle: [{ text: "Ce qui ne change pas," }, { accent: "quel que soit le projet." }] as Line[],
    commitmentItems: [
      ["Rien ne commence sans devis signé", "Le périmètre, le calendrier et le prix sont écrits avant le début du travail."],
      ["Pas de promesse intenable", "Ni classement garanti, ni publication garantie sur les stores, ni chiffres inventés."],
      ["Des validations au bon moment", "Les choix importants vous sont montrés quand ils peuvent encore changer."],
      ["Vos contenus, avec vos droits", "Nous n'utilisons que des textes, photos et marques que vous êtes autorisé à publier."],
    ] as [string, string][],
  },

  aboutPage: {
    metaTitle: "À propos",
    metaDescription:
      "AMYN est un studio digital qui conçoit des sites, des applications et des outils autour de la façon dont chaque entreprise fonctionne. Notre approche et nos exigences.",
    label: "À propos",
    title: [{ text: "Un studio digital" }, { accent: "au service de la façon dont vous travaillez." }] as Line[],
    lead: "Des sites, des applications et des outils qui collent à l'activité réelle de chaque entreprise.",
    philosophy: "Philosophie",
    philosophyTitle: [{ text: "L'outil vient après" }, { accent: "la compréhension." }] as Line[],
    philosophyBody: [
      "La plupart des entreprises n'ont pas besoin de « plus de digital ». Elles ont besoin que les demandes n'attendent plus et que les clients sachent quoi faire.",
      "Nous regardons d'abord comment vous travaillez. L'outil vient ensuite — et seulement s'il est utile. Nous préférons montrer plutôt que promettre.",
    ],
    relation: "La relation",
    relationTitle: [{ text: "Travailler avec nous," }, { accent: "concrètement." }] as Line[],
    relationItems: [
      ["Un interlocuteur direct", "Vous échangez avec les personnes qui conçoivent et construisent votre projet."],
      ["Un vocabulaire simple", "Nous expliquons les choix techniques en français courant, et vous décidez en connaissance de cause."],
      ["Un périmètre écrit", "Ce qui est inclus, ce qui ne l'est pas, et ce que nous attendons de vous : tout est dans le devis."],
      ["Une suite, si vous le souhaitez", "Après la mise en ligne, un accompagnement peut être prévu. Il n'est jamais imposé."],
    ] as [string, string][],
    standards: "Exigences",
    standardsTitle: [{ text: "Le niveau de qualité" }, { accent: "que nous nous imposons." }] as Line[],
  },

  firstLookPage: {
    metaTitle: "Recevoir un premier aperçu",
    metaDescription:
      "Présentez-nous votre entreprise et votre projet. Si le projet s'y prête, nous vous montrons une première piste concrète avant toute prestation payante. Sans engagement.",
    crumb: "Premier aperçu",
    label: "Premier aperçu · Sans engagement",
    title: [{ text: "Montrez-nous" }, { text: "votre", accent: "entreprise." }] as Line[],
    lead: "Parlez-nous de votre activité et de votre projet. On vous montre d'abord ce que nous changerions.",
    formTitle: "Formulaire de premier aperçu",
    promises: ["Sans engagement", "Aucune obligation d'achat", "Réponse d'une personne, pas d'un robot"],
    outputsLabel: "Ce que vous pouvez recevoir",
    preferEmail: "Vous préférez écrire ?",
    message: "Vous avez reçu un message d'AMYN ?",
    messageTitle: [{ text: "Voici pourquoi," }, { accent: "en toute transparence." }] as Line[],
    messageBody: [
      "Nous contactons parfois des entreprises quand leurs informations publiques — site, fiche d'établissement, pages en ligne — laissent penser qu'une amélioration pourrait leur être utile.",
      "Nous n'utilisons que ce que l'entreprise publie elle-même ou ce qui figure dans les annuaires publics, et nous écrivons à une adresse professionnelle.",
    ],
    optOutBefore: "Vous ne souhaitez plus être contacté ? Répondez « stop » ou écrivez à",
    optOutAfter: "C'est enregistré et respecté. Détails dans la",
    optOutLink: "politique de confidentialité",
    faqTitle: [{ text: "Questions" }, { accent: "fréquentes." }] as Line[],
    questions: [
      {
        q: "Est-ce vraiment sans engagement ?",
        a: "Oui. Envoyer ce formulaire ne vous engage à rien, recevoir une première piste non plus. Si vous voulez aller plus loin, nous vous proposons un devis ; vous restez libre de ne pas y donner suite.",
      },
      {
        q: "Pourquoi ne demandez-vous pas mon budget ?",
        a: "Parce qu'un chiffre donné trop tôt fausse la discussion. Nous préférons comprendre votre besoin d'abord ; le devis vient ensuite, avec un périmètre clair.",
      },
      {
        q: "Qu'est-ce que je vais recevoir ?",
        a: "Selon votre situation : une direction de page d'accueil, une courte analyse, une piste pour vos réservations ou vos demandes… Ce n'est pas un projet réalisé gratuitement, mais de quoi décider en connaissance de cause.",
      },
      {
        q: "Que faites-vous de mes informations ?",
        a: "Elles servent uniquement à étudier votre demande et à vous répondre. Elles ne sont ni revendues ni utilisées pour autre chose.",
      },
    ],
  },

  notFound: {
    metaTitle: "Page introuvable",
    metaDescription: "Cette page n'existe pas ou plus sur amyn.agency.",
    label: "Erreur 404",
    title: "Cette page",
    accent: "n'existe pas.",
    lead: "Le lien est peut-être ancien, ou l'adresse contient une faute de frappe. Voici où reprendre.",
    back: "Retour à l'accueil",
  },

  legal: {
    updated: "Dernière mise à jour",
  },
};

export type Dictionary = typeof fr;

const en: Dictionary = {
  meta: {
    title: "AMYN — Revenue OS, sales automation and bespoke digital products",
    description:
      "AMYN designs and installs Revenue OS, the infrastructure that captures enquiries, qualifies them, automates follow-up and helps your team close — plus bespoke websites, apps and digital tools.",
    shareDescription: "Turn your business into a revenue engine. AMYN designs and installs Revenue OS.",
    shareAlt: "AMYN — Revenue OS and bespoke digital products",
    tagline:
      "Revenue OS, websites, apps and automation: systems designed around the way you sell, so more enquiries become customers.",
  },
  common: {
    home: "Home",
    homeAria: "home",
    breadcrumb: "Breadcrumb",
    skip: "Skip to content",
    discover: "Explore",
    or: "or",
    studio: "Digital studio — France",
  },
  legalNav: {
    legalNotice: "Legal notice",
    privacy: "Privacy",
    cookies: "Cookies",
    terms: "Terms of service",
  },
  footer: { revenue: "Revenue OS", services: "Capabilities", studio: "Studio", info: "Information" },

  hero: {
    landmarks: ["Experience", "Analytics", "Automation", "Growth"],
  },
  home: {
    services: {
      label: "Services",
      title: [{ text: "Seven ways" }, { text: "to work", accent: "better." }],
      note: "Every project is scoped and priced on quote.",
    },
    firstLook: {
      label: "First look",
      title: [{ text: "Before trust," }, { accent: "proof." }],
      lead: "Show us your business. We'll show you first what we would change — with no obligation.",
      steps: [
        { title: "You show us", body: "Your website, your Google profile, or simply what isn't working." },
        { title: "We take a look", body: "We spot what can genuinely be improved." },
        { title: "We show you", body: "A first concrete direction. Then you decide." },
      ],
      outputs: [
        "A homepage direction",
        "A short review of your website",
        "An idea for your bookings",
        "A plan for your requests and quotes",
      ],
      outputsAria: "Examples of a first look",
      outreach: "Received a message from AMYN?",
    },
    work: {
      label: "Work",
      title: [{ text: "Concepts" }, { text: "you can", accent: "see." }],
    },
    testimonials: {
      label: "Client feedback",
      title: [{ text: "Better told by the people" }, { text: "we", accent: "work with." }],
      region: "Testimonials",
      slide: "Testimonial",
      of: "of",
      previous: "Previous testimonial",
      next: "Next testimonial",
      goTo: "Show testimonial",
      draft: "Internal draft — unverified testimonials, never published in production",
      draftShort: "Draft",
      verified: "Verified testimonial",
      source: "Source:",
      rating: "Rating",
      outOf: "out of 5",
    },
    faq: {
      label: "FAQ",
      title: [{ text: "Frequently asked" }, { accent: "questions." }],
      notHere: "Can't find your question?",
      write: "Get in touch",
      direct: "or email us at",
    },
    final: {
      label: "Get started",
      title: [{ text: "Show us" }, { text: "your", accent: "business." }],
      lead: "We'll show you first what we would change.",
    },
  },

  servicesPage: {
    metaTitle: "Capabilities: websites, apps, digital tools",
    metaDescription:
      "Beyond Revenue OS: websites, request and quote tracking, mobile apps, online booking, Google Business Profile, client onboarding and portfolios: AMYN's seven services, priced on quote.",
    label: "Capabilities · Priced on quote",
    title: [{ text: "What we" }, { accent: "build." }],
    lead: "From websites to apps, tools that genuinely earn their place. Often combined, always scoped on quote.",
    navAria: "Jump to a service",
  },
  service: {
    problem: "The problem",
    recognise: "Sound familiar?",
    answer: "Our answer",
    includes: "What it can include, depending on your project",
    forWho: "Who it's for",
    forWhoTitle: [{ text: "Examples," }, { accent: "not limits." }],
    forWhoBody:
      "These situations are examples. If your business isn't listed, that's exactly what we'll look at first.",
    process: "How it works",
    processTitle: [{ text: "How this kind" }, { accent: "of project runs." }],
    scope: "What affects the quote",
    scopeBody:
      "Every project is scoped around your needs, your goals and the features required. The quote sets out what's included before you commit to anything.",
    limits: "What we don't promise",
    related: "Often paired with",
  },

  workPage: {
    metaTitle: "Work",
    metaDescription:
      "Website, booking, request tracking and onboarding concepts created by AMYN for six trades. Demonstrations, presented as such.",
    label: "Concepts · Demonstrations",
    title: [{ text: "Six trades." }, { accent: "Six worlds." }],
    lead: "Every concept starts from a trade and a real problem. The website, and the tool that goes with it.",
    noResults: "No results are claimed.",
  },
  project: {
    caseStudy: "Case study",
    caseTitle: [{ text: "Where it started," }, { accent: "and where it's going." }],
    context: "Context",
    problem: "Problem",
    direction: "Direction",
    featuresAria: "Features",
    servicesAria: "Services involved",
    screens: "Project screens",
    next: "Next concept",
  },

  methodPage: {
    metaTitle: "Method",
    metaDescription:
      "Understand, scope, build, launch and support: the AMYN method, step by step, with a clear scope and quote before you commit to anything.",
    label: "Method",
    title: [{ text: "A clear project," }, { accent: "from start to finish." }],
    lead: "Four steps, always in the same order. You know where your project stands at every moment.",
    step: "Step",
    outputs: "What comes out of it",
    firstLookBefore: "Depending on the project, this step can start with a",
    firstLookLink: "first look",
    firstLookAfter: ": a concrete direction, before any paid work.",
    commitments: "Our commitments",
    commitmentsTitle: [{ text: "What never changes," }, { accent: "whatever the project." }],
    commitmentItems: [
      ["Nothing starts without a signed quote", "Scope, timeline and price are written down before any work begins."],
      ["No promises we can't keep", "No guaranteed rankings, no guaranteed store approval, no made-up numbers."],
      ["Approvals at the right time", "Important decisions are shown to you while they can still change."],
      ["Your content, with your rights", "We only use text, photos and brands you are authorised to publish."],
    ],
  },

  aboutPage: {
    metaTitle: "About",
    metaDescription:
      "AMYN is a digital studio that designs websites, apps and tools around the way each business works. Our approach and our standards.",
    label: "About",
    title: [{ text: "A digital studio" }, { accent: "built around the way you work." }],
    lead: "Websites, apps and tools that fit the real day-to-day of each business.",
    philosophy: "Philosophy",
    philosophyTitle: [{ text: "Understanding first," }, { accent: "tools second." }],
    philosophyBody: [
      "Most businesses don't need “more digital”. They need requests to stop waiting and customers to know what to do next.",
      "We start by looking at how you work. The tool comes afterwards — and only if it's useful. We'd rather show than promise.",
    ],
    relation: "Working together",
    relationTitle: [{ text: "Working with us," }, { accent: "in practice." }],
    relationItems: [
      ["A direct line", "You talk to the people who design and build your project."],
      ["Plain language", "We explain technical choices in everyday words, so you decide with confidence."],
      ["A written scope", "What's included, what isn't, and what we need from you: it's all in the quote."],
      ["Ongoing support, if you want it", "After launch, support can be arranged. It's never imposed."],
    ],
    standards: "Standards",
    standardsTitle: [{ text: "The level of quality" }, { accent: "we hold ourselves to." }],
  },

  firstLookPage: {
    metaTitle: "Get a first look",
    metaDescription:
      "Tell us about your business and your project. If it's a good fit, we'll show you a first concrete direction before any paid work. No obligation.",
    crumb: "First look",
    label: "First look · No obligation",
    title: [{ text: "Show us" }, { text: "your", accent: "business." }],
    lead: "Tell us about your business and your project. We'll show you first what we would change.",
    formTitle: "First look form",
    promises: ["No obligation", "No commitment to buy", "A reply from a person, not a bot"],
    outputsLabel: "What you might receive",
    preferEmail: "Prefer email?",
    message: "Received a message from AMYN?",
    messageTitle: [{ text: "Here's why," }, { accent: "in full transparency." }],
    messageBody: [
      "We sometimes contact businesses when their public information — website, business profile, online pages — suggests an improvement could be useful to them.",
      "We only use what the business publishes itself or what appears in public directories, and we write to a business address.",
    ],
    optOutBefore: "Don't want to hear from us again? Reply “stop” or write to",
    optOutAfter: "It's recorded and respected. Details in our",
    optOutLink: "privacy policy",
    faqTitle: [{ text: "Frequently asked" }, { accent: "questions." }],
    questions: [
      {
        q: "Is it really no obligation?",
        a: "Yes. Sending this form commits you to nothing, and neither does receiving a first direction. If you want to go further, we'll send you a quote — you remain free to say no.",
      },
      {
        q: "Why don't you ask for my budget?",
        a: "Because a number given too early skews the conversation. We'd rather understand your needs first; the quote comes afterwards, with a clear scope.",
      },
      {
        q: "What will I receive?",
        a: "Depending on your situation: a homepage direction, a short review, an idea for your bookings or your requests… It isn't a project done for free, but enough to decide with confidence.",
      },
      {
        q: "What do you do with my information?",
        a: "It's used only to review your request and reply to you. It's never sold or used for anything else.",
      },
    ],
  },

  notFound: {
    metaTitle: "Page not found",
    metaDescription: "This page doesn't exist on amyn.agency, or no longer does.",
    label: "Error 404",
    title: "This page",
    accent: "doesn't exist.",
    lead: "The link may be out of date, or the address may contain a typo. Here's where to pick up.",
    back: "Back to home",
  },

  legal: {
    updated: "Last updated",
  },
};

const dictionaries: Record<Locale, Dictionary> = { fr, en };

export const getDictionary = (locale: Locale): Dictionary => dictionaries[locale];
