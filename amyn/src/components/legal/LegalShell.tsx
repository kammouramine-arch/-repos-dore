import type { ReactNode } from "react";
import { PageHero } from "@/components/layout/PageHero";
import { Container, Section } from "@/components/ui/Layout";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { LEGAL_UPDATED, LEGAL_UPDATED_EN } from "@/lib/legal";

/**
 * Gabarit des pages légales : une colonne de lecture, des intitulés
 * numérotés, aucune animation d'apparition — ces pages se lisent.
 */
export function LegalShell({
  locale,
  title,
  path,
  intro,
  children,
}: {
  locale: Locale;
  title: string;
  path: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  const t = getDictionary(locale);
  const updated = locale === "en" ? `${t.legal.updated}: ${LEGAL_UPDATED_EN}` : `${t.legal.updated} : ${LEGAL_UPDATED}`;
  return (
    <>
      <PageHero
        locale={locale}
        crumbs={[{ name: title, path }]}
        label={updated}
        size="lg"
        lines={[{ text: title }]}
        lead={intro}
      />
      <Section spacing="none" className="pb-24 sm:pb-32">
        <Container>
          <div className="prose-amyn max-w-3xl space-y-14 text-fg-2 [counter-reset:legal]">{children}</div>
        </Container>
      </Section>
    </>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-[calc(var(--header-h)+2rem)] border-t border-line pt-10 [counter-increment:legal]">
      <h2 className="display-sm text-fg before:label before:mr-4 before:align-middle before:text-accent before:content-[counter(legal,decimal-leading-zero)]">
        {title}
      </h2>
      <div className="mt-6 space-y-4">{children}</div>
    </section>
  );
}

/**
 * Une ligne « intitulé : valeur ». Une valeur absente n'est pas affichée :
 * jamais d'emplacement « à compléter » en ligne. La page concernée dit en
 * toutes lettres ce qui n'existe pas encore (voir `registrationPending`).
 */
export function Fact({
  label,
  value,
  locale = "fr",
}: {
  label: string;
  value: string | null;
  locale?: Locale;
}) {
  if (!value?.trim()) return null;
  return (
    <p>
      <span className="text-fg">
        {label}
        {locale === "en" ? ":" : " :"}
      </span>{" "}
      {value}
    </p>
  );
}
