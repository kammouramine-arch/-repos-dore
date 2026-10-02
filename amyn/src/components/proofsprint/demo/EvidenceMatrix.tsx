"use client";

import { useId, useState } from "react";
import type { Locale } from "@/lib/i18n/config";
import { STATUSES, countByStatus, evidence, getDemo, type EvidenceStatus } from "@/lib/proofsprint-demo";
import { StatusBadge } from "./StatusBadge";

export const OPEN_SOURCE_EVENT = "proofsprint:open-source";

/**
 * Matrice de réponses : filtre par état de la preuve (vrais boutons radio),
 * tableau qui devient une pile de fiches sur téléphone (pas de défilement
 * horizontal), et références cliquables vers l'extrait exact.
 */
export function EvidenceMatrix({ locale }: { locale: Locale }) {
  const t = getDemo(locale);
  const [filter, setFilter] = useState<EvidenceStatus | "all">("all");
  const name = useId();
  const rows = evidence.responses.filter((r) => filter === "all" || r.status === filter);
  const options: { value: EvidenceStatus | "all"; label: string; count: number }[] = [
    { value: "all", label: t.matrix.all, count: evidence.responses.length },
    ...STATUSES.map((s) => ({ value: s, label: t.status[s], count: countByStatus(s) })),
  ];

  const openSource = (id: string) => window.dispatchEvent(new CustomEvent(OPEN_SOURCE_EVENT, { detail: id }));

  return (
    <div>
      <fieldset>
        <legend className="label text-fg-2">{t.matrix.filter}</legend>
        <div className="mt-4 flex flex-wrap gap-2">
          {options.map((o) => (
            <label
              key={o.value}
              className="relative inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line-strong px-4 text-[0.9375rem] text-fg-2 transition-colors hover:text-fg has-[:checked]:border-gold has-[:checked]:bg-[rgb(198_167_106/0.12)] has-[:checked]:text-fg has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gold"
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={filter === o.value}
                onChange={() => setFilter(o.value)}
                className="sr-only"
              />
              {o.label}
              <span className="font-mono text-[0.8125rem] text-fg-3">{o.count}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <p aria-live="polite" className="mt-5 text-[0.875rem] text-fg-3">
        {t.matrix.shown(rows.length)}
      </p>

      <table className="mt-4 w-full border-collapse text-left text-[0.9375rem]">
        <caption className="sr-only">{t.matrix.caption}</caption>
        <thead className="max-md:sr-only">
          <tr className="label text-fg-3">
            {t.matrix.cols.map((c) => (
              <th key={c} scope="col" className="border-b border-line py-3 pr-4 font-normal">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              className="max-md:mb-3 max-md:grid max-md:gap-2 max-md:rounded-[var(--radius-md)] max-md:border max-md:border-line max-md:bg-[rgb(242_238_230/0.025)] max-md:p-4"
            >
              <td className="py-4 pr-4 align-top font-mono text-[0.875rem] text-gold md:border-b md:border-line max-md:p-0">{r.id}</td>
              <th scope="row" className="py-4 pr-4 align-top font-medium text-fg md:border-b md:border-line max-md:p-0">
                {r.question[locale]}
              </th>
              <td className="py-4 pr-4 align-top text-fg-2 md:border-b md:border-line max-md:p-0">{r.answer[locale]}</td>
              <td className="py-4 align-top md:min-w-[14rem] md:border-b md:border-line max-md:p-0">
                <div className="flex flex-wrap items-center gap-2">
                  {r.source_ids.length > 0 ? (
                    r.source_ids.map((id) => (
                      <a
                        key={id}
                        href={`#${id}`}
                        onClick={() => openSource(id)}
                        aria-label={t.matrix.openSource(id)}
                        className="inline-flex min-h-9 items-center rounded-full border border-line-strong px-3 font-mono text-[0.8125rem] text-fg underline-offset-4 hover:border-gold hover:underline"
                      >
                        {id}
                      </a>
                    ))
                  ) : (
                    <span className="text-[0.8125rem] text-fg-3">{t.matrix.noSource}</span>
                  )}
                  <StatusBadge status={r.status} label={t.status[r.status]} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
