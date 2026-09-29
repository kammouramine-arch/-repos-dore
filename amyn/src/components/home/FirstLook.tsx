import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Container, Heading, Label, Section, delay } from "@/components/ui/Layout";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { ctas } from "@/lib/i18n/nav";

/**
 * Le premier aperçu — le cœur de la méthode commerciale d'AMYN, en trois
 * temps et trois phrases.
 */
export function FirstLook({ locale, number }: { locale: Locale; number?: string }) {
  const t = getDictionary(locale).home.firstLook;
  const cta = ctas(locale);
  return (
    <Section tone="paper" labelledBy="apercu-titre" className="overflow-hidden">
      <Container>
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <div data-reveal="fade">
              <Label number={number}>{t.label}</Label>
            </div>
            <Heading id="apercu-titre" className="mt-7" lines={t.title} />
          </div>
          <p data-reveal className="lead text-fg-2 lg:col-span-4">
            {t.lead}
          </p>
        </div>

        <ol className="mt-14 grid gap-4 sm:mt-20 md:grid-cols-3">
          {t.steps.map((step, i) => (
            <li
              key={step.title}
              data-reveal
              style={delay(i * 110)}
              className="lift-card relative overflow-hidden rounded-[1.25rem] border border-line bg-[rgb(255_255_255/0.45)] p-7 sm:p-9"
            >
              <span
                aria-hidden
                className="block text-[5.5rem] font-semibold leading-none tracking-[-0.06em] text-[rgb(10_10_10/0.08)]"
              >
                0{i + 1}
              </span>
              <p className="mt-2 text-[1.5rem] font-semibold tracking-[-0.03em]">{step.title}</p>
              <p className="mt-2 text-fg-2">{step.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-12 flex flex-col gap-6 sm:mt-16 lg:flex-row lg:items-center lg:justify-between">
          <ul data-reveal className="flex flex-wrap gap-2" aria-label={t.outputsAria}>
            {t.outputs.map((o) => (
              <li key={o} className="rounded-full border border-line-strong px-4 py-2 text-[0.875rem] text-fg-2">
                {o}
              </li>
            ))}
          </ul>
          <div data-reveal className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <ButtonLink href={cta.firstLook.href} className="!min-h-14 !px-7">
              {cta.firstLook.label}
            </ButtonLink>
            <Link href={`${cta.firstLook.href}#message`} className="hit-area text-[0.875rem] text-fg-2 underline underline-offset-4 hover:text-fg">
              {t.outreach}
            </Link>
          </div>
        </div>
      </Container>
    </Section>
  );
}
