"use client";

import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState } from "react";
import { Container } from "@/components/ui/Container";
import { DisplayLines } from "@/components/ui/DisplayLines";
import { GridLines } from "@/components/ui/GridLines";
import { MaskLine } from "@/components/ui/MaskLine";
import { problem } from "@/lib/content";
import { EASE, inView, stagger } from "@/lib/motion";

/**
 * SECTION 02 — PROBLÈME — « LA LIGNE ROMPUE »
 *
 * L'idée tient en une phrase : c'est la seule section du site SANS OR.
 * Le hero est doré, la solution le redeviendra ; ici la couleur s'éteint.
 * Personne ne l'analysera — tout le monde le sentira.
 *
 * Le fil conducteur est une ligne verticale : le parcours du client vers le
 * commerce. Elle entre encore dorée, perd sa couleur, puis se rompt six fois,
 * chaque segment repartant légèrement désaligné du précédent.
 */

/* Désalignements dessinés à la main, jamais aléatoires : le hasard se voit.
   L'amplitude doit rester lisible sans devenir un zigzag décoratif. */
const DRIFT = [0, 11, -8, 15, -12, 9];

export function Problem() {
  const [active, setActive] = useState(0);

  return (
    <section id="probleme" className="relative pb-32 pt-24 sm:pb-40 sm:pt-32">
      <div aria-hidden className="coldlight pointer-events-none absolute inset-0" />
      <GridLines />

      <Container className="relative">
        <div className="lg:grid lg:grid-cols-[10rem_1fr] lg:gap-16 xl:grid-cols-[13rem_1fr]">
          {/* ---- Colonne collante : le repère de lecture ------------------ */}
          <aside className="mb-12 lg:sticky lg:top-28 lg:mb-0 lg:self-start">
            <motion.div {...inView} variants={stagger(0.08)}>
              <motion.div
                variants={{
                  hidden: { opacity: 0 },
                  visible: { opacity: 1, transition: { duration: 0.8, ease: EASE } },
                }}
                className="flex items-center gap-4"
              >
                <span className="eyebrow text-bone-mute">{problem.index}</span>
                <span className="h-px w-8 bg-bone/25" />
                <span className="eyebrow text-bone-dim">{problem.eyebrow}</span>
              </motion.div>

              {/* Le compteur : il donne une longueur à parcourir. */}
              <motion.div
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: { duration: 0.8, delay: 0.2, ease: EASE },
                  },
                }}
                className="mt-10 hidden items-end gap-2 lg:flex"
              >
                <span className="relative block h-[1em] w-[1.45em] overflow-hidden font-display text-[3.25rem] font-medium leading-none tracking-tight text-bone">
                  <AnimatePresence initial={false}>
                    <motion.span
                      key={active}
                      initial={{ y: "100%" }}
                      animate={{ y: "0%" }}
                      exit={{ y: "-110%" }}
                      transition={{ duration: 0.55, ease: EASE }}
                      className="absolute left-0 top-0 w-full leading-none"
                    >
                      {problem.items[active].n}
                    </motion.span>
                  </AnimatePresence>
                </span>
                <span className="pb-1 font-display text-lg font-medium leading-none text-bone-mute">
                  / {problem.items.length.toString().padStart(2, "0")}
                </span>
              </motion.div>
            </motion.div>
          </aside>

          {/* ---- L'échine : question, ruptures, bascule ------------------- */}
          <div>
            {/* ① LA QUESTION — après la densité du hero, du silence. */}
            <motion.div
              {...inView}
              variants={stagger(0.09)}
              className="relative flex min-h-[62svh] items-center pl-6 sm:min-h-[70svh] sm:pl-12"
            >
              <motion.div
                variants={{
                  hidden: { scaleY: 0 },
                  visible: {
                    scaleY: 1,
                    transition: { duration: 1.4, ease: EASE },
                  },
                }}
                className="spine-head absolute bottom-3 left-0 top-0 w-px origin-top"
              />

              <h2 className="display text-[clamp(1.9rem,5.3vw,4.75rem)] uppercase">
                <DisplayLines
                  lines={problem.question}
                  accentClassName="text-bone-dim"
                />
              </h2>
            </motion.div>

            {/* ② LES SIX RUPTURES */}
            <div>
              {problem.items.map((item, i) => (
                <ProblemRow
                  key={item.n}
                  item={item}
                  drift={DRIFT[i]}
                  onEnter={() => setActive(i)}
                />
              ))}
            </div>

            {/* Le dernier fragment pend dans le vide. */}
            <motion.div
              {...inView}
              className="relative h-24 sm:h-32"
              variants={{
                hidden: { scaleY: 0 },
                visible: { scaleY: 1, transition: { duration: 1, ease: EASE } },
              }}
            >
              <span
                aria-hidden
                style={{ ["--drift" as string]: `${DRIFT[5]}px` }}
                className="spine spine-tail absolute left-0 top-0 h-full w-px origin-top"
              />
            </motion.div>
          </div>
        </div>

        {/* ③ LA BASCULE — la phrase se détache de l'échine et prend toute
            la largeur : c'est le seul moment de la section qui n'est plus
            accroché au parcours. */}
        <motion.div {...inView} variants={stagger(0.09)} className="mt-6 sm:mt-10">
          <p className="display text-[clamp(1.7rem,4.7vw,4.25rem)] uppercase">
            <DisplayLines
              lines={problem.closing}
              accentClassName="text-bone-dim"
            />
          </p>
        </motion.div>
      </Container>
    </section>
  );
}

/**
 * Un problème = un bloc éditorial, jamais une puce.
 *
 * Le bloc s'éteint une fois dépassé : les problèmes déjà lus s'accumulent
 * en fantômes derrière le lecteur, et seul celui du moment reste vif.
 */
function ProblemRow({
  item,
  drift,
  onEnter,
}: {
  item: { n: string; title: string; body: string };
  drift: number;
  onEnter: () => void;
}) {
  const ref = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const opacity = useTransform(scrollYProgress, [0.55, 0.85], [1, 0.22]);

  return (
    <motion.article
      ref={ref}
      style={{ opacity }}
      className="problem-row group relative py-11 pl-6 sm:py-14 sm:pl-12"
    >
      {/* Détecteur invisible : il n'existe que pour piloter le compteur. */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        onViewportEnter={onEnter}
        viewport={{ margin: "-45% 0px -45% 0px" }}
      />

      {/* Le segment de ligne, décalé — c'est la rupture. */}
      <motion.span
        aria-hidden
        style={{ ["--drift" as string]: `${drift}px` }}
        className="spine absolute bottom-4 left-0 top-4 w-px origin-top bg-bone/15"
        initial={{ scaleY: 0 }}
        whileInView={{ scaleY: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.9, ease: EASE }}
      >
        {/* Amorce plus claire en tête de segment : l'œil accroche le point de
            départ, et le désalignement avec le segment du dessus se lit. */}
        <span className="absolute inset-x-0 top-0 h-2.5 bg-bone/45" />
      </motion.span>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.5 }}
        className="transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-2 motion-reduce:transition-none"
      >
        <motion.span
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { duration: 0.6, ease: EASE } },
          }}
          className="eyebrow block text-bone-mute"
        >
          {item.n}
        </motion.span>

        <h3 className="display mt-4 text-[clamp(1.4rem,3.3vw,2.65rem)] uppercase text-bone">
          <MaskLine>{item.title}</MaskLine>
        </h3>

        <motion.p
          variants={{
            hidden: { opacity: 0, y: 14 },
            visible: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.7, delay: 0.15, ease: EASE },
            },
          }}
          className="mt-4 max-w-md text-[0.95rem] leading-[1.7] text-bone-mute transition-colors duration-500 group-hover:text-bone-dim sm:text-base"
        >
          {item.body}
        </motion.p>
      </motion.div>
    </motion.article>
  );
}
