import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Layout";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { ctas, mainNav } from "@/lib/i18n/nav";
import { href } from "@/lib/i18n/routes";

export function notFoundMetadata(locale: Locale): Metadata {
  const t = getDictionary(locale).notFound;
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    /* Une page d'erreur n'a pas d'adresse canonique : on n'hérite pas de l'accueil. */
    alternates: { canonical: null, languages: {} },
    robots: { index: false, follow: true },
  };
}

export function NotFoundPage({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).notFound;
  const cta = ctas(locale);
  return (
    <section className="tone-ink flex min-h-[85svh] items-center pb-20 pt-[calc(var(--header-h)+3rem)]">
      <Container>
        <p className="label rise text-fg-3">{t.label}</p>
        <h1 className="display-xl rise mt-8 max-w-4xl" style={{ "--delay": 80 } as React.CSSProperties}>
          {t.title} <em className="accent text-fg-2">{t.accent.replace(/'/g, "’")}</em>
        </h1>
        <p className="lead rise mt-8 max-w-xl text-fg-2" style={{ "--delay": 160 } as React.CSSProperties}>
          {t.lead}
        </p>
        <div className="rise mt-10 flex flex-col gap-3 sm:flex-row sm:items-center" style={{ "--delay": 240 } as React.CSSProperties}>
          <ButtonLink href={href("home", locale)}>{t.back}</ButtonLink>
          <ButtonLink href={cta.firstLook.href} variant="secondary">
            {cta.firstLook.label}
          </ButtonLink>
        </div>
        <ul className="mt-14 flex flex-wrap gap-x-8 gap-y-3 text-fg-2">
          {mainNav(locale).map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="link-line hit-area hover:text-fg">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
