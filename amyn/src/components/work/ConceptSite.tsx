import type { Concept } from "@/lib/concepts";

/**
 * Rendu d'un concept de site web.
 *
 * Ce n'est ni une image ni une maquette : c'est une vraie page d'accueil en
 * HTML, écrite aux dimensions réelles d'un site (1440 px de large), que la
 * fenêtre de navigateur met ensuite à l'échelle. Le texte reste donc net, et
 * les proportions sont exactement celles d'un site en production.
 *
 * `compact` bascule sur la composition étroite du même site — le concept est
 * lui-même responsive, ce qui est aussi la démonstration.
 */

export const WIDE = { width: 1440, height: 1000 } as const;
export const COMPACT = { width: 430, height: 780 } as const;

/**
 * Visuel du site. Aucune photo n'est utilisée : ces surfaces sont composées
 * en CSS à partir des trois teintes du concept. Elles tiennent le rôle d'une
 * image sans prétendre en être une.
 */
function Art({
  concept,
  variant = 0,
  className = "",
  style,
}: {
  concept: Concept;
  variant?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [a, b, c] = concept.art;

  /* Une source de lumière franche, une masse sombre, un fond dégradé : de
     quoi lire une profondeur plutôt qu'un aplat flou. */
  const compositions = [
    `radial-gradient(58% 52% at 28% 26%, ${c} 0%, transparent 72%),
     radial-gradient(75% 90% at 92% 92%, ${a} 0%, transparent 68%),
     linear-gradient(158deg, ${b} 0%, ${a} 100%)`,
    `radial-gradient(50% 46% at 74% 22%, ${c} 0%, transparent 70%),
     radial-gradient(85% 80% at 8% 96%, ${a} 0%, transparent 66%),
     linear-gradient(28deg, ${a} 0%, ${b} 100%)`,
    `radial-gradient(70% 40% at 50% 6%, ${b} 0%, transparent 74%),
     radial-gradient(46% 44% at 22% 82%, ${c} 0%, transparent 68%),
     linear-gradient(196deg, ${a} 0%, ${b} 100%)`,
    /* Hero pleine largeur : la lumière doit tomber à droite, là où le voile
       du texte ne passe pas. */
    `radial-gradient(52% 60% at 71% 38%, ${c} 0%, transparent 70%),
     radial-gradient(80% 85% at 100% 100%, ${b} 0%, transparent 62%),
     linear-gradient(135deg, ${a} 0%, ${b} 100%)`,
  ];

  return (
    <div
      aria-hidden
      className={`relative overflow-hidden ${className}`}
      style={{
        backgroundImage: compositions[variant % compositions.length],
        ...style,
      }}
    >
      {/* Vignette : les bords retombent, comme sur une vraie prise de vue. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(120% 110% at 50% 45%, transparent 42%, ${a}CC 100%)`,
        }}
      />
      <div className="grain-layer absolute inset-0 mix-blend-overlay" />
    </div>
  );
}

export function ConceptSite({
  concept,
  compact = false,
}: {
  concept: Concept;
  compact?: boolean;
}) {
  const p = concept.palette;
  const font =
    concept.typography === "serif"
      ? "Georgia, 'Iowan Old Style', 'Times New Roman', serif"
      : "var(--font-inter), 'Helvetica Neue', Arial, sans-serif";

  const dims = compact ? COMPACT : WIDE;

  return (
    <div
      style={{
        width: dims.width,
        height: dims.height,
        background: p.bg,
        color: p.ink,
        fontFamily: font,
      }}
      className="flex flex-col overflow-hidden"
    >
      <Nav concept={concept} compact={compact} />
      <Hero concept={concept} compact={compact} />
      <Block concept={concept} compact={compact} />
      <Footer concept={concept} compact={compact} />
    </div>
  );
}

/* ========================================================================== */

function Nav({ concept, compact }: { concept: Concept; compact: boolean }) {
  const p = concept.palette;

  return (
    <header
      style={{ borderColor: p.line, paddingInline: compact ? 24 : 64 }}
      className={`flex shrink-0 items-center justify-between border-b ${
        compact ? "h-[64px]" : "h-[84px]"
      }`}
    >
      <span
        style={{
          letterSpacing: concept.wordmark === "wide" ? "0.24em" : "0.02em",
          fontSize: compact ? 15 : 19,
          textTransform: concept.wordmark === "wide" ? "uppercase" : "none",
          fontWeight: concept.wordmark === "wide" ? 600 : 700,
        }}
      >
        {concept.brand}
      </span>

      {compact ? (
        <span className="flex flex-col gap-[5px]">
          <span style={{ background: p.ink }} className="block h-[1.5px] w-[20px]" />
          <span style={{ background: p.ink }} className="block h-[1.5px] w-[20px]" />
        </span>
      ) : (
        <nav className="flex items-center gap-[38px]">
          {concept.nav.slice(0, 3).map((item) => (
            <span key={item} style={{ color: p.muted, fontSize: 15 }}>
              {item}
            </span>
          ))}
          <span
            style={{
              background: concept.palette.accent,
              color: p.onAccent,
              fontSize: 14,
              padding: "11px 22px",
            }}
            className="rounded-full font-medium"
          >
            {concept.nav[3]}
          </span>
        </nav>
      )}
    </header>
  );
}

/* ========================================================================== */

function Hero({ concept, compact }: { concept: Concept; compact: boolean }) {
  const p = concept.palette;
  const titleSize = compact ? 34 : 68;

  const Eyebrow = (
    <span
      style={{ color: concept.palette.accent, fontSize: compact ? 11 : 13 }}
      className="font-semibold uppercase tracking-[0.24em]"
    >
      {concept.eyebrow}
    </span>
  );

  const Title = (
    <h1
      style={{ fontSize: titleSize, lineHeight: 1.06, letterSpacing: "-0.02em" }}
      className="font-medium"
    >
      {concept.title.map((line) => (
        <span key={line} className="block">
          {line}
        </span>
      ))}
    </h1>
  );

  const Tagline = (
    <p
      style={{ color: p.muted, fontSize: compact ? 14 : 17, lineHeight: 1.65 }}
      className={compact ? "max-w-full" : "max-w-[440px]"}
    >
      {concept.tagline}
    </p>
  );

  const Buttons = (
    <div className="flex items-center gap-4">
      <span
        style={{
          background: concept.palette.accent,
          color: p.onAccent,
          fontSize: compact ? 13 : 15,
          padding: compact ? "13px 22px" : "16px 30px",
        }}
        className="rounded-full font-medium"
      >
        {concept.primaryCta}
      </span>
      <span
        style={{
          borderColor: p.line,
          color: p.ink,
          fontSize: compact ? 13 : 15,
          padding: compact ? "13px 20px" : "16px 28px",
        }}
        className="rounded-full border"
      >
        {concept.secondaryCta}
      </span>
    </div>
  );

  /* --- Composition étroite : tout s'empile. --- */
  if (compact) {
    return (
      <section className="shrink-0">
        <Art concept={concept} variant={0} style={{ height: 210 }} />
        <div className="flex flex-col gap-4 px-6 py-7">
          {Eyebrow}
          {Title}
          {Tagline}
          {Buttons}
        </div>
      </section>
    );
  }

  if (concept.hero === "overlay") {
    return (
      <section className="relative shrink-0" style={{ height: 520 }}>
        {/* `Art` porte déjà `relative` : on le positionne par un parent
            plutôt qu'en lui ajoutant `absolute`, que Tailwind ferait
            perdre face à `relative`. */}
        <div className="absolute inset-0">
          <Art concept={concept} variant={3} className="h-full w-full" />
        </div>
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(90deg, ${p.bg}F2 0%, ${p.bg}D9 32%, ${p.bg}59 56%, transparent 76%)`,
          }}
        />
        <div className="relative flex h-full flex-col justify-center gap-6 px-16">
          {Eyebrow}
          {Title}
          {Tagline}
          {Buttons}
        </div>
      </section>
    );
  }

  if (concept.hero === "centered") {
    return (
      <section className="shrink-0">
        <div className="flex flex-col items-center gap-6 px-16 pb-10 pt-14 text-center">
          {Eyebrow}
          <div className="max-w-[860px]">{Title}</div>
          <p
            style={{ color: p.muted, fontSize: 17, lineHeight: 1.65 }}
            className="max-w-[560px]"
          >
            {concept.tagline}
          </p>
          {Buttons}
        </div>
        <Art concept={concept} variant={1} style={{ height: 226 }} />
      </section>
    );
  }

  /* --- split --- */
  return (
    <section className="flex shrink-0" style={{ height: 520 }}>
      <div className="flex w-[52%] flex-col justify-center gap-6 px-16">
        {Eyebrow}
        {Title}
        {Tagline}
        {Buttons}
      </div>
      <Art concept={concept} variant={1} className="w-[48%]" />
    </section>
  );
}

/* ========================================================================== */

function Block({ concept, compact }: { concept: Concept; compact: boolean }) {
  const p = concept.palette;
  const pad = compact ? 24 : 64;

  const Heading = (
    <div className="flex items-baseline justify-between">
      <h2
        style={{ fontSize: compact ? 20 : 30, letterSpacing: "-0.01em" }}
        className="font-medium"
      >
        {concept.blockTitle}
      </h2>
      {!compact && (
        <span style={{ color: concept.palette.accent, fontSize: 14 }}>
          Tout voir
        </span>
      )}
    </div>
  );

  return (
    <section
      style={{ background: p.surface, paddingInline: pad }}
      className={`flex flex-1 flex-col justify-center gap-6 ${compact ? "py-7" : "py-10"}`}
    >
      {Heading}

      {concept.block === "list" && (
        <ul className="flex flex-col">
          {concept.entries.map((entry) => (
            <li
              key={entry.name}
              style={{ borderColor: p.line }}
              className={`flex items-baseline justify-between border-t ${
                compact ? "py-3.5" : "py-5"
              }`}
            >
              <span style={{ fontSize: compact ? 14 : 19 }}>{entry.name}</span>
              <span style={{ color: p.muted, fontSize: compact ? 12 : 15 }}>
                {entry.detail}
              </span>
            </li>
          ))}
        </ul>
      )}

      {(concept.block === "grid" || concept.block === "cards") && (
        <div className={`grid gap-5 ${compact ? "grid-cols-1" : "grid-cols-3"}`}>
          {concept.entries.map((entry, i) => (
            <div key={entry.name} style={{ background: p.bg }} className="overflow-hidden">
              {concept.block === "grid" && (
                <Art concept={concept} variant={i} style={{ height: compact ? 74 : 132 }} />
              )}
              <div className={compact ? "p-3.5" : "p-5"}>
                <p style={{ fontSize: compact ? 14 : 17 }} className="font-medium">
                  {entry.name}
                </p>
                <p
                  style={{ color: p.muted, fontSize: compact ? 12 : 14 }}
                  className="mt-1.5"
                >
                  {entry.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {concept.block === "gallery" && (
        <div className={`grid gap-5 ${compact ? "grid-cols-2" : "grid-cols-3"}`}>
          {concept.entries.map((entry, i) => (
            <figure key={entry.name}>
              <Art concept={concept} variant={i} style={{ height: compact ? 78 : 158 }} />
              <figcaption
                style={{ color: p.muted, fontSize: compact ? 11 : 14 }}
                className="mt-2.5"
              >
                {entry.name}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}

/* ========================================================================== */

function Footer({ concept, compact }: { concept: Concept; compact: boolean }) {
  const p = concept.palette;

  return (
    <footer
      style={{ borderColor: p.line, paddingInline: compact ? 24 : 64 }}
      className={`flex shrink-0 items-center justify-between border-t ${
        compact ? "h-[52px]" : "h-[62px]"
      }`}
    >
      <span style={{ color: p.muted, fontSize: compact ? 11 : 13 }}>
        © {concept.brand}
      </span>
      {!compact && (
        <span style={{ color: p.muted, fontSize: 13 }}>
          {concept.nav.join("   ·   ")}
        </span>
      )}
    </footer>
  );
}
