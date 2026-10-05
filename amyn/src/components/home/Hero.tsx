import { Fragment } from "react";
import { RevenueFlow } from "@/components/revenue/RevenueFlow";
import { ButtonLink } from "@/components/ui/Button";
import { Check } from "@/components/ui/Icons";
import { Container, delay } from "@/components/ui/Layout";
import { HeroLight } from "./HeroLight";
import { HeroScene } from "./HeroScene";
import { HeroSceneReady } from "./HeroSceneReady";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { href } from "@/lib/i18n/routes";
import { getUi } from "@/lib/i18n/ui";
import { getRevenue } from "@/lib/revenue-os";

/**
 * Hero — compris en trois secondes : AMYN fait de l'entreprise un moteur
 * de revenus (Revenue OS), et le schéma à droite le montre — une demande
 * qui traverse le système jusqu'à l'opportunité.
 *
 * Le texte arrive en CSS pur dès la première image ; la scène de fond
 * reste celle du site (paysage de nuit, repères).
 */
export function Hero({ locale }: { locale: Locale }) {
  const r = getRevenue(locale);
  const t = r.hero;
  const landmarks = getDictionary(locale).hero.landmarks;
  const cta = getUi(locale).cta;

  return (
    <section
      aria-labelledby="hero-title"
      className="tone-ink relative flex min-h-[100svh] items-center overflow-hidden pb-16 pt-[calc(var(--header-h)+2.5rem)] lg:pb-20"
    >
      <HeroScene landmarks={landmarks} />
      <HeroSceneReady />
      <HeroLight />
      <Container className="relative grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="relative z-10 lg:col-span-7">
          <p
            className="rise inline-flex max-w-full items-center gap-2 rounded-full border border-[rgb(242_238_230/0.12)] bg-[rgb(242_238_230/0.04)] py-1.5 pl-2 pr-3.5 text-[0.8125rem] text-bone-2 backdrop-blur-md"
            style={delay(0)}
          >
            <span className="relative flex size-2 shrink-0">
              <span className="absolute inset-0 animate-ping rounded-full bg-gold/60 motion-reduce:hidden" />
              <span className="relative size-2 rounded-full bg-gold" />
            </span>
            <span className="font-semibold text-bone">{t.badge}</span>
          </p>

          <h1
            id="hero-title"
            className="mt-7 text-[clamp(2.75rem,6.6vw,6.4rem)] font-[640] leading-[0.92] tracking-[-0.052em] text-fg sm:mt-9"
          >
            {t.title.map((line, i) => (
              <Fragment key={i}>
                <span className="rise-line" style={delay(60 + i * 110)}>
                  {line.text}
                  {line.text && line.accent ? " " : null}
                  {line.accent && <em className="accent pr-[0.08em]">{line.accent}</em>}
                </span>
                {i < t.title.length - 1 ? " " : null}
              </Fragment>
            ))}
          </h1>

          <p className="lead rise mt-8 max-w-[34rem] text-bone-2 sm:mt-10" style={delay(380)}>
            {t.lead}
          </p>
          <p className="rise mt-4 max-w-[34rem] text-[0.9375rem] text-bone-3" style={delay(440)}>
            <span className="text-bone">{t.badge}</span> — {t.badgeNote}
          </p>

          <div className="rise mt-9 flex flex-col gap-3 sm:flex-row sm:items-center" style={delay(500)}>
            <ButtonLink
              href={href("revenueAudit", locale)}
              className="!min-h-14 !px-7 text-[1rem]"
              track="revenue_audit_cta_clicked"
              trackPlace="hero"
            >
              {cta.revenueAudit}
            </ButtonLink>
            <ButtonLink
              href={href("revenueOs", locale)}
              variant="secondary"
              className="!min-h-14"
              track="revenue_os_cta_clicked"
              trackPlace="hero"
            >
              {cta.revenueOs}
            </ButtonLink>
          </div>

          <ul className="rise mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[0.875rem] text-bone-3" style={delay(580)}>
            {t.checks.map((check) => (
              <li key={check} className="flex items-center gap-2">
                <Check className="size-3.5 text-gold" />
                {check}
              </li>
            ))}
          </ul>
        </div>

        <div className="rise relative z-10 mx-auto w-full max-w-[34rem] lg:col-span-5 lg:max-w-none" style={delay(360)}>
          <RevenueFlow t={r.flow} />
        </div>
      </Container>

      {/* Invitation à défiler */}
      <div aria-hidden className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 lg:block">
        <span className="block h-10 w-px overflow-hidden bg-[rgb(242_238_230/0.12)]">
          <span className="scroll-cue block h-1/2 w-full bg-gold" />
        </span>
      </div>
    </section>
  );
}
