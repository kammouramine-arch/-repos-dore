import { Fragment, type CSSProperties, type ElementType, type ReactNode } from "react";

/**
 * Primitives de mise en page. Une largeur de contenu, un rythme vertical,
 * trois tons de section — partout les mêmes.
 */

export function Container({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}) {
  return (
    <Tag className={`mx-auto w-full max-w-[88rem] px-5 sm:px-8 lg:px-12 ${className}`}>
      {children}
    </Tag>
  );
}

type Tone = "ink" | "ink-2" | "paper";

export function Section({
  children,
  tone = "ink",
  className = "",
  id,
  labelledBy,
  spacing = "default",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  id?: string;
  labelledBy?: string;
  spacing?: "default" | "tight" | "none";
}) {
  const pad =
    spacing === "none"
      ? ""
      : spacing === "tight"
        ? "py-16 sm:py-20 lg:py-24"
        : "py-20 sm:py-28 lg:py-36";
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={`tone-${tone} defer-render relative ${pad} ${className}`}
    >
      {children}
    </section>
  );
}

/**
 * Repère de chapitre : « 02 —— SERVICES ». Il doit se voir en faisant
 * défiler la page sans lire : numéro en laiton, filet, intitulé contrasté.
 * Même dessin sur toutes les pages.
 */
export function Label({
  children,
  number,
  className = "",
}: {
  children: ReactNode;
  number?: string;
  className?: string;
}) {
  return (
    <p className={`chapter ${className}`}>
      {number && (
        <>
          <span className="chapter-number">{number}</span>
          <span aria-hidden className="chapter-rule" />
        </>
      )}
      <span className="chapter-name">{children}</span>
    </p>
  );
}

/** Décalage d'apparition, en millisecondes. */
export const delay = (ms: number) => ({ "--delay": ms }) as CSSProperties;

export type HeadingLine = { text?: string; accent?: string };

/* Apostrophe typographique dans les titres : l'apostrophe droite paraît
   décollée dans le serif italique. */
const typo = (text?: string) => text?.replace(/'/g, "\u2019");

/* Noms de classes écrits en entier : Tailwind ne génère que ce qu'il lit. */
const DISPLAY = {
  xl: "display-xl",
  lg: "display-lg",
  md: "display-md",
  sm: "display-sm",
} as const;

/**
 * Titre éditorial à lignes masquées. Chaque ligne remonte derrière sa
 * découpe quand le titre entre à l'écran. `accent` termine la ligne en
 * italique — un seul accent par titre.
 */
export function Heading({
  lines,
  as: Tag = "h2",
  size = "lg",
  id,
  className = "",
}: {
  lines: HeadingLine[];
  as?: "h1" | "h2" | "h3";
  size?: "xl" | "lg" | "md" | "sm";
  id?: string;
  className?: string;
}) {
  return (
    <Tag id={id} data-reveal="mask" className={`${DISPLAY[size]} ${className}`}>
      {lines.map((line, i) => (
        <Fragment key={i}>
          <span className="mask-line" style={delay(i * 90)}>
            <span>
              {typo(line.text)}
              {line.text && line.accent ? " " : null}
              {line.accent && <em className="accent text-fg-2">{typo(line.accent)}</em>}
            </span>
          </span>
          {/* Espace entre les lignes pour les lecteurs d'écran. */}
          {i < lines.length - 1 ? " " : null}
        </Fragment>
      ))}
    </Tag>
  );
}

/** Titre de page (h1) : même dessin, animé au chargement. */
export function PageTitle({
  lines,
  size = "xl",
  className = "",
}: {
  lines: HeadingLine[];
  size?: "xl" | "lg";
  className?: string;
}) {
  return (
    <h1 className={`${DISPLAY[size]} ${className}`}>
      {lines.map((line, i) => (
        <Fragment key={i}>
          <span className="rise-line" style={delay(60 + i * 90)}>
            <span>
              {typo(line.text)}
              {line.text && line.accent ? " " : null}
              {line.accent && <em className="accent text-fg-2">{typo(line.accent)}</em>}
            </span>
          </span>
          {i < lines.length - 1 ? " " : null}
        </Fragment>
      ))}
    </h1>
  );
}

/** Étiquette courte (« Concept », « Sur devis »). */
export function Tag({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`label inline-flex items-center rounded-full border border-line-strong px-2.5 py-1 text-[0.6875rem] text-fg-2 ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * Ouverture de section : repère, titre, chapeau. Toujours la même
 * construction, pour que le site se lise d'une seule voix.
 */
export function SectionIntro({
  number,
  label,
  lines,
  lead,
  id,
  size = "lg",
  className = "",
  children,
}: {
  number?: string;
  label: string;
  lines: HeadingLine[];
  lead?: ReactNode;
  id?: string;
  size?: "lg" | "md";
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={className}>
      <div data-reveal="fade">
        <Label number={number}>{label}</Label>
      </div>
      <Heading id={id} lines={lines} size={size} className="mt-6 sm:mt-8" />
      {lead && (
        <div data-reveal className="lead mt-6 max-w-2xl text-fg-2 sm:mt-8" style={delay(160)}>
          {lead}
        </div>
      )}
      {children}
    </div>
  );
}
