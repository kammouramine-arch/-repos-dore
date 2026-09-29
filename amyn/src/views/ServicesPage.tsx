import Link from "next/link";
import { FinalCta } from "@/components/home/Sections";
import { PageHero } from "@/components/layout/PageHero";
import { ButtonLink } from "@/components/ui/Button";
import { Container, Section, delay } from "@/components/ui/Layout";
import { Shot } from "@/components/visuals/Shots";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { ctas } from "@/lib/i18n/nav";
import { href, routeAlternates, servicePath } from "@/lib/i18n/routes";
import { getUi } from "@/lib/i18n/ui";
import { priceLabel } from "@/lib/pricing";
import { pageMetadata } from "@/lib/seo";
import { getServices } from "@/lib/services";
import { shot } from "@/lib/visuals";

export function servicesMetadata(locale: Locale) {
  const t = getDictionary(locale).servicesPage;
  return pageMetadata({
    title: t.metaTitle,
    description: t.metaDescription,
    locale,
    alternates: routeAlternates("services"),
  });
}

/**
 * Services — sept blocs, chacun avec son écran. On voit ce que c'est avant
 * de lire quoi que ce soit ; le détail est sur la page du service.
 */
export function ServicesPage({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const cta = ctas(locale);
  const services = getServices(locale);

  return (
    <>
      <PageHero
        locale={locale}
        crumbs={[{ name: getUi(locale).nav.services, path: href("services", locale) }]}
        label={t.servicesPage.label}
        lines={t.servicesPage.title}
        lead={t.servicesPage.lead}
      >
        <nav aria-label={t.servicesPage.navAria}>
          <ol className="flex flex-wrap gap-2">
            {services.map((s) => (
              <li key={s.slug}>
                <a
                  href={`#${s.slug}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[rgb(242_238_230/0.14)] bg-[rgb(242_238_230/0.03)] px-4 text-[0.875rem] text-bone-2 transition-[color,border-color,transform] duration-300 hover:border-gold/50 hover:text-bone active:scale-95"
                >
                  <span className="font-mono text-[0.75rem] text-gold">{s.number}</span>
                  {s.short}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </PageHero>

      {services.map((service, index) => {
        const price = priceLabel(service.pricing, locale);
        const phone = shot(service.shot).kind === "phone";
        const flip = index % 2 === 1;
        const detail = servicePath(service.slug, locale);
        return (
          <Section
            key={service.slug}
            id={service.slug}
            tone={flip ? "ink-2" : "ink"}
            labelledBy={`${service.slug}-titre`}
            className="seam scroll-mt-[var(--header-h)]"
          >
            <Container className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
              <div className={`lg:col-span-6 ${flip ? "lg:order-2 lg:col-start-7" : ""}`}>
                <div data-reveal="fade" className="chapter">
                  <span className="chapter-number">{service.number}</span>
                  <span aria-hidden className="chapter-rule" />
                  {price && <span className="chapter-name">{price}</span>}
                </div>
                <h2 id={`${service.slug}-titre`} data-reveal className="display-lg mt-6">
                  {service.name}
                </h2>
                <p data-reveal style={delay(80)} className="mt-5 text-[1.35rem] font-medium tracking-[-0.02em] text-bone-2">
                  {service.tagline}
                </p>

                <ul data-reveal style={delay(140)} className="mt-8 flex flex-wrap gap-2">
                  {service.deliverables.slice(0, 5).map((d) => (
                    <li key={d} className="rounded-full border border-[rgb(242_238_230/0.12)] px-3.5 py-1.5 text-[0.875rem] text-bone-2">
                      {d}
                    </li>
                  ))}
                </ul>

                <div data-reveal style={delay(200)} className="mt-10 flex flex-wrap items-center gap-3">
                  <ButtonLink href={detail} variant="secondary">
                    {t.common.discover}
                  </ButtonLink>
                  <Link
                    href={`${cta.firstLook.href}?besoin=${service.slug}`}
                    className="hit-area inline-flex min-h-11 items-center px-3 text-[0.9375rem] text-bone-2 underline-offset-4 hover:text-bone hover:underline"
                  >
                    {cta.firstLook.label}
                  </Link>
                </div>
              </div>

              <div className={`lg:col-span-6 ${flip ? "lg:order-1 lg:col-start-1" : ""}`}>
                <div data-reveal className={phone ? "mx-auto w-[58%] max-w-[18rem]" : ""}>
                  <Link href={detail} tabIndex={-1} aria-hidden className="block transition-transform duration-700 ease-[var(--ease-out)] hover:-translate-y-1.5">
                    <Shot id={service.shot} locale={locale} sizes={phone ? "(min-width: 1024px) 18rem, 58vw" : "(min-width: 1024px) 48vw, 92vw"} />
                  </Link>
                </div>
              </div>
            </Container>
          </Section>
        );
      })}

      <FinalCta locale={locale} />
    </>
  );
}
