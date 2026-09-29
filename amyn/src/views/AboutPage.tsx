import { FinalCta } from "@/components/home/Sections";
import { PageHero } from "@/components/layout/PageHero";
import { Container, Heading, Label, Section, delay } from "@/components/ui/Layout";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { href, routeAlternates } from "@/lib/i18n/routes";
import { getPrinciples } from "@/lib/method";
import { pageMetadata } from "@/lib/seo";

export function aboutMetadata(locale: Locale) {
  const t = getDictionary(locale).aboutPage;
  return pageMetadata({
    title: t.metaTitle,
    description: t.metaDescription,
    locale,
    alternates: routeAlternates("about"),
  });
}

/**
 * À propos — ce qu'est AMYN, sans histoire inventée : ni date de création,
 * ni équipe fictive, ni chiffres. Une philosophie et des exigences.
 */
export function AboutPage({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).aboutPage;
  return (
    <>
      <PageHero
        locale={locale}
        crumbs={[{ name: t.label, path: href("about", locale) }]}
        label={t.label}
        lines={t.title}
        lead={t.lead}
      />

      <Section tone="ink-2" labelledBy="philosophie-titre">
        <Container className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <div data-reveal="fade">
              <Label>{t.philosophy}</Label>
            </div>
            <Heading id="philosophie-titre" size="md" className="mt-8" lines={t.philosophyTitle} />
          </div>
          <div className="prose-amyn lead space-y-6 text-fg-2 lg:col-span-6 lg:col-start-7">
            {t.philosophyBody.map((p, i) => (
              <p key={p} data-reveal style={delay(i * 80)}>
                {p}
              </p>
            ))}
          </div>
        </Container>
      </Section>

      <Section labelledBy="relation-titre">
        <Container className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <div data-reveal="fade">
              <Label>{t.relation}</Label>
            </div>
            <Heading id="relation-titre" size="md" className="mt-8" lines={t.relationTitle} />
          </div>
          <dl className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:col-span-6 lg:col-start-7">
            {t.relationItems.map(([term, text], i) => (
              <div key={term} data-reveal style={delay((i % 2) * 80)}>
                <dt className="title">{term}</dt>
                <dd className="mt-3 text-fg-2">{text}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </Section>

      <Section tone="paper" labelledBy="exigences-titre">
        <Container>
          <div data-reveal="fade">
            <Label>{t.standards}</Label>
          </div>
          <Heading id="exigences-titre" size="md" className="mt-8 max-w-3xl" lines={t.standardsTitle} />
          <ul className="mt-14 grid gap-px border-y border-line bg-line sm:-mx-6 sm:grid-cols-2 lg:grid-cols-3">
            {getPrinciples(locale).map((p, i) => (
              <li key={p.title} className="bg-canvas py-8 sm:px-6">
                <div data-reveal style={delay((i % 3) * 70)}>
                  <span className="label text-accent">{String(i + 1).padStart(2, "0")}</span>
                  <p className="title mt-5">{p.title}</p>
                  <p className="mt-3 text-[0.9375rem] text-fg-2">{p.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <FinalCta locale={locale} />
    </>
  );
}
