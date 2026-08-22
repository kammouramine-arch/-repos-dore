"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { DisplayLines } from "@/components/ui/DisplayLines";
import { GridLines } from "@/components/ui/GridLines";
import { visibility } from "@/lib/content";
import { EASE, inView, stagger } from "@/lib/motion";

/**
 * SECTION 07 — SERVICES COMPLÉMENTAIRES
 *
 * Des options, présentées comme telles. Le client doit pouvoir repartir
 * avec son site et rien d'autre : c'est pour ça que la section arrive
 * APRÈS les tarifs et qu'elle le dit dès la première phrase.
 *
 * La note d'honnêteté en bas n'est pas décorative : personne ne peut
 * garantir une position sur Google, et le prétendre ruinerait la
 * crédibilité de tout le reste du site. Elle ne se retire pas.
 */
export function Visibility() {
  return (
    <section id="visibilite" className="relative pb-32 pt-24 sm:pb-40 sm:pt-32">
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
            <span className="eyebrow text-bone-mute">{visibility.index}</span>
            <span className="h-px w-8 bg-gold/60" />
            <span className="eyebrow text-gold">{visibility.eyebrow}</span>
          </motion.div>

          <h2 className="display mt-8 text-[clamp(1.7rem,4.6vw,4rem)] uppercase sm:mt-10">
            <DisplayLines lines={visibility.title} />
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
            {visibility.body}
          </motion.p>
        </motion.div>

        <motion.ul
          {...inView}
          variants={stagger(0.08, 0.1)}
          className="mt-16 grid gap-x-12 gap-y-10 sm:mt-20 sm:grid-cols-2"
        >
          {visibility.items.map((item) => (
            <motion.li
              key={item.name}
              variants={{
                hidden: { opacity: 0, y: 18 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.7, ease: EASE },
                },
              }}
              className="border-t border-bone/10 pt-6"
            >
              <h3 className="display text-[clamp(1.05rem,1.8vw,1.4rem)] uppercase text-bone">
                {item.name}
              </h3>
              <p className="mt-3 max-w-md text-balance text-[0.9rem] leading-[1.7] text-bone-dim">
                {item.body}
              </p>
            </motion.li>
          ))}
        </motion.ul>

        <motion.div
          {...inView}
          variants={stagger(0.1, 0.15)}
          className="mt-16 flex flex-col gap-8 sm:mt-20 lg:flex-row lg:items-center lg:justify-between lg:gap-16"
        >
          <motion.p
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { duration: 0.8, ease: EASE },
              },
            }}
            className="max-w-xl text-balance text-[0.85rem] leading-[1.7] text-bone-mute"
          >
            {visibility.honesty}
          </motion.p>

          <motion.div
            variants={{
              hidden: { opacity: 0, y: 14 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.7, ease: EASE },
              },
            }}
            className="shrink-0"
          >
            <Button href="/contact?sujet=visibilite" variant="ghost" arrow={false}>
              {visibility.cta}
            </Button>
          </motion.div>
        </motion.div>
      </Container>
    </section>
  );
}
