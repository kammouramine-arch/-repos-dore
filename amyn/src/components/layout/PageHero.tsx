import Link from "next/link";
import type { ReactNode } from "react";
import { Atmosphere } from "@/components/ui/Ambient";
import { JsonLd } from "@/components/ui/JsonLd";
import { Container, PageTitle, delay, type HeadingLine } from "@/components/ui/Layout";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { href } from "@/lib/i18n/routes";
import { breadcrumbSchema } from "@/lib/seo";

export type Crumb = { name: string; path: string };

/**
 * Ouverture des pages intérieures : fil d'Ariane, titre, chapeau, actions.
 * Le fil d'Ariane est aussi publié en données structurées.
 */
export function PageHero({
  locale,
  crumbs,
  label,
  lines,
  lead,
  children,
  aside,
  size = "xl",
}: {
  locale: Locale;
  crumbs: Crumb[];
  label?: ReactNode;
  lines: HeadingLine[];
  lead?: ReactNode;
  children?: ReactNode;
  aside?: ReactNode;
  size?: "xl" | "lg";
}) {
  const t = getDictionary(locale);
  const trail = [{ name: t.common.home, path: href("home", locale) }, ...crumbs];

  return (
    <section className="tone-ink relative overflow-hidden pb-16 pt-[calc(var(--header-h)+2.5rem)] sm:pb-20 sm:pt-[calc(var(--header-h)+3.5rem)] lg:pb-24">
      <Atmosphere variant="page" />
      <JsonLd data={breadcrumbSchema(trail)} />

      <Container className="relative">
        <nav aria-label={t.common.breadcrumb} className="rise" style={delay(0)}>
          <ol className="label flex flex-wrap items-center gap-x-2.5 gap-y-1 text-fg-3">
            {trail.map((crumb, i) => {
              const last = i === trail.length - 1;
              return (
                <li key={crumb.path} className="flex items-center gap-2.5">
                  {last ? (
                    <span aria-current="page" className="text-fg-2">
                      {crumb.name}
                    </span>
                  ) : (
                    <>
                      <Link href={crumb.path} className="hit-area transition-colors hover:text-fg">
                        {crumb.name}
                      </Link>
                      <span aria-hidden>/</span>
                    </>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <div className={aside ? "grid gap-14 lg:grid-cols-12 lg:gap-10" : undefined}>
          <div className={aside ? "lg:col-span-7" : undefined}>
            {label && (
              <div className="label rise mt-12 text-fg-3 sm:mt-16" style={delay(40)}>
                {label}
              </div>
            )}
            <PageTitle
              lines={lines}
              size={size}
              className={`${label ? "mt-6" : "mt-12 sm:mt-16"} max-w-5xl`}
            />
            {lead && (
              <div className="lead rise mt-8 max-w-2xl text-fg-2 sm:mt-10" style={delay(380)}>
                {lead}
              </div>
            )}
            {children && (
              <div className="rise mt-10" style={delay(460)}>
                {children}
              </div>
            )}
          </div>
          {aside && (
            <div className="rise self-end lg:col-span-5" style={delay(520)}>
              {aside}
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
