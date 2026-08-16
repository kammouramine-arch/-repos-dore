"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { DisplayLines } from "@/components/ui/DisplayLines";
import { GridLines } from "@/components/ui/GridLines";
import { buildCircuit, type CircuitNode } from "@/lib/circuit";
import { services } from "@/lib/content";
import { EASE, inView, stagger } from "@/lib/motion";

/**
 * SECTION 04 — SERVICES — « LE CIRCUIT »
 *
 * Trois sections ont descendu un axe vertical. Celle-ci tourne de 90° : le
 * conducteur serpente en trois passes horizontales, une par circuit issu de
 * la RÉPONSE (BUILD, CONVERT, GROW). Neuf pièces, un seul conducteur.
 *
 * Le schéma complet est visible dès l'arrivée, en gris : la machine existe
 * avant qu'on l'alimente. Le courant, lui, est piloté par le scroll — il
 * avance quand on descend, il reflue quand on remonte, et chaque pièce
 * s'allume au passage.
 *
 * Section volontairement dense et de petite typographie : c'est le moment
 * technique du site. Aucune icône, aucune carte — les nœuds sont le seul
 * élément graphique.
 */
export function Services() {
  return (
    <section id="services" className="relative pb-32 pt-24 sm:pb-40 sm:pt-32">
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
            <span className="eyebrow text-bone-mute">{services.index}</span>
            <span className="h-px w-8 bg-gold/60" />
            <span className="eyebrow text-gold">{services.eyebrow}</span>
          </motion.div>

          <h2 className="display mt-8 text-[clamp(1.7rem,4.6vw,4rem)] uppercase sm:mt-10">
            <DisplayLines lines={services.title} />
          </h2>
        </motion.div>

        <CircuitBoard />
        <MobileCircuit />

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
          className="display mt-16 text-[clamp(1.15rem,2.5vw,2.05rem)] uppercase text-bone-dim sm:mt-20 lg:text-right"
        >
          {services.bridge}
        </motion.p>
      </Container>
    </section>
  );
}

/* ==========================================================================
   Grand écran : le serpentin
   ========================================================================== */

function CircuitBoard() {
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const calm = useReducedMotion();

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(() =>
      setWidth(box.getBoundingClientRect().width),
    );
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const { scrollYProgress } = useScroll({
    target: boxRef,
    offset: ["start 0.85", "end 0.75"],
  });

  /* Position du courant sur le conducteur, de 0 à 1. Sous animations
     réduites, le circuit est alimenté d'emblée. */
  const current = useTransform(
    scrollYProgress,
    calm ? [0, 1] : [0.05, 0.88],
    calm ? [1, 1] : [0, 1],
  );

  const circuit = width > 0 ? buildCircuit(width) : null;

  return (
    <div
      ref={boxRef}
      className="relative mt-20 hidden w-full lg:block"
      style={{ height: circuit?.height ?? 700 }}
    >
      {circuit && (
        <>
          <svg
            aria-hidden
            viewBox={`0 0 ${width} ${circuit.height}`}
            className="absolute inset-0 h-full w-full"
            fill="none"
          >
            {/* Le schéma : la machine, avant le courant. */}
            <path
              d={circuit.path}
              stroke="var(--color-bone)"
              strokeOpacity={0.16}
              strokeWidth={1}
            />
            {/* La lueur du courant. */}
            <motion.path
              d={circuit.path}
              stroke="var(--color-gold)"
              strokeOpacity={0.22}
              strokeWidth={4}
              className="blur-[3px]"
              style={{ pathLength: current }}
            />
            {/* Le courant. */}
            <motion.path
              d={circuit.path}
              stroke="var(--color-gold)"
              strokeWidth={1}
              style={{ pathLength: current }}
            />
          </svg>

          {/* Étiquettes de circuit, posées dans les virages. */}
          {circuit.labels.map((label, i) => (
            <span
              key={services.circuits[i].name}
              className={`eyebrow absolute text-gold/70 ${
                label.align === "right" ? "-translate-x-full" : ""
              }`}
              style={{ left: label.x, top: label.y - 34 }}
            >
              {services.circuits[i].name}
            </span>
          ))}

          {circuit.nodes.map((node) => (
            <Node
              key={`${node.run}-${node.item}`}
              node={node}
              current={current}
              service={services.circuits[node.run].items[node.item]}
            />
          ))}
        </>
      )}
    </div>
  );
}

function Node({
  node,
  current,
  service,
}: {
  node: CircuitNode;
  current: MotionValue<number>;
  service: { name: string; body: string };
}) {
  /* La pièce s'allume au passage exact du courant, et s'éteint si on remonte. */
  const lit = useTransform(current, [node.at - 0.02, node.at + 0.015], [0, 1]);
  const dot = useTransform(lit, [0, 1], [0.55, 1]);
  const nameY = useTransform(lit, [0, 1], ["115%", "0%"]);

  return (
    <div
      className="group absolute w-64 -translate-x-1/2 text-center"
      style={{ left: node.x, top: node.y }}
    >
      {/* Le nœud : seul élément graphique de la section. */}
      <motion.span
        style={{ scale: dot }}
        className="absolute left-1/2 top-0 block h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-bone/30 bg-ink transition-[border-color] duration-500 group-hover:border-gold"
      >
        <motion.span
          style={{ opacity: lit }}
          className="absolute inset-[1px] rounded-full bg-gold"
        />
      </motion.span>

      <div className="pt-7 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-1 motion-reduce:transition-none">
        <span className="block overflow-hidden py-[0.12em] -my-[0.12em]">
          <motion.span
            style={{ y: nameY }}
            className="font-display block text-[0.9rem] font-semibold uppercase tracking-[0.1em] text-bone"
          >
            {service.name}
          </motion.span>
        </span>

        <motion.p
          style={{ opacity: lit }}
          className="mx-auto mt-2.5 max-w-[15rem] text-balance text-[0.8rem] leading-[1.6] text-bone-mute"
        >
          {service.body}
        </motion.p>
      </div>
    </div>
  );
}

/* ==========================================================================
   Petit écran : le même circuit dans un boîtier plus étroit
   ========================================================================== */

/**
 * Le serpentin ne tient pas sur 390 px. Le conducteur redevient vertical,
 * les neuf pièces s'y accrochent, et le courant le parcourt de la même façon.
 * Chaque rangée alimente son propre segment : le courant reste continu sans
 * qu'on ait à mesurer quoi que ce soit.
 */
function MobileCircuit() {
  return (
    <div className="mt-16 lg:hidden">
      {services.circuits.map((circuit) => (
        <div key={circuit.name}>
          <Rail>
            <span className="eyebrow block pt-1 text-gold/70">{circuit.name}</span>
          </Rail>

          {circuit.items.map((item) => (
            <Rail key={item.name} dot>
              <h3 className="font-display text-[0.9rem] font-semibold uppercase tracking-[0.1em] text-bone">
                {item.name}
              </h3>
              <p className="mt-2 max-w-[22rem] text-[0.85rem] leading-[1.6] text-bone-mute">
                {item.body}
              </p>
            </Rail>
          ))}
        </div>
      ))}

      {/* La sortie du courant, vers la suite. */}
      <Rail tail />
    </div>
  );
}

function Rail({
  children,
  dot = false,
  tail = false,
}: {
  children?: ReactNode;
  dot?: boolean;
  tail?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const calm = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.82", "end 0.55"],
  });
  const fill = useTransform(
    scrollYProgress,
    calm ? [0, 1] : [0, 1],
    calm ? [1, 1] : [0, 1],
  );
  const lit = useTransform(fill, [0, 0.14], [0, 1]);
  const dotScale = useTransform(lit, [0, 1], [0.6, 1]);

  return (
    <div
      ref={ref}
      className={`relative pl-9 ${tail ? "h-16" : "pb-10"}`}
    >
      {/* Segment de conducteur : gris, puis rempli par le courant. */}
      <span className="absolute bottom-0 left-[3px] top-0 w-px bg-bone/16">
        <motion.span
          style={{ scaleY: fill }}
          className={`absolute inset-0 origin-top ${tail ? "bg-gradient-to-b from-gold to-transparent" : "bg-gold"}`}
        />
      </span>

      {dot && (
        <motion.span
          style={{ scale: dotScale }}
          className="absolute left-0 top-[5px] block h-[7px] w-[7px] rounded-full border border-bone/30 bg-ink"
        >
          <motion.span
            style={{ opacity: lit }}
            className="absolute inset-[1px] rounded-full bg-gold"
          />
        </motion.span>
      )}

      {children && <motion.div style={{ opacity: lit }}>{children}</motion.div>}
    </div>
  );
}
