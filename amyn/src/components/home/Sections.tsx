import { AmynMark } from "@/components/layout/Logo";
import { Atmosphere } from "@/components/ui/Ambient";
import { ButtonLink } from "@/components/ui/Button";
import { ArrowRight } from "@/components/ui/Icons";
import { Container, Heading, Label, Section, delay } from "@/components/ui/Layout";
import { ProjectCard } from "@/components/work/ProjectCard";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { ctas } from "@/lib/i18n/nav";
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
