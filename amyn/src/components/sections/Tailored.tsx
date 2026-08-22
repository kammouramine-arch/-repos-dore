"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/Container";
import { DisplayLines } from "@/components/ui/DisplayLines";
import { GridLines } from "@/components/ui/GridLines";
import { tailored } from "@/lib/content";
import { EASE, inView, stagger } from "@/lib/motion";

/**
 * SECTION 03 — SUR MESURE
 *
 * Le cœur du positionnement, dit en deux lignes et quatre appuis.
 *
 * Composition centrée et symétrique : après les créations, alignées à
 * gauche, ce recentrage marque une prise de parole. Les quatre appuis ne
 * sont pas des fonctionnalités mais ce à partir de quoi le site est
 * construit — la nuance est tout le propos de la section.
 */
export function Tailored() {
  return (
    <section id="sur-mesure" className="relative pb-32 pt-24 sm:pb-40 sm:pt-32">
      <GridLines />

      <Container className="relative">
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
            <span className="eyebrow text-bone-mute">{tailored.index}</span>
            <span className="h-px w-8 bg-gold/60" />
            <span className="eyebrow text-gold">{tailored.eyebrow}</span>
          </motion.div>

          <h2 className="display mt-10 text-[clamp(1.75rem,5.2vw,4.5rem)] uppercase sm:mt-12">
            <DisplayLines lines={tailored.title} />
          </h2>

          <motion.p
            variants={{
              hidden: { opacity: 0, y: 18 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.8, delay: 0.25, ease: EASE },
              },
            }}
            className="mt-10 max-w-xl text-balance text-[1.05rem] leading-[1.7] text-bone-dim sm:text-[1.15rem]"
          >
            {tailored.body}
          </motion.p>
        </motion.div>

        <motion.ul
          {...inView}
          variants={stagger(0.08, 0.1)}
          className="mt-20 grid gap-x-10 gap-y-12 sm:mt-24 sm:grid-cols-2 lg:grid-cols-4"
        >
          {tailored.pillars.map((pillar) => (
            <motion.li
              key={pillar.name}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.7, ease: EASE },
                },
              }}
            >
              <span aria-hidden className="block h-px w-10 bg-gold/50" />
              <h3 className="display mt-6 text-[clamp(1.1rem,1.9vw,1.5rem)] uppercase text-bone">
                {pillar.name}
              </h3>
              <p className="mt-3 text-balance text-[0.9rem] leading-[1.7] text-bone-dim">
                {pillar.body}
              </p>
            </motion.li>
          ))}
        </motion.ul>

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
          className="display mt-24 text-center text-[clamp(1.15rem,2.5vw,2.05rem)] uppercase text-bone-dim sm:mt-28"
        >
          {tailored.closing}
        </motion.p>
      </Container>
    </section>
  );
}
