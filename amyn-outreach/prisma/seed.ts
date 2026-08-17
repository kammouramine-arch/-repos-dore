/**
 * ---------------------------------------------------------------------------
 * DONNÉES DE DÉMONSTRATION
 *
 * Entièrement FICTIVES. Tous les domaines utilisent le TLD réservé `.invalid`
 * (RFC 2606), qui ne peut par définition jamais être enregistré ni résolu :
 * aucune de ces adresses ne peut recevoir de message.
 *
 * Chaque fiche porte isDemo = true. La barrière de conformité (DEMO_GUARD)
 * refuse tout envoi vers une fiche de démonstration, quelles que soient les
 * autres conditions.
 * ---------------------------------------------------------------------------
 */

import { PrismaClient } from "@prisma/client";

if (!process.env.DATABASE_URL) {
  try {
    (process as unknown as { loadEnvFile: (p?: string) => void }).loadEnvFile();
  } catch { /* .env absent */ }
}

const prisma = new PrismaClient();

/**
 * INVARIANT DU SYSTEME : un probleme (Issue) n'existe que s'il est adosse a
 * une verification (AuditCheck) qui le prouve. Les donnees de demonstration
 * ne font pas exception — sinon la fiche afficherait un probleme sans preuve.
 *
 * Cette fonction cree la verification correspondant a chaque probleme du
 * prospect et les relie.
 */
async function attachProofs(prospectId: string, ruleLabels: Record<string, { label: string; category: string; method: string }>) {
  const issues = await prisma.issue.findMany({ where: { prospectId, auditCheckId: null } });
  if (issues.length === 0) return;

  const run = await prisma.auditRun.create({
    data: {
      prospectId,
      status: "COMPLETE",
      note: "Exécution de démonstration : les constats sont fictifs mais respectent le contrat de preuve.",
      userAgent: "AmynOutreachBot/1.0 (données de démonstration)",
      rulesRun: issues.length,
      verifiedCount: issues.length,
      problemCount: issues.length,
      startedAt: new Date("2026-08-11T09:20:00Z"),
      finishedAt: new Date("2026-08-11T09:22:00Z"),
      durationMs: 1200,
    },
  });

  for (const issue of issues) {
    const meta = ruleLabels[issue.ruleId ?? ""] ?? {
      label: issue.title,
      category: "PRESENCE",
      method: issue.evidenceNote ?? "Vérification de démonstration.",
    };
    const check = await prisma.auditCheck.create({
      data: {
        prospectId,
        auditRunId: run.id,
        ruleId: issue.ruleId ?? "demo.rule",
        ruleLabel: meta.label,
        category: meta.category,
        verdict: "VERIFIED",
        confidence: issue.confidence,
        isProblem: true,
        issueType: issue.type,
        severity: issue.severity,
        observation: issue.summary,
        method: meta.method,
        targetUrl: issue.evidenceUrl,
        evidenceSnippet: issue.evidenceSnippet,
        checkedAt: new Date("2026-08-11T09:21:00Z"),
      },
    });
    await prisma.issue.update({ where: { id: issue.id }, data: { auditCheckId: check.id } });
  }
}

const DEMO_RULES: Record<string, { label: string; category: string; method: string }> = {
  "website.presence": { label: "Présence d'un site web", category: "PRESENCE", method: "Lecture des sources collectées : aucune adresse de site n'y figure." },
  "conversion.booking": { label: "Réservation en ligne", category: "CONVERSION", method: "Recherche de liens vers les plateformes de réservation connues." },
  "tech.legacy": { label: "Technologies employées", category: "TECHNIQUE", method: "Analyse du HTML : balises, attributs et bibliothèques détectées." },
  "mobile.viewport": { label: "Adaptation mobile (viewport)", category: "MOBILE", method: "Recherche de <meta name=\"viewport\"> dans le <head> de la page d'accueil." },
  "contact.form": { label: "Formulaire de contact", category: "CONTACT", method: "Analyse des <form> de la page de contact et de leur attribut action." },
};

async function main() {
  console.log("→ Nettoyage des fiches de démonstration…");
  const removedClients = await prisma.client.deleteMany({ where: { isDemo: true } });
  const removed = await prisma.prospect.deleteMany({ where: { isDemo: true } });
  await prisma.campaign.deleteMany({ where: { isDemo: true } });
  console.log(`  ${removed.count} prospect(s), ${removedClients.count} client(s) supprimé(s)`);

  // -------------------------------------------------------------------------
  // 1. READY — tout est réuni : preuves, contact, email vérifié
  // -------------------------------------------------------------------------
  const salon = await prisma.prospect.create({
    data: {
      isDemo: true,
      name: "[DEMO] Salon Éclat",
      sector: "Salon de coiffure",
      city: "Lille",
      region: "Hauts-de-France",
      googleBusinessUrl: "https://maps.example.invalid/demo/salon-eclat",
      instagramUrl: "https://instagram.example.invalid/salon_eclat_demo",
      phone: "+33 3 00 00 00 01",
      auditStatus: "COMPLETE",
      auditNote: "Aucun site web à auditer. Diagnostic fondé sur les sources disponibles.",
      auditedAt: new Date("2026-08-11T09:20:00Z"),
      recommendedOffer: "ESSENTIAL",
      recommendedPrice: 790,
      offerRationale:
        "Aucune présence web hors fiche Google. Une vitrine de 5 pages avec prise de contact directe couvre le besoin sans le sur-dimensionner.",
      fitScore: 78, auditScore: 62, contactScore: 85, overallScore: 75,
      status: "READY",
      notes: "FICHE DE DÉMONSTRATION — entreprise fictive, ne pas contacter.",
      issues: {
        create: [
          {
            type: "NO_WEBSITE", severity: "HIGH", confidence: "MEDIUM",
            title: "Aucun site web dans les sources consultées",
            summary: "Aucune adresse de site web n'est renseignée dans les sources collectées pour cette entreprise. La fiche Google Business est connue mais ne référence aucun site.",
            evidenceUrl: "https://maps.example.invalid/demo/salon-eclat",
            evidenceNote: "Lecture du champ « site web » de la fiche prospect (valeur vide).",
            ruleId: "website.presence", detectionMethod: "AUTOMATED",
          },
          {
            type: "NO_BOOKING", severity: "MEDIUM", confidence: "HIGH",
            title: "Aucune réservation en ligne",
            summary: "Aucun lien de réservation ni de prise de rendez-vous n'a été trouvé. Les clients doivent appeler pendant les heures d'ouverture.",
            evidenceUrl: "https://maps.example.invalid/demo/salon-eclat",
            evidenceNote: "Recherche de liens vers des plateformes de réservation connues.",
            ruleId: "conversion.booking", detectionMethod: "AUTOMATED",
          },
        ],
      },
      sources: {
        create: [
          { kind: "GOOGLE_BUSINESS", label: "Fiche Google Business (démo)", url: "https://maps.example.invalid/demo/salon-eclat", note: "Nom, adresse, téléphone, horaires." },
          { kind: "INSTAGRAM", label: "Compte Instagram (démo)", url: "https://instagram.example.invalid/salon_eclat_demo" },
        ],
      },
      statusEvents: {
        create: [
          { toStatus: "FOUND", reason: "Fiche créée (données de démonstration).", createdAt: new Date("2026-08-11T09:15:00Z") },
          { fromStatus: "FOUND", toStatus: "AUDITED", reason: "Audit terminé : 2 problèmes prouvés.", createdAt: new Date("2026-08-11T09:22:00Z") },
          { fromStatus: "AUDITED", toStatus: "READY", reason: "Email public trouvé et message vérifié.", createdAt: new Date("2026-08-11T09:30:00Z") },
        ],
      },
    },
  });

  const salonContact = await prisma.contact.create({
    data: {
      prospectId: salon.id,
      email: "contact@salon-eclat-demo.invalid",
      isGeneric: true,
      discoveryMethod: "GOOGLE_BUSINESS",
      sourceUrl: "https://maps.example.invalid/demo/salon-eclat",
      sourceSnippet: "Adresse publiée dans la description de la fiche Google.",
      validationStatus: "SYNTAX_OK",
      isPrimary: true,
    },
  });
  await prisma.prospect.update({ where: { id: salon.id }, data: { primaryContactId: salonContact.id } });

  const salonIssues = await prisma.issue.findMany({ where: { prospectId: salon.id }, select: { id: true } });
  await prisma.emailDraft.create({
    data: {
      prospectId: salon.id,
      kind: "INITIAL",
      subject: "[DEMO] Salon Éclat — visible sur Google, mais sans site",
      body: [
        "Bonjour,",
        "",
        "Je suis tombé sur Salon Éclat en cherchant un salon de coiffure à Lille, et je n'ai",
        "trouvé aucun site à votre nom, seulement votre fiche Google.",
        "",
        "Quand quelqu'un vous cherche, il n'a rien à consulter avant de vous appeler : ni vos",
        "prestations, ni vos tarifs, ni vos horaires.",
        "",
        "J'ai aussi noté que je n'ai pas trouvé de moyen de réserver en ligne chez vous.",
        "",
        "Je suis Amyn, je crée des sites pour les commerces de la métropole lilloise.",
        "Pour une situation comme la vôtre, je pense à mon offre Essential à 790 €.",
        "",
        "Si le sujet vous intéresse, je peux vous montrer concrètement ce que cela donnerait.",
        "Sinon, dites-le moi et je n'insiste pas.",
        "",
        "Amyn",
        "AMYN — Web & Growth, Lille",
        "contact@amyn.agency",
        "",
        "Si vous ne souhaitez pas recevoir d'autre message de ma part, répondez simplement",
        "« STOP » : je vous retire immédiatement de ma liste et ne vous recontacte plus.",
      ].join("\n"),
      citedIssueIds: JSON.stringify(salonIssues.map((i) => i.id)),
      generator: "template",
      verificationPassed: true,
      verificationNotes: "Vérification passée sans remarque.",
      isActive: true,
    },
  });

  // -------------------------------------------------------------------------
  // 2. BLOCKED — site analysé mais AUCUN email public : la règle en action
  // -------------------------------------------------------------------------
  await prisma.prospect.create({
    data: {
      isDemo: true,
      name: "[DEMO] Atelier Bois & Forme",
      sector: "Menuiserie",
      city: "Roubaix",
      region: "Hauts-de-France",
      website: "https://atelier-bois-forme-demo.invalid",
      phone: "+33 3 00 00 00 02",
      auditStatus: "COMPLETE",
      auditedAt: new Date("2026-08-12T14:05:00Z"),
      recommendedOffer: "PREMIUM",
      recommendedPrice: 1290,
      offerRationale: "Site existant mais daté, sans formulaire fonctionnel ni référencement local.",
      fitScore: 70, auditScore: 88, contactScore: 12, overallScore: 56,
      status: "BLOCKED",
      blockedReason: "Aucune adresse email publique trouvée sur les pages analysées. Aucune adresse n'a été devinée.",
      notes: "FICHE DE DÉMONSTRATION — illustre la règle « jamais deviner un email ».",
      issues: {
        create: [
          {
            type: "OUTDATED_SITE", severity: "HIGH", confidence: "HIGH",
            title: "Site techniquement daté",
            summary: "Marqueurs relevés dans le code de la page d'accueil : jQuery 1.7 ; mention de copyright arrêtée en 2016.",
            evidenceUrl: "https://atelier-bois-forme-demo.invalid/",
            evidenceSnippet: '<footer>© 2016 Atelier Bois &amp; Forme</footer>\n<script src="/js/jquery-1.7.min.js"></script>',
            evidenceNote: "Recherche dans le HTML brut : version de jQuery, année de copyright.",
            ruleId: "tech.legacy", detectionMethod: "AUTOMATED",
          },
          {
            type: "NOT_MOBILE_FRIENDLY", severity: "HIGH", confidence: "HIGH",
            title: "Page non adaptée au mobile",
            summary: "Aucune balise <meta name=\"viewport\"> n'est présente dans le HTML de la page d'accueil. Une largeur fixe en pixels a également été relevée.",
            evidenceUrl: "https://atelier-bois-forme-demo.invalid/",
            evidenceSnippet: '<body><div id="wrapper" style="width:980px">',
            ruleId: "mobile.viewport", detectionMethod: "AUTOMATED",
          },
          {
            type: "BROKEN_FORM", severity: "HIGH", confidence: "HIGH",
            title: "Formulaire de contact cassé",
            summary: "Le formulaire envoie vers /cgi-bin/formmail.pl, qui répond HTTP 404. Les messages envoyés par ce formulaire ne parviennent nulle part.",
            evidenceUrl: "https://atelier-bois-forme-demo.invalid/contact",
            evidenceSnippet: '<form action="/cgi-bin/formmail.pl" method="post">',
            ruleId: "contact.form", detectionMethod: "AUTOMATED",
          },
        ],
      },
      sources: {
        create: [
          { kind: "WEBSITE", label: "Site officiel (démo)", url: "https://atelier-bois-forme-demo.invalid" },
          { kind: "LEGAL_NOTICE", label: "Mentions légales — aucune adresse email publiée", url: "https://atelier-bois-forme-demo.invalid/mentions-legales", note: "Page présente mais sans email. Aucune adresse devinée : règle absolue." },
        ],
      },
      statusEvents: {
        create: [
          { toStatus: "FOUND", reason: "Fiche créée (données de démonstration)." },
          { fromStatus: "FOUND", toStatus: "AUDITED", reason: "Audit complet : 3 problèmes prouvés." },
          { fromStatus: "AUDITED", toStatus: "BLOCKED", reason: "Aucun email public trouvé." },
        ],
      },
    },
  });

  // -------------------------------------------------------------------------
  // 3. FOUND — repérée, rien de vérifié
  // -------------------------------------------------------------------------
  await prisma.prospect.create({
    data: {
      isDemo: true,
      name: "[DEMO] Le Comptoir Nord",
      sector: "Traiteur",
      city: "Villeneuve-d'Ascq",
      region: "Hauts-de-France",
      website: "https://le-comptoir-nord-demo.invalid",
      phone: "+33 3 00 00 00 03",
      auditStatus: "PENDING",
      auditNote: "Aucun audit lancé.",
      status: "FOUND",
      notes: "FICHE DE DÉMONSTRATION — entreprise fictive.",
      sources: {
        create: [{ kind: "DIRECTORY", label: "Annuaire (démo) — traiteur, métropole lilloise", note: "Aucune vérification effectuée." }],
      },
      statusEvents: { create: [{ toStatus: "FOUND", reason: "Fiche créée (données de démonstration)." }] },
    },
  });

  // Adosser une verification a chaque probleme : l'invariant vaut aussi pour
  // les donnees de demonstration.
  for (const p of await prisma.prospect.findMany({ where: { isDemo: true }, select: { id: true } })) {
    await attachProofs(p.id, DEMO_RULES);
  }

  const [prospects, issues, contacts, drafts, sends] = await Promise.all([
    prisma.prospect.count(), prisma.issue.count(), prisma.contact.count(),
    prisma.emailDraft.count(), prisma.sendLog.count(),
  ]);

  console.log("");
  console.log("✓ Données de démonstration installées");
  console.log(`  prospects   : ${prospects}`);
  const unproven = await prisma.issue.count({ where: { auditCheckId: null } });
  console.log(`  problèmes   : ${issues}  (dont ${unproven} sans preuve liée — doit valoir 0)`);
  console.log(`  contacts    : ${contacts}`);
  console.log(`  brouillons  : ${drafts}`);
  console.log(`  envois      : ${sends}  (aucun email n'a été envoyé)`);
  console.log("");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
