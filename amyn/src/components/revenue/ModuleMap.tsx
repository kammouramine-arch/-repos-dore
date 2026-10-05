"use client";

import { useState } from "react";
import { AmynMark } from "@/components/layout/Logo";
import type { ModuleId, RevenueCopy } from "@/lib/revenue-os";

/**
 * Les neuf modules, en architecture : un cœur (Revenue OS) relié à trois
 * groupes — Capter, Convertir, Piloter. Choisir un module allume sa branche
 * et affiche son rôle et ce qu'il relie.
 *
 * Ordinateur : schéma en trois colonnes + panneau de détail.
 * Téléphone : liste par groupe, le détail s'ouvre sous le module choisi.
 */
export function ModuleMap({ t }: { t: RevenueCopy["modules"] }) {
  const [active, setActive] = useState<ModuleId>("reception");
  const activeGroup = t.groups.find((g) => t.byGroup[g.id].includes(active))?.id;
  const current = t.items[active];

  return (
    <div>
      {/* Le cœur et ses trois branches (ordinateur) */}
      <div aria-hidden className="relative hidden lg:block">
        <div className="mx-auto flex w-fit items-center gap-3 rounded-full border border-gold/60 bg-[rgb(18_16_12/0.9)] px-5 py-3 shadow-[0_0_60px_-12px_rgb(198_167_106/0.45)]">
          <AmynMark className="size-6 text-bone" />
          <span className="text-[1.05rem] font-semibold tracking-[-0.02em] text-fg">{t.core}</span>
        </div>
        <div className="relative mx-auto h-10 w-[66.6%]">
          <span className="absolute left-1/2 top-0 h-1/2 w-px bg-line" />
          <span className="absolute inset-x-0 top-1/2 h-px bg-line" />
          {t.groups.map((g, i) => (
            <span
              key={g.id}
              className={`absolute top-1/2 h-1/2 w-px transition-colors duration-500 ${activeGroup === g.id ? "bg-gold" : "bg-line"}`}
              style={{ left: `${i * 50}%` }}
            />
          ))}
          <span
            className="absolute top-1/2 h-px bg-gold transition-[left,width] duration-500 ease-[var(--ease-out)]"
            style={(() => {
              const i = t.groups.findIndex((g) => g.id === activeGroup);
              return { left: `${Math.min(i, 1) * 50}%`, width: i === 1 ? "0%" : "50%" };
            })()}
          />
          <span className="absolute left-1/2 top-0 h-1/2 w-px bg-gold" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {t.groups.map((g) => {
          const lit = activeGroup === g.id;
          return (
            <div
              key={g.id}
              className={`rounded-[var(--radius-md)] border p-4 transition-colors duration-500 sm:p-5 ${
                lit ? "border-gold/50 bg-[rgb(198_167_106/0.05)]" : "border-line bg-[rgb(242_238_230/0.02)]"
              }`}
            >
              <h3 className="flex items-baseline justify-between gap-3">
                <span className="label text-gold">{g.name}</span>
                <span className="text-[0.8125rem] text-fg-3">{g.note}</span>
              </h3>
              <ul className="mt-4 space-y-2">
                {t.byGroup[g.id].map((id) => {
                  const m = t.items[id];
                  const selected = id === active;
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => setActive(id)}
                        aria-pressed={selected}
                        aria-controls={selected ? `module-${id} module-detail` : "module-detail"}
                        className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-[var(--radius-sm)] border px-4 py-3 text-left transition-[background-color,border-color,color] duration-300 ${
                          selected
                            ? "border-gold bg-[rgb(198_167_106/0.12)] text-fg"
                            : "border-line text-fg-2 hover:border-line-strong hover:text-fg"
                        }`}
                      >
                        <span className="font-medium">{m.name}</span>
                        <span aria-hidden className={`size-2 shrink-0 rounded-full ${selected ? "bg-gold" : "bg-line-strong"}`} />
                      </button>
                      {/* Téléphone : le détail s'ouvre ici. */}
                      {selected && (
                        <div id={`module-${id}`} className="px-1 pb-2 pt-3 lg:hidden">
                          <ModuleDetail t={t} id={id} />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Ordinateur : panneau de détail */}
      <div
        id="module-detail"
        aria-live="polite"
        className="mt-4 hidden rounded-[var(--radius-md)] border border-gold/40 bg-[linear-gradient(120deg,rgb(198_167_106/0.08),rgb(14_14_14/0.6))] p-7 lg:grid lg:grid-cols-12 lg:gap-8"
      >
        <p className="text-[1.35rem] font-semibold tracking-[-0.025em] text-fg lg:col-span-4">{current.name}</p>
        <div className="lg:col-span-8">
          <ModuleDetail t={t} id={active} />
        </div>
      </div>
    </div>
  );
}

function ModuleDetail({ t, id }: { t: RevenueCopy["modules"]; id: ModuleId }) {
  const m = t.items[id];
  return (
    <>
      <p className="leading-relaxed text-fg-2">{m.body}</p>
      <p className="mt-4 flex flex-wrap items-center gap-2">
        <span className="label text-[0.6875rem] text-fg-3">{t.connectsTo}</span>
        {m.links.map((l) => (
          <span key={l} className="rounded-full border border-line-strong px-2.5 py-1 text-[0.8125rem] text-fg-2">
            {l}
          </span>
        ))}
      </p>
    </>
  );
}
