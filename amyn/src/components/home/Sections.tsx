import { AmynMark } from "@/components/layout/Logo";
import { Atmosphere } from "@/components/ui/Ambient";
import { ButtonLink } from "@/components/ui/Button";
import { ArrowRight } from "@/components/ui/Icons";
import { Container, Heading, Label, Section, delay } from "@/components/ui/Layout";
import { BrowserShot, PhoneShot } from "@/components/visuals/Shots";
import { ProjectCard } from "@/components/work/ProjectCard";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { ctas } from "@/lib/i18n/nav";
import { href } from "@/lib/i18n/routes";
import { getMethod, getPrinciples } from "@/lib/method";
import { CONCEPT_NOTICES, projectBySlug } from "@/lib/projects";
import { site } from "@/lib/site";

/* ==========================================================================
   Réalisations
   ========================================================================== */

export function Work({ locale, number }: { locale: Locale; number?: string }) {
  const t = getDictionary(locale).home.work;
  const cta = ctas(locale);
  const [first, second, third] = ["maison-elan", "thermia", "cabinet-aurel"].map(
    (slug) => projectBySlug(slug, locale)!,
  );

  return (
    <Section labelledBy="realisations-titre" className="seam">
      <Container>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div data-reveal="fade">
              <Label number={number}>{t.label}</Label>
            </div>
            <Heading id="realisations-titre" className="mt-7" lines={t.title} />
          </div>
          <ButtonLink href={cta.work.href} variant="secondary" className="self-start lg:self-auto">
            {cta.work.label}
          </ButtonLink>
        </div>

        <div className="mt-14 sm:mt-20">
          <ProjectCard locale={locale} project={first} layout="wide" />
        </div>
        <div className="mt-14 grid gap-14 md:grid-cols-2 md:gap-8 lg:gap-10">
          <ProjectCard locale={locale} project={second} />
          <ProjectCard locale={locale} project={third} />
        </div>

        <p className="label mt-12 max-w-2xl text-bone-3">{CONCEPT_NOTICES[locale]}</p>
      </Container>
    </Section>
  );
}

/* ==========================================================================
   Au-delà du site : les outils, en images
   ========================================================================== */

export function Tools({ locale, number }: { locale: Locale; number?: string }) {
  const t = getDictionary(locale).home.tools;
  return (
    <Section tone="ink-2" labelledBy="outils-titre" className="seam overflow-hidden">
      <Container>
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <div data-reveal="fade">
              <Label number={number}>{t.label}</Label>
            </div>
            <Heading id="outils-titre" className="mt-7" lines={t.title} />
          </div>
          <p data-reveal className="lead text-bone-2 lg:col-span-5">
            {t.lead}
          </p>
        </div>

        <div className="relative mt-14 grid grid-cols-12 items-end gap-4 sm:mt-20 sm:gap-6">
          <figure data-reveal className="col-span-12 lg:col-span-8">
            <BrowserShot id="quote-detail" locale={locale} sizes="(min-width: 1024px) 60vw, 95vw" />
            <figcaption className="label mt-4 text-bone-3">
              <span className="text-gold">02</span> {t.captions[0]}
            </figcaption>
          </figure>
          <figure data-reveal style={delay(120)} className="col-span-6 sm:col-span-4 lg:col-span-2">
            <PhoneShot id="technician" locale={locale} sizes="(min-width: 1024px) 14vw, 45vw" />
            <figcaption className="label mt-4 text-bone-3">
              <span className="text-gold">03</span> {t.captions[1]}
            </figcaption>
          </figure>
          <figure data-reveal style={delay(200)} className="col-span-6 sm:col-span-4 lg:col-span-2">
            <PhoneShot id="booking" locale={locale} sizes="(min-width: 1024px) 14vw, 45vw" />
            <figcaption className="label mt-4 text-bone-3">
              <span className="text-gold">04</span> {t.captions[2]}
            </figcaption>
          </figure>
        </div>
      </Container>
    </Section>
  );
}

/* ==========================================================================
   Méthode
   ========================================================================== */

export function Method({ locale, number }: { locale: Locale; number?: string }) {
  const t = getDictionary(locale).home.method;
  const method = getMethod(locale);
  const principles = getPrinciples(locale);
  return (
    <Section labelledBy="methode-titre" className="seam">
      <Container>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div data-reveal="fade">
              <Label number={number}>{t.label}</Label>
            </div>
            <Heading id="methode-titre" className="mt-7" lines={t.title} />
          </div>
          <ButtonLink href={href("method", locale)} variant="text">
            {t.link}
          </ButtonLink>
        </div>

        <ol className="mt-14 grid gap-4 sm:mt-20 sm:grid-cols-2 lg:grid-cols-4">
          {method.map((step, i) => (
            <li
              key={step.number}
              data-reveal
              style={delay(i * 90)}
              className="lift-card group relative overflow-hidden rounded-[1.25rem] border border-[rgb(242_238_230/0.1)] bg-[rgb(242_238_230/0.025)] p-7"
            >
              <span className="block text-[4.5rem] font-semibold leading-none tracking-[-0.06em] text-transparent [-webkit-text-stroke:1px_rgb(198_167_106/0.55)] transition-colors duration-500 group-hover:text-gold/20">
                {step.number}
              </span>
              <p className="mt-6 text-[1.5rem] font-semibold tracking-[-0.03em] text-bone">{step.title}</p>
              <p className="mt-2 text-[0.9375rem] text-bone-2">{step.summary}</p>
            </li>
          ))}
        </ol>

        <ul
          aria-label={t.commitmentsAria}
          className="mt-4 grid gap-px overflow-hidden rounded-[1.25rem] border border-[rgb(242_238_230/0.1)] bg-[rgb(242_238_230/0.1)] sm:grid-cols-2 lg:grid-cols-4"
        >
          {principles.slice(0, 4).map((p, i) => (
            <li key={p.title} className="bg-[#0d0d0d] px-7 py-6">
              <div data-reveal style={delay(i * 70)}>
                <p className="flex items-center gap-2.5 text-[1.05rem] font-semibold tracking-[-0.02em] text-bone">
                  <span aria-hidden className="size-1.5 rounded-full bg-gold" />
                  {p.title}
                </p>
                <p className="mt-2 text-[0.9375rem] text-bone-3">{p.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

/* ==========================================================================
   Appel final
   ========================================================================== */

export function FinalCta({ locale, number }: { locale: Locale; number?: string }) {
  const t = getDictionary(locale);
  const cta = ctas(locale);
  return (
    <Section labelledBy="final-titre" className="seam overflow-hidden">
      <Atmosphere variant="finale" />
      <AmynMark
        className="pointer-events-none absolute -bottom-24 left-1/2 size-[34rem] -translate-x-1/2 text-[rgb(242_238_230/0.025)]"
        accent="rgb(198 167 106 / 0.1)"
      />
      <Container className="relative text-center">
        <div data-reveal="fade" className="flex justify-center">
          <Label number={number}>{t.home.final.label}</Label>
        </div>
        <Heading
          id="final-titre"
          size="xl"
          className="mx-auto mt-8 max-w-5xl"
          lines={t.home.final.title}
        />
        <p data-reveal className="lead mx-auto mt-8 max-w-xl text-bone-2" style={delay(150)}>
          {t.home.final.lead}
        </p>

        <div data-reveal style={delay(250)} className="mt-11 flex justify-center">
          <ButtonLink href={cta.firstLook.href} className="!min-h-16 !px-9 text-[1.05rem]">
            {cta.firstLook.label}
          </ButtonLink>
        </div>

        <a
          href={`mailto:${site.email}`}
          data-reveal
          style={delay(320)}
          className="mt-8 inline-flex min-h-11 items-center gap-2 text-bone-3 transition-colors hover:text-bone"
        >
          {t.common.or} {site.email}
          <ArrowRight className="size-4" />
        </a>
      </Container>
    </Section>
  );
}
