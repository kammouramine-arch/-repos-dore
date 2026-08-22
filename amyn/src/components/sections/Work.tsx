"use client";

import { motion } from "framer-motion";
import { useState, type ReactNode } from "react";
import { BrowserFrame } from "@/components/work/BrowserFrame";
import { Container } from "@/components/ui/Container";
import { DisplayLines } from "@/components/ui/DisplayLines";
import { GridLines } from "@/components/ui/GridLines";
import { concepts } from "@/lib/concepts";
import { work } from "@/lib/content";
import { EASE, inView, stagger } from "@/lib/motion";

/**
 * SECTION 02 — CRÉATIONS
 *
 * La pièce maîtresse : c'est elle qui prouve qu'AMYN sait faire des sites.
 *
 * Chaque métier ouvre un vrai site web, rendu en HTML aux dimensions d'un
 * écran d'ordinateur, dans une fenêtre de navigateur. Le prospect ne
 * regarde pas une vignette : il regarde une page d'accueil finie, avec sa
 * navigation, son hero, ses sections et son pied de page.
 *
 * Six univers différents — palette, typographie, composition : rien n'est
 * partagé d'un concept à l'autre, parce que c'est exactement l'argument.
 *
 * Les marques sont fictives et le badge « Concept AMYN » de la fenêtre le
 * dit en permanence.
 */
export function Work() {
  /* Le survol prime sur le clic : on balaie les métiers sans rien cliquer,
     et un clic fige celui qu'on veut regarder. */
  const [locked, setLocked] = useState(0);
  const [preview, setPreview] = useState<number | null>(null);
  const active = preview ?? locked;
  const concept = concepts[active];

  return (
    <section id="creations" className="relative pb-32 pt-24 sm:pb-40 sm:pt-32">
      <GridLines />

      <Container className="relative">
        <motion.div {...inView} variants={stagger(0.09)}>
          <motion.div
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { duration: 0.8, ease: EASE } },
            }}
            className="flex items-center gap-4"
          >
            <span className="eyebrow text-bone-mute">{work.index}</span>
            <span className="h-px w-8 bg-gold/60" />
            <span className="eyebrow text-gold">{work.eyebrow}</span>
          </motion.div>

          <h2 className="display mt-8 text-[clamp(1.7rem,4.6vw,4rem)] uppercase sm:mt-10">
            <DisplayLines lines={work.title} />
          </h2>

          <motion.p
            variants={{
              hidden: { opacity: 0, y: 16 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.8, delay: 0.2, ease: EASE },
              },
            }}
            className="mt-8 max-w-xl text-balance text-[0.975rem] leading-[1.75] text-bone-dim"
          >
            {work.intro}
          </motion.p>
        </motion.div>

        {/* Les métiers. Une seule rangée : le site, lui, doit prendre toute
            la largeur en dessous. */}
        <motion.div
          {...inView}
          variants={{
            hidden: { opacity: 0, y: 14 },
            visible: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.7, ease: EASE },
            },
          }}
          className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-4 border-b border-bone/10 pb-5 sm:mt-16 sm:gap-x-10"
        >
          {concepts.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onMouseEnter={() => setPreview(i)}
              onMouseLeave={() => setPreview(null)}
              onFocus={() => setPreview(i)}
              onBlur={() => setPreview(null)}
              onClick={() => setLocked(i)}
              aria-pressed={i === active}
              className={`relative font-display text-[0.78rem] font-semibold uppercase tracking-[0.18em] transition-colors duration-400 sm:text-[0.85rem] ${
                i === active ? "text-bone" : "text-bone/35 hover:text-bone/70"
              }`}
            >
              {item.trade}
              {i === active && (
                /* Le trait se tient sous son propre mot : la rangée passe à
                   la ligne sur les petits écrans, il ne doit jamais tomber
                   sur le métier d'en dessous. */
                <motion.span
                  layoutId="concept-marker"
                  transition={{ duration: 0.45, ease: EASE }}
                  className="absolute -bottom-[10px] left-0 h-px w-full bg-gold"
                />
              )}
            </button>
          ))}
        </motion.div>

        {/* Le site. */}
        <motion.div
          {...inView}
          variants={{
            hidden: { opacity: 0, y: 28 },
            visible: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.9, ease: EASE },
            },
          }}
          className="mt-12 sm:mt-14"
        >
          <BrowserFrame concept={concept} />
        </motion.div>

        {/* La légende : ce que ce site cherche à obtenir, et ce qu'il
            embarque. Elle se ré-imprime au changement de métier. */}
        <div className="mt-10 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-16">
          <div className="lg:max-w-md">
            <Reprint
              id={active}
              className="font-display text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-gold"
            >
              {concept.brand}
            </Reprint>
            <Reprint
              id={active}
              delay={0.06}
              className="mt-4 text-balance text-[0.975rem] leading-[1.7] text-bone-dim"
            >
              {concept.intent}
            </Reprint>
          </div>

          <ul className="flex flex-wrap gap-x-8 gap-y-3 lg:max-w-lg lg:justify-end">
            {concept.features.map((feature, i) => (
              <li key={feature} className="flex items-center gap-2.5">
                <span aria-hidden className="h-px w-4 shrink-0 bg-gold/45" />
                <Reprint
                  id={active}
                  delay={0.1 + i * 0.05}
                  className="text-[0.85rem] text-bone-mute"
                >
                  {feature}
                </Reprint>
              </li>
            ))}
          </ul>
        </div>

        <p className="mx-auto mt-16 max-w-lg text-center text-[0.72rem] leading-[1.6] text-bone-mute sm:mt-20">
          {work.disclaimer}
        </p>

        <motion.p
          {...inView}
          variants={{
            hidden: { opacity: 0, y: 18 },
            visible: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.8, ease: EASE },
            },
          }}
          className="display mt-16 text-center text-[clamp(1.15rem,2.5vw,2.05rem)] uppercase text-bone-dim sm:mt-20"
        >
          {work.bridge}
        </motion.p>
      </Container>
    </section>
  );
}

/**
 * Ré-impression d'un morceau de texte : le bloc reste, le contenu est
 * remplacé et remonte derrière son masque.
 */
function Reprint({
  id,
  children,
  delay = 0,
  className = "",
}: {
  id: number;
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <span className="block overflow-hidden py-[0.14em] -my-[0.14em]">
      <motion.span
        key={id}
        initial={{ y: "115%" }}
        animate={{ y: "0%" }}
        transition={{ duration: 0.5, delay, ease: EASE }}
        className={`block ${className}`}
      >
        {children}
      </motion.span>
    </span>
  );
}
