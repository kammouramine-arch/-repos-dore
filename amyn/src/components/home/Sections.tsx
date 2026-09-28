import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { ArrowRight, Mail } from "@/components/ui/Icons";
import { Container, Heading, Label, Section, SectionIntro, delay } from "@/components/ui/Layout";
import { BrowserFrame, PhoneFrame } from "@/components/visuals/Frames";
import { AppMock, BookingMock, OnboardingMock, QuoteBoardMock } from "@/components/visuals/Mocks";
import { ProjectCard } from "@/components/work/ProjectCard";
import { method, principles } from "@/lib/method";
import { CONCEPT_NOTICE, projectBySlug } from "@/lib/projects";
import { serviceBySlug, servicePath } from "@/lib/services";
import { cta, site } from "@/lib/site";

/* ==========================================================================
   Section 5 — Réalisations
   ========================================================================== */

export function Work() {
  const [first, second, third] = ["maison-elan", "thermia", "cabinet-aurel"].map(
    (slug) => projectBySlug(slug)!,
  );

  return (
    <Section labelledBy="realisations-titre">
      <Container>
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <SectionIntro
            number="04"
            label="Réalisations"
            id="realisations-titre"
            lines={[{ text: "Des concepts, pour montrer" }, { accent: "une direction." }]}
            lead="Chaque concept part d'un métier et d'un problème précis. Ce sont des démonstrations de notre façon de travailler, présentées comme telles."
          />
          <ButtonLink href="/realisations" variant="text" className="shrink-0">
            Toutes les réalisations
          </ButtonLink>
        </div>

        <div className="mt-16 sm:mt-20">
          <ProjectCard project={first} layout="wide" />
        </div>

        <div className="mt-20 grid gap-20 md:grid-cols-2 md:gap-10 lg:gap-14">
          <ProjectCard project={second} />
          <ProjectCard project={third} />
        </div>

        <p className="label mt-16 max-w-2xl text-fg-3">{CONCEPT_NOTICE}</p>
      </Container>
    </Section>
  );
}

/* ==========================================================================
   Section 6 — Méthode
   ========================================================================== */

export function Method() {
  return (
    <Section tone="ink-2" labelledBy="methode-titre">
      <Container>
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <SectionIntro
            number="05"
            label="Méthode"
            id="methode-titre"
            lines={[{ text: "Quatre étapes," }, { accent: "et aucune surprise." }]}
          />
          <ButtonLink href="/methode" variant="text" className="shrink-0">
            Notre méthode en détail
          </ButtonLink>
        </div>

        <ol className="mt-16 grid gap-px border-y border-line bg-line sm:-mx-6 sm:grid-cols-2 lg:mt-20 lg:grid-cols-4">
          {method.map((step, i) => (
            <li key={step.number} className="bg-canvas py-8 sm:px-6 sm:py-10">
              <div data-reveal style={delay(i * 90)}>
                <span className="label text-accent">{step.number}</span>
                <p className="display-sm mt-6">{step.title}</p>
                <p className="mt-4 text-[0.9375rem] leading-relaxed text-fg-2">{step.summary}</p>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}

/* ==========================================================================
   Section 7 — Plus qu'un site
   ========================================================================== */

const problems: { quote: string; slug: string }[] = [
  { quote: "Nous perdons des demandes.", slug: "suivi-demandes-devis" },
  { quote: "Nos réservations sont gérées à la main.", slug: "reservation-en-ligne" },
  { quote: "Nos clients ne savent pas quoi faire ensuite.", slug: "onboarding-client" },
  { quote: "Notre portfolio est éparpillé.", slug: "portfolio-contenu" },
  { quote: "Notre suivi interne est désorganisé.", slug: "suivi-demandes-devis" },
  { quote: "Sur téléphone, c'est compliqué.", slug: "application-mobile" },
];

export function BeyondWebsites() {
  return (
    <Section labelledBy="au-dela-titre">
      <Container>
        <SectionIntro
          number="06"
          label="Au-delà du site"
          id="au-dela-titre"
          className="max-w-4xl"
          lines={[
            { text: "Parfois, le problème n'est pas" },
            { accent: "« il nous faut un site »." },
          ]}
          lead="C'est souvent quelque chose de plus précis. Nous construisons la solution digitale qui y répond — et seulement celle-là."
        />

        <ul className="mt-14 grid gap-px border-y border-line bg-line sm:-mx-6 sm:grid-cols-2 lg:-mx-8 lg:mt-20 lg:grid-cols-3">
          {problems.map((item, i) => {
            const service = serviceBySlug(item.slug)!;
            return (
              <li key={item.quote} className="bg-canvas">
                <Link
                  href={servicePath(item.slug)}
                  data-reveal
                  style={delay((i % 3) * 80)}
                  className="group flex h-full flex-col justify-between gap-8 py-8 sm:px-6 lg:px-8"
                >
                  <p className="accent text-[1.65rem] leading-tight text-fg">« {item.quote} »</p>
                  <span className="flex items-center gap-2 text-[0.875rem] text-fg-2 transition-colors group-hover:text-fg">
                    <span className="label text-accent">{service.number}</span>
                    {service.name}
                    <ArrowRight className="nudge size-4" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-20 grid grid-cols-12 gap-x-4 gap-y-14 sm:gap-x-6 lg:mt-28">
          <Example className="col-span-12 lg:col-span-8" number="02" caption="Suivi des demandes & devis">
            <BrowserFrame
              url="app.thermia-services.fr/demandes"
              width={1280}
              height={800}
              label="Illustration : tableau de suivi des demandes et des devis."
            >
              <QuoteBoardMock />
            </BrowserFrame>
          </Example>
          <Example
            className="col-span-8 col-start-3 sm:col-span-6 sm:col-start-4 lg:col-span-3 lg:col-start-10"
            number="04"
            caption="Réservation en ligne"
          >
            <PhoneFrame label="Illustration : réservation en ligne sur téléphone.">
              <BookingMock />
            </PhoneFrame>
          </Example>
          <Example
            className="col-span-8 col-start-3 sm:col-span-6 sm:col-start-4 lg:col-span-3 lg:col-start-1 lg:-mt-10"
            number="03"
            caption="Application mobile"
          >
            <PhoneFrame label="Illustration : application cliente, prochain rendez-vous et notifications.">
              <AppMock />
            </PhoneFrame>
          </Example>
          <Example className="col-span-12 lg:col-span-8 lg:col-start-5" number="06" caption="Onboarding client">
            <BrowserFrame
              url="espace.cabinet-aurel.fr/bienvenue"
              width={1280}
              height={800}
              label="Illustration : parcours d'accueil d'un nouveau client."
            >
              <OnboardingMock />
            </BrowserFrame>
          </Example>
        </div>
      </Container>
    </Section>
  );
}

function Example({
  number,
  caption,
  className = "",
  children,
}: {
  number: string;
  caption: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <figure data-reveal className={className}>
      {children}
      <figcaption className="label mt-4 flex gap-3 text-fg-3">
        <span className="text-accent">{number}</span>
        {caption} — illustration
      </figcaption>
    </figure>
  );
}

/* ==========================================================================
   Section 8 — Pourquoi AMYN
   ========================================================================== */

export function WhyAmyn() {
  return (
    <Section tone="ink-2" labelledBy="pourquoi-titre">
      <Container className="grid gap-14 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-4">
          <div data-reveal="fade">
            <Label number="07">Pourquoi AMYN</Label>
          </div>
          <Heading
            id="pourquoi-titre"
            size="md"
            className="mt-8"
            lines={[{ text: "Ce que vous pouvez" }, { accent: "attendre de nous." }]}
          />
          <p data-reveal className="mt-8 text-fg-2" style={delay(150)}>
            Pas de chiffres gonflés ni de promesses de classement. Des engagements
            simples, que vous pouvez vérifier à chaque étape.
          </p>
        </div>

        <ul className="grid gap-x-10 border-t border-line sm:grid-cols-2 lg:col-span-7 lg:col-start-6">
          {principles.map((item, i) => (
            <li
              key={item.title}
              data-reveal
              style={delay((i % 2) * 90)}
              className="border-b border-line py-7"
            >
              <p className="title">{item.title}</p>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-fg-2">{item.body}</p>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

/* ==========================================================================
   Section 10 — Appel final
   ========================================================================== */

export function FinalCta({ number }: { number?: string }) {
  return (
    <Section labelledBy="final-titre" className="overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[80%] bg-[radial-gradient(55%_60%_at_50%_100%,rgb(198_167_106/0.08),transparent_70%)]"
      />
      <Container className="relative text-center">
        <div data-reveal="fade" className="flex justify-center">
          <Label number={number}>Commencer</Label>
        </div>
        <Heading
          id="final-titre"
          className="mx-auto mt-8 max-w-5xl"
          lines={[
            { text: "Montrez-nous votre entreprise." },
            { accent: "Nous vous montrerons ce que nous améliorerions." },
          ]}
        />
        <p data-reveal className="lead mx-auto mt-8 max-w-2xl text-fg-2" style={delay(150)}>
          Un site, un parcours client, une réservation, un portfolio ou un processus
          interne : commencez par nous montrer votre situation actuelle.
        </p>

        <div
          data-reveal
          style={delay(250)}
          className="mt-11 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4"
        >
          <ButtonLink href={cta.firstLook.href}>{cta.firstLook.label}</ButtonLink>
          <ButtonLink href={cta.project.href} variant="secondary">
            {cta.project.label}
          </ButtonLink>
        </div>

        <a
          href={`mailto:${site.email}`}
          data-reveal
          style={delay(320)}
          className="mt-10 inline-flex min-h-11 items-center gap-2.5 text-fg-2 transition-colors hover:text-fg"
        >
          <Mail className="size-4" />
          <span className="link-line">{site.email}</span>
        </a>
      </Container>
    </Section>
  );
}
