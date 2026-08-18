import Link from 'next/link';
import {
  ArrowRight,
  Camera,
  Clock3,
  FileText,
  Gauge,
  ListChecks,
  Mic,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppPreview } from '@/components/marketing/app-preview';
import { PricingGrid } from '@/components/marketing/pricing';
import { FaqItem, FeatureCard, SectionHeading } from '@/components/marketing/sections';
import { BRAND } from '@/components/brand';
import { TRIAL_DAYS } from '@/lib/billing/plans';

const TRADES = [
  'Plombiers',
  'Électriciens',
  'Chauffagistes',
  'Climaticiens',
  'Peintres',
  'Couvreurs',
  'Menuisiers',
  'Maçons',
  'Paysagistes',
  'Rénovation',
  'Nettoyage',
  'Dépannage',
];

const FAQ = [
  {
    question: 'Dois-je vérifier les devis préparés par l’IA ?',
    answer:
      "Oui, et c'est volontaire. DEVISIA prépare un projet de devis complet, signale les informations manquantes et affiche son niveau de confiance. Rien n'est envoyé sans votre validation explicite.",
  },
  {
    question: 'Est-ce que DEVISIA utilise mes prix ?',
    answer:
      "Votre catalogue de prix est prioritaire sur toute suggestion. Si vous avez configuré « Installation chauffe-eau 200 L » à 950 € HT, c'est ce prix qui est appliqué. Sans article correspondant, DEVISIA vous demande le prix plutôt que d'en inventer un.",
  },
  {
    question: 'Comment fonctionne la dictée ?',
    answer:
      'Vous appuyez sur le microphone et vous décrivez le chantier normalement. La dictée fonctionne directement dans le navigateur sur les appareils compatibles ; sinon vous enregistrez, ou vous écrivez.',
  },
  {
    question: 'Mes clients voient-ils que j’utilise une IA ?',
    answer:
      "Non. Le client reçoit un devis PDF à votre en-tête et une page de devis à vos couleurs. DEVISIA n'apparaît nulle part dans les documents envoyés.",
  },
  {
    question: 'Que se passe-t-il après l’essai gratuit ?',
    answer: `Vous disposez de ${TRIAL_DAYS} jours d'essai sans carte bancaire. À l'issue, vous choisissez une formule ; sans abonnement, vos données restent accessibles en lecture et exportables.`,
  },
  {
    question: 'Puis-je importer mes anciens devis et ma liste de prix ?',
    answer:
      "Oui. Vous pouvez importer un fichier CSV de catalogue, et proposer vos anciens devis à l'analyse pour en extraire prestations et prix. Rien n'est ajouté à votre catalogue sans votre validation.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* ----------------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden">
        <div className="grid-backdrop absolute inset-0 -z-10" aria-hidden />
        <div className="container-page pb-16 pt-14 sm:pt-20 lg:pb-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="animate-in-up inline-flex items-center gap-2 rounded-full border border-line bg-canvas px-3 py-1.5 text-[12.5px] font-medium text-muted shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden />
              {BRAND.positioning}
            </p>

            <h1 className="animate-in-up delay-1 mt-6 text-[38px] font-semibold leading-[1.05] tracking-[-0.035em] text-ink sm:text-[56px]">
              L’IA qui transforme votre travail en devis.
            </h1>

            <p className="animate-in-up delay-2 mx-auto mt-5 max-w-xl text-[16.5px] leading-relaxed text-muted sm:text-[18px]">
              Parlez, ajoutez vos photos et laissez DEVISIA préparer votre devis professionnel en
              quelques secondes.
            </p>

            <div className="animate-in-up delay-3 mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/inscription">
                  Créer mon compte gratuitement
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto">
                <Link href="#comment">Voir comment ça marche</Link>
              </Button>
            </div>

            <p className="animate-in-up delay-4 mt-4 text-[12.5px] text-subtle">
              {TRIAL_DAYS} jours d’essai · Sans carte bancaire · Résiliable à tout moment
            </p>
          </div>

          <div className="animate-in-up delay-4 mx-auto mt-14 max-w-5xl">
            <AppPreview />
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- Métiers */}
      <section className="border-y border-line bg-surface/60 py-8">
        <div className="container-page">
          <p className="text-center text-[12px] font-semibold uppercase tracking-[0.14em] text-subtle">
            Conçu pour les métiers du bâtiment et des services
          </p>
          <ul className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {TRADES.map((trade) => (
              <li
                key={trade}
                className="rounded-full border border-line bg-canvas px-3 py-1.5 text-[13px] text-muted"
              >
                {trade}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* -------------------------------------------------------------- Problème */}
      <section className="py-20 sm:py-24">
        <div className="container-page">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <SectionHeading
                align="left"
                eyebrow="Le vrai problème"
                title="Vous ne perdez pas des chantiers sur le prix. Vous les perdez sur le délai."
                description="Le client demande trois devis. Le premier qui répond prend souvent le chantier. Pendant ce temps, votre devis attend le dimanche soir — et le dimanche soir, vous êtes fatigué."
              />
              <ul className="mt-8 space-y-4">
                {[
                  ['Le devis se fait le soir', 'Après une journée sur le chantier, l’administratif passe en dernier.'],
                  ['La relance ne se fait jamais', 'Un devis envoyé sans réponse, c’est un chantier perdu silencieusement.'],
                  ['Les prix sont refaits à chaque fois', 'Sans catalogue, chaque devis repart de zéro et les marges varient.'],
                ].map(([title, body]) => (
                  <li key={title} className="flex gap-3.5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-danger" aria-hidden />
                    <div>
                      <p className="text-[14.5px] font-medium text-ink">{title}</p>
                      <p className="mt-0.5 text-[13.5px] leading-relaxed text-muted">{body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[18px] border border-line bg-surface/50 p-6 sm:p-8">
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-subtle">
                Avec DEVISIA
              </p>
              <p className="mt-4 text-[22px] font-semibold leading-snug tracking-[-0.02em] text-ink">
                {BRAND.promise}
              </p>
              <div className="mt-7 space-y-3">
                {[
                  { icon: Mic, label: 'Vous décrivez le chantier', time: '30 s' },
                  { icon: Sparkles, label: 'DEVISIA prépare le devis', time: '10 s' },
                  { icon: ListChecks, label: 'Vous vérifiez et ajustez', time: '20 s' },
                  { icon: Send, label: 'Le client reçoit et accepte en ligne', time: '1 clic' },
                ].map((step) => (
                  <div
                    key={step.label}
                    className="flex items-center gap-3.5 rounded-[12px] border border-line bg-canvas px-4 py-3 shadow-xs"
                  >
                    <step.icon className="h-[18px] w-[18px] shrink-0 text-accent" aria-hidden />
                    <span className="flex-1 text-[14px] text-ink-soft">{step.label}</span>
                    <span className="text-[12.5px] font-medium text-subtle tabular">{step.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- Fonctionnalités */}
      <section id="fonctionnalites" className="scroll-mt-20 border-t border-line bg-surface/40 py-20 sm:py-24">
        <div className="container-page">
          <SectionHeading
            eyebrow="Fonctionnalités"
            title="Tout ce qu’il faut pour vendre, rien de ce qui vous ralentit."
            description="DEVISIA couvre le parcours qui rapporte : la demande, le devis, la relance et l’encaissement du chantier."
          />

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard icon={Sparkles} title="Création de devis par IA">
              Une description suffit. DEVISIA identifie l’intervention, les fournitures et la
              main-d’œuvre, puis construit un devis structuré.
            </FeatureCard>
            <FeatureCard icon={Mic} title="Devis vocal">
              Un gros bouton microphone, une main libre. Parlez comme vous parleriez à votre apprenti.
            </FeatureCard>
            <FeatureCard icon={Camera} title="Analyse des photos">
              Ajoutez les photos du chantier : équipements visibles, contraintes d’accès et état de
              l’existant sont pris en compte.
            </FeatureCard>
            <FeatureCard icon={Wallet} title="Catalogue de prix">
              Vos articles, vos prix d’achat, vos prix de vente et vos marges. DEVISIA applique votre
              catalogue avant toute suggestion.
            </FeatureCard>
            <FeatureCard icon={Clock3} title="Relances automatiques">
              24 h, 3 jours, 7 jours : les relances sont préparées et envoyées avec votre accord.
              Jamais de spam.
            </FeatureCard>
            <FeatureCard icon={Users} title="Clients et prospects">
              Un pipeline simple, du premier appel au chantier gagné, avec l’historique complet de
              chaque client.
            </FeatureCard>
            <FeatureCard icon={FileText} title="PDF professionnel">
              Un devis à votre logo, conforme, lisible, que vous pouvez envoyer sans le retoucher.
            </FeatureCard>
            <FeatureCard icon={Gauge} title="Suivi du chiffre d’affaires">
              Gagné, en attente, taux d’acceptation, panier moyen : votre entreprise en un écran.
            </FeatureCard>
            <FeatureCard icon={Smartphone} title="Pensé pour le chantier">
              Installable sur votre téléphone, utilisable d’une main, lisible en plein soleil.
            </FeatureCard>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- Comment ça marche */}
      <section id="comment" className="scroll-mt-20 py-20 sm:py-24">
        <div className="container-page">
          <SectionHeading
            eyebrow="Comment ça marche"
            title="Trois gestes entre le chantier et le devis envoyé."
          />
          <ol className="mt-14 grid gap-6 lg:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Vous décrivez',
                body: "« Le client a une fuite sous l'évier. Il faut remplacer le siphon, vérifier les raccordements et prévoir environ une heure de main-d'œuvre. »",
                icon: Mic,
              },
              {
                step: '02',
                title: 'DEVISIA prépare',
                body: "Analyse du chantier, lecture des photos, recherche dans votre catalogue, calcul de la TVA et des totaux par le logiciel — jamais par le modèle.",
                icon: Sparkles,
              },
              {
                step: '03',
                title: 'Vous validez et envoyez',
                body: 'Vous ajustez les quantités, vous envoyez. Le client consulte, accepte en ligne, vous êtes notifié immédiatement.',
                icon: Send,
              },
            ].map((item) => (
              <li key={item.step} className="relative rounded-[16px] border border-line bg-canvas p-6 shadow-xs">
                <span className="text-[12px] font-semibold tracking-[0.12em] text-accent tabular">
                  {item.step}
                </span>
                <item.icon className="mt-4 h-5 w-5 text-ink-soft" aria-hidden />
                <h3 className="mt-3 text-[16px] font-semibold text-ink">{item.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted">{item.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------------------ Récupération */}
      <section id="recuperation" className="scroll-mt-20 border-y border-line bg-ink py-20 text-white sm:py-24">
        <div className="container-page">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/50">
                Récupération de chiffre d’affaires
              </p>
              <h2 className="text-[28px] font-semibold leading-[1.15] tracking-[-0.028em] sm:text-[36px]">
                {BRAND.recovery}
              </h2>
              <p className="mt-5 max-w-lg text-[15.5px] leading-relaxed text-white/70">
                DEVISIA calcule en permanence le montant des devis envoyés qui n’ont pas encore reçu
                de réponse. Vous voyez exactement combien d’argent est en attente — et vous relancez
                en un geste.
              </p>
              <div className="mt-8">
                <Button asChild size="lg" variant="secondary">
                  <Link href="/inscription">Voir mon chiffre d’affaires en attente</Link>
                </Button>
              </div>
            </div>

            <div className="rounded-[18px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm sm:p-8">
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white/50">
                Chiffre d’affaires à récupérer
              </p>
              <p className="mt-3 text-[48px] font-semibold leading-none tracking-[-0.035em] tabular">
                4 850 €
              </p>
              <p className="mt-3 text-[14px] text-white/70">3 clients n’ont pas encore répondu.</p>

              <div className="mt-6 space-y-2">
                {[
                  ['M. Martin', 'DEV-2026-0038', '1 950 €', '5 jours'],
                  ['Boulangerie Lemoine', 'DEV-2026-0041', '2 100 €', '3 jours'],
                  ['Mme Ferrand', 'DEV-2026-0042', '800 €', '2 jours'],
                ].map(([name, ref, amount, delay]) => (
                  <div
                    key={ref}
                    className="flex items-center justify-between gap-3 rounded-[10px] border border-white/10 bg-white/[0.03] px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-medium">{name}</p>
                      <p className="text-[12px] text-white/50 tabular">
                        {ref} · sans réponse depuis {delay}
                      </p>
                    </div>
                    <span className="shrink-0 text-[14px] font-semibold tabular">{amount}</span>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-[11.5px] text-white/40">Exemple d’affichage avec des données fictives.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ Tarifs */}
      <section id="tarifs" className="scroll-mt-20 py-20 sm:py-24">
        <div className="container-page">
          <SectionHeading
            eyebrow="Tarifs"
            title="Un abonnement remboursé par un seul chantier récupéré."
            description="Tous les tarifs sont hors taxes, sans engagement, et incluent les mises à jour."
          />
          <div className="mt-14">
            <PricingGrid />
          </div>
          <p className="mt-8 flex items-center justify-center gap-2 text-[13px] text-muted">
            <ShieldCheck className="h-4 w-4 text-success" aria-hidden />
            Vos données restent les vôtres, exportables à tout moment.
          </p>
        </div>
      </section>

      {/* --------------------------------------------------------------------- FAQ */}
      <section id="faq" className="scroll-mt-20 border-t border-line bg-surface/40 py-20 sm:py-24">
        <div className="container-page">
          <SectionHeading eyebrow="Questions fréquentes" title="Ce que les artisans nous demandent." />
          <div className="mx-auto mt-12 max-w-3xl border-t border-line">
            {FAQ.map((item) => (
              <FaqItem key={item.question} question={item.question} answer={item.answer} />
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ CTA final */}
      <section className="py-20 sm:py-28">
        <div className="container-page">
          <div className="mx-auto max-w-3xl rounded-[20px] border border-line bg-canvas px-6 py-14 text-center shadow-sm sm:px-12">
            <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.03em] text-ink sm:text-[36px]">
              Créez votre premier devis en moins d’une minute.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[15.5px] leading-relaxed text-muted">
              Ouvrez DEVISIA, décrivez votre prochain chantier et voyez le devis se construire.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/inscription">
                  Créer mon compte gratuitement
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="lg" className="w-full sm:w-auto">
                <Link href="/connexion">J’ai déjà un compte</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
