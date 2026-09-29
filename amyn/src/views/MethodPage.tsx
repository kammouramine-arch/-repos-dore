import Link from "next/link";
import { FinalCta } from "@/components/home/Sections";
import { PageHero } from "@/components/layout/PageHero";
import { ButtonLink } from "@/components/ui/Button";
import { Container, Heading, Label, Section, delay } from "@/components/ui/Layout";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { ctas } from "@/lib/i18n/nav";
import { href, routeAlternates } from "@/lib/i18n/routes";
import { getMethod } from "@/lib/method";
import { pageMetadata } from "@/lib/seo";

export function methodMetadata(locale: Locale) {
  const t = getDictionary(locale).methodPage;
  return pageMetadata({
    title: t.metaTitle,
    description: t.metaDescription,
    locale,
    alternates: routeAlternates("method"),
  });
}

export function MethodPage({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).methodPage;
  const cta = ctas(locale);
  return (
    <>
      <PageHero
        locale={locale}
        crumbs={[{ name: t.label, path: href("method", locale) }]}
        label={t.label}
        lines={t.title}
        lead={t.lead}
      />

      <Section spacing="none" className="pb-20 sm:pb-28">
        <Container>
          <ol className="border-t border-line">
            {getMethod(locale).map((step, i) => (
              <li
                key={step.number}
                className="grid gap-8 border-b border-line py-14 sm:py-20 lg:grid-cols-12 lg:gap-10"
              >
                <div data-reveal className="lg:col-span-4">
                  <span className="label text-accent">
                    {t.step} {step.number}
                  </span>
                  <h2 className="display-md mt-5">{step.title}</h2>
                  <p className="mt-4 text-fg-2">{step.summary}</p>
                </div>
                <p data-reveal style={delay(80)} className="lead text-fg-2 lg:col-span-5 lg:col-start-6">
                  {step.detail}
                </p>
                <div data-reveal style={delay(140)} className="lg:col-span-2 lg:col-start-11">
                  <p className="label text-fg-3">{t.outputs}</p>
                  <ul className="mt-4 space-y-2 text-[0.9375rem] text-fg">
                    {step.outputs.map((o) => (
                      <li key={o}>{o}</li>
                    ))}
                  </ul>
                </div>
                {i === 0 && (
                  <p data-reveal className="text-[0.9375rem] text-fg-3 lg:col-span-7 lg:col-start-6">
                    {t.firstLookBefore}{" "}
                    <Link href={cta.firstLook.href} className="text-fg underline underline-offset-4">
                      {t.firstLookLink}
                    </Link>
                    {locale === "en" ? "" : " "}
                    {t.firstLookAfter}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      <Section tone="paper" labelledBy="engagements-titre">
        <Container className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <div data-reveal="fade">
              <Label>{t.commitments}</Label>
            </div>
            <Heading id="engagements-titre" size="md" className="mt-8" lines={t.commitmentsTitle} />
          </div>
          <ul className="grid gap-x-10 border-t border-line sm:grid-cols-2 lg:col-span-6 lg:col-start-7">
            {t.commitmentItems.map(([title, body], i) => (
              <li key={title} data-reveal style={delay((i % 2) * 80)} className="border-b border-line py-7">
                <p className="title">{title}</p>
                <p className="mt-2 text-[0.9375rem] text-fg-2">{body}</p>
              </li>
            ))}
          </ul>
          <div data-reveal className="lg:col-span-12">
            <ButtonLink href={cta.firstLook.href}>{cta.firstLook.label}</ButtonLink>
          </div>
        </Container>
      </Section>

      <FinalCta locale={locale} />
    </>
  );
}
