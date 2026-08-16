"use client";

import { motion } from "framer-motion";
import { useState, type ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { DisplayLines } from "@/components/ui/DisplayLines";
import { GridLines } from "@/components/ui/GridLines";
import { showcase } from "@/lib/content";
import { EASE, inView, stagger } from "@/lib/motion";

/**
 * SECTION 05 — SHOWCASE — « LE BANC D'ESSAI »
 *
 * Pas quatre captures d'écran : un seul téléphone, quatre métiers, et de
 * vrais sites rendus en HTML dans l'appareil.
 *
 * Le geste de la section : quand le métier change, le squelette ne bouge
 * pas — seul le contenu se ré-imprime, bloc par bloc. On voit de ses yeux
 * que la barre de titre, le bouton d'action et la barre du bas sont aux
 * mêmes places. C'est « le même système, monté sur mesure », démontré.
 *
 * Ce n'est pas une galerie mais une pièce annotée : des filets partent du
 * téléphone et nomment ce que chaque élément rapporte. Le prospect ne se
 * dit pas « c'est joli », il se dit « ça me ferait gagner des clients ».
 */
export function Showcase() {
  /* `locked` est le choix du visiteur, `preview` le survol. Le survol prime,
     ce qui permet de balayer les quatre métiers sans rien cliquer. */
  const [locked, setLocked] = useState(0);
  const [preview, setPreview] = useState<number | null>(null);
  const active = preview ?? locked;
  const demo = showcase.demos[active];

  return (
    <section id="showcase" className="relative pb-32 pt-24 sm:pb-40 sm:pt-32">
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
            <span className="eyebrow text-bone-mute">{showcase.index}</span>
            <span className="h-px w-8 bg-gold/60" />
            <span className="eyebrow text-gold">{showcase.eyebrow}</span>
          </motion.div>

          <h2 className="display mt-8 text-[clamp(1.7rem,4.6vw,4rem)] uppercase sm:mt-10">
            <DisplayLines lines={showcase.title} />
          </h2>
        </motion.div>

        {/* Onglets de métier — petit écran. */}
        <div className="mt-12 flex flex-wrap gap-x-7 gap-y-3 lg:hidden">
          {showcase.demos.map((item, i) => (
            <button
              key={item.trade}
              type="button"
              onClick={() => setLocked(i)}
              className={`font-display text-[0.72rem] font-semibold uppercase tracking-[0.2em] transition-colors duration-400 ${
                i === active ? "text-gold" : "text-bone/35"
              }`}
            >
              {item.trade}
            </button>
          ))}
        </div>

        <div className="mt-14 lg:mt-20 lg:flex lg:items-center lg:gap-16">
          {/* Liste des métiers — grand écran. */}
          <div className="hidden flex-1 lg:block">
            {showcase.demos.map((item, i) => (
              <button
                key={item.trade}
                type="button"
                onMouseEnter={() => setPreview(i)}
                onMouseLeave={() => setPreview(null)}
                onFocus={() => setPreview(i)}
                onBlur={() => setPreview(null)}
                onClick={() => setLocked(i)}
                className={`display relative block w-full py-2 pl-14 text-left text-[clamp(1.6rem,3.2vw,2.9rem)] uppercase transition-colors duration-500 ${
                  i === active ? "text-bone" : "text-bone/25 hover:text-bone/50"
                }`}
              >
                {i === active && (
                  <motion.span
                    layoutId="showcase-marker"
                    transition={{ duration: 0.5, ease: EASE }}
                    className="absolute left-0 top-1/2 h-px w-9 -translate-y-1/2 bg-gold"
                  />
                )}
                {item.trade}
              </button>
            ))}
          </div>

          {/* L'appareil. */}
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
            className="relative mx-auto w-full max-w-[19rem] shrink-0"
          >
            {/* Le badge ne disparaît jamais : ces sites sont des concepts. */}
            <span className="eyebrow absolute -top-3 right-6 z-10 rounded-full border border-gold/40 bg-ink px-3 py-1 text-[0.5rem] text-gold">
              Concept
            </span>

            <div className="rounded-[2rem] border border-bone/12 bg-ink-soft p-2 lg:rounded-[2.6rem] lg:p-2.5">
              <div className="overflow-hidden rounded-[1.7rem] bg-ink lg:rounded-[2.2rem]">
                <DemoScreen demo={demo} id={active} />
              </div>
            </div>

            {/* Annotations — grand écran. Le même langage de filets que le
                circuit de la section 04. */}
            <div className="pointer-events-none absolute inset-y-0 left-full hidden lg:block">
              {demo.notes.map((note, i) => (
                <div
                  key={note.text}
                  className="absolute flex w-[19rem] -translate-y-1/2 items-center gap-4"
                  style={{ top: `${note.at}%` }}
                >
                  <span className="h-px w-16 shrink-0 bg-gold/35" />
                  <Reprint
                    id={active}
                    delay={0.1 + i * 0.06}
                    className="text-[0.82rem] leading-[1.5] text-bone-dim"
                  >
                    {note.text}
                  </Reprint>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="hidden flex-1 lg:block" />
        </div>

        {/* Annotations — petit écran, en liste sous l'appareil. */}
        <ul className="mx-auto mt-10 max-w-[19rem] space-y-3 lg:hidden">
          {demo.notes.map((note, i) => (
            <li key={note.text} className="flex items-center gap-3">
              <span className="h-px w-6 shrink-0 bg-gold/35" />
              <Reprint
                id={active}
                delay={0.08 + i * 0.05}
                className="text-[0.85rem] text-bone-dim"
              >
                {note.text}
              </Reprint>
            </li>
          ))}
        </ul>

        <p className="mx-auto mt-14 max-w-md text-center text-[0.72rem] leading-[1.6] text-bone-mute sm:mt-16">
          {showcase.disclaimer}
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
          {showcase.bridge}
        </motion.p>
      </Container>
    </section>
  );
}

/**
 * Ré-impression d'un morceau de contenu.
 *
 * Le bloc reste, le texte est remplacé : l'ancien disparaît net, le nouveau
 * remonte derrière son masque. C'est le geste de révélation du site, réduit
 * à l'échelle d'une ligne — et ça donne la sensation d'une presse qui
 * ré-imprime la même maquette avec une autre identité.
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

/**
 * Le site de démonstration : du vrai HTML, pas une capture.
 *
 * Six blocs, aux mêmes places pour les quatre métiers. La barre du bas ne
 * change même pas de libellés — c'est ce qui rend le squelette lisible.
 */
function DemoScreen({
  demo,
  id,
}: {
  demo: (typeof showcase.demos)[number];
  id: number;
}) {
  return (
    <div className="flex h-[34rem] flex-col">
      {/* ① l'enseigne */}
      <div className="flex items-center justify-between px-5 pb-4 pt-6">
        <Reprint
          id={id}
          className="font-display text-[0.7rem] font-semibold uppercase tracking-[0.26em] text-bone"
        >
          {demo.name}
        </Reprint>
        <span aria-hidden className="flex flex-col gap-[3px]">
          <span className="block h-px w-4 bg-bone/40" />
          <span className="block h-px w-4 bg-bone/40" />
        </span>
      </div>

      <div className="flex-1 px-5">
        {/* ② l'accroche */}
        <div className="mt-5">
          {demo.headline.map((line, i) => (
            <Reprint
              key={i}
              id={id}
              delay={0.04 + i * 0.05}
              className="font-display text-[1.15rem] leading-[1.3] text-bone"
            >
              {line}
            </Reprint>
          ))}
        </div>

        {/* ③ l'action principale — seul aplat de couleur de la démo */}
        <motion.div
          initial={false}
          animate={{ backgroundColor: demo.accent }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mt-6 w-full rounded-full px-4 py-3 text-center"
        >
          <Reprint
            id={id}
            delay={0.12}
            className="font-display text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-ink"
          >
            {demo.action}
          </Reprint>
        </motion.div>

        {/* ④ le statut */}
        <div className="mt-5 flex items-center gap-2">
          <motion.span
            initial={false}
            animate={{ backgroundColor: demo.accent }}
            transition={{ duration: 0.5, ease: EASE }}
            className="h-1.5 w-1.5 shrink-0 rounded-full"
          />
          <Reprint id={id} delay={0.17} className="text-[0.72rem] text-bone-dim">
            {demo.status}
          </Reprint>
        </div>

        {/* ⑤ les prestations */}
        <div className="mt-7 border-t border-bone/10 pt-4">
          <p className="eyebrow text-[0.5rem] text-bone-mute">Prestations</p>
          <ul className="mt-3">
            {demo.services.map((service, i) => (
              <li
                key={service}
                className="flex items-center justify-between border-b border-bone/[0.07] py-2.5"
              >
                <Reprint
                  id={id}
                  delay={0.21 + i * 0.05}
                  className="text-[0.78rem] text-bone"
                >
                  {service}
                </Reprint>
                <span aria-hidden className="text-[0.7rem] text-bone-mute">
                  →
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* ⑥ nous trouver */}
        <div className="mt-6">
          <p className="eyebrow text-[0.5rem] text-bone-mute">Nous trouver</p>
          <Reprint
            id={id}
            delay={0.36}
            className="mt-2 text-[0.78rem] text-bone-dim"
          >
            {demo.hours}
          </Reprint>
        </div>
      </div>

      {/* ⑦ la barre d'action, identique dans les quatre démos */}
      <div className="grid grid-cols-3 border-t border-bone/12">
        {showcase.actions.map((label) => (
          <span
            key={label}
            className="py-3.5 text-center font-display text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-bone-dim"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
