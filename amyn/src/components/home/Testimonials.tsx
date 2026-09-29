import { Container, Heading, Label, Section } from "@/components/ui/Layout";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { visibleTestimonials } from "@/lib/testimonials";
import { TestimonialsStage } from "./TestimonialsStage";

/**
 * Témoignages. Rien n'est affiché s'il n'y a aucun témoignage publiable
 * dans la langue : pas de section vide, pas de faux avis. Les brouillons
 * (non vérifiés) ne sortent qu'en prévisualisation, sous une mention
 * « brouillon » visible — jamais en production (voir `testimonials.ts`).
 */
export function Testimonials({ locale, number }: { locale: Locale; number?: string }) {
  const items = visibleTestimonials(locale);
  if (items.length === 0) return null;

  const t = getDictionary(locale).home.testimonials;
  const drafts = items.some((item) => !item.verified);

  return (
    <Section labelledBy="temoignages-titre" className="seam overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-full bg-[radial-gradient(45%_55%_at_20%_40%,rgb(198_167_106/0.07),transparent_70%)]"
      />
      <Container className="relative">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div data-reveal="fade">
              <Label number={number}>{t.label}</Label>
            </div>
            <Heading id="temoignages-titre" className="mt-7" lines={t.title} />
          </div>
          {drafts && (
            <p
              data-reveal="fade"
              className="max-w-sm self-start rounded-[var(--radius-md)] border border-dashed border-gold/50 px-4 py-3 font-mono text-[0.75rem] uppercase leading-relaxed tracking-[0.1em] text-gold-2 lg:self-auto"
            >
              {t.draft}
            </p>
          )}
        </div>

        <div data-reveal className="mt-14 sm:mt-20">
          <TestimonialsStage
            items={items}
            labels={{
              region: t.region,
              slide: t.slide,
              of: t.of,
              previous: t.previous,
              next: t.next,
              goTo: t.goTo,
              verified: t.verified,
              source: t.source,
              rating: t.rating,
              outOf: t.outOf,
            }}
          />
        </div>
      </Container>
    </Section>
  );
}

/** Vrai si la section a quelque chose à montrer (pour la numérotation). */
export const hasTestimonials = (locale: Locale) => visibleTestimonials(locale).length > 0;
