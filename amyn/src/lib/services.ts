import type { Locale } from "./i18n/config.ts";
import { DEFAULT_PRICING, type Pricing } from "./pricing.ts";
import { servicesEn } from "./services.en.ts";

/**
 * Les sept services d'AMYN.
 *
 * Source unique : l'accueil, la page Services, les sept pages de détail,
 * le formulaire de projet, le plan du site et les données structurées
 * lisent tous ce fichier. Un service ajouté ici apparaît partout.
 *
 * Règles de rédaction :
 * - on décrit ce que le service PEUT inclure, jamais une promesse de
 *   résultat ;
 * - aucune garantie de classement, d'approbation par les stores, de trafic
 *   ou d'avis ;
 * - chaque page est écrite pour son service : pas de paragraphe recopié.
 *
 * La version anglaise des textes est dans `services.en.ts` ; la structure
 * (identifiant, numéro, visuel, tarification, services liés) reste ici.
 */

export type VisualKey =
  | "website"
  | "quotes"
  | "app"
  | "booking"
  | "profile"
  | "onboarding"
  | "portfolio";

export type Service = {
  slug: string;
  number: string;
  name: string;
  /** Nom court pour les listes serrées (formulaires, pied de page). */
  short: string;
  /** Une phrase, centrée sur le bénéfice. */
  summary: string;
  /** Cinq ou six mots, pour les listes qu'on scanne. */
  tagline: string;
  /** Écran qui illustre le service (voir visuals.ts). */
  shot: string;
  visual: VisualKey;
  pricing: Pricing;

  hero: { title: string; accent: string; intro: string };
  problem: { title: string; body: string; signs: string[] };
  solution: { title: string; body: string };
  deliverables: string[];
  useCases: { who: string; need: string }[];
  /** Ce qui fait varier le périmètre, donc le devis. */
  scope: string[];
  process: { title: string; body: string }[];
  /** Ce que le service ne promet pas — dit clairement. */
  limits?: string;
  faq: { q: string; a: string }[];
  seo: { title: string; description: string };
  related: string[];
};

/** Tout ce qui se traduit dans un service. */
export type ServiceText = Pick<
  Service,
  | "name"
  | "short"
  | "summary"
  | "tagline"
  | "hero"
  | "problem"
  | "solution"
  | "deliverables"
  | "useCases"
  | "scope"
  | "process"
  | "limits"
  | "faq"
  | "seo"
>;

export const services: Service[] = [
  {
    slug: "site-web",
    number: "01",
    name: "Site web & refonte",
    short: "Site web / refonte",
    summary:
      "Un site professionnel, rapide et lisible sur mobile, construit autour de ce que vos clients viennent y chercher.",
    tagline: "Un site qui donne envie d’appeler.",
    shot: "site-cabinet-aurel",
    visual: "website",
    pricing: DEFAULT_PRICING,
    hero: {
      title: "Un site qui ressemble à votre entreprise,",
      accent: "et qui l'aide à travailler.",
      intro:
        "Création ou refonte : nous concevons des sites vitrines et des pages de service pensés pour être compris en quelques secondes, consultés sur téléphone et utilisés pour vous contacter.",
    },
    problem: {
      title: "Un site peut exister sans servir à rien.",
      body: "Beaucoup de sites d'entreprise ont été faits une fois, puis oubliés. Ils s'affichent mal sur mobile, cachent l'information utile et ne disent pas clairement quoi faire ensuite. Le visiteur repart sans appeler, sans réserver, sans demander de devis.",
      signs: [
        "Le site est difficile à lire sur téléphone.",
        "Vos services, vos horaires ou vos tarifs sont introuvables.",
        "Le site ne reflète plus la qualité de votre travail.",
        "Vous ne pouvez pas le mettre à jour vous-même.",
        "Les demandes arrivent rarement par le site.",
      ],
    },
    solution: {
      title: "Partir de votre activité, pas d'un modèle.",
      body: "Nous commençons par comprendre ce que vos clients cherchent et ce qui les décide. La structure, les textes et le design en découlent. Le résultat est un site clair, rapide, adapté au mobile, avec un parcours de contact évident.",
    },
    deliverables: [
      "Site vitrine ou site d'entreprise sur mesure",
      "Pages de service et pages d'atterrissage",
      "Refonte d'un site existant",
      "Présentation de vos réalisations",
      "Formulaire de contact ou de demande de devis",
      "Intégration d'un outil de réservation",
      "Optimisation mobile et performance",
      "Bases du référencement naturel et local",
      "Mesure d'audience, avec gestion du consentement si nécessaire",
    ],
    useCases: [
      { who: "Restaurant", need: "Carte à jour, horaires, réservation en deux gestes." },
      { who: "Artisan", need: "Réalisations mises en valeur, demandes de devis qualifiées." },
      { who: "Cabinet de conseil", need: "Crédibilité immédiate, expertises claires, prise de contact simple." },
      { who: "Commerce", need: "Sélection du moment, accès, horaires, envie de passer." },
    ],
    scope: [
      "Nombre et nature des pages",
      "Rédaction des contenus : fournie par vous ou accompagnée",
      "Photos et visuels disponibles",
      "Fonctionnalités : réservation, formulaires avancés, espace client",
      "Reprise de contenus d'un site existant",
    ],
    process: [
      { title: "Comprendre", body: "Votre activité, vos clients, ce que le site doit obtenir." },
      { title: "Structurer", body: "Plan du site, parcours, contenus nécessaires." },
      { title: "Concevoir", body: "Design, développement, intégration des contenus." },
      { title: "Mettre en ligne", body: "Tests sur mobile et ordinateur, mise en ligne, prise en main." },
    ],
    limits:
      "Nous posons des bases solides pour le référencement naturel et local. Personne ne peut garantir une position dans Google : nous ne le promettons pas.",
    faq: [
      {
        q: "Pouvez-vous refaire mon site existant ?",
        a: "Oui. Nous partons de ce qui fonctionne déjà, reprenons les contenus utiles et reconstruisons le reste. Si votre site actuel a une adresse bien établie, nous veillons à ne pas casser les liens existants.",
      },
      {
        q: "Pourrai-je modifier mon site moi-même ?",
        a: "Selon vos besoins, nous pouvons prévoir une interface d'édition pour les contenus qui changent souvent (carte, actualités, réalisations). C'est un choix fait au moment du cadrage.",
      },
      {
        q: "Mon site apparaîtra-t-il en tête des résultats de recherche ?",
        a: "Personne ne peut le garantir honnêtement. Nous construisons un site techniquement propre, rapide et bien structuré, ce qui donne de bonnes bases au référencement. Le classement dépend ensuite de nombreux facteurs extérieurs.",
      },
    ],
    seo: {
      title: "Création et refonte de site web",
      description:
        "Création et refonte de sites web professionnels, rapides et adaptés au mobile, conçus autour de votre activité. Sur devis.",
    },
    related: ["reservation-en-ligne", "portfolio-contenu", "google-business"],
  },

  {
    slug: "suivi-demandes-devis",
    number: "02",
    name: "Suivi des demandes & devis",
    short: "Suivi demandes & devis",
    summary:
      "Un tableau simple pour savoir, à tout moment, quelles demandes attendent une réponse, un devis ou une relance.",
    tagline: "Plus aucune demande oubliée.",
    shot: "quotes",
    visual: "quotes",
    pricing: DEFAULT_PRICING,
    hero: {
      title: "Plus aucune demande",
      accent: "oubliée dans une boîte mail.",
      intro:
        "Un outil de suivi sur mesure pour organiser les demandes clients, les informations manquantes, les devis envoyés et les relances à faire — sans adopter un logiciel trop lourd pour votre activité.",
    },
    problem: {
      title: "Les demandes arrivent de partout. Le suivi, nulle part.",
      body: "Un appel, un e-mail, un message sur les réseaux, un formulaire : chaque demande arrive par un canal différent. On note sur un carnet, on garde un e-mail non lu pour s'en souvenir, et certaines se perdent. Les devis partent, mais personne ne sait lesquels relancer.",
      signs: [
        "Vous ne savez pas combien de demandes sont en attente.",
        "Des devis restent sans relance.",
        "Il manque souvent une information pour chiffrer.",
        "Plusieurs personnes répondent sans voir le même historique.",
      ],
    },
    solution: {
      title: "Un tableau à la mesure de votre façon de vendre.",
      body: "Nous construisons un outil simple, avec vos étapes à vous : nouvelle demande, informations manquantes, devis envoyé, relance, accepté. Chaque fiche garde les coordonnées, les notes et la prochaine action. Ce n'est pas un CRM complet : c'est l'essentiel, bien fait.",
    },
    deliverables: [
      "Tableau de suivi des demandes par étape",
      "Fiches clients avec coordonnées et notes",
      "Suivi du statut des devis",
      "Liste des prochaines actions et des relances",
      "Repérage des informations manquantes",
      "Réception des demandes du formulaire de votre site",
      "Accès sécurisé pour vous et votre équipe",
    ],
    useCases: [
      { who: "Artisan du bâtiment", need: "Suivre les visites, les devis et les relances chantier par chantier." },
      { who: "Entreprise de services", need: "Centraliser les demandes reçues par téléphone, e-mail et site." },
      { who: "Traiteur, événementiel", need: "Savoir quelles dates sont en option et quels devis attendent une réponse." },
    ],
    scope: [
      "Nombre d'étapes et de champs à suivre",
      "Nombre d'utilisateurs",
      "Connexion au formulaire du site",
      "Import de données existantes (tableur, carnet)",
      "Notifications et rappels",
    ],
    process: [
      { title: "Observer", body: "Comment une demande arrive, qui la traite, où elle se perd." },
      { title: "Cadrer", body: "Étapes, informations à conserver, droits d'accès." },
      { title: "Construire", body: "L'outil, testé sur vos vraies situations." },
      { title: "Accompagner", body: "Prise en main, ajustements après les premières semaines." },
    ],
    limits:
      "Nous construisons un outil de suivi ciblé. Si votre besoin relève d'un CRM complet (automatisations marketing, comptabilité intégrée…), nous vous le dirons au cadrage.",
    faq: [
      {
        q: "Est-ce un CRM ?",
        a: "Pas au sens d'un logiciel de gestion commerciale complet. C'est un outil de suivi conçu pour vos étapes, avec l'essentiel : demandes, clients, devis, relances et notes. Il peut évoluer si vos besoins grandissent.",
      },
      {
        q: "Mes données sont-elles protégées ?",
        a: "L'accès est protégé par identifiant, et les données de vos clients ne servent qu'à votre activité. L'hébergement et les mesures de sécurité sont précisés au cadrage, avant toute mise en service.",
      },
      {
        q: "Puis-je récupérer mes données ?",
        a: "Oui. La possibilité d'exporter vos données est prévue dès la conception de l'outil.",
      },
    ],
    seo: {
      title: "Outil de suivi des demandes et des devis",
      description:
        "Un outil sur mesure pour suivre les demandes clients, les devis, les relances et les prochaines actions. Simple, conçu pour votre activité. Sur devis.",
    },
    related: ["onboarding-client", "site-web", "application-mobile"],
  },

  {
    slug: "application-mobile",
    number: "03",
    name: "Application mobile",
    short: "Application mobile",
    summary:
      "Une application iOS ou Android conçue pour un usage précis : vos clients, votre équipe, votre terrain.",
    tagline: "Votre service, dans leur poche.",
    shot: "app",
    visual: "app",
    pricing: DEFAULT_PRICING,
    hero: {
      title: "Une application,",
      accent: "quand elle a vraiment une raison d'exister.",
      intro:
        "Applications clientes, applications internes, espaces de réservation ou de suivi : nous concevons des applications iOS et Android sur mesure, après avoir vérifié ensemble qu'une application est bien la bonne réponse.",
    },
    problem: {
      title: "Certaines choses ne tiennent pas dans un site.",
      body: "Un client qui revient chaque semaine, une équipe qui travaille sur le terrain, un suivi qui doit tenir dans la poche : pour ces usages, un site montre vite ses limites. À l'inverse, beaucoup d'applications sont construites sans besoin réel et ne sont jamais ouvertes.",
      signs: [
        "Vos clients reviennent souvent et refont les mêmes démarches.",
        "Votre équipe note sur papier ce qui devrait être saisi sur place.",
        "Vous avez besoin de notifications ou d'un accès hors ligne.",
        "Vos outils actuels ne sont pas utilisables sur téléphone.",
      ],
    },
    solution: {
      title: "D'abord vérifier le besoin. Ensuite, le faire bien.",
      body: "Nous commençons par définir l'usage précis de l'application et ce qu'elle doit permettre dès sa première version. Selon le projet, nous développons pour iOS, Android ou les deux, avec une approche multiplateforme quand elle est pertinente. Le périmètre et la faisabilité sont toujours validés avant le développement.",
    },
    deliverables: [
      "Application cliente (compte, réservation, suivi, fidélité)",
      "Application interne pour votre équipe",
      "Tableau de bord et espace client",
      "Notifications",
      "Connexion à vos outils existants (API, back-office)",
      "Développement iOS, Android ou multiplateforme",
      "Accompagnement à la publication sur les stores",
    ],
    useCases: [
      { who: "Salon, institut", need: "Réserver, retrouver ses rendez-vous, recevoir un rappel." },
      { who: "Entreprise d'intervention", need: "Fiches d'intervention, photos et signatures sur le terrain." },
      { who: "Club, studio", need: "Planning, inscriptions, abonnements, messages aux membres." },
    ],
    scope: [
      "Plateformes visées : iOS, Android ou les deux",
      "Nombre d'écrans et de parcours",
      "Comptes utilisateurs et rôles",
      "Connexions à des services externes",
      "Fonctionnement hors ligne, notifications",
      "Back-office d'administration",
    ],
    process: [
      { title: "Qualifier", body: "Le besoin, les utilisateurs, la faisabilité technique." },
      { title: "Prototyper", body: "Les écrans clés, testés avant d'écrire le code." },
      { title: "Développer", body: "Par étapes, avec des versions de test régulières." },
      { title: "Publier", body: "Préparation des fiches, soumission aux stores, suivi." },
    ],
    limits:
      "La publication dépend des règles d'Apple et de Google. Nous préparons l'application pour les respecter, mais aucune agence ne peut garantir l'acceptation sur l'App Store ou Google Play.",
    faq: [
      {
        q: "Pouvez-vous créer une application iPhone et Android ?",
        a: "Oui. Selon le projet, nous développons une application par plateforme ou une application multiplateforme. Le choix se fait au cadrage, en fonction des fonctionnalités, du budget et de la maintenance à prévoir.",
      },
      {
        q: "Mon projet a-t-il besoin d'une application ?",
        a: "Pas toujours. Si un site bien conçu répond au besoin, nous vous le dirons : c'est plus simple et moins coûteux. Une application se justifie par un usage régulier ou des fonctions propres au téléphone.",
      },
      {
        q: "L'application sera-t-elle acceptée sur les stores ?",
        a: "Nous la préparons pour respecter les règles d'Apple et de Google et nous accompagnons la soumission. La décision finale leur appartient : nous ne pouvons pas la garantir.",
      },
    ],
    seo: {
      title: "Développement d'application mobile iOS et Android",
      description:
        "Applications mobiles iOS et Android sur mesure : applications clientes, internes, réservation, espaces clients. Besoin et faisabilité validés avant le développement. Sur devis.",
    },
    related: ["reservation-en-ligne", "onboarding-client", "suivi-demandes-devis"],
  },

  {
    slug: "reservation-en-ligne",
    number: "04",
    name: "Réservation en ligne",
    short: "Réservation en ligne",
    summary:
      "Vos clients réservent quand ils y pensent, même à 23 h. Vous gardez la main sur vos disponibilités.",
    tagline: "Des réservations, même à 23 h.",
    shot: "booking",
    visual: "booking",
    pricing: DEFAULT_PRICING,
    hero: {
      title: "La réservation,",
      accent: "sans le téléphone qui sonne pendant le service.",
      intro:
        "Nous mettons en place un système de réservation adapté à votre activité : vos prestations, vos disponibilités, vos règles. Intégré à votre site, et relié à votre agenda quand c'est possible.",
    },
    problem: {
      title: "Chaque réservation manuelle coûte du temps.",
      body: "Répondre au téléphone en plein rendez-vous, rappeler, noter dans un agenda papier, gérer les annulations par SMS : la réservation manuelle interrompt le travail et laisse passer des clients qui voulaient simplement réserver en ligne.",
      signs: [
        "Vous prenez les rendez-vous par téléphone ou par message.",
        "Des clients abandonnent quand personne ne répond.",
        "Les oublis et annulations tardives vous coûtent des créneaux.",
        "Votre outil actuel ne correspond pas à vos prestations.",
      ],
    },
    solution: {
      title: "Vos règles, appliquées automatiquement.",
      body: "Nous configurons ou développons la réservation autour de votre fonctionnement : durée des prestations, pauses, délais minimum, personnes ou salles disponibles. Selon l'outil retenu, la réservation peut envoyer une confirmation, des rappels et se synchroniser avec votre agenda.",
    },
    deliverables: [
      "Choix ou développement de l'outil de réservation",
      "Configuration des prestations et des disponibilités",
      "Demande de réservation ou réservation confirmée",
      "Confirmation de rendez-vous",
      "Rappels automatiques, lorsque l'outil le permet",
      "Synchronisation avec votre agenda",
      "Gestion des réservations et des coordonnées clients",
      "Intégration à votre site",
    ],
    useCases: [
      { who: "Coiffeur, barbier", need: "Rendez-vous par prestation et par coiffeur." },
      { who: "Restaurant", need: "Réservation de tables avec capacité et services." },
      { who: "Praticien, consultant", need: "Créneaux de consultation, rappels, informations préalables." },
    ],
    scope: [
      "Outil existant configuré ou système développé sur mesure",
      "Nombre de prestations, de personnes et de lieux",
      "Paiement ou acompte à la réservation",
      "Rappels par e-mail ou SMS",
      "Synchronisation d'agenda",
    ],
    process: [
      { title: "Comprendre", body: "Vos prestations, vos contraintes, vos habitudes." },
      { title: "Choisir", body: "Outil existant ou développement, selon le besoin." },
      { title: "Configurer", body: "Règles, disponibilités, messages, intégration au site." },
      { title: "Tester", body: "Réservations d'essai, ajustements, prise en main." },
    ],
    limits:
      "Les rappels, la synchronisation d'agenda et le paiement dépendent de l'outil retenu. Nous vous indiquons précisément ce qui sera en place avant de commencer.",
    faq: [
      {
        q: "Faut-il un outil sur mesure ?",
        a: "Pas forcément. Pour beaucoup d'activités, un outil existant bien configuré suffit. Le développement sur mesure se justifie quand vos règles de réservation sont particulières.",
      },
      {
        q: "Les rappels sont-ils automatiques ?",
        a: "Ils peuvent l'être, selon l'outil choisi. Nous le précisons au cadrage, avec les canaux disponibles (e-mail, SMS).",
      },
      {
        q: "Puis-je garder la validation manuelle ?",
        a: "Oui. La réservation peut être une simple demande que vous confirmez, ou une réservation immédiate. C'est vous qui décidez.",
      },
    ],
    seo: {
      title: "Mise en place de la réservation en ligne",
      description:
        "Réservation en ligne adaptée à votre activité : prestations, disponibilités, confirmations et rappels selon l'outil. Intégrée à votre site. Sur devis.",
    },
    related: ["site-web", "application-mobile", "google-business"],
  },

  {
    slug: "google-business",
    number: "05",
    name: "Fiche Google Business",
    short: "Google Business",
    summary:
      "Une fiche d'établissement complète, exacte et soignée : ce que beaucoup de clients voient avant votre site.",
    tagline: "La première impression, soignée.",
    shot: "profile",
    visual: "profile",
    pricing: DEFAULT_PRICING,
    hero: {
      title: "Votre fiche Google,",
      accent: "à la hauteur de votre établissement.",
      intro:
        "Nous améliorons les informations de votre fiche d'établissement Google : catégories, description, services, horaires, photos et cohérence avec votre site. Des informations justes et bien présentées, rien d'artificiel.",
    },
    problem: {
      title: "Une fiche incomplète donne une mauvaise première impression.",
      body: "Pour beaucoup de clients, la fiche d'établissement est le premier contact avec votre entreprise. Horaires faux, catégorie approximative, photos anciennes, description vide : ces détails suffisent à faire choisir un concurrent.",
      signs: [
        "Les horaires ou le numéro ne sont pas à jour.",
        "La description est vide ou générique.",
        "Les photos sont rares, anciennes ou de mauvaise qualité.",
        "Les informations diffèrent de celles de votre site.",
      ],
    },
    solution: {
      title: "Des informations exactes, présentées avec soin.",
      body: "Nous passons votre fiche en revue et proposons des améliorations conformes aux règles de Google : catégories pertinentes, description claire, services détaillés, recommandations de photos et cohérence avec votre site et vos autres présences en ligne.",
    },
    deliverables: [
      "Revue complète des informations de la fiche",
      "Choix des catégories",
      "Rédaction de la description de l'établissement",
      "Description des services",
      "Recommandations de photos",
      "Cohérence avec votre site et vos autres présences",
      "Conseils pour la gestion des avis",
    ],
    useCases: [
      { who: "Restaurant, café", need: "Horaires exacts, menu, photos qui donnent envie." },
      { who: "Artisan", need: "Zone d'intervention, services détaillés, réalisations." },
      { who: "Commerce de proximité", need: "Informations pratiques, nouveautés, accès." },
    ],
    scope: [
      "État actuel de la fiche",
      "Nombre d'établissements",
      "Rédaction des descriptions de services",
      "Photos disponibles ou à prévoir",
    ],
    process: [
      { title: "Observer", body: "Votre fiche actuelle et ce que voient vos clients." },
      { title: "Recommander", body: "Les corrections et améliorations prioritaires." },
      { title: "Appliquer", body: "Avec votre accès, ou en vous guidant pas à pas." },
      { title: "Vérifier", body: "Cohérence finale avec votre site et vos réseaux." },
    ],
    limits:
      "Nous ne promettons ni première position, ni classement garanti, ni volume de trafic ou d'avis. Nous ne créons jamais de faux avis et n'en sollicitons pas en échange d'une contrepartie.",
    faq: [
      {
        q: "Pouvez-vous améliorer ma fiche Google ?",
        a: "Oui : informations, catégories, description, services, recommandations de photos et cohérence avec votre site. En revanche, personne ne peut garantir une position dans les résultats.",
      },
      {
        q: "Faut-il vous donner accès à ma fiche ?",
        a: "C'est le plus simple, via un accès gestionnaire que vous pouvez retirer à tout moment. Nous pouvons aussi vous guider pour appliquer les modifications vous-même.",
      },
      {
        q: "Pouvez-vous nous obtenir des avis ?",
        a: "Nous pouvons vous conseiller sur la manière de demander un avis à vos clients satisfaits, dans le respect des règles de Google. Nous ne créons ni n'achetons d'avis.",
      },
    ],
    seo: {
      title: "Amélioration de la fiche Google Business",
      description:
        "Amélioration des informations de votre fiche d'établissement Google : catégories, description, services, photos. Sans promesse de classement. Sur devis.",
    },
    related: ["site-web", "portfolio-contenu", "reservation-en-ligne"],
  },

  {
    slug: "onboarding-client",
    number: "06",
    name: "Onboarding client",
    short: "Onboarding client",
    summary:
      "Un parcours d'accueil clair pour que chaque nouveau client sache quoi faire, quoi envoyer et à quoi s'attendre.",
    tagline: "Chaque nouveau client, guidé.",
    shot: "onboarding",
    visual: "onboarding",
    pricing: DEFAULT_PRICING,
    hero: {
      title: "Un nouveau client",
      accent: "ne devrait jamais se demander « et maintenant ? ».",
      intro:
        "Nous concevons des parcours d'accueil digitaux : formulaires, listes d'étapes, collecte de documents et instructions claires. Le client avance seul, vous gagnez des allers-retours.",
    },
    problem: {
      title: "Le début d'une collaboration se joue sur les détails.",
      body: "Documents envoyés en plusieurs fois, informations oubliées, questions répétées par e-mail : les premiers jours avec un nouveau client consomment beaucoup de temps et laissent parfois une impression de désordre.",
      signs: [
        "Vous envoyez les mêmes explications à chaque nouveau client.",
        "Il manque toujours un document pour commencer.",
        "Les clients ne savent pas où en est leur dossier.",
        "Les informations sont éparpillées entre e-mails et fichiers.",
      ],
    },
    solution: {
      title: "Un parcours guidé, à votre image.",
      body: "Nous transformons votre démarrage en parcours : un écran d'accueil, les étapes à suivre, les informations et documents à fournir, et ce qui se passe ensuite. Selon le besoin, cela prend la forme d'un formulaire guidé, d'une page dédiée ou d'un espace client.",
    },
    deliverables: [
      "Formulaire d'accueil guidé",
      "Écran de bienvenue et présentation des étapes",
      "Liste de contrôle de démarrage",
      "Collecte de documents",
      "Instructions et prochaines étapes",
      "Espace client, si nécessaire",
      "Étapes automatisées lorsque c'est pertinent",
    ],
    useCases: [
      { who: "Cabinet, expert", need: "Collecter les pièces avant le premier rendez-vous." },
      { who: "Agence, studio", need: "Réunir contenus, accès et validations au lancement." },
      { who: "Formation, coaching", need: "Accueillir, informer, préparer la première séance." },
    ],
    scope: [
      "Nombre d'étapes et de documents",
      "Page publique ou espace client sécurisé",
      "Automatisations (e-mails, rappels)",
      "Connexion à vos outils existants",
    ],
    process: [
      { title: "Cartographier", body: "Ce qui se passe aujourd'hui entre la signature et le démarrage." },
      { title: "Simplifier", body: "Les étapes utiles, dans le bon ordre." },
      { title: "Concevoir", body: "Le parcours, ses écrans et ses messages." },
      { title: "Lancer", body: "Premiers clients accompagnés, ajustements." },
    ],
    faq: [
      {
        q: "Faut-il un espace client ?",
        a: "Pas toujours. Un formulaire guidé et une page claire suffisent souvent. L'espace client se justifie quand le client doit revenir suivre son dossier.",
      },
      {
        q: "Les documents collectés sont-ils sécurisés ?",
        a: "Le mode de stockage et les accès sont définis au cadrage, en fonction de la nature des documents. Les données sensibles demandent des précautions particulières, que nous précisons avant de construire.",
      },
    ],
    seo: {
      title: "Parcours d'onboarding client",
      description:
        "Parcours d'accueil digital pour vos nouveaux clients : formulaires, étapes, collecte de documents, espace client si nécessaire. Sur devis.",
    },
    related: ["suivi-demandes-devis", "application-mobile", "site-web"],
  },

  {
    slug: "portfolio-contenu",
    number: "07",
    name: "Portfolio & contenu",
    short: "Portfolio & contenu",
    summary:
      "Votre vrai travail, présenté comme il le mérite : projets, galeries, études de cas et services.",
    tagline: "Votre travail, enfin mis en valeur.",
    shot: "portfolio",
    visual: "portfolio",
    pricing: DEFAULT_PRICING,
    hero: {
      title: "Votre travail parle.",
      accent: "Encore faut-il bien le montrer.",
      intro:
        "Nous structurons et mettons en forme vos réalisations : galeries de projets, études de cas, avant/après légitimes, présentation des services. Avec vos contenus réels et autorisés, uniquement.",
    },
    problem: {
      title: "Un beau travail mal présenté se remarque peu.",
      body: "Des photos dispersées sur un téléphone, un compte Instagram, un vieux PDF : beaucoup d'entreprises ont d'excellentes réalisations, mais rien pour les présenter proprement au moment où un client hésite.",
      signs: [
        "Vos réalisations sont éparpillées sur plusieurs supports.",
        "Les photos ne sont ni triées ni légendées.",
        "Vous envoyez des images une par une aux prospects.",
        "Vos projets ne racontent pas ce que vous avez résolu.",
      ],
    },
    solution: {
      title: "Trier, structurer, raconter.",
      body: "Nous sélectionnons avec vous les projets les plus représentatifs, puis nous les présentons avec contexte, demande, réponse apportée et visuels. Le tout s'intègre à votre site ou forme une présentation autonome.",
    },
    deliverables: [
      "Structure du portfolio",
      "Galeries de projets",
      "Mise en forme d'études de cas",
      "Présentation des services",
      "Rédaction des descriptions",
      "Avant/après, lorsqu'ils sont légitimes",
      "Organisation des contenus existants",
    ],
    useCases: [
      { who: "Menuisier, architecte d'intérieur", need: "Projets en images, avec matériaux et contraintes." },
      { who: "Photographe, créatif", need: "Séries cohérentes, navigation fluide." },
      { who: "Entreprise de rénovation", need: "Avant/après documentés, par type de chantier." },
    ],
    scope: [
      "Nombre de projets à présenter",
      "Photos disponibles, retouches ou prises de vue à prévoir",
      "Rédaction des textes",
      "Intégration au site ou document autonome",
    ],
    process: [
      { title: "Rassembler", body: "Photos, documents, informations sur chaque projet." },
      { title: "Sélectionner", body: "Les projets qui montrent le mieux votre savoir-faire." },
      { title: "Mettre en forme", body: "Structure, textes, galeries, mise en page." },
      { title: "Intégrer", body: "Au site, ou sous forme de présentation à partager." },
    ],
    limits:
      "Nous n'utilisons que des contenus dont vous détenez les droits ou dont l'utilisation a été autorisée, notamment par vos clients lorsqu'ils sont identifiables.",
    faq: [
      {
        q: "Je n'ai pas de belles photos. Que faire ?",
        a: "Nous vous indiquons ce qui est exploitable, ce qui peut être amélioré et ce qu'il vaut mieux refaire. Si des prises de vue sont nécessaires, nous le précisons au cadrage.",
      },
      {
        q: "Puis-je montrer des chantiers chez mes clients ?",
        a: "Oui, avec leur accord lorsqu'ils ou leur domicile sont reconnaissables. Nous vous aidons à préparer cette demande simplement.",
      },
    ],
    seo: {
      title: "Portfolio et mise en valeur des réalisations",
      description:
        "Structuration et mise en forme de vos réalisations : galeries, études de cas, présentation des services, avec vos contenus réels et autorisés. Sur devis.",
    },
    related: ["site-web", "google-business", "onboarding-client"],
  },
];

const byLocale: Record<Locale, Service[]> = {
  fr: services,
  en: services.map((service) => ({ ...service, ...servicesEn[service.slug] })),
};

/** Les services dans une langue. `slug` reste l'identifiant interne. */
export const getServices = (locale: Locale = "fr") => byLocale[locale];

export const serviceBySlug = (slug: string, locale: Locale = "fr") =>
  byLocale[locale].find((service) => service.slug === slug);
