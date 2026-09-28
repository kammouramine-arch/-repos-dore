"use client";

import { useId, useState } from "react";
import { Plus } from "./Icons";

/**
 * Accordéon accessible : de vrais boutons, `aria-expanded`, et un panneau
 * relié par `aria-controls`. Le contenu reste dans la page (utile aux
 * moteurs et à la recherche du navigateur) ; il est seulement replié.
 */
export function Accordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const base = useId();

  return (
    <ul className="border-t border-line">
      {items.map((item, i) => {
        const expanded = open === i;
        const button = `${base}-b${i}`;
        const panel = `${base}-p${i}`;
        return (
          <li key={item.q} className="border-b border-line">
            <h3>
              <button
                id={button}
                type="button"
                aria-expanded={expanded}
                aria-controls={panel}
                onClick={() => setOpen(expanded ? null : i)}
                className="group flex w-full items-start justify-between gap-6 py-6 text-left"
              >
                <span className="title">{item.q}</span>
                <Plus
                  className={`mt-1 size-5 shrink-0 text-fg-3 transition-transform duration-500 ease-[var(--ease-out)] group-hover:text-fg ${
                    expanded ? "rotate-45" : ""
                  }`}
                />
              </button>
            </h3>
            <div
              id={panel}
              role="region"
              aria-labelledby={button}
              data-open={expanded}
              className="fold"
            >
              <div>
                <p className="max-w-2xl pb-7 pr-10 text-fg-2">{item.a}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
