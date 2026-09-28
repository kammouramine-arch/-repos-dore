import Link from "next/link";
import { FinalCta } from "@/components/home/Sections";
import { PageHero } from "@/components/layout/PageHero";
import { ButtonLink } from "@/components/ui/Button";
import { Container, Section, Tag, delay } from "@/components/ui/Layout";
import { ServiceVisual } from "@/components/visuals/ServiceVisual";
import { priceLabel } from "@/lib/pricing";
import { pageMetadata } from "@/lib/seo";
import { services, servicePath } from "@/lib/services";
import { cta } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Services",
  description:
    "Sites web, suivi des demandes et des devis, applications mobiles, réservation en ligne, fiche Google Business, onboarding client, portfolio : les sept services d'AMYN, sur devis.",
  path: "/services",
});

export default function ServicesPage() {
  return (
    <>
      <PageHero
        crumbs={[{ name: "Services", path: "/services" }]}
        label="Sept services · Sur devis"
        lines={[{ text: "Ce que nous construisons," }, { accent: "et pourquoi." }]}
        lead="Chaque service répond à un problème précis d'entreprise. Beaucoup de projets en combinent plusieurs : un site et une réservation, un outil de suivi et un parcours d'accueil. Chaque projet est cadré selon vos besoins, vos objectifs et les fonctionnalités nécessaires."
      >
        <nav aria-label="Aller à un service">
          <ol className="flex flex-wrap gap-2">
            {services.map((s) => (
              <li key={s.slug}>
                <a
                  href={`#${s.slug}`}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-4 text-[0.875rem] text-fg-2 transition-colors hover:border-line-strong hover:text-fg"
                >
                  <span className="label text-accent">{s.number}</span>
                  {s.short}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </PageHero>

      {services.map((service, index) => {
        const price = priceLabel(service.pricing);
        return (
          <Section
            key={service.slug}
            id={service.slug}
            tone={index % 2 === 0 ? "ink-2" : "ink"}
            labelledBy={`${service.slug}-titre`}
            className="scroll-mt-[var(--header-h)]"
          >
            <Container className="grid gap-14 lg:grid-cols-12 lg:gap-10">
              <div className="lg:col-span-6">
                <div data-reveal="fade" className="flex flex-wrap items-center gap-3">
                  <span className="label text-accent">{service.number}</span>
                  {price && <Tag>{price}</Tag>}
                </div>
                <h2 id={`${service.slug}-titre`} data-reveal className="display-md mt-6">
                  {service.name}
                </h2>
                <p data-reveal className="lead mt-6 text-fg-2" style={delay(100)}>
                  {service.summary}
                </p>

                <dl className="mt-12 grid gap-10 sm:grid-cols-2">
                  <div data-reveal>
                    <dt className="label text-fg-3">Le problème</dt>
                    <dd className="mt-3 text-fg-2">{service.problem.title}</dd>
                  </div>
                  <div data-reveal style={delay(80)}>
                    <dt className="label text-fg-3">Notre réponse</dt>
                    <dd className="mt-3 text-fg-2">{service.solution.title}</dd>
                  </div>
                  <div data-reveal className="sm:col-span-2">
                    <dt className="label text-fg-3">Ce que cela peut inclure</dt>
                    <dd className="mt-4">
                      <ul className="grid gap-x-8 gap-y-2.5 text-[0.9375rem] text-fg sm:grid-cols-2">
                        {service.deliverables.slice(0, 6).map((d) => (
                          <li key={d} className="flex gap-3">
                            <span aria-hidden className="mt-[0.7em] h-px w-3 shrink-0 bg-accent" />
                            {d}
                          </li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                  <div data-reveal>
                    <dt className="label text-fg-3">Pour qui</dt>
                    <dd className="mt-3 text-[0.9375rem] text-fg-2">
                      {service.useCases.map((u) => u.who).join(", ")}, et bien d&apos;autres.
                    </dd>
                  </div>
                  <div data-reveal style={delay(80)}>
                    <dt className="label text-fg-3">Ce qui fait varier le devis</dt>
                    <dd className="mt-3 text-[0.9375rem] text-fg-2">
                      {service.scope.slice(0, 3).join(" · ")}
                    </dd>
                  </div>
                </dl>

                <div data-reveal className="mt-12 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
                  <ButtonLink href={servicePath(service.slug)} variant="secondary">
                    Découvrir le service
                  </ButtonLink>
                  <Link
                    href={`${cta.firstLook.href}?besoin=${service.slug}`}
                    className="link-line text-[0.9375rem] text-fg-2 transition-colors hover:text-fg"
                  >
                    {cta.firstLook.label}
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-5 lg:col-start-8">
                <div data-reveal className="lg:sticky lg:top-[calc(var(--header-h)+3rem)]">
                  <ServiceVisual visual={service.visual} />
                  <p className="label mt-4 text-fg-3">Illustration — {service.name}</p>
                </div>
              </div>
            </Container>
          </Section>
        );
      })}

      <FinalCta />
    </>
  );
}
