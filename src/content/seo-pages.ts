/**
 * Pages SEO éditoriales.
 *
 * Chaque page répond à une intention de recherche différente et contient du
 * contenu réellement utile (mentions légales du devis, postes de chiffrage,
 * repères de prix méthodologiques). Aucun contenu n'est dupliqué d'une page
 * à l'autre.
 */

export interface SeoSection {
  title: string;
  body?: string;
  bullets?: string[];
}

export interface SeoFaq {
  question: string;
  answer: string;
}

export interface SeoPage {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  h1: string;
  intro: string;
  sections: SeoSection[];
  faq: SeoFaq[];
  ctaTitle: string;
  ctaBody: string;
}

const MENTIONS_OBLIGATOIRES: SeoSection = {
  title: 'Ce que doit contenir un devis conforme en France',
  body:
    "Un devis engage l'entreprise dès sa signature par le client. Pour être opposable et conforme, il doit comporter un certain nombre de mentions.",
  bullets: [
    "La date d'émission et la durée de validité de l'offre",
    "Le nom, l'adresse, le SIRET et, le cas échéant, le numéro de TVA intracommunautaire de l'entreprise",
    'Le nom et l’adresse du client, ainsi que le lieu d’exécution des travaux',
    'Le décompte détaillé de chaque prestation et produit : quantité, unité, prix unitaire HT',
    'Les frais de déplacement éventuels',
    'La somme globale à payer HT et TTC, avec le taux de TVA appliqué à chaque ligne',
    'Les conditions et modalités de paiement, ainsi que l’acompte demandé',
    'La mention « devis reçu avant l’exécution des travaux », datée et signée par le client',
    "Pour le bâtiment : les coordonnées de l'assurance responsabilité civile professionnelle et de la garantie décennale",
  ],
};

const TVA_BATIMENT: SeoSection = {
  title: 'Quel taux de TVA appliquer',
  body:
    "Dans le bâtiment, trois taux coexistent et se choisissent selon la nature des travaux et l'ancienneté du logement. Le taux réduit suppose une attestation signée par le client.",
  bullets: [
    '20 % : taux normal, travaux neufs, locaux professionnels, dépannage sur équipement non éligible',
    '10 % : travaux d’amélioration, transformation, aménagement et entretien d’un logement achevé depuis plus de deux ans',
    '5,5 % : travaux de rénovation énergétique éligibles et prestations directement liées',
  ],
};

export const SEO_PAGES: SeoPage[] = [
  {
    slug: 'logiciel-devis-artisan',
    metaTitle: 'Logiciel de devis pour artisan — simple, mobile et rapide',
    metaDescription:
      "Créez vos devis depuis le chantier, envoyez-les en un geste et relancez automatiquement. Le logiciel de devis pensé pour les artisans pressés.",
    eyebrow: 'Logiciel de devis',
    h1: 'Le logiciel de devis pensé pour les artisans, pas pour les comptables',
    intro:
      "La plupart des logiciels de devis ont été conçus pour un bureau. DEVISIA est conçu pour une camionnette, une main libre et cinq minutes entre deux interventions. Vous décrivez le chantier, l'application prépare le devis, vous vérifiez et vous envoyez.",
    sections: [
      {
        title: 'Le vrai problème n’est pas de faire un devis, c’est de le faire à temps',
        body:
          "Un client qui demande trois devis retient très souvent celui qui arrive en premier. Or le devis se prépare le soir, après une journée de chantier, quand l'énergie manque. Résultat : des demandes qui restent en attente plusieurs jours, et des chantiers perdus sans jamais savoir pourquoi.",
      },
      {
        title: 'Ce que DEVISIA change concrètement',
        bullets: [
          'Le devis se prépare à l’oral, sur place, pendant que les informations sont fraîches',
          'Votre catalogue de prix est appliqué automatiquement : vos prix, pas des prix inventés',
          'Le PDF part par email avec une page en ligne où le client accepte en un clic',
          'Vous êtes notifié dès que le client ouvre le devis',
          'Les relances sont préparées pour vous : vous validez, elles partent',
        ],
      },
      MENTIONS_OBLIGATOIRES,
      {
        title: 'Combien de temps pour un devis',
        body:
          "En pratique, un devis d'intervention simple (dépannage, remplacement d'un équipement, petite pose) se prépare en moins d'une minute avec une description parlée et une photo. Un devis de rénovation à plusieurs lots demande davantage de vérifications : DEVISIA prépare la structure, vous ajustez les quantités.",
      },
    ],
    faq: [
      {
        question: 'Faut-il être à l’aise avec l’informatique ?',
        answer:
          "Non. L'écran principal comporte un bouton microphone et un bouton photo. Si vous savez envoyer un message vocal, vous savez utiliser DEVISIA.",
      },
      {
        question: 'Mes prix sont-ils respectés ?',
        answer:
          "Oui. Le catalogue de prix de votre entreprise est prioritaire sur toute suggestion. Quand aucun article ne correspond, DEVISIA vous pose la question au lieu d'inventer un prix.",
      },
      {
        question: 'Puis-je modifier le devis avant l’envoi ?',
        answer:
          "Toujours. Aucun devis ne part sans votre validation explicite : vous voyez chaque ligne, chaque quantité et chaque montant avant l'envoi.",
      },
    ],
    ctaTitle: 'Votre premier devis en moins d’une minute',
    ctaBody: 'Créez votre compte, ajoutez trois articles à votre catalogue et testez sur un vrai chantier.',
  },
  {
    slug: 'devis-ia',
    metaTitle: 'Devis par IA — comment ça marche vraiment',
    metaDescription:
      "Comment une IA prépare un devis fiable : transcription, analyse des photos, rapprochement avec votre catalogue et calculs vérifiés par le logiciel.",
    eyebrow: 'Devis par IA',
    h1: 'Le devis par IA, sans la magie et sans les approximations',
    intro:
      "Un devis engage votre entreprise. Une IA qui invente des prix serait un risque, pas un gain de temps. DEVISIA sépare donc strictement deux rôles : l'IA structure et rédige, le logiciel calcule et applique vos prix.",
    sections: [
      {
        title: 'Les cinq étapes de la préparation',
        bullets: [
          'Transcription : votre description parlée devient du texte',
          'Analyse : identification de l’intervention, des fournitures et de la main-d’œuvre',
          'Lecture des photos : équipements visibles, contraintes d’accès, état existant',
          'Rapprochement : chaque ligne est reliée à un article de votre catalogue de prix',
          'Calcul : quantités, remises, TVA et totaux sont calculés par le logiciel, jamais par le modèle',
        ],
      },
      {
        title: 'Ce que l’IA ne fait jamais',
        bullets: [
          'Elle n’invente ni marque, ni modèle, ni puissance, ni référence produit',
          'Elle ne calcule aucun total : les montants sont produits par un moteur de calcul déterministe',
          'Elle n’envoie jamais un devis à votre place',
          'Elle n’utilise pas les données d’une entreprise pour une autre',
        ],
      },
      {
        title: 'Que se passe-t-il quand une information manque',
        body:
          "Si vous dites « installer une chaudière » sans préciser le modèle, DEVISIA n'invente pas une référence. Le devis affiche une question explicite : « Quelle est la marque, le modèle et la puissance de la chaudière ? ». Vous complétez, le chiffrage s'ajuste.",
      },
      {
        title: 'Et la confidentialité de vos données',
        body:
          "Votre catalogue, vos clients et vos devis appartiennent à votre entreprise. Les données d'une entreprise ne sont jamais mélangées à celles d'une autre, et ne servent pas à entraîner un modèle général.",
      },
    ],
    faq: [
      {
        question: 'L’IA peut-elle se tromper ?',
        answer:
          "Oui, comme n'importe quel brouillon. C'est pourquoi chaque devis affiche un niveau de confiance, la liste des informations manquantes et les points de vigilance. La vérification humaine avant envoi n'est pas optionnelle : elle fait partie du produit.",
      },
      {
        question: 'Faut-il une connexion pour dicter ?',
        answer:
          "La dictée fonctionne directement dans le navigateur sur les appareils compatibles. Vous pouvez aussi enregistrer puis envoyer l'audio, ou simplement écrire votre description.",
      },
    ],
    ctaTitle: 'Essayez sur une intervention réelle',
    ctaBody: 'Décrivez votre prochain chantier à voix haute et comparez avec le devis que vous auriez fait le soir.',
  },
  {
    slug: 'devis-plombier',
    metaTitle: 'Devis plombier — modèle, postes de chiffrage et exemple',
    metaDescription:
      'Comment chiffrer un devis de plomberie : fournitures, main-d’œuvre, déplacement, TVA. Structure type et erreurs à éviter.',
    eyebrow: 'Plomberie',
    h1: 'Faire un devis de plomberie clair et rentable',
    intro:
      "En plomberie, la marge se joue rarement sur la fourniture : elle se joue sur le temps réellement passé et sur ce qui n'a pas été chiffré. Voici la structure qui limite les mauvaises surprises.",
    sections: [
      {
        title: 'Les postes à ne pas oublier',
        bullets: [
          'Déplacement et prise en charge, surtout en dépannage',
          'Dépose et évacuation de l’ancien équipement',
          'Fournitures : robinetterie, flexibles, siphon, joints, raccords, fixations',
          'Consommables : téflon, silicone, colliers, petites pièces',
          'Main-d’œuvre, en distinguant intervention et mise en service',
          'Remise en état après intervention (percements, saignées, nettoyage)',
          'Mise en sécurité et essais sous pression',
        ],
      },
      {
        title: 'Exemple de structure pour un remplacement de chauffe-eau',
        bullets: [
          'Dépose et évacuation de l’ancien ballon',
          'Fourniture du ballon (capacité et énergie précisées)',
          'Groupe de sécurité, flexibles et raccords',
          'Pose, raccordement hydraulique et électrique',
          'Mise en eau, purge et contrôle de fonctionnement',
          'Main-d’œuvre : temps d’intervention estimé',
        ],
      },
      TVA_BATIMENT,
      {
        title: 'Les erreurs qui coûtent cher',
        bullets: [
          'Annoncer un prix au téléphone avant d’avoir vu le chantier',
          'Oublier l’accessibilité : combles, vide sanitaire, étage sans ascenseur',
          'Ne pas préciser ce qui n’est pas inclus (reprise de carrelage, peinture, maçonnerie)',
          'Laisser un devis sans date de validité alors que les prix de fourniture bougent',
        ],
      },
    ],
    faq: [
      {
        question: 'Un devis de dépannage est-il payant ?',
        answer:
          "Le devis est gratuit sauf déplacement ou diagnostic explicitement facturé, ce qui doit être annoncé au client avant l'intervention. Indiquez-le clairement dans vos conditions.",
      },
      {
        question: 'Comment chiffrer une fuite non localisée ?',
        answer:
          "Chiffrez d'abord la recherche de fuite comme une prestation à part entière, puis proposez la réparation dans un second devis une fois le diagnostic établi. C'est plus honnête et cela évite les litiges.",
      },
    ],
    ctaTitle: 'Un devis de plomberie depuis le chantier',
    ctaBody: 'Décrivez l’intervention à voix haute, prenez une photo sous l’évier, vérifiez et envoyez.',
  },
  {
    slug: 'devis-electricien',
    metaTitle: 'Devis électricien — chiffrage, normes et modèle',
    metaDescription:
      'Structurer un devis d’électricité : points lumineux, prises, tableau, mise aux normes NF C 15-100, main-d’œuvre et TVA.',
    eyebrow: 'Électricité',
    h1: 'Devis électricien : chiffrer au point, pas au forfait flou',
    intro:
      "En électricité, le chiffrage au nombre de points (prises, interrupteurs, points lumineux, circuits spécialisés) reste le plus lisible pour le client et le plus sûr pour vous.",
    sections: [
      {
        title: 'Chiffrer au point',
        bullets: [
          'Point lumineux simple, va-et-vient, télérupteur',
          'Prise 16 A, prise commandée, prise réseau',
          'Circuit spécialisé : plaque, four, lave-linge, lave-vaisselle',
          'Tableau : nombre de rangées, disjoncteurs divisionnaires, différentiels',
          'Alimentation, liaison équipotentielle et mise à la terre',
        ],
      },
      {
        title: 'Mise aux normes et sécurité',
        body:
          "La norme NF C 15-100 encadre les installations neuves et les rénovations totales. Précisez sur le devis ce qui relève d'une mise en sécurité (protection différentielle, terre, remplacement du tableau) et ce qui relève d'une mise en conformité complète : le budget n'est pas le même et la confusion crée des litiges.",
      },
      TVA_BATIMENT,
      {
        title: 'Ce qui doit apparaître pour rassurer le client',
        bullets: [
          'Le détail des protections installées et leur calibre',
          'La distinction fourniture / pose sur chaque ligne',
          'Le temps de coupure et la remise en service',
          'Les finitions non incluses : rebouchage, peinture, faux plafonds',
          'L’attestation de conformité éventuelle et son coût',
        ],
      },
    ],
    faq: [
      {
        question: 'Faut-il détailler chaque prise sur le devis ?',
        answer:
          'Oui, au moins par quantité et par type. Un devis « rénovation électrique : 6 000 € » est refusé bien plus souvent qu’un devis détaillant 32 points et un tableau.',
      },
      {
        question: 'Comment gérer les imprévus dans l’existant ?',
        answer:
          "Prévoyez une ligne explicite « travaux conservatoires non visibles à ce stade », chiffrée à zéro, avec une mention indiquant qu'un avenant sera proposé si des désordres sont découverts.",
      },
    ],
    ctaTitle: 'Vos points, vos prix, votre devis',
    ctaBody: 'Chargez votre grille de prix au point : DEVISIA l’applique automatiquement.',
  },
  {
    slug: 'devis-chauffagiste',
    metaTitle: 'Devis chauffagiste — chaudière, PAC et entretien',
    metaDescription:
      'Chiffrer un devis de chauffage : dépose, fourniture, pose, mise en service, désembouage, aides. Structure claire pour le client.',
    eyebrow: 'Chauffage',
    h1: 'Devis de chauffage : le détail qui fait signer',
    intro:
      "Sur un remplacement de générateur, le client compare rarement des lignes techniques : il compare un montant. Un devis structuré, qui montre ce qui est réellement fait, se défend beaucoup mieux qu'un forfait global.",
    sections: [
      {
        title: 'La structure qui fonctionne',
        bullets: [
          'Dépose et évacuation du générateur existant',
          'Fourniture du nouvel équipement, marque, modèle et puissance précisés',
          'Adaptation hydraulique : vannes, circulateur, raccords, vase d’expansion',
          'Évacuation des fumées et ventilation',
          'Raccordement électrique et régulation',
          'Désembouage ou traitement de l’eau si nécessaire',
          'Mise en service, réglages et explication au client',
        ],
      },
      {
        title: 'Puissance : ne jamais deviner',
        body:
          "La puissance d'un générateur dépend des déperditions du logement, pas d'une règle générale. Tant que la surface, l'isolation et le nombre d'émetteurs ne sont pas connus, le chiffrage reste une hypothèse — et doit être présenté comme tel au client.",
      },
      {
        title: 'Aides et financement',
        body:
          "Les dispositifs d'aide évoluent régulièrement. Indiquez sur le devis les informations dont le client aura besoin pour ses démarches (nature des travaux, caractéristiques de l'équipement, qualifications de l'entreprise) sans promettre un montant d'aide que vous ne maîtrisez pas.",
      },
      TVA_BATIMENT,
    ],
    faq: [
      {
        question: 'Faut-il chiffrer l’entretien dans le même devis ?',
        answer:
          "Proposez-le en option clairement séparée. Un contrat d'entretien signé en même temps que l'installation est la meilleure source de chiffre d'affaires récurrent.",
      },
      {
        question: 'Comment justifier un écart de prix avec un concurrent ?',
        answer:
          "Par le détail. Un devis qui montre le désembouage, l'adaptation hydraulique et la mise en service explique naturellement l'écart avec un devis qui ne les mentionne pas.",
      },
    ],
    ctaTitle: 'Préparez le devis pendant la visite',
    ctaBody: 'Photographiez l’installation existante, décrivez ce que vous voyez, ajustez ensuite au bureau.',
  },
  {
    slug: 'devis-peintre',
    metaTitle: 'Devis peintre — chiffrage au m², préparation et finitions',
    metaDescription:
      'Faire un devis de peinture : métré, état du support, préparation, nombre de couches, protections et finitions.',
    eyebrow: 'Peinture',
    h1: 'Devis de peinture : le support décide du prix',
    intro:
      "Deux chantiers de 40 m² peuvent avoir un coût du simple au double. Ce n'est pas la peinture qui fait la différence, c'est la préparation. Un devis de peinture crédible commence donc par une description honnête du support.",
    sections: [
      {
        title: 'Le métré, poste par poste',
        bullets: [
          'Murs : surface développée, hauteur sous plafond',
          'Plafonds : surface, accessibilité, éclairage rasant',
          'Boiseries : portes, plinthes, huisseries, comptées à l’unité ou au mètre linéaire',
          'Protection des sols et du mobilier',
          'Nettoyage et remise en état',
        ],
      },
      {
        title: 'Décrire l’état du support',
        bullets: [
          'Support neuf, à impressionner',
          'Ancienne peinture en bon état, simple lessivage',
          'Support fissuré, à rebouchage et enduit de rebouchage',
          'Support dégradé, à ratissage complet ou toile de rénovation',
          'Trace d’humidité : traitement préalable indispensable, à traiter en amont',
        ],
      },
      {
        title: 'Précisions qui évitent les litiges',
        bullets: [
          'Nombre de couches réellement prévues et type de finition (mat, velours, satin)',
          'Marque et gamme de peinture, ou au minimum la classe de produit',
          'Ce qui n’est pas inclus : décollement de papier peint, ragréage, reprise de plâtrerie',
          'Conditions d’accès et libération des pièces par le client',
        ],
      },
      TVA_BATIMENT,
    ],
    faq: [
      {
        question: 'Faut-il facturer un déplacement pour le métré ?',
        answer:
          "Pour un chantier de rénovation complet, la visite fait partie de la vente. Pour un simple rafraîchissement, un métré à distance à partir de photos et de dimensions suffit souvent, à condition de le préciser sur le devis.",
      },
      {
        question: 'Comment présenter un prix au m² ?',
        answer:
          "Affichez le prix au m² par prestation (préparation, impression, finition) plutôt qu'un prix global au m². Le client comprend alors ce qu'il paie et compare sur des bases réelles.",
      },
    ],
    ctaTitle: 'Métrez, décrivez, envoyez',
    ctaBody: 'Photographiez chaque pièce, dictez l’état du support et laissez DEVISIA structurer le devis.',
  },
  {
    slug: 'devis-couvreur',
    metaTitle: 'Devis couvreur — toiture, zinguerie et sécurité',
    metaDescription:
      'Chiffrer un devis de couverture : surface développée, échafaudage, matériaux, zinguerie, évacuation et garanties.',
    eyebrow: 'Couverture',
    h1: 'Devis de couverture : chiffrer l’accès autant que la toiture',
    intro:
      "En couverture, l'accès et la sécurité représentent une part significative du montant. Les faire apparaître clairement évite que le client compare votre devis complet à un devis qui les a oubliés.",
    sections: [
      {
        title: 'Les postes structurants',
        bullets: [
          'Surface développée réelle, en tenant compte de la pente',
          'Échafaudage, protections périphériques et durée de location',
          'Dépose de la couverture existante et tri des déchets',
          'Charpente : contrôle, remplacement de liteaux ou de chevrons dégradés',
          'Écran de sous-toiture et ventilation',
          'Couverture : tuiles, ardoises, accessoires de faîtage et de rive',
          'Zinguerie : gouttières, descentes, noues, solins, closoirs',
          'Évacuation en déchetterie et nettoyage du chantier',
        ],
      },
      {
        title: 'Ce qui doit être écrit noir sur blanc',
        bullets: [
          'La part d’aléa liée à la charpente, invisible avant dépose',
          'Le traitement des points singuliers : cheminée, fenêtres de toit, arêtiers',
          'Les garanties : décennale, et sa mention avec la compagnie et le numéro de contrat',
          'Les conditions météo pouvant décaler le planning',
        ],
      },
      {
        title: 'Sécurité : un argument commercial',
        body:
          "Le travail en hauteur est encadré. Détailler les moyens de protection collective mis en œuvre n'est pas un coût à cacher : c'est la démonstration que votre entreprise travaille correctement, et une réponse directe aux devis anormalement bas.",
      },
      TVA_BATIMENT,
    ],
    faq: [
      {
        question: 'Comment gérer une charpente dégradée découverte en cours de chantier ?',
        answer:
          'Prévoyez au devis une ligne « remplacement d’éléments de charpente » avec un prix unitaire au mètre linéaire et une quantité à zéro. Le client connaît le prix à l’avance, et l’avenant se limite à la quantité constatée.',
      },
      {
        question: 'Faut-il chiffrer le démoussage séparément ?',
        answer:
          'Oui. C’est une prestation d’entretien récurrente, avec sa propre périodicité, et une excellente porte d’entrée pour revenir chez le client.',
      },
    ],
    ctaTitle: 'Le devis prêt en descendant du toit',
    ctaBody: 'Photos de la couverture, description parlée, chiffrage structuré : le devis part le jour même.',
  },
];

export function getSeoPage(slug: string): SeoPage | undefined {
  return SEO_PAGES.find((page) => page.slug === slug);
}
