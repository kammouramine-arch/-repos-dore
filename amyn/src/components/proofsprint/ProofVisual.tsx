import type { ProofSprintCopy } from "@/lib/proofsprint";

/**
 * Visuel du hero ProofSprint : vos documents sources (à gauche) deviennent
 * une matrice de réponses, une proof room et un calcul de ROI (à droite).
 *
 * Tout est en HTML et CSS, comme les autres maquettes du site : net à
 * toutes les tailles, sans image à charger. Le contenu est fictif et le
 * dit en toutes lettres. Pour les lecteurs d'écran, l'ensemble est une
 * seule image décrite.
 */
const TONE = {
  ok: "border-[rgb(140_190_160/0.35)] bg-[rgb(31_59_47/0.55)] text-[#a9d7bb]",
  review: "border-gold/40 bg-[rgb(198_167_106/0.12)] text-gold-2",
  gap: "border-[rgb(220_140_120/0.35)] bg-[rgb(110_40_30/0.35)] text-[#efb3a2]",
} as const;

const panel =
  "rounded-[var(--radius-md)] border border-[rgb(242_238_230/0.1)] bg-[rgb(14_14_14/0.82)] shadow-[0_24px_60px_-34px_rgb(0_0_0/0.95)]";

export function ProofVisual({ t }: { t: ProofSprintCopy["visual"] }) {
  return (
    <div
      role="img"
      aria-label={`${t.fictional} — ${t.aria}`}
      className="relative rounded-[1.5rem] border border-[rgb(242_238_230/0.1)] bg-[linear-gradient(160deg,rgb(242_238_230/0.05),rgb(242_238_230/0.015))] p-4 shadow-[0_40px_100px_-50px_rgb(0_0_0/0.9)] sm:p-6"
    >
      <span className="label inline-flex items-center gap-2 rounded-full border border-gold/40 px-3 py-1 text-[0.6875rem] text-gold-2">
        <span className="size-1.5 rounded-full bg-gold" />
        {t.fictional}
      </span>

      <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,0.9fr)_1.5rem_minmax(0,1.6fr)] sm:items-center sm:gap-3">
        {/* Sources */}
        <div>
          <p className="label text-[0.6875rem] text-fg-2">{t.sources}</p>
          <ul className="mt-3 flex flex-wrap gap-2 sm:flex-col">
            {t.docs.map((doc) => (
              <li
                key={doc}
                className="flex min-w-0 items-center gap-2 rounded-[var(--radius-sm)] border border-[rgb(242_238_230/0.1)] bg-[rgb(242_238_230/0.03)] px-2.5 py-2 text-[0.75rem] text-fg-2"
              >
                <span aria-hidden className="h-3.5 w-3 shrink-0 rounded-[2px] border border-[rgb(242_238_230/0.3)] [clip-path:polygon(0_0,70%_0,100%_25%,100%_100%,0_100%)]" />
                <span className="truncate">{doc}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Le fil : des sources vers les livrables. */}
        <div aria-hidden className="flex items-center justify-center sm:h-full">
          <span className="relative block h-6 w-px bg-gradient-to-b from-[rgb(242_238_230/0.1)] via-gold to-[rgb(242_238_230/0.1)] sm:h-[78%]">
            <span className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold shadow-[0_0_14px_3px_rgb(198_167_106/0.45)]" />
          </span>
        </div>

        {/* Livrables */}
        <div className="grid gap-3">
          <div className={`${panel} p-3`}>
            <p className="label text-[0.6875rem] text-fg-2">{t.matrix}</p>
            <ul className="mt-2.5 space-y-1.5">
              {t.matrixRows.map((row) => (
                <li key={row.q} className="flex items-center justify-between gap-3 border-b border-[rgb(242_238_230/0.06)] pb-1.5 last:border-0 last:pb-0">
                  <span className="min-w-0 truncate text-[0.75rem] text-fg-2">{row.q}</span>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[0.6875rem] ${TONE[row.tone as keyof typeof TONE]}`}>
                    {row.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className={`${panel} overflow-hidden`}>
              <div className="flex items-center gap-1.5 border-b border-[rgb(242_238_230/0.08)] px-3 py-2">
                <span className="size-1.5 rounded-full bg-[rgb(242_238_230/0.25)]" />
                <span className="size-1.5 rounded-full bg-[rgb(242_238_230/0.25)]" />
                <span className="ml-1.5 label text-[0.6875rem] text-fg-2">{t.room}</span>
              </div>
              <div className="p-3">
                <div className="flex flex-wrap gap-1">
                  {t.roomTabs.map((tab, i) => (
                    <span
                      key={tab}
                      className={`rounded-full px-2 py-0.5 text-[0.6875rem] ${
                        i === 0 ? "bg-gold text-ink" : "border border-[rgb(242_238_230/0.12)] text-fg-3"
                      }`}
                    >
                      {tab}
                    </span>
                  ))}
                </div>
                <span className="mt-3 block h-1.5 w-[85%] rounded-full bg-[rgb(242_238_230/0.14)]" />
                <span className="mt-1.5 block h-1.5 w-[62%] rounded-full bg-[rgb(242_238_230/0.09)]" />
                <span className="mt-1.5 block h-1.5 w-[74%] rounded-full bg-[rgb(242_238_230/0.09)]" />
              </div>
            </div>

            <div className={`${panel} p-3`}>
              <p className="label text-[0.6875rem] text-fg-2">{t.roi}</p>
              <dl className="mt-2 space-y-1">
                {t.roiInputs.map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-2 text-[0.6875rem]">
                    <dt className="truncate text-fg-2">{k}</dt>
                    <dd className="font-mono text-fg">{v}</dd>
                  </div>
                ))}
              </dl>
              <div aria-hidden className="mt-2.5 flex h-8 items-end gap-1">
                {[28, 42, 55, 70, 86].map((h, i) => (
                  <span
                    key={h}
                    className={`flex-1 rounded-t-[2px] ${i < 2 ? "bg-[rgb(242_238_230/0.18)]" : "bg-gradient-to-t from-gold/40 to-gold-2/80"}`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <p className="mt-2 text-[0.6875rem] leading-snug text-fg-2">{t.roiNote}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
