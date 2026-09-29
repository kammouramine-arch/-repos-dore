import { Fragment } from "react";
import { Atmosphere } from "@/components/ui/Ambient";
import { ButtonLink } from "@/components/ui/Button";
import { Check } from "@/components/ui/Icons";
import { Container, delay } from "@/components/ui/Layout";
import { BrowserShot, PhoneShot } from "@/components/visuals/Shots";
import { cta } from "@/lib/site";

/**
 * Hero — compris en trois secondes : ce que fait AMYN (sites, apps,
 * systèmes), pour qui (les entreprises), et la preuve à droite, en images.
 *
 * Le texte arrive en CSS pur dès la première image ; la scène flotte,
 * s'incline vers le curseur (Interactions.tsx) et glisse au défilement.
 */
export function Hero() {
  const words = [{ text: "Sites." }, { text: "Apps." }, { text: "Systèmes.", accent: true }];

  return (
    <section
      aria-labelledby="hero-title"
      className="tone-ink relative flex min-h-[100svh] items-center overflow-hidden pb-16 pt-[calc(var(--header-h)+2.5rem)] lg:pb-20"
    >
      <Atmosphere variant="hero" />
      <Container className="relative grid items-center gap-14 lg:grid-cols-12 lg:gap-8">
        <div className="relative z-10 lg:col-span-6">
          <p
            className="rise inline-flex items-center gap-2 rounded-full border border-[rgb(242_238_230/0.12)] bg-[rgb(242_238_230/0.04)] py-1.5 pl-2 pr-3.5 text-[0.8125rem] text-bone-2 backdrop-blur-md"
            style={delay(0)}
          >
            <span className="relative flex size-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-gold/60 motion-reduce:hidden" />
              <span className="relative size-2 rounded-full bg-gold" />
            </span>
            Studio digital pour les entreprises
          </p>

          <h1 id="hero-title" className="display-hero mt-7 sm:mt-9">
            {words.map((w, i) => (
              <Fragment key={w.text}>
                <span className="rise-line" style={delay(60 + i * 110)}>
                  {w.accent ? <em className="accent pr-[0.08em]">{w.text}</em> : w.text}
                </span>
                {i < words.length - 1 ? " " : null}
              </Fragment>
            ))}
          </h1>

          <p className="lead rise mt-8 max-w-[30rem] text-bone-2 sm:mt-10" style={delay(420)}>
            Sites web, applications et systèmes digitaux conçus autour de votre activité.
          </p>

          <div className="rise mt-9 flex flex-col gap-3 sm:flex-row sm:items-center" style={delay(500)}>
            <ButtonLink href={cta.firstLook.href} className="!min-h-14 !px-7 text-[1rem]">
              {cta.firstLook.label}
            </ButtonLink>
            <ButtonLink href={cta.work.href} variant="secondary" className="!min-h-14">
              {cta.work.label}
            </ButtonLink>
          </div>

          <ul className="rise mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[0.875rem] text-bone-3" style={delay(580)}>
            {["Sans engagement", "Une première piste avant tout devis"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Check className="size-3.5 text-gold" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <HeroStage />
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

/**
 * La scène : un site au centre, un tableau de bord derrière, une
 * réservation au premier plan, et deux notifications qui flottent. Chaque
 * plan a sa profondeur : ils ne bougent pas à la même vitesse.
 */
function HeroStage() {
  return (
    <div className="rise relative lg:col-span-6" style={delay(360)}>
      <div
        data-tilt=""
        className="stage relative mx-auto aspect-[1/0.86] w-full max-w-[40rem] lg:max-w-none"
      >
        {/* Arrière-plan : le tableau de suivi. */}
        <div className="plane absolute right-0 top-0 w-[70%] opacity-70 [--depth:-30px]">
          <div className="float-c">
            <BrowserShot id="quotes" sizes="(min-width: 1024px) 30vw, 70vw" />
          </div>
        </div>

        {/* Centre : le site. */}
        <div className="plane absolute left-0 top-[16%] w-[84%] [--depth:10px]">
          <div className="float-a">
            <BrowserShot id="site-maison-elan" eager sizes="(min-width: 1024px) 40vw, 84vw" />
          </div>
        </div>

        {/* Premier plan : la réservation sur téléphone. */}
        <div className="plane absolute bottom-0 right-[3%] w-[31%] [--depth:50px]">
          <div className="float-b">
            <PhoneShot id="table-booking" eager sizes="(min-width: 1024px) 14vw, 31vw" />
          </div>
        </div>

        {/* Notifications */}
        <Notice className="left-[-2%] top-[4%] [--depth:70px] float-b" title="Réservation confirmée" detail="2 pers. · ce soir 20:30" />
        <Notice className="bottom-[10%] left-[8%] [--depth:80px] float-c" title="Nouvelle demande de devis" detail="Rénovation · infos complètes" tone="gold" />
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-x-[10%] bottom-[-6%] h-24 rounded-[50%] bg-[radial-gradient(closest-side,rgb(198_167_106/0.22),transparent)] blur-2xl" />
    </div>
  );
}

function Notice({
  title,
  detail,
  className = "",
  tone = "light",
}: {
  title: string;
  detail: string;
  className?: string;
  tone?: "light" | "gold";
}) {
  return (
    <div
      aria-hidden
      className={`plane absolute hidden items-center gap-3 rounded-2xl border px-3.5 py-3 shadow-[0_20px_50px_-20px_rgb(0_0_0/0.9)] backdrop-blur-xl sm:flex ${
        tone === "gold"
          ? "border-gold/40 bg-[rgb(28_24_18/0.82)]"
          : "border-[rgb(242_238_230/0.14)] bg-[rgb(20_20_20/0.78)]"
      } ${className}`}
    >
      <span className={`flex size-8 items-center justify-center rounded-full ${tone === "gold" ? "bg-gold text-ink" : "bg-[#1F3B2F] text-bone"}`}>
        <Check className="size-4" />
      </span>
      <span>
        <span className="block text-[0.8125rem] font-medium text-bone">{title}</span>
        <span className="block text-[0.75rem] text-bone-3">{detail}</span>
      </span>
    </div>
  );
}
