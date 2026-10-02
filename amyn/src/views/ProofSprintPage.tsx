import { ProofSprintForm } from "@/components/forms/ProofSprintForm";
import { PageHero } from "@/components/layout/PageHero";
import { ProofVisual } from "@/components/proofsprint/ProofVisual";
import { Accordion } from "@/components/ui/Accordion";
import { ButtonLink } from "@/components/ui/Button";
import { Check } from "@/components/ui/Icons";
import { JsonLd } from "@/components/ui/JsonLd";
import { Container, Heading, Label, Section, delay } from "@/components/ui/Layout";
import type { Locale } from "@/lib/i18n/config";
import { href, routeAlternates } from "@/lib/i18n/routes";
import { getUi } from "@/lib/i18n/ui";
import { getProofSprint } from "@/lib/proofsprint";
import { pageMetadata, proofSprintSchema } from "@/lib/seo";
import { site } from "@/lib/site";

export function proofSprintMetadata(locale: Locale) {
  const t = getProofSprint(locale).meta;
  return pageMetadata({
    title: t.title,
    description: t.description,
    locale,
    alternates: routeAlternates("proofsprint"),
  });
}

/* Ancres stables : elles servent aux boutons du hero et aux liens des
   e-mails de prospection (…/proofsprint#contact). */
const ANCHOR = { deliverables: "livrables", contact: "contact" } as const;

/**
 * ProofSprint — page dédiée, même grammaire que les pages de service :
 * hero avec visuel, contexte, livrables, déroulé, public, prix, pourquoi
 * AMYN, questions, contact. Aucun témoignage, logo, chiffre ou résultat :
 * on décrit ce qui est livré et comment.
 */
export function ProofSprintPage({ locale }: { locale: Locale }) {
  const t = getProofSprint(locale);
  const nav = getUi(locale).nav;
  const demo = href("proofsprintDemo", locale);

  return (
    <>
      <JsonLd data={proofSprintSchema(locale)} />

      <PageHero
        locale={locale}
        crumbs={[{ name: nav.proofsprint, path: href("proofsprint", locale) }]}
        label={t.hero.label}
        lines={t.hero.title}
        size="lg"
        lead={t.hero.lead}
        aside={<ProofVisual t={t.visual} />}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <ButtonLink href={`#${ANCHOR.contact}`} className="!min-h-14 !px-7 text-[1rem]">
            {t.hero.primary}
          </ButtonLink>
          <ButtonLink href={demo} variant="secondary" className="!min-h-14 border-gold/60">
            {t.demo.cta}
          </ButtonLink>
          <ButtonLink href={`#${ANCHOR.deliverables}`} variant="text" className="min-h-11 px-2">
            {t.hero.secondary}
          </ButtonLink>
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

      {/* Le contexte */}
      <Section tone="ink-2" labelledBy="ps-contexte-titre" className="seam">
        <Container className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <div data-reveal="fade">
              <Label>{t.problem.label}</Label>
            </div>
            <Heading id="ps-contexte-titre" className="mt-8" lines={t.problem.title} />
            <p data-reveal className="lead mt-8 text-fg-2">
              {t.problem.intro}
            </p>
          </div>
          <ol className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
            {t.problem.points.map((p, i) => (
              <li
                key={p.title}
                data-reveal
                style={delay(i * 70)}
                className="rounded-[var(--radius-md)] border border-line bg-[rgb(242_238_230/0.025)] p-6 sm:p-7"
              >
                <span className="font-mono text-[0.8125rem] text-gold">0{i + 1}</span>
                <h3 className="mt-4 text-[1.15rem] font-semibold tracking-[-0.02em] text-fg">{p.title}</h3>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-fg-2">{p.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      {/* Les livrables */}
      <Section id={ANCHOR.deliverables} labelledBy="ps-livrables-titre" className="seam scroll-mt-[var(--header-h)]">
        <Container>
          <div className="max-w-3xl">
            <div data-reveal="fade">
              <Label>{t.deliverables.label}</Label>
            </div>
            <Heading id="ps-livrables-titre" className="mt-8" lines={t.deliverables.title} />
            <p data-reveal className="lead mt-8 text-fg-2">
              {t.deliverables.intro}
            </p>
          </div>
          <ol className="mt-14 grid gap-4 sm:mt-16 md:grid-cols-2 lg:grid-cols-3">
            {t.deliverables.items.map((item, i) => (
              <li
                key={item.title}
                data-reveal
                style={delay(i * 60)}
                className={`flex flex-col rounded-[var(--radius-md)] border border-line bg-[linear-gradient(160deg,rgb(242_238_230/0.05),rgb(242_238_230/0.012))] p-6 sm:p-8 ${
                  i === 0 ? "lg:col-span-2" : ""
                }`}
              >
                <span className="flex size-10 items-center justify-center rounded-full border border-gold/50 font-mono text-[0.8125rem] text-gold">
                  {i + 1}
                </span>
                <h3 className="mt-6 text-[1.3rem] font-semibold leading-tight tracking-[-0.025em] text-fg">{item.title}</h3>
                <p className="mt-4 text-[0.9375rem] leading-relaxed text-fg-2">{item.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      {/* Le déroulé */}
      <Section tone="ink-2" labelledBy="ps-sprint-titre" className="seam">
        <Container>
          <div className="max-w-3xl">
            <div data-reveal="fade">
              <Label>{t.process.label}</Label>
            </div>
            <Heading id="ps-sprint-titre" className="mt-8" lines={t.process.title} />
          </div>
          <ol className="mt-14 grid gap-px overflow-hidden rounded-[var(--radius-md)] border border-line bg-[rgb(242_238_230/0.08)] sm:mt-16 md:grid-cols-5">
            {t.process.steps.map((step, i) => (
              <li key={step.when} data-reveal style={delay(i * 60)} className="bg-[#0f0f0f] p-6 sm:p-7">
                <p className="label text-[0.75rem] text-gold">{step.when}</p>
                <h3 className="mt-4 text-[1.1rem] font-semibold tracking-[-0.02em] text-fg">{step.title}</h3>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-fg-2">{step.body}</p>
              </li>
            ))}
          </ol>
          <p data-reveal className="mt-8 max-w-3xl text-[0.9375rem] leading-relaxed text-fg-3">
            {t.process.note}
          </p>
        </Container>
      </Section>

      {/* Pour qui */}
      <Section tone="paper" labelledBy="ps-pour-qui-titre">
        <Container className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <div data-reveal="fade">
              <Label>{t.audience.label}</Label>
            </div>
            <Heading id="ps-pour-qui-titre" size="md" className="mt-8" lines={t.audience.title} />
          </div>
          <div className="lg:col-span-7">
            <ul className="border-t border-line">
              {t.audience.items.map((item, i) => (
                <li key={item} data-reveal style={delay(i * 50)} className="flex gap-4 border-b border-line py-5 text-[1.05rem] text-fg">
                  <Check className="mt-1 size-4 shrink-0 text-accent" />
                  {item}
                </li>
              ))}
            </ul>
            <div data-reveal className="mt-10 rounded-[var(--radius-md)] border border-line p-6 sm:p-7">
              <p className="font-medium text-fg">{t.audience.whenTitle}</p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {t.audience.when.map((w) => (
                  <li key={w} className="rounded-full border border-line-strong px-3.5 py-1.5 text-[0.9375rem] text-fg-2">
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </Section>

      {/* Prix et périmètre */}
      <Section labelledBy="ps-prix-titre">
        <Container className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <div data-reveal="fade">
              <Label>{t.pricing.label}</Label>
            </div>
            <Heading id="ps-prix-titre" className="mt-8" lines={t.pricing.title} />
            {/* Juste au-dessus du prix : de quoi juger sur pièces. */}
            <div data-reveal className="mt-10 rounded-[var(--radius-md)] border border-gold/40 bg-[rgb(198_167_106/0.06)] p-5 sm:p-6">
              <p className="label flex items-center gap-2 text-gold-2">
                <span aria-hidden className="size-1.5 rounded-full bg-gold" />
                {t.demo.label}
              </p>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-fg-2">{t.demo.intro}</p>
              <ButtonLink href={demo} variant="secondary" className="mt-5 border-gold/60">
                {t.demo.cta}
              </ButtonLink>
            </div>
            <div data-reveal className="mt-10">
              <p className="text-[clamp(2.6rem,6vw,4rem)] font-semibold leading-none tracking-[-0.04em] text-fg">{t.pricing.price}</p>
              <p className="mt-3 text-fg-3">{t.pricing.priceNote}</p>
              <p className="mt-5 text-[0.9375rem] leading-relaxed text-fg-2">{t.feeExplanation}</p>
            </div>
            <div data-reveal className="mt-10 border-t border-line pt-6">
              <p className="label text-fg-3">{t.pricing.paymentTitle}</p>
              <p className="mt-3 text-fg-2">{t.pricing.payment}</p>
            </div>
          </div>
          <div className="lg:col-span-7">
            <div
              data-reveal
              className="rounded-[1.5rem] border border-line bg-[linear-gradient(160deg,rgb(242_238_230/0.05),rgb(242_238_230/0.015))] p-6 shadow-[0_40px_100px_-50px_rgb(0_0_0/0.9)] sm:p-10"
            >
              <h3 className="display-sm">{t.pricing.scopeTitle}</h3>
              <ul className="mt-6 grid gap-x-8 sm:grid-cols-2">
                {t.pricing.scope.map((item) => (
                  <li key={item} className="flex gap-3 border-b border-line py-3.5 text-[0.9375rem] text-fg-2">
                    <Check className="mt-1 size-3.5 shrink-0 text-gold" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-8 text-[0.9375rem] leading-relaxed text-fg-2">{t.pricing.languageNote}</p>
              <p className="mt-4 text-[0.9375rem] leading-relaxed text-fg-2">{t.pricing.fit}</p>
            </div>
          </div>
        </Container>
      </Section>

      {/* Pourquoi AMYN */}
      <Section tone="ink-2" labelledBy="ps-pourquoi-titre" className="seam">
        <Container className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-6">
            <div data-reveal="fade">
              <Label>{t.why.label}</Label>
            </div>
            <Heading id="ps-pourquoi-titre" size="md" className="mt-8" lines={t.why.title} />
            <p data-reveal className="lead mt-8 text-fg-2">
              {t.why.body}
            </p>
          </div>
          <ul className="grid gap-4 self-end lg:col-span-5 lg:col-start-8">
            {t.why.capabilities.map((c, i) => (
              <li key={c.title} data-reveal style={delay(i * 60)} className="border-t border-line pt-5">
                <h3 className="text-[1.05rem] font-semibold tracking-[-0.02em] text-fg">{c.title}</h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-fg-2">{c.body}</p>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* Questions */}
      <Section labelledBy="ps-faq-titre" className="seam">
        <Container className="grid gap-12 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-4">
            <div data-reveal="fade">
              <Label>{t.faq.label}</Label>
            </div>
            <Heading id="ps-faq-titre" size="md" className="mt-8" lines={t.faq.title} />
          </div>
          <div className="lg:col-span-7 lg:col-start-6">
            <Accordion items={t.faq.items} />
          </div>
        </Container>
      </Section>

      {/* Contact */}
      <Section id={ANCHOR.contact} labelledBy="ps-contact-titre" className="seam scroll-mt-[var(--header-h)]">
        <Container className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <div data-reveal="fade">
              <Label>{t.contact.label}</Label>
            </div>
            <Heading id="ps-contact-titre" size="md" className="mt-8" lines={t.contact.title} />
            <p data-reveal className="mt-8 text-fg-2">
              {t.contact.lead}
            </p>
            <p data-reveal className="mt-8 text-fg-3">
              {t.contact.orEmail}{" "}
              <a href={`mailto:${site.email}?subject=ProofSprint`} className="text-fg underline underline-offset-4">
                {site.email}
              </a>
            </p>
          </div>
          <div className="lg:col-span-7">
            <div className="rounded-[1.5rem] border border-[rgb(242_238_230/0.1)] bg-[linear-gradient(160deg,rgb(242_238_230/0.05),rgb(242_238_230/0.015))] p-5 shadow-[0_40px_100px_-50px_rgb(0_0_0/0.9)] backdrop-blur-sm sm:p-10">
              <ProofSprintForm locale={locale} />
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
