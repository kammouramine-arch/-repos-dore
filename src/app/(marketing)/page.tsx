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
import { HeroBackdrop } from '@/components/marketing/hero-backdrop';
import { ProductStage } from '@/components/marketing/product-stage';
import { WorkflowShowcase } from '@/components/marketing/workflow';
import { PricingGrid } from '@/components/marketing/pricing';
import { FaqItem, FeatureCard, SectionHeading } from '@/components/marketing/sections';
import { CountEuros, Reveal } from '@/components/marketing/motion';
import {
  CatalogueVisual,
  ClientsVisual,
  MobileVisual,
  PdfVisual,
  PhotosVisual,
  RecoveryVisual,
  StatusFlowVisual,
  VoiceVisual,
} from '@/components/marketing/feature-visuals';
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
      "Oui, et c'est volontaire. DEVISERA prépare un projet de devis complet, signale les informations manquantes et affiche son niveau de confiance. Rien n'est envoyé sans votre validation explicite.",
  },
  {
    question: 'Est-ce que DEVISERA utilise mes prix ?',
    answer:
      "Votre catalogue de prix est prioritaire sur toute suggestion. Si vous avez configuré « Installation chauffe-eau 200 L » à 950 € HT, c'est ce prix qui est appliqué. Sans article correspondant, DEVISERA vous demande le prix plutôt que d'en inventer un.",
  },
  {
    question: 'Comment fonctionne la dictée ?',
    answer:
      'Vous appuyez sur le microphone et vous décrivez le chantier normalement. La dictée fonctionne directement dans le navigateur sur les appareils compatibles ; sinon vous enregistrez, ou vous écrivez.',
  },
  {
    question: 'Mes clients voient-ils que j’utilise une IA ?',
    answer:
      "Le PDF reprend les informations de votre entreprise. Vérifiez son aperçu avant l'envoi ; les projets préparés par IA restent sous votre responsabilité.",
  },
  {
    question: 'Que se passe-t-il après l’essai gratuit ?',
    answer: `Sur le web, l'essai dure ${TRIAL_DAYS} jours sans carte bancaire. Sur iPhone, l'offre d'essai Apple est réservée aux personnes éligibles : l'abonnement se renouvelle automatiquement au tarif affiché par Apple, sauf annulation. Vérifiez les conditions sur l'écran de confirmation avant de souscrire.`,
  },
  {
    question: 'Puis-je importer mes anciens devis et ma liste de prix ?',
    answer:
      "Oui. Vous pouvez importer un fichier CSV de catalogue, et proposer vos anciens devis à l'analyse pour en extraire prestations et prix. Rien n'est ajouté à votre catalogue sans votre validation.",
  },
];

/** Délais de la séquence d'entrée du héros : atmosphère, badge, titre, texte, boutons, produit. */
const HERO = {
  badge: '120ms',
  title: '260ms',
  text: '420ms',
  actions: '560ms',
  note: '680ms',
  product: '760ms',
} as const;

function heroDelay(delay: string) {
  return { '--hero-delay': delay } as React.CSSProperties;
}

export default function HomePage() {
  return (
    <>
      {/* ----------------------------------------------------------------- Hero */}
      <section className="relative -mt-[68px] overflow-hidden pt-[68px]">
        <HeroBackdrop />
        <div className="container-page pb-20 pt-14 sm:pt-20 lg:pb-28 lg:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <p
              className="hero-in inline-flex items-center gap-2 rounded-full border border-line/80 bg-canvas/80 px-3.5 py-1.5 text-[12.5px] font-medium text-ink-soft shadow-xs backdrop-blur"
              style={heroDelay(HERO.badge)}
            >
              <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden />
              {BRAND.positioning}
            </p>

            <h1
              className="hero-in mt-6 text-[40px] font-bold leading-[1.04] tracking-[-0.04em] text-ink text-balance sm:text-[60px] lg:text-[68px]"
              style={heroDelay(HERO.title)}
            >
              L’IA qui transforme votre travail en{' '}
              <span className="bg-[linear-gradient(120deg,#2341C6_0%,#2F52E8_45%,#6F8CFF_100%)] bg-clip-text text-transparent">devis</span>.
            </h1>

            <p
              className="hero-in mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-muted text-pretty sm:text-[19px]"
              style={heroDelay(HERO.text)}
            >
              Parlez, ajoutez vos photos et laissez DEVISERA préparer votre devis professionnel en
              quelques secondes.
            </p>

            <div className="hero-in mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row" style={heroDelay(HERO.actions)}>
              <Button asChild size="lg" className="group w-full shadow-glow transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-10px_rgba(47,82,232,0.55)] sm:w-auto sm:px-7">
                <Link href="/inscription">
                  Essayer gratuitement
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg" className="w-full bg-canvas/80 backdrop-blur transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-card sm:w-auto sm:px-7">
                <Link href="#comment">Voir comment ça marche</Link>
              </Button>
            </div>

            <p className="hero-in mt-5 text-[12.5px] text-subtle" style={heroDelay(HERO.note)}>
              {TRIAL_DAYS} jours d’essai sur le web sans carte bancaire. Conditions Apple distinctes sur iPhone.
            </p>
          </div>

          <div className="hero-in mt-16 sm:mt-20" style={heroDelay(HERO.product)}>
            <ProductStage />
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- Métiers */}
      <section className="border-y border-line bg-surface/60 py-8">
        <div className="container-page">
          <Reveal as="p" className="text-center text-[12px] font-semibold uppercase tracking-[0.14em] text-subtle">
            Conçu pour les métiers du bâtiment et des services
          </Reveal>
          <Reveal as="ul" delay={120} className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {TRADES.map((trade) => (
              <li
                key={trade}
                className="rounded-full border border-line bg-canvas px-3.5 py-1.5 text-[13px] text-muted transition-[color,border-color,transform] duration-200 hover:-translate-y-px hover:border-accent-border hover:text-accent-hover"
              >
                {trade}
              </li>
            ))}
          </Reveal>
        </div>
      </section>

      {/* -------------------------------------------------------------- Problème */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        <div className="pointer-events-none absolute right-0 top-1/2 -z-10 h-[520px] w-[520px] -translate-y-1/2 translate-x-1/3 rounded-full bg-[radial-gradient(closest-side,rgba(47,82,232,0.08),rgba(47,82,232,0))]" aria-hidden />
        <div className="container-page">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
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
                ].map(([title, body], index) => (
                  <Reveal as="li" key={title} delay={120 + index * 90} className="flex gap-3.5">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-danger" aria-hidden />
                    <div>
                      <p className="text-[15px] font-semibold text-ink">{title}</p>
                      <p className="mt-0.5 text-[14px] leading-relaxed text-muted">{body}</p>
                    </div>
                  </Reveal>
                ))}
              </ul>
            </div>

            <Reveal delay={160} scale className="relative">
              <div className="pointer-events-none absolute -inset-4 rounded-[30px] bg-[radial-gradient(closest-side,rgba(47,82,232,0.10),rgba(47,82,232,0))] blur-xl" aria-hidden />
              <div className="relative rounded-[20px] border border-line bg-canvas p-6 shadow-[0_24px_60px_-30px_rgba(10,26,74,0.3)] sm:p-8">
                <p className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
                  Avec DEVISERA
                </p>
                <p className="mt-4 text-[22px] font-semibold leading-snug tracking-[-0.02em] text-ink sm:text-[24px]">
                  {BRAND.promise}
                </p>
                <ol className="mt-7 space-y-2.5">
                  {[
                    { icon: Mic, label: 'Vous décrivez le chantier', time: '01' },
                    { icon: Sparkles, label: 'DEVISERA prépare le devis', time: '02' },
                    { icon: ListChecks, label: 'Vous vérifiez et ajustez', time: '03' },
                    { icon: Send, label: 'Vous partagez le devis avec le client', time: '04' },
                  ].map((step, index) => (
                    <li
                      key={step.label}
                      className="group flex items-center gap-3.5 rounded-[12px] border border-line bg-surface/60 px-4 py-3 transition-[border-color,background-color,transform] duration-200 hover:-translate-y-px hover:border-accent-border hover:bg-canvas"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-canvas text-accent shadow-xs transition-colors group-hover:bg-accent-soft">
                        <step.icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="flex-1 text-[14.5px] text-ink">{step.label}</span>
                      <span className="text-[12px] font-semibold tracking-[0.1em] text-subtle tabular">{step.time}</span>
                      {index === 3 ? <span className="sr-only">Dernière étape</span> : null}
                    </li>
                  ))}
                </ol>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- Fonctionnalités */}
      <section id="fonctionnalites" className="scroll-mt-20 border-t border-line bg-surface/50 py-20 sm:py-28">
        <div className="container-page">
          <SectionHeading
            eyebrow="Fonctionnalités"
            title="Tout ce qu’il faut pour vendre, rien de ce qui vous ralentit."
            description="DEVISERA couvre le parcours qui rapporte : la demande, le devis, la relance et l’encaissement du chantier."
          />

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <FeatureCard icon={Mic} title="Devis vocal, préparé par l’IA" className="lg:col-span-3" visual={<VoiceVisual />}>
              Un gros bouton microphone, une main libre. Vous parlez comme à votre apprenti ; DEVISERA identifie
              l’intervention, les fournitures et la main-d’œuvre, puis construit un devis structuré.
            </FeatureCard>
            <FeatureCard icon={Wallet} title="Catalogue de prix" className="lg:col-span-3" delay={80} visual={<CatalogueVisual />}>
              Vos articles, vos prix d’achat, vos prix de vente et vos marges. DEVISERA applique votre catalogue
              avant toute suggestion.
            </FeatureCard>

            <FeatureCard icon={Camera} title="Analyse des photos" className="lg:col-span-2" delay={60} visual={<PhotosVisual />}>
              Équipements visibles, contraintes d’accès et état de l’existant sont pris en compte.
            </FeatureCard>
            <FeatureCard icon={Clock3} title="Suivi et relances" className="lg:col-span-2" delay={120} visual={<StatusFlowVisual />}>
              Envoyé, consulté, relancé : 24 h, 3 jours, 7 jours. Les relances partent avec votre accord. Jamais de spam.
            </FeatureCard>
            <FeatureCard icon={Gauge} title="Chiffre d’affaires à récupérer" className="lg:col-span-2" delay={180} visual={<RecoveryVisual />}>
              Devisé, en attente, sans réponse : votre activité en un écran, et l’argent qui attend une réponse.
            </FeatureCard>

            <FeatureCard icon={Users} title="Clients et prospects" className="lg:col-span-2" delay={60} visual={<ClientsVisual />}>
              Un pipeline simple, du premier appel au chantier gagné, avec l’historique complet de chaque client.
            </FeatureCard>
            <FeatureCard icon={FileText} title="PDF professionnel" className="lg:col-span-2" delay={120} visual={<PdfVisual />}>
              Un devis lisible à votre logo : vérifiez les prix, la TVA et les mentions applicables avant de l’envoyer.
            </FeatureCard>
            <FeatureCard icon={Smartphone} title="Pensé pour le chantier" className="lg:col-span-2" delay={180} visual={<MobileVisual />}>
              Installable sur votre téléphone, utilisable d’une main, lisible en plein soleil.
            </FeatureCard>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- Comment ça marche */}
      <section id="comment" className="relative scroll-mt-20 overflow-hidden py-20 sm:py-28">
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[640px] w-[900px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-[radial-gradient(closest-side,rgba(47,82,232,0.07),rgba(47,82,232,0))]" aria-hidden />
        <div className="container-page">
          <SectionHeading
            eyebrow="Comment ça marche"
            title="Du chantier au devis envoyé, sans repasser par le bureau."
            description="Vous décrivez, DEVISERA structure, vous validez. Le suivi et la relance sont déjà prêts."
          />
          <Reveal delay={120} className="mt-14">
            <WorkflowShowcase />
          </Reveal>
          <Reveal as="p" delay={200} className="mx-auto mt-10 max-w-2xl text-center text-[13.5px] leading-relaxed text-muted">
            La TVA et les totaux sont calculés par le logiciel, jamais par le modèle. Vous contrôlez les quantités, les prix et
            les mentions avant l’envoi ; aucune acceptation en ligne n’est nécessaire pour transmettre un devis.
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------ Récupération */}
      <section id="recuperation" className="relative scroll-mt-20 overflow-hidden border-y border-line bg-ink py-20 text-white sm:py-28">
        <div className="pointer-events-none absolute inset-0 -z-0" aria-hidden>
          <div className="drift-a absolute -left-40 top-1/2 h-[560px] w-[760px] -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(47,82,232,0.35),rgba(47,82,232,0))] blur-3xl" />
          <div className="drift-b absolute -right-32 -top-20 h-[420px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(111,140,255,0.22),rgba(111,140,255,0))] blur-3xl" />
          <div className="noise absolute inset-0 opacity-60" />
        </div>
        <div className="container-page relative">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <SectionHeading
                align="left"
                tone="dark"
                eyebrow="Récupération de chiffre d’affaires"
                title={BRAND.recovery}
                description="DEVISERA calcule en permanence le montant des devis envoyés qui n’ont pas encore reçu de réponse. Vous voyez exactement combien d’argent est en attente — et vous relancez en un geste."
              />
              <Reveal delay={160} className="mt-8">
                <Button asChild size="lg" className="group bg-white text-ink shadow-[0_10px_30px_-12px_rgba(255,255,255,0.5)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_16px_40px_-12px_rgba(255,255,255,0.55)]">
                  <Link href="/inscription">
                    Voir mon chiffre d’affaires en attente
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </Button>
              </Reveal>
            </div>

            <Reveal delay={120} scale className="relative">
              <div className="pointer-events-none absolute -inset-6 rounded-[36px] bg-[radial-gradient(closest-side,rgba(111,140,255,0.28),rgba(111,140,255,0))] blur-2xl" aria-hidden />
              <div className="relative rounded-[20px] border border-white/12 bg-white/[0.05] p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)] backdrop-blur-md sm:p-8">
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white/55">
                  Chiffre d’affaires à récupérer
                </p>
                <p className="mt-3 text-[52px] font-bold leading-none tracking-[-0.04em] tabular sm:text-[60px]">
                  <CountEuros value={4850} />
                </p>
                <p className="mt-3 text-[14px] text-white/70">3 clients n’ont pas encore répondu.</p>

                <div className="mt-6 space-y-2">
                  {[
                    ['M. Martin', 'DEV-2026-0038', '1 950 €', '5 jours'],
                    ['Boulangerie Lemoine', 'DEV-2026-0041', '2 100 €', '3 jours'],
                    ['Mme Ferrand', 'DEV-2026-0042', '800 €', '2 jours'],
                  ].map(([name, ref, amount, delay], index) => (
                    <Reveal
                      key={ref}
                      delay={260 + index * 110}
                      className="group flex items-center justify-between gap-3 rounded-[12px] border border-white/10 bg-white/[0.04] px-4 py-3 transition-colors hover:border-accent-bright/50 hover:bg-white/[0.07]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-medium">{name}</p>
                        <p className="text-[12px] text-white/50 tabular">
                          {ref} · sans réponse depuis {delay}
                        </p>
                      </div>
                      <span className="flex shrink-0 items-center gap-3">
                        <span className="text-[14px] font-semibold tabular">{amount}</span>
                        <span className="hidden rounded-[8px] border border-white/15 px-2.5 py-1 text-[11.5px] font-medium text-white/80 transition-colors group-hover:border-accent-bright group-hover:bg-accent group-hover:text-white sm:inline-flex">
                          Relancer
                        </span>
                      </span>
                    </Reveal>
                  ))}
                </div>

                <p className="mt-4 text-[11.5px] text-white/40">Exemple d’affichage avec des données fictives.</p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ Tarifs */}
      <section id="tarifs" className="relative scroll-mt-20 overflow-hidden py-20 sm:py-28">
        <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[700px] w-[1000px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(47,82,232,0.06),rgba(47,82,232,0))]" aria-hidden />
        <div className="container-page">
          <SectionHeading
            eyebrow="Tarifs"
            title="Un abonnement remboursé par un seul chantier récupéré."
            description="Tous les tarifs sont hors taxes, sans engagement, et incluent les mises à jour."
          />
          <div className="mt-14 lg:mt-16">
            <PricingGrid />
          </div>
          <Reveal as="p" delay={200} className="mt-10 flex items-center justify-center gap-2 text-center text-[13px] text-muted">
            <ShieldCheck className="h-4 w-4 shrink-0 text-success" aria-hidden />
            Vos données restent les vôtres. Export du catalogue disponible ; contactez-nous pour une demande de copie complète.
          </Reveal>
        </div>
      </section>

      {/* --------------------------------------------------------------------- FAQ */}
      <section id="faq" className="scroll-mt-20 border-t border-line bg-surface/50 py-20 sm:py-28">
        <div className="container-page">
          <SectionHeading eyebrow="Questions fréquentes" title="Ce que les artisans nous demandent." />
          <Reveal delay={120} className="mx-auto mt-12 max-w-3xl rounded-[18px] border border-line bg-canvas px-4 shadow-card sm:px-6">
            {FAQ.map((item) => (
              <FaqItem key={item.question} question={item.question} answer={item.answer} />
            ))}
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------------ CTA final */}
      <section className="py-20 sm:py-28">
        <div className="container-page">
          <Reveal scale className="relative mx-auto max-w-4xl overflow-hidden rounded-[24px] bg-ink px-6 py-16 text-center text-white shadow-[0_40px_90px_-40px_rgba(10,26,74,0.6)] sm:px-12 sm:py-20">
            <div className="pointer-events-none absolute inset-0" aria-hidden>
              <div className="absolute inset-0 bg-[linear-gradient(180deg,#14245A_0%,#0B1220_100%)]" />
              <div className="drift-a absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(47,82,232,0.55),rgba(47,82,232,0))] blur-3xl" />
              <div className="absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,rgba(111,140,255,0.6),transparent)]" />
            </div>
            <div className="relative">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[12px] font-medium text-white/85">
                <Mic className="h-3.5 w-3.5 text-accent-bright" aria-hidden />
                Votre prochain devis commence par une phrase
              </p>
              <h2 className="mt-5 text-[30px] font-bold leading-[1.1] tracking-[-0.035em] text-balance sm:text-[42px]">
                Préparez votre prochain devis depuis le chantier.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-[16px] leading-relaxed text-white/70 text-pretty">
                Ouvrez DEVISERA, décrivez votre prochain chantier et voyez le devis se construire.
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="group w-full bg-white text-ink transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_16px_40px_-12px_rgba(255,255,255,0.5)] sm:w-auto sm:px-7">
                  <Link href="/inscription">
                    Essayer gratuitement
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="lg" className="w-full text-white/85 hover:bg-white/10 hover:text-white sm:w-auto">
                  <Link href="/connexion">J’ai déjà un compte</Link>
                </Button>
              </div>
              <p className="mt-5 text-[12.5px] text-white/50">
                {TRIAL_DAYS} jours d’essai sur le web sans carte bancaire. Conditions Apple distinctes sur iPhone.
              </p>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
