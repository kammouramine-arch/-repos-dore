/**
 * ---------------------------------------------------------------------------
 * DONNÉES DE DÉMONSTRATION — LOT 1
 *
 * Ces trois entreprises sont ENTIÈREMENT FICTIVES.
 *
 * Tous les domaines utilisent le TLD réservé `.invalid` (RFC 2606) : il ne
 * peut, par définition, jamais être enregistré ni résolu. Aucune de ces
 * adresses email ne peut recevoir de message, même par accident.
 *
 * Aucune requête de prospection réelle n'a été effectuée pour produire ce
 * fichier. Chaque fiche porte isDemo = true.
 * ---------------------------------------------------------------------------
 */

import { PrismaClient } from "@prisma/client";

// Charge .env si l'on exécute le script hors du serveur Next.
if (!process.env.DATABASE_URL) {
  try {
    (process as unknown as { loadEnvFile: (p?: string) => void }).loadEnvFile();
  } catch {
    /* .env absent : on laissera Prisma signaler l'erreur */
  }
}

const prisma = new PrismaClient();

async function main() {
  console.log("→ Nettoyage des fiches de démonstration existantes…");
  const removed = await prisma.prospect.deleteMany({ where: { isDemo: true } });
  console.log(`  ${removed.count} fiche(s) supprimée(s)`);

  // -------------------------------------------------------------------------
  // 1. READY — aucun site, email public trouvé, email rédigé et vérifié
  // -------------------------------------------------------------------------
  const salon = await prisma.prospect.create({
    data: {
      isDemo: true,
      name: "[DEMO] Salon Éclat",
      sector: "Salon de coiffure",
      city: "Lille",
      region: "Hauts-de-France",
      website: null,
      googleBusinessUrl: "https://maps.example.invalid/demo/salon-eclat",
      instagramUrl: "https://instagram.example.invalid/salon_eclat_demo",
      email: "contact@salon-eclat-demo.invalid",
      emailSource: "GOOGLE_BUSINESS",
      phone: "+33 3 00 00 00 01",
      auditStatus: "COMPLETE",
      auditNote: "Aucun site web à auditer. Diagnostic basé sur la fiche Google.",
      auditedAt: new Date("2026-08-11T09:20:00Z"),
      recommendedOffer: "ESSENTIAL",
      recommendedPrice: 790,
      offerRationale:
        "Aucune présence web hors fiche Google. Un site vitrine de 5 pages avec prise de contact directe couvre le besoin sans sur-dimensionner.",
      status: "READY",
      notes: "FICHE DE DÉMONSTRATION — entreprise fictive, ne pas contacter.",
      issues: {
        create: [
          {
            type: "NO_WEBSITE",
            severity: "HIGH",
            title: "Aucun site web",
            summary:
              "La fiche Google Business ne référence aucun site. Aucun domaine correspondant trouvé dans les sources consultées.",
            evidenceUrl: "https://maps.example.invalid/demo/salon-eclat",
            evidenceNote:
              "Champ « Site Web » vide sur la fiche Google au moment du constat.",
            detectionMethod: "AUTOMATED",
            detectedAt: new Date("2026-08-11T09:20:00Z"),
          },
          {
            type: "NO_BOOKING",
            severity: "MEDIUM",
            title: "Aucune réservation en ligne",
            summary:
              "Aucun lien de prise de rendez-vous sur la fiche Google. Les clients doivent appeler pendant les heures d'ouverture.",
            evidenceUrl: "https://maps.example.invalid/demo/salon-eclat",
            evidenceNote: "Aucun bouton « Prendre rendez-vous » sur la fiche.",
            detectionMethod: "AUTOMATED",
            detectedAt: new Date("2026-08-11T09:21:00Z"),
          },
          {
            type: "GBP_INCOMPLETE",
            severity: "MEDIUM",
            title: "Fiche Google incomplète",
            summary:
              "Horaires renseignés mais aucune photo de l'établissement et description absente.",
            evidenceUrl: "https://maps.example.invalid/demo/salon-eclat",
            evidenceNote: "Champs manquants constatés : photos (0), description (vide).",
            detectionMethod: "AUTOMATED",
            detectedAt: new Date("2026-08-11T09:22:00Z"),
          },
        ],
      },
      sources: {
        create: [
          {
            kind: "GOOGLE_BUSINESS",
            label: "Fiche Google Business (démo)",
            url: "https://maps.example.invalid/demo/salon-eclat",
            note: "Nom, adresse, téléphone, horaires. Email publié dans la description.",
            collectedAt: new Date("2026-08-11T09:18:00Z"),
          },
          {
            kind: "INSTAGRAM",
            label: "Compte Instagram (démo)",
            url: "https://instagram.example.invalid/salon_eclat_demo",
            note: "Confirmation de l'activité et de l'adresse.",
            collectedAt: new Date("2026-08-11T09:19:00Z"),
          },
        ],
      },
      statusEvents: {
        create: [
          {
            toStatus: "FOUND",
            reason: "Fiche créée (données de démonstration).",
            actor: "SYSTEM",
            createdAt: new Date("2026-08-11T09:15:00Z"),
          },
          {
            fromStatus: "FOUND",
            toStatus: "RESEARCHED",
            reason: "Diagnostic terminé : 3 problèmes documentés avec preuve.",
            actor: "SYSTEM",
            createdAt: new Date("2026-08-11T09:22:00Z"),
          },
          {
            fromStatus: "RESEARCHED",
            toStatus: "READY",
            reason: "Email professionnel public trouvé et message rédigé.",
            actor: "SYSTEM",
            createdAt: new Date("2026-08-11T09:30:00Z"),
          },
        ],
      },
    },
  });

  const salonIssues = await prisma.issue.findMany({
    where: { prospectId: salon.id },
    select: { id: true, type: true },
  });
  const citedIds = salonIssues
    .filter((i) => i.type === "NO_WEBSITE" || i.type === "NO_BOOKING")
    .map((i) => i.id);

  await prisma.emailDraft.create({
    data: {
      prospectId: salon.id,
      subject: "Salon Éclat — votre visibilité à Lille",
      body: [
        "Bonjour,",
        "",
        "En cherchant un salon de coiffure à Lille, je suis tombé sur votre fiche Google.",
        "Elle est bien renseignée, mais elle ne renvoie vers aucun site, et il n'y a pas",
        "de moyen de réserver en ligne : vos clients doivent appeler.",
        "",
        "Je suis Amyn, je crée des sites pour les commerces de la métropole lilloise.",
        "Pour un salon, un site simple avec prise de rendez-vous représente en général",
        "quelques rendez-vous supplémentaires pris en dehors de vos heures d'ouverture.",
        "",
        "Si le sujet vous intéresse, je peux vous montrer à quoi cela ressemblerait.",
        "",
        "Amyn — AMYN, Web & Growth",
        "contact@amyn.agency",
        "",
        "Vous ne souhaitez plus recevoir de message de ma part ? Répondez « STOP »,",
        "je vous retire immédiatement de ma liste.",
      ].join("\n"),
      citedIssueIds: JSON.stringify(citedIds),
      model: "claude-opus-5",
      verificationPassed: true,
      verificationNotes:
        "Les 2 problèmes cités correspondent à des Issue enregistrées avec preuve. Aucun chiffre, aucune promesse de résultat détectés.",
      generatedAt: new Date("2026-08-11T09:30:00Z"),
      isActive: true,
    },
  });

  // -------------------------------------------------------------------------
  // 2. RESEARCHED — site obsolète, mais AUCUN email public trouvé.
  //    Illustre la règle : sans email public, la fiche n'entre pas en campagne.
  // -------------------------------------------------------------------------
  await prisma.prospect.create({
    data: {
      isDemo: true,
      name: "[DEMO] Atelier Bois & Forme",
      sector: "Menuiserie",
      city: "Roubaix",
      region: "Hauts-de-France",
      website: "https://atelier-bois-forme-demo.invalid",
      googleBusinessUrl: "https://maps.example.invalid/demo/atelier-bois-forme",
      email: null,
      phone: "+33 3 00 00 00 02",
      auditStatus: "COMPLETE",
      auditNote: "Site accessible et analysé intégralement (4 pages).",
      auditedAt: new Date("2026-08-12T14:05:00Z"),
      recommendedOffer: "PREMIUM",
      recommendedPrice: 1290,
      offerRationale:
        "Site existant mais daté, sans formulaire fonctionnel ni référencement local. La refonte avec devis en ligne et Google Business justifie l'offre Premium.",
      status: "RESEARCHED",
      notes:
        "FICHE DE DÉMONSTRATION — aucun email professionnel public trouvé : ne peut pas entrer en campagne.",
      issues: {
        create: [
          {
            type: "OUTDATED_SITE",
            severity: "HIGH",
            title: "Site obsolète",
            summary:
              "Mention de copyright arrêtée en 2016 et bibliothèque jQuery 1.7 (publiée en 2011) chargée sur toutes les pages.",
            evidenceUrl: "https://atelier-bois-forme-demo.invalid/",
            evidenceSnippet:
              '<footer>© 2016 Atelier Bois &amp; Forme</footer>\n<script src="/js/jquery-1.7.min.js"></script>',
            detectionMethod: "AUTOMATED",
            detectedAt: new Date("2026-08-12T14:05:00Z"),
          },
          {
            type: "NOT_MOBILE_FRIENDLY",
            severity: "HIGH",
            title: "Mauvaise expérience mobile",
            summary:
              "Aucune balise viewport et largeur de page fixée à 980 px : le site ne s'adapte pas aux écrans de téléphone.",
            evidenceUrl: "https://atelier-bois-forme-demo.invalid/",
            evidenceSnippet: '<body><div id="wrapper" style="width:980px">',
            evidenceNote: "Aucune balise <meta name=\"viewport\"> trouvée dans le <head>.",
            detectionMethod: "AUTOMATED",
            detectedAt: new Date("2026-08-12T14:06:00Z"),
          },
          {
            type: "BROKEN_FORM",
            severity: "HIGH",
            title: "Formulaire de contact cassé",
            summary:
              "Le formulaire de la page contact pointe vers un script inexistant : les demandes envoyées ne parviennent nulle part.",
            evidenceUrl: "https://atelier-bois-forme-demo.invalid/contact",
            evidenceSnippet: '<form action="/cgi-bin/formmail.pl" method="post">',
            evidenceNote: "Requête sur /cgi-bin/formmail.pl → réponse 404.",
            detectionMethod: "AUTOMATED",
            detectedAt: new Date("2026-08-12T14:07:00Z"),
          },
          {
            type: "NO_CLICK_TO_CALL",
            severity: "MEDIUM",
            title: "Numéro non cliquable sur mobile",
            summary:
              "Le téléphone est affiché en texte brut, sans lien tel: — impossible d'appeler d'un clic depuis un téléphone.",
            evidenceUrl: "https://atelier-bois-forme-demo.invalid/contact",
            evidenceSnippet: "<p>Tél. 03 00 00 00 02</p>",
            detectionMethod: "AUTOMATED",
            detectedAt: new Date("2026-08-12T14:07:30Z"),
          },
        ],
      },
      sources: {
        create: [
          {
            kind: "WEBSITE",
            label: "Site officiel (démo)",
            url: "https://atelier-bois-forme-demo.invalid",
            note: "4 pages analysées : accueil, réalisations, à propos, contact.",
            collectedAt: new Date("2026-08-12T14:00:00Z"),
          },
          {
            kind: "LEGAL_NOTICE",
            label: "Mentions légales — aucune adresse email publiée",
            url: "https://atelier-bois-forme-demo.invalid/mentions-legales",
            note: "Page présente mais sans email de contact. Aucune adresse devinée : règle absolue.",
            collectedAt: new Date("2026-08-12T14:08:00Z"),
          },
        ],
      },
      statusEvents: {
        create: [
          {
            toStatus: "FOUND",
            reason: "Fiche créée (données de démonstration).",
            actor: "SYSTEM",
            createdAt: new Date("2026-08-12T13:55:00Z"),
          },
          {
            fromStatus: "FOUND",
            toStatus: "RESEARCHED",
            reason:
              "Audit complet : 4 problèmes documentés. Bloqué ici — aucun email public trouvé.",
            actor: "SYSTEM",
            createdAt: new Date("2026-08-12T14:08:00Z"),
          },
        ],
      },
    },
  });

  // -------------------------------------------------------------------------
  // 3. FOUND — repérée, rien de vérifié encore
  // -------------------------------------------------------------------------
  await prisma.prospect.create({
    data: {
      isDemo: true,
      name: "[DEMO] Le Comptoir Nord",
      sector: "Traiteur",
      city: "Villeneuve-d'Ascq",
      region: "Hauts-de-France",
      website: "https://le-comptoir-nord-demo.invalid",
      googleBusinessUrl: "https://maps.example.invalid/demo/le-comptoir-nord",
      email: null,
      phone: "+33 3 00 00 00 03",
      auditStatus: "PENDING",
      auditNote: "Aucun audit lancé. Le moteur de diagnostic arrive au lot 2.",
      recommendedOffer: null,
      recommendedPrice: null,
      status: "FOUND",
      notes: "FICHE DE DÉMONSTRATION — entreprise fictive, ne pas contacter.",
      sources: {
        create: [
          {
            kind: "DIRECTORY",
            label: "Annuaire (démo) — secteur traiteur, métropole lilloise",
            note: "Nom, ville, téléphone et site. Aucune vérification effectuée.",
            collectedAt: new Date("2026-08-14T10:02:00Z"),
          },
        ],
      },
      statusEvents: {
        create: [
          {
            toStatus: "FOUND",
            reason: "Fiche créée (données de démonstration). En attente d'audit.",
            actor: "SYSTEM",
            createdAt: new Date("2026-08-14T10:02:00Z"),
          },
        ],
      },
    },
  });

  const total = await prisma.prospect.count();
  const issues = await prisma.issue.count();
  const drafts = await prisma.emailDraft.count();
  const sends = await prisma.sendLog.count();

  console.log("");
  console.log("✓ Données de démonstration installées");
  console.log(`  prospects          : ${total}`);
  console.log(`  problèmes documentés : ${issues}`);
  console.log(`  brouillons d'email : ${drafts}`);
  console.log(`  envois journalisés : ${sends}  (aucun email n'a été envoyé)`);
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
