import { Fragment } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Container, delay } from "@/components/ui/Layout";
import { COMPACT, ConceptSite, WIDE } from "@/components/visuals/ConceptSite";
import { BrowserFrame, PhoneFrame } from "@/components/visuals/Frames";
import { BookingMock, QuoteBoardMock } from "@/components/visuals/Mocks";
import { projectBySlug } from "@/lib/projects";
import { cta } from "@/lib/site";

/**
 * Hero.
 *
 * En cinq secondes : ce que fait AMYN (le repère et le chapeau), pour qui
 * (les entreprises), et en quoi c'est différent (du sur-mesure, et une
 * première piste avant tout engagement).
 *
 * L'entrée est animée en CSS pur : elle démarre avec la page, sans attendre
 * le JavaScript.
 */
export function Hero() {
  const lines = [
    { text: "Votre entreprise mérite" },
    { text: "mieux qu\u2019une présence" },
    { text: "digitale ", accent: "générique." },
  ];

  return (
    <section
      aria-labelledby="hero-title"
      className="tone-ink relative overflow-hidden pb-20 pt-[calc(var(--header-h)+3rem)] sm:pb-28 sm:pt-[calc(var(--header-h)+4.5rem)] lg:pb-32 lg:pt-[calc(var(--header-h)+5.5rem)]"
    >
      {/* Lumière rasante, très basse : elle donne une profondeur au noir
          sans devenir un dégradé décoratif. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[80vh] bg-[radial-gradient(55%_60%_at_78%_10%,rgb(198_167_106/0.08),transparent_70%)]"
      />

      <Container className="relative grid items-center gap-16 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-7">
          <p className="label rise text-fg-3" style={delay(0)}>
            Studio digital — sites web, applications, outils sur mesure
          </p>

          <h1
            id="hero-title"
            className="mt-7 font-serif text-[clamp(2.6rem,6.1vw,6rem)] font-normal leading-[0.98] tracking-[-0.022em] sm:mt-9"
          >
            {lines.map((line, i) => (
              <Fragment key={i}>
                <span className="rise-line" style={delay(i * 70)}>
                  <span>
                    {line.text}
                    {line.accent && <em className="accent text-fg-2">{line.accent}</em>}
                  </span>
                </span>
                {i < lines.length - 1 ? " " : null}
              </Fragment>
            ))}
          </h1>

          <p className="lead rise mt-9 max-w-[34rem] text-fg-2 sm:mt-11" style={delay(200)}>
            AMYN conçoit des sites web, des applications et des outils digitaux —
            réservation, suivi des demandes, accueil client — autour de la façon
            dont votre entreprise fonctionne réellement.
          </p>

          <div className="rise mt-9 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4" style={delay(280)}>
            <ButtonLink href={cta.firstLook.href}>{cta.firstLook.label}</ButtonLink>
            <ButtonLink href={cta.services.href} variant="secondary">
              {cta.services.label}
            </ButtonLink>
          </div>

          <p className="rise mt-6 max-w-md text-[0.875rem] leading-relaxed text-fg-3" style={delay(340)}>
            Sans engagement. Selon le projet, nous pouvons vous montrer une première
            piste avant toute prestation payante.
          </p>
        </div>

        <HeroComposition />
      </Container>
    </section>
  );
}

/**
 * Trois solutions, trois supports : un site, une réservation sur téléphone,
 * un tableau de suivi. Composées comme une planche, avec leurs légendes —
 * pas comme des captures flottantes.
 */
function HeroComposition() {
  const project = projectBySlug("maison-elan")!;
  const siteLabel = "Illustration : page d'accueil d'un restaurant, concept créé par AMYN.";

  return (
    <div className="rise relative lg:col-span-5" style={delay(380)}>
      <div className="relative pb-[18%] pl-[14%] sm:pl-[22%] lg:pl-[10%]">
        {/* Site web */}
        <figure>
          <Caption number="01" title="Site web" className="mb-3 mt-0 text-right" />
          <BrowserFrame
            url={project.domain}
            width={COMPACT.width}
            height={COMPACT.height}
            label={siteLabel}
            className="sm:hidden"
          >
            <ConceptSite concept={project} compact />
          </BrowserFrame>
          <BrowserFrame
            url={project.domain}
            width={WIDE.width}
            height={WIDE.height}
            label={siteLabel}
            className="hidden sm:block"
          >
            <ConceptSite concept={project} />
          </BrowserFrame>
        </figure>

        {/* Suivi des demandes — masqué sur téléphone pour garder la planche
            lisible. */}
        <figure className="drift absolute bottom-0 right-0 hidden w-[62%] sm:block" style={{ "--drift-from": "1.5rem", "--drift-to": "-1.5rem" } as React.CSSProperties}>
          <BrowserFrame
            url="app.thermia-services.fr"
            width={1280}
            height={800}
            label="Illustration : tableau de suivi des demandes et des devis."
          >
            <QuoteBoardMock />
          </BrowserFrame>
          <Caption number="03" title="Suivi des demandes" />
        </figure>

        {/* Réservation */}
        <figure
          className="drift absolute bottom-[-2%] left-0 w-[34%] sm:w-[27%] lg:w-[31%]"
          style={{ "--drift-from": "3rem", "--drift-to": "-2rem" } as React.CSSProperties}
        >
          <PhoneFrame label="Illustration : réservation en ligne sur téléphone.">
            <BookingMock />
          </PhoneFrame>
          <Caption number="02" title="Réservation" />
        </figure>
      </div>
    </div>
  );
}

function Caption({
  number,
  title,
  className = "",
}: {
  number: string;
  title: string;
  className?: string;
}) {
  return (
    <figcaption className={`label mt-3 text-[0.6875rem] text-fg-3 ${className}`}>
      <span className="text-accent">{number}</span> {title}
    </figcaption>
  );
}
