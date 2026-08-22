"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { DisplayLines } from "@/components/ui/DisplayLines";
import { care } from "@/lib/content";
import { EASE, inView, stagger } from "@/lib/motion";

/**
 * SECTION 08 — AMYN CARE
 *
 * Partout ailleurs sur ce site, le mouvement s'arrête dès que le visiteur
 * s'arrête : tout est piloté par le scroll. Ici, et ici seulement, une
 * impulsion continue de traverser l'écran toute seule — un site entretenu
 * ne s'arrête pas non plus. L'argument se voit avant d'être lu.
 *
 * La section est posée sur une plaque distincte, avec un filet en haut et
 * en bas : la maintenance n'est pas une étape du récit, c'est un objet
 * séparé. Et elle est facultative — la phrase qui le dit est la première
 * chose lisible sous le titre, pas une note en bas de page.
 */
export function Care() {
  const calm = useReducedMotion();
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section
      id="care"
      className="relative border-y border-bone/10 bg-ink-soft py-24 sm:py-32"
    >
      <Container className="relative">
        <motion.div {...inView} variants={stagger(0.09)}>
          <motion.div
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { duration: 0.8, ease: EASE } },
            }}
            className="flex items-center gap-4"
          >
            <span className="eyebrow text-bone-mute">{care.index}</span>
            <span className="h-px w-8 bg-gold/60" />
            <span className="eyebrow text-gold">{care.eyebrow}</span>
          </motion.div>

          <h2 className="display mt-10 text-[clamp(1.8rem,4.8vw,4rem)] uppercase">
            <DisplayLines lines={care.title} />
          </h2>

          {/* Facultatif : dit tout de suite, pas en petits caractères. */}
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
            {care.optional}
          </motion.p>
        </motion.div>

        {/* ---- LE POULS : la seule animation du site qui ne s'arrête pas. */}
        <motion.div
          {...inView}
          variants={{
            hidden: { scaleX: 0 },
            visible: { scaleX: 1, transition: { duration: 1.2, ease: EASE } },
          }}
          className="relative mt-16 h-px w-full origin-left bg-bone/12 sm:mt-20"
        >
          {!calm && (
            <span aria-hidden className="absolute inset-0 overflow-hidden">
              {/* L'impulsion fait 22 % de la largeur ; la déplacer de 560 %
                  de sa propre largeur la fait traverser toute la ligne. */}
              <motion.span
                className="absolute left-0 top-0 h-px w-[22%] bg-gradient-to-r from-transparent via-gold to-transparent"
                animate={{ x: ["-110%", "560%"] }}
                transition={{
                  duration: 6.5,
                  repeat: Infinity,
                  repeatDelay: 1.2,
                  ease: "linear",
                }}
              />
            </span>
          )}
        </motion.div>

        <motion.div
          {...inView}
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { duration: 0.7, ease: EASE } },
          }}
          className="mt-8 flex items-center gap-3"
        >
          <motion.span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full bg-gold"
            animate={calm ? {} : { opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="eyebrow text-bone-mute">{care.status}</span>
        </motion.div>

        <div className="mt-16 grid gap-10 sm:mt-20 lg:grid-cols-3 lg:items-start lg:gap-7">
          {care.tiers.map((tier, i) => (
            <CareTier
              key={tier.name}
              tier={tier}
              index={i}
              dimmed={hovered !== null && hovered !== i}
              onHover={setHovered}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}

function CareTier({
  tier,
  index,
  dimmed,
  onHover,
}: {
  tier: (typeof care.tiers)[number];
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
          ? "rounded-2xl border border-gold/30 bg-ink p-8 shadow-[0_0_80px_-30px_rgba(200,164,92,0.3)] lg:-mt-8"
          : "px-1 lg:px-2"
      }`}
    >
      {featured && "badge" in tier && tier.badge && (
        <span className="eyebrow absolute -top-3 left-8 rounded-full border border-gold/40 bg-ink-soft px-3 py-1 text-[0.5rem] text-gold">
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

        <p className="display mt-5 text-[clamp(1.9rem,3.2vw,2.6rem)]">
          <span className={featured ? "text-metal" : "text-bone"}>
            {tier.price}
          </span>
          <span className="ml-2 font-display text-[0.4em] font-medium tracking-normal text-bone-mute">
            {care.period}
          </span>
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

      {/* Les formules supérieures reprennent la précédente : on le dit,
          on ne recopie pas la liste. */}
      {"intro" in tier && tier.intro && (
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
          {tier.intro}
        </motion.p>
      )}

      <ul className={"intro" in tier && tier.intro ? "mt-4" : "mt-6"}>
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
        className="mt-auto pt-9"
      >
        <Button
          href={`/contact?formule=${encodeURIComponent(tier.name)}`}
          variant={featured ? "gold" : "ghost"}
          arrow={false}
          className="w-full"
        >
          {care.cta}
        </Button>
      </motion.div>
    </motion.div>
  );
}
