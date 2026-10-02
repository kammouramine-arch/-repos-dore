import { PageHero } from "@/components/layout/PageHero";
import { CapacityCalculator } from "@/components/proofsprint/demo/CapacityCalculator";
import { EvidenceMatrix } from "@/components/proofsprint/demo/EvidenceMatrix";
import { SourceList } from "@/components/proofsprint/demo/SourceList";
import { StatusBadge } from "@/components/proofsprint/demo/StatusBadge";
import { ButtonLink } from "@/components/ui/Button";
import { Container, Heading, Label, Section, delay } from "@/components/ui/Layout";
import type { Locale } from "@/lib/i18n/config";
import { href, routeAlternates } from "@/lib/i18n/routes";
import { getUi } from "@/lib/i18n/ui";
import { STATUSES, countByStatus, demoFiles, evidence, getDemo } from "@/lib/proofsprint-demo";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export function proofSprintDemoMetadata(locale: Locale) {
  const t = getDemo(locale).meta;
  return pageMetadata({
    title: t.title,
    description: t.description,
    locale,
    alternates: routeAlternates("proofsprintDemo"),
  });
}

const card = "rounded-[var(--radius-md)] border border-line bg-[rgb(242_238_230/0.025)] p-6 sm:p-7";

/**
 * Démonstration ProofSprint — le paquet fourni (20 questions, 8 sources
 * fictives) rendu avec les composants du site. Avertissement « fictif »
 * en tête, réponses négatives et preuves manquantes visibles, calculateur
 * transparent, et retour vers l'offre et son formulaire de contact.
 */
export function ProofSprintDemoPage({ locale }: { locale: Locale }) {
  const t = getDemo(locale);
  const nav = getUi(locale).nav;
  const offer = href("proofsprint", locale);
  const files = demoFiles(locale);
  const open = evidence.responses.filter((r) => r.status !== "supported");

  return (
    <>
      <PageHero
        locale={locale}
        crumbs={[
          { name: nav.proofsprint, path: offer },
          { name: t.crumb, path: href("proofsprintDemo", locale) },
        ]}
        label={t.label}
        lines={[{ text: t.title }]}
        size="lg"
        lead={t.intro}
      >
        <div role="note" className="max-w-2xl rounded-[var(--radius-md)] border border-gold/50 bg-[rgb(198_167_106/0.08)] p-5 sm:p-6">
          <p className="label flex items-center gap-2 text-gold-2">
            <span aria-hidden className="size-1.5 rounded-full bg-gold" />
            {t.noticeTitle}
          </p>
          <p className="mt-3 text-fg">{t.notice}</p>
          <p className="mt-2 text-[0.9375rem] text-fg-2">{evidence.scenario[locale]}</p>
          <p className="mt-2 text-[0.9375rem] text-fg-2">{t.publicNotice}</p>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <ButtonLink href={`#${t.anchor.matrix}`} className="!min-h-14 !px-7 text-[1rem]">
            {t.matrix.label}
          </ButtonLink>
          <ButtonLink href={offer} variant="secondary" className="!min-h-14">
            {t.backToOffer}
          </ButtonLink>
        </div>
      </PageHero>

      {/* Vue d'ensemble */}
      <Section tone="ink-2" labelledBy="demo-vue-titre" className="seam">
        <Container>
          <div data-reveal="fade">
            <Label>{t.overview.label}</Label>
          </div>
          <Heading id="demo-vue-titre" size="md" className="mt-8 max-w-3xl" lines={[{ text: t.overview.title }]} />
          <ul className="mt-12 grid gap-4 sm:grid-cols-3">
            {STATUSES.map((s, i) => (
              <li key={s} data-reveal style={delay(i * 60)} className={card}>
                <p className="text-[clamp(2.4rem,5vw,3.2rem)] font-semibold leading-none tracking-[-0.04em] text-fg">
                  {countByStatus(s)}
                </p>
                <div className="mt-4">
                  <StatusBadge status={s} label={t.status[s]} />
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {[t.overview.before, t.overview.after, t.overview.unproven].map(([title, body], i) => (
              <div key={title} data-reveal style={delay(i * 60)} className={card}>
                <h3 className="text-[1.1rem] font-semibold tracking-[-0.02em] text-fg">{title}</h3>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-fg-2">{body}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* 01 · Matrice */}
      <Section id={t.anchor.matrix} labelledBy="demo-matrice-titre" className="seam scroll-mt-[var(--header-h)]">
        <Container>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div data-reveal="fade">
                <Label number="01">{t.matrix.label}</Label>
              </div>
              <h2 id="demo-matrice-titre" className="sr-only">
                {t.matrix.label}
              </h2>
              <p data-reveal className="lead mt-8 text-fg-2">
                {t.matrix.note}
              </p>
            </div>
            <a
              href={files.matrix}
              download={t.files.matrix}
              className="inline-flex min-h-11 items-center gap-2 self-start rounded-full border border-line-strong px-5 text-[0.9375rem] text-fg transition-colors hover:border-gold lg:self-auto"
            >
              <span aria-hidden>↓</span>
              {t.matrix.download}
            </a>
          </div>
          <div className="mt-10">
            <EvidenceMatrix locale={locale} />
          </div>
        </Container>
      </Section>

      {/* 02 · Sources */}
      <Section tone="ink-2" id={t.anchor.sources} labelledBy="demo-sources-titre" className="seam scroll-mt-[var(--header-h)]">
        <Container className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <div data-reveal="fade">
              <Label number="02">{t.sources.label}</Label>
            </div>
            <h2 id="demo-sources-titre" className="sr-only">
              {t.sources.label}
            </h2>
            <p data-reveal className="mt-8 text-fg-2">
              {t.sources.note}
            </p>
            <a
              href={files.sources}
              download={t.files.sources}
              className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong px-5 text-[0.9375rem] text-fg transition-colors hover:border-gold"
            >
              <span aria-hidden>↓</span>
              {t.sources.download}
            </a>
          </div>
          <div className="lg:col-span-8">
            <SourceList locale={locale} />
          </div>
        </Container>
      </Section>

      {/* 03 · Espace acheteur */}
      <Section labelledBy="demo-espace-titre" className="seam">
        <Container>
          <div data-reveal="fade">
            <Label number="03">{t.room.label}</Label>
          </div>
          <h2 id="demo-espace-titre" className="sr-only">
            {t.room.label}
          </h2>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {t.room.items.map(([title, body], i) => (
              <li key={title} data-reveal style={delay(i * 50)} className={card}>
                <h3 className="text-[1.1rem] font-semibold tracking-[-0.02em] text-fg">{title}</h3>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-fg-2">{body}</p>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* 04 · Mise en œuvre et questions ouvertes */}
      <Section tone="ink-2" labelledBy="demo-plan-titre" className="seam">
        <Container>
          <div data-reveal="fade">
            <Label number="04">{t.plan.label}</Label>
          </div>
          <h2 id="demo-plan-titre" className="sr-only">
            {t.plan.label}
          </h2>
          <div data-reveal className={`${card} mt-10 border-gold/40`}>
            <h3 className="text-[1.1rem] font-semibold tracking-[-0.02em] text-fg">{t.plan.pilotTitle}</h3>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-fg-2">{t.plan.pilot}</p>
          </div>
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {open.map((r) => (
              <li key={r.id} className={card}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-semibold tracking-[-0.02em] text-fg">
                    <span className="font-mono text-gold">{r.id}</span> · {r.question[locale]}
                  </h3>
                  <StatusBadge status={r.status} label={t.status[r.status]} />
                </div>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-fg-2">{r.answer[locale]}</p>
              </li>
            ))}
          </ul>
          <p data-reveal className="mt-6 max-w-3xl text-[0.9375rem] leading-relaxed text-fg-3">
            {t.plan.owners}
          </p>
        </Container>
      </Section>

      {/* 05 · Calculateur */}
      <Section id={t.anchor.calculator} labelledBy="demo-calcul-titre" className="seam scroll-mt-[var(--header-h)]">
        <Container>
          <div className="max-w-3xl">
            <div data-reveal="fade">
              <Label number="05">{t.calc.label}</Label>
            </div>
            <h2 id="demo-calcul-titre" className="sr-only">
              {t.calc.label}
            </h2>
            <p data-reveal className="lead mt-8 text-fg-2">
              {t.calc.note}
            </p>
          </div>
          <div className="mt-10">
            <CapacityCalculator locale={locale} />
          </div>
        </Container>
      </Section>

      {/* 06 · Acceptation */}
      <Section tone="ink-2" labelledBy="demo-acceptation-titre" className="seam">
        <Container className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <div data-reveal="fade">
              <Label number="06">{t.accept.label}</Label>
            </div>
            <h2 id="demo-acceptation-titre" className="sr-only">
              {t.accept.label}
            </h2>
          </div>
          <ul className="border-t border-line lg:col-span-8">
            {t.accept.items.map((item, i) => (
              <li key={item} data-reveal style={delay(i * 50)} className="flex gap-4 border-b border-line py-5 text-fg-2">
                <span aria-hidden className="mt-1 size-4 shrink-0 rounded-[var(--radius-xs)] border border-line-strong" />
                {item}
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* Prix et contact */}
      <Section labelledBy="demo-suite-titre" className="seam">
        <Container className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-6">
            <div data-reveal="fade">
              <Label>{t.closing.label}</Label>
            </div>
            <Heading id="demo-suite-titre" size="md" className="mt-8" lines={[{ text: t.closing.title }]} />
          </div>
          <div className="lg:col-span-6">
            <p data-reveal className="text-fg-2">
              {t.closing.priceNote}
            </p>
            <p data-reveal className="mt-4 text-[0.9375rem] text-fg-3">
              {t.languageNote}
            </p>
            <div data-reveal className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink href={`${offer}#contact`} className="!min-h-14 !px-7 text-[1rem]">
                {t.contact}
              </ButtonLink>
              <ButtonLink href={offer} variant="secondary" className="!min-h-14">
                {t.backToOffer}
              </ButtonLink>
            </div>
            <p className="mt-8 text-[0.875rem] text-fg-3">
              <a href={`mailto:${site.email}?subject=ProofSprint`} className="underline underline-offset-4 hover:text-fg">
                {site.email}
              </a>
            </p>
            <p className="mt-6 text-[0.8125rem] leading-relaxed text-fg-3">{t.footer}</p>
          </div>
        </Container>
      </Section>
    </>
  );
}
