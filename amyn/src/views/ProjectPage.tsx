import Image from "next/image";
import Link from "next/link";
import { FinalCta } from "@/components/home/Sections";
import { PageHero } from "@/components/layout/PageHero";
import { ArrowUpRight } from "@/components/ui/Icons";
import { Container, Heading, Label, Section, delay } from "@/components/ui/Layout";
import { BrowserShot, PhoneShot } from "@/components/visuals/Shots";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { href, projectAlternates, projectPath, servicePath } from "@/lib/i18n/routes";
import { getUi } from "@/lib/i18n/ui";
import { CONCEPT_NOTICES, KIND_LABELS, getProjects, projectBySlug } from "@/lib/projects";
import { pageMetadata } from "@/lib/seo";
import { serviceBySlug } from "@/lib/services";
import { shot, shotAlt, shotSrc } from "@/lib/visuals";

export function projectMetadata(slug: string, locale: Locale) {
  const project = projectBySlug(slug, locale);
  if (!project) return {};
  const kind = KIND_LABELS[locale][project.kind];
  return pageMetadata({
    title:
      locale === "en"
        ? `${project.brand} — ${project.sector.toLowerCase()} ${kind.toLowerCase()}`
        : `${project.brand} — ${kind.toLowerCase()} ${project.sector.toLowerCase()}`,
    description: locale === "en" ? `AMYN ${kind.toLowerCase()}: ${project.summary}` : `${kind} AMYN : ${project.summary}`,
    locale,
    alternates: projectAlternates(slug),
  });
}

/**
 * Étude de cas : d'abord les écrans, en grand. Ensuite trois phrases —
 * contexte, problème, direction — puis le reste des écrans. La nature du
 * projet (concept) est rappelée en tête et sous les visuels.
 */
export function ProjectPage({ slug, locale }: { slug: string; locale: Locale }) {
  const project = projectBySlug(slug, locale)!;
  const t = getDictionary(locale).project;
    const projects = getProjects(locale);
  const index = projects.findIndex((p) => p.slug === project.slug);
  const next = projects[(index + 1) % projects.length];
  const services = project.services.map((s) => serviceBySlug(s, locale)!);
  const wide = project.screens.filter((id) => shot(id).kind === "browser");
  const phones = project.screens.filter((id) => shot(id).kind === "phone");

  return (
    <>
      <PageHero
        locale={locale}
        crumbs={[
          { name: getUi(locale).nav.work, path: href("work", locale) },
          { name: project.brand, path: projectPath(project.slug, locale) },
        ]}
        label={
          <span className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-gold/40 px-2.5 py-1 text-gold">{KIND_LABELS[locale][project.kind]}</span>
            <span>{project.sector}</span>
          </span>
        }
        lines={[{ text: project.brand }]}
        lead={project.summary}
      />

      {/* La vitrine */}
      <Section spacing="none" className="pb-20 sm:pb-28">
        <Container>
          <div
            data-reveal
            className="relative overflow-hidden rounded-[1.5rem] border border-[rgb(242_238_230/0.1)] px-4 pb-0 pt-8 sm:px-12 sm:pt-16"
            style={{ background: `radial-gradient(80% 70% at 50% 100%, ${project.palette.accent}40, transparent 70%), linear-gradient(160deg, rgb(242 238 230 / 0.06), rgb(242 238 230 / 0.01))` }}
          >
            <BrowserShot id={`site-${project.slug}`} locale={locale} eager sizes="(min-width: 1024px) 75vw, 94vw" className="w-[86%] rounded-b-none border-b-0" />
            <div className="absolute bottom-0 right-[3%] w-[24%]">
              <div className="float-b translate-y-[14%]">
                <PhoneShot id={`mobile-${project.slug}`} locale={locale} eager sizes="(min-width: 1024px) 18vw, 26vw" />
              </div>
            </div>
          </div>
          <p className="label mt-5 text-bone-3">{CONCEPT_NOTICES[locale]}</p>
        </Container>
      </Section>

      {/* L'étude de cas, en trois phrases */}
      <Section tone="ink-2" labelledBy="etude-titre" className="seam">
        <Container>
          <div data-reveal="fade">
            <Label>{t.caseStudy}</Label>
          </div>
          <Heading id="etude-titre" className="mt-7" lines={t.caseTitle} />

          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {[
              [t.context, project.context],
              [t.problem, project.problem],
              [t.direction, project.direction],
            ].map(([term, text], i) => (
              <div
                key={term}
                data-reveal
                style={delay(i * 90)}
                className="rounded-[1.25rem] border border-[rgb(242_238_230/0.1)] bg-[rgb(242_238_230/0.025)] p-7"
              >
                <p className="label text-gold">{term}</p>
                <p className="mt-4 text-bone-2">{text}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <ul data-reveal className="flex flex-wrap gap-2" aria-label={t.featuresAria}>
              {project.features.map((f) => (
                <li key={f} className="rounded-full border border-[rgb(242_238_230/0.14)] px-4 py-2 text-[0.9375rem] text-bone">
                  {f}
                </li>
              ))}
            </ul>
            <ul data-reveal className="flex flex-wrap gap-2" aria-label={t.servicesAria}>
              {services.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={servicePath(s.slug, locale)}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[rgb(198_167_106/0.12)] px-4 text-[0.9375rem] text-gold-2 transition-[background-color,transform] hover:bg-[rgb(198_167_106/0.2)] active:scale-95"
                  >
                    <span className="font-mono text-[0.75rem]">{s.number}</span>
                    {s.short}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </Section>

      {/* Les autres écrans */}
      <Section labelledBy="ecrans-titre" className="seam">
        <Container>
          <h2 id="ecrans-titre" className="sr-only">
            {t.screens}
          </h2>
          <div className="grid grid-cols-12 items-end gap-x-4 gap-y-12 sm:gap-x-6">
            {wide.length > 1 && (
              <figure data-reveal className="col-span-12">
                <BrowserShot id={wide[0]} locale={locale} sizes="(min-width: 1024px) 88vw, 94vw" />
                <figcaption className="mt-3 text-[0.875rem] text-bone-3">{shotAlt(wide[0], locale)}</figcaption>
              </figure>
            )}
            {wide.slice(wide.length > 1 ? 1 : 0).map((id) => (
              <figure key={id} data-reveal className={phones.length ? "col-span-12 lg:col-span-8" : "col-span-12"}>
                <BrowserShot id={id} locale={locale} sizes="(min-width: 1024px) 62vw, 94vw" />
                <figcaption className="mt-3 text-[0.875rem] text-bone-3">{shotAlt(id, locale)}</figcaption>
              </figure>
            ))}
            {phones.length > 0 && (
              <div className={`grid gap-4 sm:gap-6 ${phones.length > 1 ? "grid-cols-2" : "grid-cols-1"} ${wide.length ? "col-span-12 sm:col-span-8 sm:col-start-3 lg:col-span-4 lg:col-start-auto" : "col-span-12 mx-auto w-full max-w-xl"}`}>
                {phones.map((id, i) => (
                  <figure key={id} data-reveal style={delay(120 + i * 80)} className={phones.length === 1 ? "mx-auto w-[62%]" : ""}>
                    <PhoneShot id={id} locale={locale} sizes="(min-width: 1024px) 15vw, 45vw" />
                    <figcaption className="mt-3 text-[0.8125rem] text-bone-3">{shotAlt(id, locale)}</figcaption>
                  </figure>
                ))}
              </div>
            )}
          </div>
        </Container>
      </Section>

      {/* Projet suivant */}
      <Section tone="ink-2" spacing="tight" className="seam">
        <Container>
          <Link href={projectPath(next.slug, locale)} className="group grid items-center gap-6 sm:grid-cols-[1fr_auto]">
            <span className="flex items-center gap-6">
              <span className="relative hidden h-24 w-40 shrink-0 overflow-hidden rounded-lg border border-[rgb(242_238_230/0.12)] sm:block">
                <Image src={shotSrc(`site-${next.slug}`)} alt="" fill sizes="160px" quality={70} className="object-cover object-top transition-transform duration-700 group-hover:scale-110" />
              </span>
              <span>
                <span className="label text-bone-3">{t.next} · {next.sector}</span>
                <span className="display-md mt-2 block text-bone transition-colors group-hover:text-gold-2">{next.brand}</span>
              </span>
            </span>
            <span
              aria-hidden
              className="flex size-14 items-center justify-center rounded-full border border-[rgb(242_238_230/0.18)] text-bone-2 transition-[background-color,color,border-color,transform] duration-500 ease-[var(--ease-spring)] group-hover:rotate-45 group-hover:border-gold group-hover:bg-gold group-hover:text-ink"
            >
              <ArrowUpRight className="size-5" />
            </span>
          </Link>
        </Container>
      </Section>

      <FinalCta locale={locale} />
    </>
  );
}
