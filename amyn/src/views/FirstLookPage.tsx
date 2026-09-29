import Link from "next/link";
import { FirstLookForm, OutreachNotice } from "@/components/forms/FirstLookForm";
import { Faq } from "@/components/home/Faq";
import { PageHero } from "@/components/layout/PageHero";
import { Check } from "@/components/ui/Icons";
import { Container, Heading, Label, Section, delay } from "@/components/ui/Layout";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { href, routeAlternates } from "@/lib/i18n/routes";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export function firstLookMetadata(locale: Locale) {
  const t = getDictionary(locale).firstLookPage;
  return pageMetadata({
    title: t.metaTitle,
    description: t.metaDescription,
    locale,
    alternates: routeAlternates("firstLook"),
  });
}

/**
 * Le seul point de contact du site. Tous les appels à l'action y mènent ;
 * l'ancienne page /contact y redirige.
 */
export function FirstLookPage({ locale }: { locale: Locale }) {
  const d = getDictionary(locale);
  const t = d.firstLookPage;
  return (
    <>
      <PageHero
        locale={locale}
        crumbs={[{ name: t.crumb, path: href("firstLook", locale) }]}
        label={t.label}
        lines={t.title}
        lead={t.lead}
      >
        <OutreachNotice locale={locale} />
      </PageHero>

      <Section spacing="none" id="formulaire" labelledBy="formulaire-titre" className="scroll-mt-[var(--header-h)] pb-24 sm:pb-32">
        <Container className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <aside className="order-2 lg:order-1 lg:col-span-4">
            <div className="lg:sticky lg:top-[calc(var(--header-h)+2rem)]">
              <h2 id="formulaire-titre" className="sr-only">
                {t.formTitle}
              </h2>
              <ul className="space-y-3">
                {t.promises.map((p) => (
                  <li key={p} className="flex items-center gap-3 text-bone">
                    <span className="flex size-6 items-center justify-center rounded-full bg-[rgb(198_167_106/0.15)]">
                      <Check className="size-3.5 text-gold" />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>

              <div className="mt-10 border-t border-[rgb(242_238_230/0.1)] pt-8">
                <p className="label text-bone-3">{t.outputsLabel}</p>
                <ul className="mt-5 space-y-2">
                  {d.home.firstLook.outputs.map((o) => (
                    <li key={o} className="font-serif text-[1.3rem] italic leading-snug text-bone-2">
                      {o}
                    </li>
                  ))}
                </ul>
              </div>

              <p className="mt-10 text-[0.9375rem] text-bone-3">
                {t.preferEmail}{" "}
                <a href={`mailto:${site.email}`} className="text-bone underline underline-offset-4">
                  {site.email}
                </a>
              </p>
            </div>
          </aside>

          <div className="order-1 lg:order-2 lg:col-span-8">
            <div className="rounded-[1.5rem] border border-[rgb(242_238_230/0.1)] bg-[linear-gradient(160deg,rgb(242_238_230/0.05),rgb(242_238_230/0.015))] p-5 shadow-[0_40px_100px_-50px_rgb(0_0_0/0.9)] backdrop-blur-sm sm:p-10">
              <FirstLookForm locale={locale} />
            </div>
          </div>
        </Container>
      </Section>

      <Section tone="paper" id="message" labelledBy="message-titre" className="scroll-mt-[var(--header-h)]">
        <Container className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <div data-reveal="fade">
              <Label>{t.message}</Label>
            </div>
            <Heading id="message-titre" size="md" className="mt-8" lines={t.messageTitle} />
          </div>
          <div className="prose-amyn space-y-5 text-fg-2 lg:col-span-6 lg:col-start-7">
            {t.messageBody.map((p, i) => (
              <p key={p} data-reveal style={delay(i * 60)}>
                {p}
              </p>
            ))}
            <p data-reveal style={delay(120)}>
              {t.optOutBefore} <a href={`mailto:${site.email}`}>{site.email}</a>. {t.optOutAfter}{" "}
              <Link href={`${href("privacy", locale)}#prospection`}>{t.optOutLink}</Link>.
            </p>
          </div>
        </Container>
      </Section>

      <Faq locale={locale} items={t.questions} title={t.faqTitle} />
    </>
  );
}
