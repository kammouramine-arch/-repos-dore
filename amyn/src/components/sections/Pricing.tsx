"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { DisplayLines } from "@/components/ui/DisplayLines";
import { GridLines } from "@/components/ui/GridLines";
import { pricing } from "@/lib/content";
import { EASE, inView, stagger } from "@/lib/motion";

/**
 * SECTION 06 — LES OFFRES — « LES TROIS PALIERS »
 *
 * Trois paliers du même système, pas trois produits qui se disputent le
 * choix : chaque offre reprend la précédente, et le dit en une ligne au
 * lieu de répéter la liste.
 *
 * La hiérarchie est portée par la composition, jamais par la couleur :
 * PREMIUM est le seul palier encadré, le seul surélevé, et le seul à
 * recevoir le bouton doré. Les deux autres restent ouverts, sans cadre.
 * C'est la règle de la maison appliquée au pricing — un seul or par écran.
 */
export function Pricing() {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section id="offres" className="relative pb-32 pt-24 sm:pb-40 sm:pt-32">
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
            <span className="eyebrow text-bone-mute">{pricing.index}</span>
            <span className="h-px w-8 bg-gold/60" />
            <span className="eyebrow text-gold">{pricing.eyebrow}</span>
          </motion.div>

          <h2 className="display mt-10 text-[clamp(1.75rem,5.2vw,4.5rem)] uppercase sm:mt-12">
            <DisplayLines lines={pricing.title} />
          </h2>
        </motion.div>

        <div className="mt-20 grid gap-12 sm:mt-24 lg:grid-cols-3 lg:items-start lg:gap-7">
          {pricing.tiers.map((tier, i) => (
            <Tier
              key={tier.name}
              tier={tier}
              index={i}
              dimmed={hovered !== null && hovered !== i}
              onHover={setHovered}
            />
          ))}
        </div>

        {/* Le conducteur repart vers AMYN Care. */}
        <motion.div
          {...inView}
          variants={stagger(0.12)}
          className="mt-24 flex flex-col items-center text-center sm:mt-28"
        >
          <motion.p
            variants={{
              hidden: { opacity: 0, y: 18 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.8, ease: EASE },
              },
            }}
            className="display text-[clamp(1.15rem,2.5vw,2.05rem)] uppercase text-bone-dim"
          >
            {pricing.bridge}
          </motion.p>

          <motion.span
            aria-hidden
            variants={{
              hidden: { scaleY: 0 },
              visible: {
                scaleY: 1,
                transition: { duration: 1, delay: 0.15, ease: EASE },
              },
            }}
            className="mt-10 h-16 w-px origin-top bg-gradient-to-b from-gold/50 to-transparent sm:h-20"
          />
        </motion.div>
      </Container>
    </section>
  );
}

function Tier({
  tier,
  index,
  dimmed,
  onHover,
}: {
  tier: (typeof pricing.tiers)[number];
  index: number;
  dimmed: boolean;
  onHover: (i: number | null) => void;
}) {
  const featured = tier.featured;

  return (
    <motion.div
      {...inView}
      variants={stagger(0.05, index * 0.1)}
      onHoverStart={() => onHover(index)}
      onHoverEnd={() => onHover(null)}
      animate={{ opacity: dimmed ? 0.55 : 1 }}
      transition={{ duration: 0.5, ease: EASE }}
      className={`group relative flex h-full flex-col ${
        featured
          ? "rounded-2xl border border-gold/30 bg-ink-soft p-8 shadow-[0_0_90px_-30px_rgba(200,164,92,0.35)] sm:p-10 lg:-mt-10"
          : "px-1 lg:px-2"
      }`}
    >
      {featured && "badge" in tier && tier.badge && (
        <span className="eyebrow absolute -top-3 left-8 rounded-full border border-gold/40 bg-ink px-3 py-1 text-[0.5rem] text-gold sm:left-10">
          {tier.badge}
        </span>
      )}

      <motion.div
        variants={{
          hidden: { opacity: 0, y: 16 },
          visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.7, ease: EASE },
          },
        }}
      >
        <p className={`eyebrow ${featured ? "text-gold" : "text-bone-mute"}`}>
          {tier.name}
        </p>

        <p
          className={`display mt-5 text-[clamp(2rem,3.6vw,3rem)] ${
            featured ? "text-metal" : "text-bone"
          }`}
        >
          {tier.price}
        </p>

        <p className="mt-4 max-w-[19rem] text-balance text-[0.9rem] leading-[1.65] text-bone-dim lg:min-h-[3.1rem]">
          {tier.pitch}
        </p>
      </motion.div>

      <motion.div
        variants={{
          hidden: { scaleX: 0 },
          visible: {
            scaleX: 1,
            transition: { duration: 0.9, delay: 0.15, ease: EASE },
          },
        }}
        className={`mt-8 h-px w-full origin-left ${featured ? "bg-gold/25" : "bg-bone/12"}`}
      />

      {/* Chaque palier reprend le précédent : on le dit, on ne le répète pas. */}
      {tier.inherits && (
        <motion.p
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { duration: 0.7, delay: 0.2, ease: EASE },
            },
          }}
          className={`mt-6 font-display text-[0.72rem] font-semibold uppercase tracking-[0.16em] ${
            featured ? "text-gold/80" : "text-bone-dim"
          }`}
        >
          {tier.inherits}
        </motion.p>
      )}

      {/* Pas de coches, pas d'icônes : un filet fin suffit à séparer. */}
      <ul className="mt-4">
        {tier.features.map((feature, i) => (
          <motion.li
            key={feature}
            variants={{
              hidden: { opacity: 0, y: 10 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.55, delay: 0.25 + i * 0.04, ease: EASE },
              },
            }}
            className="border-b border-bone/[0.07] py-2.5 text-[0.875rem] leading-[1.5] text-bone-dim transition-colors duration-500 group-hover:text-bone"
          >
            {feature}
          </motion.li>
        ))}
      </ul>

      <motion.div
        variants={{
          hidden: { opacity: 0, y: 14 },
          visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.7, delay: 0.4, ease: EASE },
          },
        }}
        className="mt-9 pt-1"
      >
        <Button
          href={`/contact?offre=${encodeURIComponent(tier.name)}`}
          variant={featured ? "gold" : "ghost"}
          arrow={false}
          className="w-full"
        >
          {pricing.cta}
        </Button>
      </motion.div>
    </motion.div>
  );
}
