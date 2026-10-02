import type { EvidenceStatus } from "@/lib/proofsprint-demo";

/**
 * État d'une réponse : une forme ET un libellé, jamais la couleur seule.
 *   ✓ sourcée · ! relecture requise · ✕ preuve manquante
 */
const STYLE: Record<EvidenceStatus, { glyph: string; className: string }> = {
  supported: { glyph: "✓", className: "border-[rgb(140_190_160/0.4)] bg-[rgb(31_59_47/0.55)] text-[#b9e2c8]" },
  review: { glyph: "!", className: "border-gold/45 bg-[rgb(198_167_106/0.12)] text-gold-2" },
  missing: { glyph: "✕", className: "border-[rgb(220_140_120/0.45)] bg-[rgb(110_40_30/0.35)] text-[#f3c0b2]" },
};

export function StatusBadge({ status, label }: { status: EvidenceStatus; label: string }) {
  const s = STYLE[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.8125rem] leading-tight ${s.className}`}>
      <span aria-hidden className="flex size-4 shrink-0 items-center justify-center rounded-full border border-current text-[0.625rem] font-semibold">
        {s.glyph}
      </span>
      {label}
    </span>
  );
}
