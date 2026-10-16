import type { HeadingLine } from "@/components/ui/Layout";
import type { Locale } from "./i18n/config.ts";

/**
 * AMYN Acquisition & Conversion Express — offre de projet à prix d'entrée
 * publié (à partir de 2 500 €), pour les dirigeants et PME de France,
 * Belgique, Luxembourg et Suisse romande.
 *
 * Aucune promesse de résultat : ni nombre de demandes, ni taux de
 * conversion, ni chiffre d'affaires. On décrit ce qui est construit.
 * Le traitement de la TVA n'est pas tranché ici : formulation neutre,
 * précisée dans la proposition.
 */

export const ACQUISITION_FROM_EUR = 2500;

const nb = " ";
const nn = " ";

const fr = {
  meta: {
    title: "Acquisition & Conversion Express — site, formulaires qualifiés et suivi des demandes",
    description:
      "Une expérience web premium pour transformer l'intérêt de vos visiteurs en demandes qualifiées : formulaires intelligents, rendez-vous, suivi. À partir de 2 500 €.",
  },
  name: "Acquisition & Conversion Express",
  hero: {
    eyebrow: "AMYN / Acquisition & Conversion",
    title: [{ text: "Votre présence digitale." }, { text: "Un véritable", accent: "levier de croissance." }] as HeadingLine[],
    lead: "Nous concevons des expériences digitales pensées pour transformer l'intérêt de vos visiteurs en opportunités commerciales concrètes, tout en simplifiant la gestion de vos prospects.",
    primary: "Découvrir notre approche",
    secondary: "Parler de mon projet",
    facts: ["Projet ponctuel", `À partir de 2${nn}500${nb}€`, "France · Belgique · Luxembourg · Suisse romande"],
  },
  visual: {
    label: "Exemple illustratif",
    title: "Nouvelle demande qualifiée",
    source: "Site · formulaire de projet",
    fields: [
      ["Type de projet", "Refonte du site + prise de rendez-vous"],
      ["Budget envisagé", `5${nn}000 – 10${nn}000${nb}€`],
      ["Échéance", "Sous 3 mois"],
      ["Créneau souhaité", "Mardi, 10:00"],
    ] as [string, string][],
    steps: ["Notification envoyée", "Demande ajoutée au suivi", "Rendez-vous proposé"],
  },
  problem: {
    label: "Le constat",
    title: [{ text: "Un beau site" }, { text: "ne suffit", accent: "plus." }] as HeadingLine[],
    lead: "Attirer l'attention est une première étape. Encore faut-il permettre à vos visiteurs de passer à l'action, recueillir les bonnes informations et assurer un suivi efficace de chaque demande.",
    items: [
      { title: "Des visiteurs qui repartent", body: "Un site peut attirer l'attention sans rendre la prochaine étape suffisamment claire." },
      { title: "Des demandes difficiles à qualifier", body: "Sans formulaire structuré, comprendre le besoin de chaque prospect demande souvent des allers-retours inutiles." },
      { title: "Un suivi commercial dispersé", body: "Quand les demandes arrivent par plusieurs canaux, garder une vue d'ensemble claire devient plus difficile." },
    ],
  },
  solution: {
    label: "L'approche",
    title: [{ text: "Une expérience pensée" }, { text: "pour", accent: "convertir." }] as HeadingLine[],
    lead: "Quatre étapes reliées, du premier regard au suivi de la demande.",
    stages: [
      { title: "Attirer", body: "Une expérience digitale professionnelle qui exprime clairement la valeur de votre entreprise." },
      { title: "Convaincre", body: "Une structure persuasive, des contenus pertinents, des appels à l'action clairs et des éléments de confiance." },
      { title: "Qualifier", body: "Des formulaires intelligents qui recueillent les informations utiles avant le premier échange." },
      { title: "Suivre", body: "Notifications, intégrations et automatisations simples pour organiser vos opportunités commerciales." },
    ],
  },
  included: {
    label: "Le périmètre",
    title: [{ text: "Tout ce qu'il faut" }, { text: "pour aller plus", accent: "loin." }] as HeadingLine[],
    lead: "Le périmètre exact est défini ensemble lors du cadrage, selon votre activité et vos outils.",
    items: [
      { title: "Expérience web premium", body: "Page d'atterrissage ou site, conçu pour la conversion et adapté à votre marque." },
      { title: "Parcours de conversion", body: "Une prochaine étape claire à chaque endroit de la page." },
      { title: "Formulaires intelligents", body: "Des formulaires adaptés à votre activité, courts là où il le faut." },
      { title: "Qualification des prospects", body: "Besoin, type de projet et budget recueillis dès la demande." },
      { title: "Prise de rendez-vous", body: "Intégrée au parcours, lorsque c'est pertinent pour votre activité." },
      { title: "Automatisations essentielles", body: "Notifications par e-mail et flux de travail simples." },
      { title: "Suivi des demandes", body: "Un tableau de suivi simple, ou une intégration à vos outils existants." },
      { title: "Analytics & mesure", body: "Mesure d'audience et suivi des conversions, configurés et testés." },
    ],
    also: "Responsive sur ordinateur, tablette et téléphone · tests et mise en ligne inclus.",
  },
  pricing: {
    label: "L'investissement",
    title: [{ text: "Un investissement." }, { accent: "Une ambition." }] as HeadingLine[],
    from: "À partir de",
    price: `2${nn}500${nb}€`,
    kind: "Investissement unique, par projet.",
    tax: "Montant d'entrée indicatif. Le montant définitif et le traitement de la TVA applicable sont précisés dans la proposition.",
    body: "Chaque entreprise possède ses propres enjeux. Nous définissons ensemble un périmètre clair, des livrables précis et une solution adaptée à vos objectifs.",
    honest: "Nous ne promettons ni volume de demandes, ni taux de conversion, ni chiffre d'affaires : nous construisons le dispositif, et vous en gardez la maîtrise.",
    audience: "Pour les dirigeants, fondateurs et PME en France, en Belgique, au Luxembourg et en Suisse romande.",
    cta: "Discuter de mon projet",
    beyond: "Besoin d'un système commercial complet ?",
    beyondLink: "Découvrir Revenue OS",
  },
  card: {
    label: "Offre projet",
    summary: "Une expérience web premium pensée pour transformer l'intérêt de vos visiteurs en demandes qualifiées : parcours de conversion, formulaires intelligents, rendez-vous, notifications et suivi.",
    facts: [`À partir de 2${nn}500${nb}€`, "Projet ponctuel"],
    cta: "Découvrir l'offre",
  },
  finale: {
    label: "Votre projet",
    title: [{ text: "Et si votre prochain projet" }, { accent: "commençait ici ?" }] as HeadingLine[],
    lead: "Parlons de vos objectifs et imaginons une expérience digitale à la hauteur de votre entreprise.",
    primary: "Présenter mon projet",
    orEmail: "Ou écrivez-nous directement :",
  },
};

export type AcquisitionCopy = typeof fr;

const en: AcquisitionCopy = {
  meta: {
    title: "Acquisition & Conversion Express — website, qualified forms and lead follow-up",
    description:
      "A premium web experience that turns visitor interest into qualified enquiries: smart forms, appointment booking, follow-up. From €2,500.",
  },
  name: "Acquisition & Conversion Express",
  hero: {
    eyebrow: "AMYN / Acquisition & Conversion",
    title: [{ text: "Your digital presence." }, { text: "A genuine", accent: "growth lever." }],
    lead: "We design digital experiences built to turn your visitors' interest into concrete business opportunities, while making your prospects simpler to manage.",
    primary: "Discover our approach",
    secondary: "Talk about my project",
    facts: ["One-time project", "From €2,500", "France · Belgium · Luxembourg · French-speaking Switzerland"],
  },
  visual: {
    label: "Illustrative example",
    title: "New qualified enquiry",
    source: "Website · project form",
    fields: [
      ["Project type", "Website redesign + appointment booking"],
      ["Budget", "€5,000–€10,000"],
      ["Timeline", "Within 3 months"],
      ["Preferred slot", "Tuesday, 10:00"],
    ],
    steps: ["Notification sent", "Enquiry added to tracking", "Appointment offered"],
  },
  problem: {
    label: "The situation",
    title: [{ text: "A beautiful website" }, { text: "is no longer", accent: "enough." }],
    lead: "Attracting attention is a first step. Visitors still need to be able to act, the right information has to be collected, and every enquiry needs effective follow-up.",
    items: [
      { title: "Visitors who leave", body: "A website may attract attention without making the next step sufficiently clear." },
      { title: "Enquiries that are hard to qualify", body: "Without structured forms, understanding each prospect's needs can require unnecessary back-and-forth." },
      { title: "Scattered sales follow-up", body: "When enquiries arrive through multiple channels, keeping a clear overview becomes harder." },
    ],
  },
  solution: {
    label: "The approach",
    title: [{ text: "An experience designed" }, { text: "to", accent: "convert." }],
    lead: "Four connected stages, from first impression to enquiry follow-up.",
    stages: [
      { title: "Attract", body: "A professional digital experience that communicates your company's value clearly." },
      { title: "Convince", body: "Persuasive structure, relevant content, clear calls to action and trust-building elements." },
      { title: "Qualify", body: "Smart enquiry forms that collect useful project information before the first conversation." },
      { title: "Follow up", body: "Notifications, integrations and simple automations that help organise your business opportunities." },
    ],
  },
  included: {
    label: "The scope",
    title: [{ text: "Everything you need" }, { text: "to go", accent: "further." }],
    lead: "The exact scope is defined together during discovery, based on your business and your tools.",
    items: [
      { title: "Premium web experience", body: "A landing page or website, built for conversion and true to your brand." },
      { title: "Conversion journey", body: "A clear next step at every point on the page." },
      { title: "Smart forms", body: "Forms adapted to your business, short where they need to be." },
      { title: "Prospect qualification", body: "Needs, project type and budget captured at enquiry." },
      { title: "Appointment booking", body: "Built into the journey, where it makes sense for your business." },
      { title: "Essential automations", body: "Email notifications and simple workflows." },
      { title: "Enquiry tracking", body: "A simple tracking dashboard, or integration with your existing tools." },
      { title: "Analytics & measurement", body: "Audience measurement and conversion tracking, configured and tested." },
    ],
    also: "Responsive on desktop, tablet and mobile · testing and deployment included.",
  },
  pricing: {
    label: "The investment",
    title: [{ text: "One investment." }, { accent: "One ambition." }],
    from: "From",
    price: "€2,500",
    kind: "One-time project investment.",
    tax: "Indicative starting amount. The final amount and the applicable VAT treatment are set out in the proposal.",
    body: "Every business has its own challenges. Together we define a clear scope, precise deliverables and a solution suited to your objectives.",
    honest: "We don't promise a number of enquiries, a conversion rate or revenue: we build the system, and you stay in control of it.",
    audience: "For CEOs, founders and SMEs in France, Belgium, Luxembourg and French-speaking Switzerland.",
    cta: "Discuss my project",
    beyond: "Need a complete sales system?",
    beyondLink: "Explore Revenue OS",
  },
  card: {
    label: "Project offer",
    summary: "A premium web experience built to turn visitor interest into qualified enquiries: conversion journey, smart forms, appointments, notifications and follow-up.",
    facts: ["From €2,500", "One-time project"],
    cta: "Discover the offer",
  },
  finale: {
    label: "Your project",
    title: [{ text: "What if your next project" }, { accent: "started here?" }],
    lead: "Let's talk about your objectives and imagine a digital experience worthy of your business.",
    primary: "Present my project",
    orEmail: "Or email us directly:",
  },
};

const copy: Record<Locale, AcquisitionCopy> = { fr, en };
export const getAcquisition = (locale: Locale): AcquisitionCopy => copy[locale];

/** Identifiant du service dans le formulaire de projet (`?besoin=`). */
export const ACQUISITION_SLUG = "acquisition-conversion";
