import Link from "next/link";
import { Accordion } from "@/components/ui/Accordion";
import { Atmosphere } from "@/components/ui/Ambient";
import { ButtonLink } from "@/components/ui/Button";
import { ArrowUpRight, Check } from "@/components/ui/Icons";
import { Container, Heading, Label, Section, delay } from "@/components/ui/Layout";
import type { Locale } from "@/lib/i18n/config";
import { href, servicePath } from "@/lib/i18n/routes";
import { getRevenue, type CapabilityKey } from "@/lib/revenue-os";
import { site } from "@/lib/site";
import { LeadStory } from "./LeadStory";
import { ModuleMap } from "./ModuleMap";
import { OpportunityCalculator } from "./OpportunityCalculator";
import { RevenueDashboard } from "./RevenueDashboard";

/**
 * Sections Revenue OS, partagées entre l'accueil et /revenue-os.
 * Même grammaire que le reste du site : repère de chapitre, titre
 * éditorial, coutures lumineuses, apparitions discrètes.
 */

type Props = { locale: Locale; number?: string };

const panel =
  "rounded-[1.5rem] border border-[rgb(242_238_230/0.1)] bg-[linear-gradient(160deg,rgb(242_238_230/0.05),rgb(242_238_230/0.012))] shadow-[0_40px_100px_-50px_rgb(0_0_0/0.9)]";
const tile = "rounded-[var(--radius-md)] border border-line bg-[rgb(242_238_230/0.025)]";

/* --- Transition éditoriale ------------------------------------------------ */

export function SystemStatement({ locale }: Props) {
  const t = getRevenue(locale).statement;
  return (
    <Section labelledBy="rev-statement" className="seam overflow-hidden">
      <Container>
        <p data-reveal className="display-md max-w-4xl text-fg-3">
          {t.a}
        </p>
        <Heading id="rev-statement" size="xl" className="mt-6 max-w-6xl" lines={[{ text: t.b }]} />
        <p data-reveal className="lead mt-10 max-w-2xl text-fg-2">
          {t.body}
        </p>

        {/* Six outils séparés, une seule infrastructure. */}
        <div aria-hidden className="mt-16">
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {t.sources.map((s, i) => (
              <li key={s} data-reveal style={delay(i * 60)} className={`${tile} px-3 py-3 text-center text-[0.8125rem] text-fg-2`}>
                {s}
              </li>
            ))}
          </ul>
          <div className="relative mx-auto h-12 w-[83%] max-sm:hidden">
            {[0, 20, 40, 60, 80, 100].map((x) => (
              <span key={x} className="absolute top-0 h-1/2 w-px bg-gradient-to-b from-line to-gold/60" style={{ left: `${x}%` }} />
            ))}
            <span className="absolute inset-x-0 top-1/2 h-px bg-gold/60" />
            <span className="absolute left-1/2 top-1/2 h-1/2 w-px bg-gold" />
          </div>
          <div className="mt-3 flex justify-center sm:mt-0">
            <span className="inline-flex items-center gap-3 rounded-full border border-gold/60 bg-[rgb(18_16_12/0.9)] px-5 py-2.5 text-[0.9375rem] font-semibold text-fg shadow-[0_0_50px_-12px_rgb(198_167_106/0.5)]">
              <span className="size-2 rounded-full bg-gold" />
              AMYN Revenue OS™
            </span>
          </div>
        </div>
      </Container>
    </Section>
  );
}

/* --- L'offre phare + modules ---------------------------------------------- */

export function FlagshipIntro({ locale, number, withLink = true }: Props & { withLink?: boolean }) {
  const r = getRevenue(locale);
  const t = r.intro;
  return (
    <Section tone="ink-2" labelledBy="rev-flagship" className="seam overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -right-40 top-10 size-[42rem] rounded-full bg-[radial-gradient(closest-side,rgb(198_167_106/0.12),transparent_70%)]" />
      <Container className="relative">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <div data-reveal="fade">
              <Label number={number}>{t.eyebrow}</Label>
            </div>
            <h2 id="rev-flagship" data-reveal className="mt-8 whitespace-nowrap text-[clamp(2.3rem,6vw,5.25rem)] font-semibold leading-[0.92] tracking-[-0.05em] text-fg">
              AMYN Revenue OS<sup className="ml-1 align-super text-[0.3em] font-normal text-gold">™</sup>
            </h2>
            <p data-reveal className="mt-8 max-w-2xl font-serif text-[clamp(1.5rem,2.6vw,2.1rem)] leading-[1.2] text-fg">
              {t.lead}
            </p>
            <p data-reveal className="lead mt-6 max-w-2xl text-fg-2">
              {t.body}
            </p>
            {withLink && (
              <div data-reveal className="mt-10">
                <ButtonLink href={href("revenueOs", locale)} variant="secondary" track="revenue_os_cta_clicked" trackPlace="flagship">
                  {t.cta}
                </ButtonLink>
              </div>
            )}
          </div>
          <div className="self-end lg:col-span-5">
            <ul className="border-t border-line">
              {t.principles.map((p, i) => (
                <li key={p} data-reveal style={delay(i * 70)} className="flex gap-4 border-b border-line py-5 text-[1.05rem] text-fg">
                  <Check className="mt-1.5 size-4 shrink-0 text-gold" />
                  {p}
                </li>
              ))}
            </ul>
            <p data-reveal className="mt-6 text-[1.1rem] font-semibold tracking-[-0.02em] text-gold-2">
              {t.principlesClose}
            </p>
          </div>
        </div>
      </Container>
    </Section>
  );
}

export function ModulesSection({ locale, number }: Props) {
  const t = getRevenue(locale).modules;
  return (
    <Section labelledBy="rev-modules" className="seam">
      <Container>
        <div className="max-w-3xl">
          <div data-reveal="fade">
            <Label number={number}>{t.label}</Label>
          </div>
          <Heading id="rev-modules" className="mt-8" lines={t.title} />
          <p data-reveal className="lead mt-8 text-fg-2">
            {t.intro}
          </p>
        </div>
        <div className="mt-14">
          <ModuleMap t={t} />
        </div>
      </Container>
    </Section>
  );
}

/* --- Le scénario ---------------------------------------------------------- */

export function StorySection({ locale, number }: Props) {
  const t = getRevenue(locale).story;
  return (
    <Section tone="ink-2" labelledBy="rev-story" className="seam">
      <Container>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div data-reveal="fade">
              <Label number={number}>{t.label}</Label>
            </div>
            <Heading id="rev-story" size="xl" className="mt-8" lines={t.title} />
          </div>
          <p data-reveal className="label inline-flex w-fit items-center gap-2 rounded-full border border-gold/40 px-3 py-1.5 text-[0.6875rem] text-gold-2">
            <span aria-hidden className="size-1.5 rounded-full bg-gold" />
            {t.note}
          </p>
        </div>
        <div className="mt-16">
          <LeadStory t={t} />
        </div>
        <p data-reveal className="mt-16 max-w-4xl font-serif text-[clamp(1.8rem,4vw,3.2rem)] leading-[1.1] text-fg">
          {t.close}
        </p>
      </Container>
    </Section>
  );
}

/* --- Le problème ---------------------------------------------------------- */

export function ProblemSection({ locale, number }: Props) {
  const t = getRevenue(locale).problem;
  return (
    <Section labelledBy="rev-problem" className="seam">
      <Container>
        <div className="max-w-4xl">
          <div data-reveal="fade">
            <Label number={number}>{t.label}</Label>
          </div>
          <Heading id="rev-problem" className="mt-8" lines={t.title} />
          <p data-reveal className="mt-6 font-serif text-[clamp(1.5rem,2.6vw,2rem)] text-gold-2">
            {t.lead}
          </p>
        </div>
        <ol className="relative mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-6 lg:gap-2">
          <span aria-hidden className="absolute inset-x-6 top-7 hidden h-px bg-gradient-to-r from-line via-[rgb(220_140_120/0.4)] to-[rgb(220_140_120/0.7)] lg:block" />
          {t.chain.map((c, i) => {
            const last = i === t.chain.length - 1;
            return (
              <li key={c.title} data-reveal style={delay(i * 80)} className="relative">
                <span
                  aria-hidden
                  className={`relative z-10 flex size-14 items-center justify-center rounded-full border font-mono text-[0.8125rem] ${
                    last ? "border-[rgb(220_140_120/0.7)] bg-[rgb(70_26_20)] text-[#f3c0b2]" : "border-line-strong bg-canvas text-fg-3"
                  }`}
                >
                  0{i + 1}
                </span>
                <h3 className={`mt-4 text-[1.05rem] font-semibold tracking-[-0.02em] ${last ? "text-[#f3c0b2]" : "text-fg"}`}>{c.title}</h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-fg-3">{c.body}</p>
              </li>
            );
          })}
        </ol>
        <p data-reveal className="mt-16 max-w-5xl text-[clamp(1.8rem,4.2vw,3.4rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-fg">
          {t.close}
        </p>
      </Container>
    </Section>
  );
}

/* --- Réactivation --------------------------------------------------------- */

export function ReactivationSection({ locale, number }: Props) {
  const t = getRevenue(locale).reactivation;
  return (
    <Section tone="ink-2" labelledBy="rev-reactivation" className="seam">
      <Container className="grid gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-6">
          <div data-reveal="fade">
            <Label number={number}>{t.label}</Label>
          </div>
          <Heading id="rev-reactivation" className="mt-8" lines={t.title} />
          <p data-reveal className="lead mt-8 text-fg-2">
            {t.body}
          </p>
          <p data-reveal className="mt-6 max-w-xl text-[0.9375rem] leading-relaxed text-fg-3">
            {t.compliance}
          </p>
        </div>
        <div className="lg:col-span-5 lg:col-start-8">
          <div className={`${panel} p-5 sm:p-7`}>
            <p className="text-fg-2">{t.lead}</p>
            <ul className="mt-5">
              {t.items.map((item, i) => (
                <li
                  key={item}
                  data-reveal
                  style={delay(i * 70)}
                  className={`flex items-center gap-4 border-b border-line py-4 last:border-0 ${i === 1 ? "text-fg" : "text-fg-2"}`}
                >
                  <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${i === 1 ? "bg-gold shadow-[0_0_14px_3px_rgb(198_167_106/0.5)]" : "border border-line-strong"}`} />
                  <span className="first-letter:uppercase">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </Section>
  );
}

/* --- Vue direction -------------------------------------------------------- */

export function DashboardSection({ locale, number }: Props) {
  const t = getRevenue(locale).dashboard;
  return (
    <Section labelledBy="rev-dashboard" className="seam">
      <Container>
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <div data-reveal="fade">
              <Label number={number}>{t.label}</Label>
            </div>
            <Heading id="rev-dashboard" className="mt-8" lines={t.title} />
          </div>
          <p data-reveal className="text-fg-2 lg:col-span-5">
            {t.lead}
          </p>
        </div>
        <div data-reveal className="mt-14">
          <RevenueDashboard t={t} locale={locale} />
        </div>
      </Container>
    </Section>
  );
}

/* --- Calculateur ---------------------------------------------------------- */

export function CalculatorSection({ locale, number }: Props) {
  const t = getRevenue(locale).calculator;
  return (
    <Section tone="ink-2" id={locale === "fr" ? "calculateur" : "calculator"} labelledBy="rev-calculator" className="seam scroll-mt-[var(--header-h)]">
      <Container>
        <div className="max-w-3xl">
          <div data-reveal="fade">
            <Label number={number}>{t.label}</Label>
          </div>
          <Heading id="rev-calculator" className="mt-8" lines={t.title} />
          <p data-reveal className="lead mt-8 text-fg-2">
            {t.lead}
          </p>
        </div>
        <div className="mt-12">
          <OpportunityCalculator t={t} locale={locale} auditHref={href("revenueAudit", locale)} />
        </div>
      </Container>
    </Section>
  );
}

/* --- Pour qui ------------------------------------------------------------- */

export function AudienceSection({ locale, number }: Props) {
  const t = getRevenue(locale).audience;
  return (
    <Section tone="paper" labelledBy="rev-audience">
      <Container>
        <div data-reveal="fade">
          <Label number={number}>{t.label}</Label>
        </div>
        <Heading id="rev-audience" className="mt-8 max-w-5xl" lines={t.title} />
        <ul className="mt-14 grid border-t border-line sm:grid-cols-2 lg:grid-cols-3">
          {t.sectors.map((s, i) => (
            <li
              key={s}
              data-reveal
              style={delay((i % 3) * 60)}
              className="flex items-baseline gap-4 border-b border-line py-5 text-[clamp(1.15rem,2vw,1.5rem)] font-semibold tracking-[-0.025em] text-fg sm:pr-6"
            >
              <span className="font-mono text-[0.8125rem] font-normal text-accent">{String(i + 1).padStart(2, "0")}</span>
              {s}
            </li>
          ))}
        </ul>
        <p data-reveal className="mt-12 max-w-3xl font-serif text-[clamp(1.5rem,2.6vw,2.1rem)] leading-[1.2] text-fg">
          {t.close}
        </p>
      </Container>
    </Section>
  );
}

/* --- Méthode -------------------------------------------------------------- */

export function ProcessSection({ locale, number }: Props) {
  const t = getRevenue(locale).process;
  return (
    <Section labelledBy="rev-process" className="seam">
      <Container>
        <div data-reveal="fade">
          <Label number={number}>{t.label}</Label>
        </div>
        <Heading id="rev-process" className="mt-8 max-w-4xl" lines={t.title} />
        <ol className="relative mt-14 grid gap-4 lg:grid-cols-4">
          <span aria-hidden className="absolute inset-x-8 top-8 hidden h-px bg-gradient-to-r from-gold/60 via-line to-line lg:block" />
          {t.steps.map((s, i) => (
            <li key={s.title} data-reveal style={delay(i * 80)} className={`${tile} relative p-6 sm:p-7`}>
              <span className="relative z-10 flex size-10 items-center justify-center rounded-full border border-gold/60 bg-canvas font-mono text-[0.8125rem] text-gold">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-6 text-[1.25rem] font-semibold tracking-[-0.025em] text-fg">{s.title}</h3>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-fg-2">{s.body}</p>
              {s.list && (
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {s.list.map((x) => (
                    <li key={x} className="rounded-full border border-line px-2.5 py-1 text-[0.8125rem] text-fg-2">
                      {x}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}

/* --- L'engagement --------------------------------------------------------- */

export function OfferSection({ locale, number }: Props) {
  const r = getRevenue(locale);
  const t = r.offer;
  const m = r.management;
  return (
    <Section tone="ink-2" id={locale === "fr" ? "engagement" : "engagement"} labelledBy="rev-offer" className="seam scroll-mt-[var(--header-h)] overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -left-40 bottom-0 size-[40rem] rounded-full bg-[radial-gradient(closest-side,rgb(198_167_106/0.1),transparent_70%)]" />
      <Container className="relative">
        <div data-reveal="fade">
          <Label number={number}>{t.label}</Label>
        </div>
        <div className={`${panel} mt-10 grid gap-10 p-6 sm:p-10 lg:grid-cols-12 lg:gap-12 lg:p-14`}>
          <div className="lg:col-span-5">
            <h2 id="rev-offer" className="whitespace-nowrap text-[clamp(1.9rem,3.5vw,3.1rem)] font-semibold leading-[0.95] tracking-[-0.045em] text-fg">
              AMYN Revenue OS<sup className="ml-1 align-super text-[0.35em] font-normal text-gold">™</sup>
            </h2>
            <p className="mt-3 font-serif text-[1.5rem] text-fg-2">{t.subtitle}</p>
            <div className="mt-10 border-t border-line pt-8">
              <p className="label text-fg-3">{t.priceLead}</p>
              <p className="mt-2 text-[clamp(2.6rem,6vw,4rem)] font-semibold leading-none tracking-[-0.04em] text-fg">{t.price}</p>
              <p className="mt-3 text-[0.875rem] text-fg-3">{t.tax}</p>
            </div>
            <p className="mt-8 text-fg-2">{t.intro}</p>
            <div className="mt-10">
              <ButtonLink href={href("revenueAudit", locale)} className="!min-h-14 !px-7 text-[1rem]" track="revenue_audit_cta_clicked" trackPlace="offer">
                {t.cta}
              </ButtonLink>
            </div>
            <p className="mt-5 max-w-sm text-[0.875rem] leading-relaxed text-fg-3">{t.micro}</p>
          </div>
          <div className="lg:col-span-7">
            <p className="label text-fg-3">{t.includesTitle}</p>
            <ul className="mt-5 grid gap-x-8 sm:grid-cols-2">
              {t.includes.map((item) => (
                <li key={item} className="flex gap-3 border-b border-line py-3.5 text-[0.9375rem] text-fg">
                  <Check className="mt-1 size-3.5 shrink-0 text-gold" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-4 grid gap-6 rounded-[1.5rem] border border-line p-6 sm:p-10 lg:grid-cols-12 lg:items-center lg:gap-12">
          <div className="lg:col-span-5">
            <p className="label text-gold">{m.label}</p>
            <h3 className="mt-4 text-[clamp(1.6rem,3vw,2.2rem)] font-semibold tracking-[-0.035em] text-fg">{m.title}</h3>
            <p className="mt-4 text-fg-2">{m.body}</p>
          </div>
          <div className="lg:col-span-7">
            <ul className="flex flex-wrap gap-2">
              {m.items.map((x) => (
                <li key={x} className="rounded-full border border-line-strong px-4 py-2 text-[0.9375rem] text-fg first-letter:uppercase">
                  {x}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[0.9375rem] text-fg-3">{m.note}</p>
          </div>
        </div>
      </Container>
    </Section>
  );
}

/* --- Au-delà de Revenue OS ------------------------------------------------ */

const CAPABILITY_HREF: Record<CapabilityKey, (l: Locale) => string> = {
  websites: (l) => servicePath("site-web", l),
  webapps: (l) => servicePath("suivi-demandes-devis", l),
  mobile: (l) => servicePath("application-mobile", l),
  ai: (l) => href("revenueOs", l),
  products: (l) => href("work", l),
  growth: (l) => servicePath("google-business", l),
};

export function CapabilitiesSection({ locale, number }: Props) {
  const t = getRevenue(locale).capabilities;
  const keys = Object.keys(t.items) as CapabilityKey[];
  return (
    <Section labelledBy="rev-capabilities" className="seam">
      <Container>
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <div data-reveal="fade">
              <Label number={number}>{t.label}</Label>
            </div>
            <Heading id="rev-capabilities" className="mt-8" lines={t.title} />
          </div>
          <div className="lg:col-span-4">
            <p data-reveal className="text-fg-2">
              {t.lead}
            </p>
            <div data-reveal className="mt-6">
              <ButtonLink href={href("services", locale)} variant="text">
                {t.more}
              </ButtonLink>
            </div>
          </div>
        </div>
        <ul className="mt-14 grid gap-px overflow-hidden rounded-[var(--radius-md)] border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {keys.map((k, i) => (
            <li key={k} data-reveal style={delay(i * 50)} className="bg-canvas">
              <Link href={CAPABILITY_HREF[k](locale)} className="group flex h-full flex-col p-6 transition-colors duration-300 hover:bg-[rgb(242_238_230/0.03)] sm:p-8">
                <span className="flex items-start justify-between gap-4">
                  <span className="font-mono text-[0.8125rem] text-gold">{String(i + 1).padStart(2, "0")}</span>
                  <ArrowUpRight className="size-5 text-fg-3 transition-[transform,color] duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-gold" />
                </span>
                <span className="mt-8 text-[1.4rem] font-semibold tracking-[-0.03em] text-fg">{t.items[k].title}</span>
                <span className="mt-3 text-[0.9375rem] leading-relaxed text-fg-2">{t.items[k].body}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

/* --- /revenue-os : architecture, intégrations, sécurité, FAQ ------------- */

export function ArchitectureSection({ locale, number }: Props) {
  const t = getRevenue(locale).page.architecture;
  return (
    <Section tone="ink-2" labelledBy="rev-architecture" className="seam">
      <Container>
        <div data-reveal="fade">
          <Label number={number}>{t.label}</Label>
        </div>
        <Heading id="rev-architecture" className="mt-8 max-w-4xl" lines={t.title} />
        <ol className="mt-14 grid gap-3 lg:grid-cols-4">
          {t.layers.map((layer, i) => {
            const core = i === 1;
            return (
              <li
                key={layer.name}
                data-reveal
                style={delay(i * 80)}
                className={`relative rounded-[var(--radius-md)] border p-6 ${core ? "border-gold/60 bg-[linear-gradient(160deg,rgb(198_167_106/0.14),rgb(14_14_14/0.8))] shadow-[0_0_60px_-20px_rgb(198_167_106/0.5)]" : "border-line bg-[rgb(242_238_230/0.025)]"}`}
              >
                <p className={`label ${core ? "text-gold-2" : "text-fg-3"}`}>
                  {String(i + 1).padStart(2, "0")} · {layer.name}
                </p>
                <ul className="mt-5 space-y-2">
                  {layer.items.map((x) => (
                    <li key={x} className={`rounded-[var(--radius-sm)] border px-3 py-2 text-[0.9375rem] ${core ? "border-gold/30 text-fg" : "border-line text-fg-2"}`}>
                      {x}
                    </li>
                  ))}
                </ul>
                {i < t.layers.length - 1 && (
                  <span aria-hidden className="absolute -bottom-3 left-1/2 z-10 flex size-6 -translate-x-1/2 items-center justify-center rounded-full border border-line bg-canvas text-[0.75rem] text-gold lg:-right-3 lg:bottom-auto lg:left-auto lg:top-1/2 lg:-translate-y-1/2 lg:translate-x-0">
                    <span className="lg:hidden">↓</span>
                    <span className="hidden lg:inline">→</span>
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </Container>
    </Section>
  );
}

export function IntegrationsSection({ locale, number }: Props) {
  const t = getRevenue(locale).integrations;
  return (
    <Section labelledBy="rev-integrations" className="seam">
      <Container className="grid gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-5">
          <div data-reveal="fade">
            <Label number={number}>{t.label}</Label>
          </div>
          <Heading id="rev-integrations" size="md" className="mt-8" lines={t.title} />
          <p data-reveal className="mt-8 text-fg-2">
            {t.lead}
          </p>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2 lg:col-span-7 lg:grid-cols-3">
          {t.categories.map(([name, examples], i) => (
            <li key={name} data-reveal style={delay((i % 3) * 50)} className={`${tile} p-5`}>
              <p className="font-semibold tracking-[-0.02em] text-fg">{name}</p>
              <p className="mt-2 text-[0.875rem] leading-relaxed text-fg-3">{examples}</p>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

export function SecuritySection({ locale, number }: Props) {
  const t = getRevenue(locale).security;
  return (
    <Section tone="ink-2" labelledBy="rev-security" className="seam">
      <Container className="grid gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-5">
          <div data-reveal="fade">
            <Label number={number}>{t.label}</Label>
          </div>
          <Heading id="rev-security" size="md" className="mt-8" lines={t.title} />
        </div>
        <ul className="border-t border-line lg:col-span-7">
          {t.items.map((item, i) => (
            <li key={item.title} data-reveal style={delay(i * 50)} className="grid gap-2 border-b border-line py-6 sm:grid-cols-[13rem_1fr] sm:gap-8">
              <h3 className="font-semibold tracking-[-0.02em] text-fg">{item.title}</h3>
              <p className="text-[0.9375rem] leading-relaxed text-fg-2">{item.body}</p>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

export function RevenueFaq({ locale, number, items, title }: Props & { items?: { q: string; a: string }[]; title?: ReturnType<typeof getRevenue>["faq"]["title"] }) {
  const t = getRevenue(locale).faq;
  return (
    <Section labelledBy="rev-faq" className="seam">
      <Container className="grid gap-12 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-4">
          <div data-reveal="fade">
            <Label number={number}>{t.label}</Label>
          </div>
          <Heading id="rev-faq" size="md" className="mt-8" lines={title ?? t.title} />
          <p data-reveal className="mt-8 text-fg-2">
            <a href={`mailto:${site.email}?subject=Revenue%20OS`} className="text-fg underline underline-offset-4">
              {site.email}
            </a>
          </p>
        </div>
        <div className="lg:col-span-7 lg:col-start-6">
          <Accordion items={items ?? t.items} />
        </div>
      </Container>
    </Section>
  );
}

/* --- Appel final ---------------------------------------------------------- */

export function RevenueFinale({ locale, number }: Props) {
  const r = getRevenue(locale);
  const t = r.finale;
  return (
    <Section labelledBy="rev-finale" className="seam overflow-hidden">
      <Atmosphere variant="finale" />
      <Container className="relative text-center">
        <div data-reveal="fade" className="flex justify-center">
          <Label number={number}>{t.label}</Label>
        </div>
        <Heading id="rev-finale" size="xl" className="mx-auto mt-8 max-w-5xl" lines={t.title} />
        <p data-reveal className="lead mx-auto mt-8 max-w-2xl text-fg-2" style={delay(150)}>
          {t.lead}
        </p>
        <div data-reveal style={delay(250)} className="mt-11 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <ButtonLink href={href("revenueAudit", locale)} className="!min-h-16 !px-9 text-[1.05rem]" track="revenue_audit_cta_clicked" trackPlace="finale">
            {r.offer.cta}
          </ButtonLink>
          <a href={`mailto:${site.email}`} className="inline-flex min-h-11 items-center gap-2 px-3 text-fg-3 transition-colors hover:text-fg">
            {site.email}
          </a>
        </div>
      </Container>
    </Section>
  );
}
