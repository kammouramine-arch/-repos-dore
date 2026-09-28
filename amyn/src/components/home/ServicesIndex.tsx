"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ArrowRight } from "@/components/ui/Icons";

export type ServiceRow = {
  slug: string;
  number: string;
  name: string;
  summary: string;
  price: string | null;
  href: string;
};

/**
 * L'index des services.
 *
 * Pas une grille de cartes : un sommaire éditorial. Chaque ligne est un
 * lien complet. Sur grand écran, survoler ou parcourir au clavier une ligne
 * affiche à droite l'interface correspondante — la preuve visuelle que
 * chaque service est une vraie chose, pas un mot dans une liste.
 *
 * Les visuels sont rendus côté serveur et transmis ici : ce composant ne
 * fait que choisir lequel montrer.
 */
export function ServicesIndex({
  rows,
  previews,
}: {
  rows: ServiceRow[];
  previews: ReactNode[];
}) {
  const [active, setActive] = useState(0);

  return (
    <div className="grid gap-12 lg:grid-cols-12 lg:gap-12">
      <ol className="border-t border-line lg:col-span-7">
        {rows.map((row, i) => {
          const on = i === active;
          return (
            <li key={row.slug} data-reveal style={{ "--delay": i * 50 } as React.CSSProperties}>
              <Link
                href={row.href}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                className="group relative grid grid-cols-[2.75rem_1fr] gap-x-3 border-b border-line py-7 sm:grid-cols-[4rem_1fr_auto] sm:gap-x-6 sm:py-8"
              >
                {/* Filet laiton qui se trace sur la ligne active. */}
                <span
                  aria-hidden
                  className={`absolute -bottom-px left-0 h-px w-full origin-left bg-accent transition-transform duration-700 ease-[var(--ease-out)] ${
                    on ? "lg:scale-x-100" : ""
                  } scale-x-0 group-hover:scale-x-100`}
                />
                <span className="label pt-2 text-accent sm:pt-3">{row.number}</span>

                <span>
                  <span
                    className={`display-sm block transition-colors duration-500 ${
                      on ? "lg:text-fg" : "lg:text-fg-2"
                    } text-fg group-hover:text-fg`}
                  >
                    {row.name}
                  </span>
                  <span className="mt-3 block max-w-xl text-[0.9375rem] leading-relaxed text-fg-2">
                    {row.summary}
                  </span>
                  {row.price && (
                    <span className="label mt-4 block text-fg-3 sm:hidden">{row.price}</span>
                  )}
                </span>

                <span className="hidden flex-col items-end justify-between gap-6 pt-3 sm:flex">
                  {row.price && <span className="label text-fg-3">{row.price}</span>}
                  <span className="flex items-center gap-2 text-[0.875rem] text-fg-2 transition-colors group-hover:text-fg">
                    Découvrir <ArrowRight className="nudge size-4" />
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      {/* Aperçu — grands écrans seulement : sur téléphone, chaque page de
          service a son propre visuel en tête. */}
      <div aria-hidden className="relative hidden lg:col-span-5 lg:block">
        <div className="sticky top-[calc(var(--header-h)+3rem)]">
          <div className="relative">
            {previews.map((preview, i) => (
              <div
                key={rows[i].slug}
                /* Les aperçus inactifs restent dans la page mais ne sont pas
                   rendus : aucun coût tant qu'on ne les affiche pas. */
                style={{ contentVisibility: i === active ? "visible" : "hidden" }}
                className={`transition-[opacity,transform] duration-700 ease-[var(--ease-out)] ${
                  i === active
                    ? "relative opacity-100"
                    : "pointer-events-none absolute inset-x-0 top-0 translate-y-3 opacity-0"
                }`}
              >
                {preview}
              </div>
            ))}
          </div>
          <p className="label mt-5 flex gap-3 text-fg-3">
            <span className="text-accent">{rows[active].number}</span>
            <span>Illustration — {rows[active].name}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
