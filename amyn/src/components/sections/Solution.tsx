"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Container } from "@/components/ui/Container";
import { DisplayLines } from "@/components/ui/DisplayLines";
import { GridLines } from "@/components/ui/GridLines";
import { Wordmark } from "@/components/ui/Wordmark";
import { solution } from "@/lib/content";
import { EASE, inView, stagger } from "@/lib/motion";

/**
 * SECTION 03 — SOLUTION — « LA SOUDURE »
 *
 * L'inverse exact de la section 02 : là-bas asymétrie, marge et gris froid ;
 * ici symétrie, axe et or. Le changement d'alignement fait partie de la
 * sensation de transformation.
 *
 * La ligne brisée du CONSTAT se recompose sous les yeux du visiteur : les
 * fragments se réalignent, les ruptures se referment, l'or remonte le long
 * du trait. La couleur revient AVANT le premier mot — la sensation précède
 * l'explication.
 *
 * Puis l'axe se divise en trois brins (BUILD, CONVERT, GROW) et se rejoint
 * sous la promesse de marque.
 */

/* Exactement les désalignements de la section 02 : c'est la même ligne. */
const DRIFT = [0, 11, -8, 15, -12, 9];

export function Solution() {
  const ref = useRef<HTMLElement>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  /* Le halo chaud monte à mesure qu'on traverse la section. */
  const halo = useTransform(scrollYProgress, [0.05, 0.45], [0, 1]);

  return (
    <section ref={ref} id="solution" className="relative overflow-hidden pb-32 sm:pb-40">
      <motion.div
        aria-hidden
        style={{ opacity: halo }}
        className="goldlight pointer-events-none absolute inset-0"
      />
      <GridLines />

      <Container className="relative">
        {/* ① LA SOUDURE ------------------------------------------------- */}
        <Weld />

        {/* ② LE TITRE — centré sur l'axe que la ligne vient de tracer. */}
        <motion.div
          {...inView}
          variants={stagger(0.09)}
          className="flex flex-col items-center text-center"
        >
          <motion.div
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { duration: 0.8, ease: EASE } },
            }}
            className="flex items-center gap-4"
          >
            <span className="eyebrow text-bone-mute">{solution.index}</span>
            <span className="h-px w-8 bg-gold/60" />
            <span className="eyebrow text-gold">{solution.eyebrow}</span>
          </motion.div>

          <h2 className="display mt-10 text-[clamp(1.75rem,5.6vw,5rem)] uppercase sm:mt-12">
            <DisplayLines lines={solution.title} />
          </h2>
        </motion.div>

        {/* ③ LA TRIADE — l'axe se divise en trois. --------------------- */}
        <Branches />

        <div className="mt-2 grid gap-20 lg:mt-0 lg:grid-cols-3 lg:gap-0">
          {solution.pillars.map((pillar, i) => (
            <Pillar
              key={pillar.name}
              pillar={pillar}
              index={i}
              dimmed={hovered !== null && hovered !== i}
              onHover={setHovered}
            />
          ))}
        </div>

        {/* ④ LA CONVERGENCE — les trois brins se rejoignent. ----------- */}
        <Branches converge />

        <motion.div
          {...inView}
          variants={stagger(0.1)}
          className="mt-24 flex flex-col items-center text-center sm:mt-28 lg:mt-0"
        >
          {/* Sur petit écran l'éventail n'existe pas : ce brin tient l'axe et
              raccroche la signature aux trois piliers. */}
          <motion.span
            variants={{
              hidden: { scaleY: 0 },
              visible: { scaleY: 1, transition: { duration: 0.8, ease: EASE } },
            }}
            className="mb-14 h-14 w-px origin-top bg-gold/45 lg:hidden"
          />

          <p className="display text-[clamp(1.15rem,3.2vw,2.6rem)] uppercase">
            <DisplayLines lines={solution.promise} />
          </p>

          <motion.span
            variants={{
              hidden: { scaleX: 0 },
              visible: {
                scaleX: 1,
                transition: { duration: 1, delay: 0.3, ease: EASE },
              },
            }}
            className="rule-gold mt-10 h-px w-[min(70vw,16rem)] origin-center"
          />

          <motion.span
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { duration: 0.9, delay: 0.45, ease: EASE },
              },
            }}
            className="mt-6"
          >
            <Wordmark className="text-[0.8rem]" />
          </motion.span>
        </motion.div>
      </Container>
    </section>
  );
}

/* ==========================================================================
   ① LA SOUDURE
   ========================================================================== */

/**
 * Six fragments qui reprennent la position exacte où la section 02 les a
 * laissés, puis glissent vers l'axe central, referment leurs ruptures et
 * s'allument en or du haut vers le bas.
 *
 * Tout est piloté par la position de scroll : le visiteur fait la soudure
 * lui-même, et peut la défaire en remontant.
 */
function Weld() {
  const boxRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLSpanElement>(null);
  const calm = useReducedMotion();

  /* On mesure où la section 02 posait sa ligne, plutôt que de coder en dur
     une valeur qui deviendrait fausse au premier changement de gabarit. */
  const [geo, setGeo] = useState({ spineX: 0, travel: 0 });

  useEffect(() => {
    const box = boxRef.current;
    const marker = markerRef.current;
    if (!box || !marker) return;

    const observer = new ResizeObserver(() => {
      const b = box.getBoundingClientRect();
      const m = marker.getBoundingClientRect();
      const spineX = m.left - b.left;
      setGeo({ spineX, travel: b.width / 2 - spineX });
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const { scrollYProgress } = useScroll({
    target: boxRef,
    offset: ["start end", "end center"],
  });

  return (
    <div
      ref={boxRef}
      className="relative h-[58svh] min-h-[22rem] w-full sm:h-[64svh] sm:min-h-[26rem]"
    >
      {/* Repère invisible : même gabarit de grille que la section 02, donc
          même abscisse de ligne, à tous les formats d'écran. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 lg:grid lg:grid-cols-[10rem_1fr] lg:gap-16 xl:grid-cols-[13rem_1fr]"
      >
        <span className="hidden lg:block" />
        <span ref={markerRef} className="block h-px w-px" />
      </div>

      <div
        aria-hidden
        className="absolute inset-y-0"
        style={{ left: geo.spineX }}
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <WeldFragment
            key={i}
            index={i}
            progress={scrollYProgress}
            travel={geo.travel}
            calm={calm}
          />
        ))}
      </div>
    </div>
  );
}

function WeldFragment({
  index,
  progress,
  travel,
  calm,
}: {
  index: number;
  progress: MotionValue<number>;
  travel: number;
  calm: boolean | null;
}) {
  /* Réalignement, puis fermeture des ruptures, puis embrasement : les trois
     temps se chevauchent à peine, pour qu'on lise chaque geste.

     Le premier cinquième du défilement ne bouge rien : les fragments restent
     exactement là où le CONSTAT les a laissés, le temps qu'on les reconnaisse. */
  const x = useTransform(progress, [0.28, 0.6], [DRIFT[index], travel]);
  const gap = useTransform(progress, [0.34, 0.68], [20, 0]);
  const height = useTransform(gap, (g) => `calc(16.6667% - ${g}px)`);

  /* L'or descend fragment par fragment : le signal se propage. */
  const ignite = 0.62 + index * 0.05;
  const gold = useTransform(progress, [ignite, ignite + 0.1], [0, 1]);
  const glow = useTransform(gold, [0, 1], [0, 0.4]);

  if (calm) {
    return (
      <span
        className="absolute left-0 w-px bg-gold"
        style={{
          top: `${index * 16.6667}%`,
          height: "16.6667%",
          transform: `translateX(${travel}px)`,
        }}
      />
    );
  }

  return (
    <motion.span
      style={{ x, height, top: `${index * 16.6667}%` }}
      className="absolute left-0 w-px bg-bone/15"
    >
      <motion.span
        style={{ opacity: glow }}
        className="absolute -inset-x-[3px] inset-y-0 bg-gold blur-[3px]"
      />
      <motion.span style={{ opacity: gold }} className="absolute inset-0 bg-gold" />
    </motion.span>
  );
}

/* ==========================================================================
   ③ LES TROIS BRINS
   ========================================================================== */

/**
 * L'éventail : un tronc, trois branches — un système, trois fonctions.
 * `converge` retourne le dessin pour le raccord final.
 *
 * Réservé aux grands écrans : en dessous, les piliers s'empilent et chacun
 * reprend l'axe avec son propre brin. Ce n'est pas un repli, c'est la même
 * idée dite autrement.
 */
const BRANCH_H = 128;

function Branches({ converge = false }: { converge?: boolean }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  /* Le tracé est calculé en pixels réels plutôt que dans un repère étiré :
     c'est la seule façon de garder un trait d'exactement 1 px quand la boîte
     est bien plus large que haute. */
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(() =>
      setWidth(box.getBoundingClientRect().width),
    );
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const draw = (delay: number) => ({
    initial: { pathLength: 0 },
    whileInView: { pathLength: 1 },
    viewport: { once: true, amount: 0.4 },
    transition: { duration: 1.1, delay, ease: EASE },
  });

  /* Les trois brins visent le centre exact de chaque colonne de piliers. */
  const left = width / 6;
  const mid = width / 2;
  const right = (width * 5) / 6;
  const H = BRANCH_H;

  const branch = (to: number) =>
    `M${mid} 0 V${H * 0.16} C${mid} ${H * 0.55}, ${to} ${H * 0.45}, ${to} ${H * 0.82} V${H}`;

  return (
    <div
      ref={boxRef}
      aria-hidden
      className={`relative hidden w-full lg:block ${converge ? "mt-4" : "mt-16"}`}
      style={{ height: H }}
    >
      {width > 0 && (
        <svg
          viewBox={`0 0 ${width} ${H}`}
          className={`h-full w-full ${converge ? "-scale-y-100" : ""}`}
          fill="none"
        >
          <g stroke="var(--color-gold)" strokeWidth={1} strokeOpacity={0.55}>
            <motion.path d={branch(left)} {...draw(0.1)} />
            <motion.path d={`M${mid} 0 V${H}`} {...draw(0)} />
            <motion.path d={branch(right)} {...draw(0.1)} />
          </g>
        </svg>
      )}
    </div>
  );
}

function Pillar({
  pillar,
  index,
  dimmed,
  onHover,
}: {
  pillar: { name: string; body: string; mirror: string };
  index: number;
  dimmed: boolean;
  onHover: (i: number | null) => void;
}) {
  return (
    <motion.div
      {...inView}
      variants={stagger(0.08, index * 0.12)}
      onHoverStart={() => onHover(index)}
      onHoverEnd={() => onHover(null)}
      animate={{ opacity: dimmed ? 0.42 : 1 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="pillar group flex flex-col items-center px-6 text-center"
    >
      {/* Le brin qui alimente le pilier. Au survol, une impulsion descend. */}
      <motion.span
        variants={{
          hidden: { scaleY: 0 },
          visible: { scaleY: 1, transition: { duration: 0.8, ease: EASE } },
        }}
        className="relative h-14 w-px origin-top overflow-hidden bg-gold/45"
      >
        <span className="strand-pulse absolute inset-x-0 h-6 bg-gold opacity-0" />
      </motion.span>

      <motion.h3
        variants={{
          hidden: { opacity: 0, y: 18 },
          visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.7, delay: 0.1, ease: EASE },
          },
        }}
        className="display mt-8 text-[clamp(1.6rem,3.4vw,2.75rem)] uppercase text-bone transition-colors duration-500 group-hover:text-gold-light"
      >
        {pillar.name}
      </motion.h3>

      <motion.p
        variants={{
          hidden: { opacity: 0, y: 16 },
          visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.7, delay: 0.2, ease: EASE },
          },
        }}
        className="mt-5 max-w-[17rem] text-balance text-[0.95rem] leading-[1.7] text-bone-dim"
      >
        {pillar.body}
      </motion.p>

      {/* La phrase-miroir : elle retourne un problème de la section 02. */}
      <motion.p
        variants={{
          hidden: { opacity: 0, y: 16 },
          visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.7, delay: 0.32, ease: EASE },
          },
        }}
        className="accent mt-6 max-w-[17rem] text-balance text-[clamp(1.05rem,1.6vw,1.35rem)] leading-[1.45] text-bone"
      >
        {pillar.mirror}
      </motion.p>
    </motion.div>
  );
}
