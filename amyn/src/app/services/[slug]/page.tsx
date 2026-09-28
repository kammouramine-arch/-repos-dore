import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Faq } from "@/components/home/Faq";
import { FinalCta } from "@/components/home/Sections";
import { PageHero } from "@/components/layout/PageHero";
import { ButtonLink } from "@/components/ui/Button";
import { ArrowRight } from "@/components/ui/Icons";
import { JsonLd } from "@/components/ui/JsonLd";
import { Container, Heading, Label, Section, Tag, delay } from "@/components/ui/Layout";
import { Shot } from "@/components/visuals/Shots";
import { shot } from "@/lib/visuals";
import { QUOTE_LABEL, priceLabel } from "@/lib/pricing";
import { pageMetadata, serviceSchema } from "@/lib/seo";
import { serviceBySlug, servicePath, services } from "@/lib/services";
import { cta } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = serviceBySlug(slug);
  if (!service) return {};
  return pageMetadata({
    title: service.seo.title,
    description: service.seo.description,
    path: servicePath(service.slug),
  });
}

export default async function ServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = serviceBySlug(slug);
  if (!service) notFound();

  const price = priceLabel(service.pricing);
  const related = service.related.map((s) => serviceBySlug(s)!);

  return (
    <>
      <JsonLd data={serviceSchema(service)} />

      <PageHero
        crumbs={[
          { name: "Services", path: "/services" },
          { name: service.name, path: servicePath(service.slug) },
        ]}
        label={
          <span className="flex flex-wrap items-center gap-3">
            <span className="text-accent">{service.number}</span>
            <span>{service.name}</span>
            {price && <Tag>{price}</Tag>}
          </span>
        }
        size="lg"
        lines={[{ text: service.hero.title }, { accent: service.hero.accent }]}
        lead={service.hero.intro}
        aside={
          <div className={shot(service.shot).kind === "phone" ? "mx-auto w-[62%] max-w-[19rem]" : ""}>
            <div className="float-a">
              <Shot id={service.shot} eager sizes="(min-width: 1024px) 40vw, 92vw" />
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <ButtonLink href={`${cta.firstLook.href}?besoin=${service.slug}`}>
            {cta.firstLook.label}
          </ButtonLink>
        </div>
      </PageHero>

      {/* Le problème */}
      <Section tone="ink-2" labelledBy="probleme-titre" className="seam">
        <Container className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-6">
            <div data-reveal="fade">
              <Label>Le problème</Label>
            </div>
            <Heading id="probleme-titre" className="mt-8" lines={[{ text: service.problem.title }]} />
            <p data-reveal className="lead mt-8 text-fg-2" style={delay(120)}>
              {service.problem.body}
            </p>
          </div>
          <div className="lg:col-span-5 lg:col-start-8">
            <p data-reveal className="label text-fg-3">
              Vous vous reconnaissez ?
            </p>
            <ul className="mt-6 border-t border-line">
              {service.problem.signs.map((sign, i) => (
                <li
                  key={sign}
                  data-reveal
                  style={delay(i * 60)}
                  className="flex gap-4 border-b border-line py-4 text-fg"
                >
                  <span className="label pt-1 text-accent">{String(i + 1).padStart(2, "0")}</span>
                  {sign}
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </Section>

      {/* La réponse */}
      <Section labelledBy="reponse-titre" className="seam">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-6">
              <div data-reveal="fade">
                <Label>Notre réponse</Label>
              </div>
              <Heading id="reponse-titre" className="mt-8" lines={[{ text: service.solution.title }]} />
            </div>
            <p data-reveal className="lead text-fg-2 lg:col-span-5 lg:col-start-8 lg:mt-16">
              {service.solution.body}
            </p>
          </div>

          <div className="mt-16 lg:mt-24">
            <p data-reveal className="label text-fg-3">
              Ce que cela peut inclure, selon votre projet
            </p>
            <ul className="mt-6 grid gap-px border-y border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
              {service.deliverables.map((item, i) => (
                <li key={item} className="bg-canvas">
                  <div data-reveal style={delay((i % 3) * 70)} className="flex h-full gap-4 py-6 sm:px-6">
                    <span className="label pt-1 text-accent">{String(i + 1).padStart(2, "0")}</span>
                    <span className="text-fg">{item}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </Section>

      {/* Pour qui */}
      <Section tone="paper" labelledBy="pour-qui-titre">
        <Container className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <div data-reveal="fade">
              <Label>Pour qui</Label>
            </div>
            <Heading
              id="pour-qui-titre"
              size="md"
              className="mt-8"
              lines={[{ text: "Des exemples," }, { accent: "pas des limites." }]}
            />
            <p data-reveal className="mt-8 text-fg-2">
              Ces situations sont des exemples. Si votre activité n&apos;y figure pas,
              c&apos;est justement ce que nous regardons en premier.
            </p>
          </div>
          <ul className="border-t border-line lg:col-span-7 lg:col-start-6">
            {service.useCases.map((u, i) => (
              <li
                key={u.who}
                data-reveal
                style={delay(i * 70)}
                className="grid gap-2 border-b border-line py-7 sm:grid-cols-[13rem_1fr] sm:gap-8"
              >
                <p className="font-serif text-[1.55rem] leading-tight">{u.who}</p>
                <p className="text-fg-2 sm:pt-1">{u.need}</p>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* Déroulement et périmètre */}
      <Section labelledBy="deroulement-titre" className="seam">
        <Container>
          <div data-reveal="fade">
            <Label>Déroulement</Label>
          </div>
          <Heading
            id="deroulement-titre"
            size="md"
            className="mt-8"
            lines={[{ text: "Comment se passe" }, { accent: "ce type de projet." }]}
          />

          <ol className="mt-14 grid gap-px border-y border-line bg-line sm:-mx-6 sm:grid-cols-2 lg:grid-cols-4">
            {service.process.map((step, i) => (
              <li key={step.title} className="bg-canvas py-8 sm:px-6">
                <div data-reveal style={delay(i * 80)}>
                  <span className="label text-accent">0{i + 1}</span>
                  <p className="title mt-5">{step.title}</p>
                  <p className="mt-3 text-[0.9375rem] leading-relaxed text-fg-2">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-20 grid gap-12 lg:grid-cols-12 lg:gap-10">
            <div data-reveal className="lg:col-span-6">
              <p className="label text-fg-3">Ce qui fait varier le devis</p>
              <ul className="mt-6 space-y-3">
                {service.scope.map((item) => (
                  <li key={item} className="flex gap-3 text-fg">
                    <span aria-hidden className="mt-[0.8em] h-px w-3 shrink-0 bg-accent" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-8 text-[0.9375rem] text-fg-2">
                <span className="text-fg">{price ?? QUOTE_LABEL}.</span> Chaque projet est cadré
                selon vos besoins, vos objectifs et les fonctionnalités nécessaires. Le devis
                détaille ce qui est inclus avant tout engagement.
              </p>
            </div>

            {service.limits && (
              <aside data-reveal style={delay(100)} className="self-start rounded-[var(--radius-sm)] border border-line p-7 sm:p-9 lg:col-span-5 lg:col-start-8">
                <p className="label text-accent">Ce que nous ne promettons pas</p>
                <p className="mt-4 text-fg-2">{service.limits}</p>
              </aside>
            )}
          </div>
        </Container>
      </Section>

      <Faq items={service.faq} />

      {/* Services liés */}
      <Section tone="ink-2" spacing="tight" labelledBy="lies-titre">
        <Container>
          <h2 id="lies-titre" className="label text-fg-3">
            Souvent associé à
          </h2>
          <ul className="mt-6 grid gap-px border-y border-line bg-line md:-mx-6 md:grid-cols-3">
            {related.map((r) => (
              <li key={r.slug} className="bg-canvas">
                <Link href={servicePath(r.slug)} className="group flex h-full flex-col gap-4 py-7 md:px-6">
                  <span className="label text-accent">{r.number}</span>
                  <span className="display-sm">{r.name}</span>
                  <span className="text-[0.9375rem] text-fg-2">{r.summary}</span>
                  <span className="mt-auto flex items-center gap-2 pt-2 text-[0.875rem] text-fg-2 group-hover:text-fg">
                    Découvrir <ArrowRight className="nudge size-4" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <FinalCta />
    </>
  );
}
