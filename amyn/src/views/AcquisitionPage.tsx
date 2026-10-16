import Link from "next/link";
import { FirstLookForm } from "@/components/forms/FirstLookForm";
import { PageHero } from "@/components/layout/PageHero";
import { ButtonLink } from "@/components/ui/Button";
import { ArrowUpRight, Check } from "@/components/ui/Icons";
import { JsonLd } from "@/components/ui/JsonLd";
import { Container, Heading, Label, Section, delay } from "@/components/ui/Layout";
import { ACQUISITION_SLUG, getAcquisition, type AcquisitionCopy } from "@/lib/acquisition";
import type { Locale } from "@/lib/i18n/config";
import { href, routeAlternates } from "@/lib/i18n/routes";
import { getUi } from "@/lib/i18n/ui";
import { acquisitionSchema, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export function acquisitionMetadata(locale: Locale) {
  const t = getAcquisition(locale).meta;
  return pageMetadata({ title: t.title, description: t.description, locale, alternates: routeAlternates("acquisition") });
}

/* Ancres stables (boutons du hero, liens directs). */
const APPROACH = { fr: "approche", en: "approach" } as const;
const PROJECT = { fr: "projet", en: "project" } as const;

/**
 * Acquisition & Conversion Express — même grammaire que les autres pages :
 * hero avec visuel, constat, approche en quatre étapes reliées, périmètre,
 * investissement, puis le formulaire de projet existant (service pré-coché).
 * Aucun chiffre de résultat, aucune promesse.
 */
export function AcquisitionPage({ locale }: { locale: Locale }) {
  const t = getAcquisition(locale);
  const nav = getUi(locale).nav;
  const approach = APPROACH[locale];
  const project = PROJECT[locale];
  const n = (i: number) => String(i + 1).padStart(2, "0");

  return (
    <>
      <JsonLd data={acquisitionSchema(locale)} />

      <PageHero
        locale={locale}
        crumbs={[{ name: nav.acquisition, path: href("acquisition", locale) }]}
        label={t.hero.eyebrow}
        lines={t.hero.title}
        size="lg"
        lead={t.hero.lead}
        aside={<InquiryVisual t={t.visual} />}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <ButtonLink href={`#${approach}`} className="!min-h-14 !px-7 text-[1rem]">
            {t.hero.primary}
          </ButtonLink>
          <a
            href={`#${project}`}
            data-track="contact_initiated"
            data-track-place="acquisition_hero"
            className="group inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-gold/60 px-7 text-[1rem] font-medium text-fg transition-colors hover:border-gold hover:bg-[rgb(198_167_106/0.08)]"
          >
            {t.hero.secondary}
            <ArrowUpRight className="size-4 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
        </div>
        <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[0.875rem] text-fg-3">
          {t.hero.facts.map((fact) => (
            <li key={fact} className="flex items-center gap-2">
              <Check className="size-3.5 text-gold" />
              {fact}
            </li>
          ))}
        </ul>
      </PageHero>

      {/* Le constat */}
      <Section tone="ink-2" labelledBy="acq-problem" className="seam">
        <Container>
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-7">
              <div data-reveal="fade">
                <Label number="02">{t.problem.label}</Label>
              </div>
              <Heading id="acq-problem" className="mt-8" lines={t.problem.title} />
            </div>
            <p data-reveal className="self-end font-serif text-[clamp(1.3rem,2.2vw,1.7rem)] leading-snug text-fg-2 lg:col-span-5">
              {t.problem.lead}
            </p>
          </div>
          <ol className="mt-16 grid gap-px overflow-hidden border-y border-line bg-line md:grid-cols-3">
            {t.problem.items.map((item, i) => (
              <li key={item.title} data-reveal style={delay(i * 90)} className="bg-canvas py-8 md:px-8 md:first:pl-0 md:last:pr-0">
                <span className="font-mono text-[0.8125rem] text-gold">{n(i)}</span>
                <h3 className="mt-5 text-[1.35rem] font-semibold leading-tight tracking-[-0.025em] text-fg">{item.title}</h3>
                <p className="mt-3 max-w-sm leading-relaxed text-fg-2">{item.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      {/* L'approche : quatre étapes reliées */}
      <Section id={approach} labelledBy="acq-approach" className="seam">
        <Container>
          <div className="max-w-3xl">
            <div data-reveal="fade">
              <Label number="03">{t.solution.label}</Label>
            </div>
            <Heading id="acq-approach" className="mt-8" lines={t.solution.title} />
            <p data-reveal className="lead mt-8 text-fg-2">
              {t.solution.lead}
            </p>
          </div>
          <ol className="relative mt-16 grid gap-10 pl-10 lg:grid-cols-4 lg:gap-8 lg:pl-0">
            {/* Le fil qui relie les étapes : il se trace à l'arrivée, puis une lumière le parcourt. */}
            <span aria-hidden data-reveal="fade" className="acq-line acq-line-v absolute bottom-3 left-[0.6875rem] top-3 w-px lg:hidden" />
            <span aria-hidden data-reveal="fade" className="acq-line acq-line-h absolute left-3 right-3 top-[0.6875rem] hidden h-px lg:block" />
            {t.solution.stages.map((s, i) => (
              <li key={s.title} data-reveal style={delay(200 + i * 160)} className="relative">
                <span
                  aria-hidden
                  className="absolute -left-10 top-0 flex size-[1.4rem] items-center justify-center rounded-full border border-gold bg-canvas shadow-[0_0_24px_-4px_rgb(198_167_106/0.6)] lg:static"
                >
                  <span className="size-1.5 rounded-full bg-gold" />
                </span>
                <p className="font-mono text-[0.8125rem] text-gold lg:mt-7">{n(i)}.</p>
                <h3 className="mt-2 font-serif text-[clamp(1.8rem,3vw,2.4rem)] leading-none text-fg">{s.title}</h3>
                <p className="mt-4 max-w-xs leading-relaxed text-fg-2">{s.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      {/* Le périmètre */}
      <Section tone="paper" labelledBy="acq-included">
        <Container>
          <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <div data-reveal="fade">
                <Label number="04">{t.included.label}</Label>
              </div>
              <Heading id="acq-included" className="mt-8" lines={t.included.title} />
            </div>
            <p data-reveal className="text-fg-2 lg:col-span-5">
              {t.included.lead}
            </p>
          </div>
          <ul className="mt-14 grid border-t border-line md:grid-cols-2 md:gap-x-12">
            {t.included.items.map((item, i) => (
              <li key={item.title} data-reveal style={delay((i % 2) * 70)} className="grid grid-cols-[2.5rem_1fr] gap-x-4 border-b border-line py-6">
                <span className="pt-1 font-mono text-[0.8125rem] text-accent">{n(i)}</span>
                <span>
                  <span className="block text-[1.2rem] font-semibold tracking-[-0.02em] text-fg">{item.title}</span>
                  <span className="mt-1.5 block text-[0.9375rem] leading-relaxed text-fg-2">{item.body}</span>
                </span>
              </li>
            ))}
          </ul>
          <p data-reveal className="mt-8 font-serif text-[1.3rem] text-fg">
            {t.included.also}
          </p>
        </Container>
      </Section>

      {/* L'investissement */}
      <Section tone="ink-2" labelledBy="acq-pricing" className="seam overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -right-40 top-0 size-[38rem] rounded-full bg-[radial-gradient(closest-side,rgb(198_167_106/0.1),transparent_70%)]" />
        <Container className="relative">
          <div data-reveal="fade">
            <Label number="05">{t.pricing.label}</Label>
          </div>
          <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-6">
              <Heading id="acq-pricing" lines={t.pricing.title} />
              <p data-reveal className="lead mt-8 max-w-xl text-fg-2">
                {t.pricing.body}
              </p>
              <p data-reveal className="mt-6 max-w-xl text-[0.9375rem] leading-relaxed text-fg-3">
                {t.pricing.honest}
              </p>
            </div>
            <div data-reveal className="lg:col-span-5 lg:col-start-8">
              <div className="border-y border-gold/40 py-8">
                <p className="label text-fg-3">{t.pricing.from}</p>
                <p className="mt-3 text-[clamp(3.2rem,7vw,5rem)] font-semibold leading-none tracking-[-0.045em] text-fg">{t.pricing.price}</p>
                <p className="mt-4 font-serif text-[1.35rem] text-fg">{t.pricing.kind}</p>
                <p className="mt-3 text-[0.8125rem] leading-relaxed text-fg-3">{t.pricing.tax}</p>
              </div>
              <p className="mt-6 text-[0.9375rem] text-fg-2">{t.pricing.audience}</p>
              <div className="mt-8">
                <ButtonLink href={`#${project}`} className="!min-h-14 !px-7 text-[1rem]">
                  {t.pricing.cta}
                </ButtonLink>
              </div>
              <p className="mt-8 text-[0.9375rem] text-fg-3">
                {t.pricing.beyond}{" "}
                <Link href={href("revenueOs", locale)} className="text-fg underline underline-offset-4 hover:text-gold-2">
                  {t.pricing.beyondLink}
                </Link>
              </p>
            </div>
          </div>
        </Container>
      </Section>

      {/* Le projet : formulaire existant, service pré-coché */}
      <Section id={project} labelledBy="acq-project" className="seam">
        <Container className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <div data-reveal="fade">
              <Label number="06">{t.finale.label}</Label>
            </div>
            <Heading id="acq-project" className="mt-8" lines={t.finale.title} />
            <p data-reveal className="lead mt-8 text-fg-2">
              {t.finale.lead}
            </p>
            <div data-reveal className="mt-10 lg:hidden">
              <ButtonLink href="#acq-form" className="!min-h-14 !px-7 text-[1rem]">
                {t.finale.primary}
              </ButtonLink>
            </div>
            <p data-reveal className="mt-10 text-fg-3">
              {t.finale.orEmail}{" "}
              <a href={`mailto:${site.email}?subject=${encodeURIComponent(t.name)}`} className="text-fg underline underline-offset-4">
                {site.email}
              </a>
            </p>
          </div>
          <div id="acq-form" className="lg:col-span-7">
            <div className="rounded-[1.5rem] border border-[rgb(242_238_230/0.1)] bg-[linear-gradient(160deg,rgb(242_238_230/0.05),rgb(242_238_230/0.015))] p-5 shadow-[0_40px_100px_-50px_rgb(0_0_0/0.9)] sm:p-10">
              <p className="label mb-6 flex items-center gap-2 text-gold">
                <span aria-hidden className="size-1.5 rounded-full bg-gold" />
                {t.finale.primary}
              </p>
              <FirstLookForm locale={locale} service={ACQUISITION_SLUG} />
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}

/** Visuel du hero : une demande qualifiée, et ce qui se passe ensuite. Illustratif. */
function InquiryVisual({ t }: { t: AcquisitionCopy["visual"] }) {
  return (
    <figure className="relative rounded-[1.5rem] border border-[rgb(242_238_230/0.1)] bg-[linear-gradient(160deg,rgb(242_238_230/0.055),rgb(242_238_230/0.012))] p-5 shadow-[0_40px_100px_-50px_rgb(0_0_0/0.9)] sm:p-7">
      <figcaption className="label inline-flex items-center gap-2 rounded-full border border-gold/40 px-3 py-1 text-[0.6875rem] text-gold-2">
        <span aria-hidden className="size-1.5 rounded-full bg-gold" />
        {t.label}
      </figcaption>
      <div className="mt-5 rounded-[var(--radius-md)] border border-gold/40 bg-[rgb(14_14_14/0.82)] p-4">
        <p className="flex items-center gap-2.5">
          <span aria-hidden className="relative flex size-2.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-gold/60 motion-reduce:hidden" />
            <span className="relative size-2.5 rounded-full bg-gold" />
          </span>
          <span className="text-[0.9375rem] font-medium text-fg">{t.title}</span>
        </p>
        <p className="mt-1 pl-5 text-[0.75rem] text-fg-3">{t.source}</p>
        <dl className="mt-4 divide-y divide-line border-t border-line">
          {t.fields.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[8.5rem_1fr] gap-3 py-2.5 text-[0.8125rem] max-sm:grid-cols-1 max-sm:gap-0.5">
              <dt className="text-fg-3">{k}</dt>
              <dd className="text-fg">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <ol className="mt-4 space-y-2.5">
        {t.steps.map((s) => (
          <li key={s} className="flex items-center gap-3 text-[0.875rem] text-fg">
            <span aria-hidden className="flex size-5 items-center justify-center rounded-full bg-gold text-ink">
              <Check className="size-3" />
            </span>
            {s}
          </li>
        ))}
      </ol>
    </figure>
  );
}
