import { statusMeta } from "@/lib/constants";

export function StatusBadge({
  status,
  size = "md",
}: {
  status: string;
  size?: "sm" | "md";
}) {
  const meta = statusMeta(status);
  const pad = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ring-1 ring-inset font-medium whitespace-nowrap ${pad} ${meta.badge}`}
      title={meta.description}
    >
      <span className={`size-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    HIGH: { label: "Élevée", cls: "bg-rose-500/10 text-rose-300 ring-rose-400/20" },
    MEDIUM: { label: "Moyenne", cls: "bg-amber-500/10 text-amber-300 ring-amber-400/20" },
    LOW: { label: "Faible", cls: "bg-zinc-500/10 text-zinc-400 ring-zinc-400/20" },
  };
  const meta = map[severity] ?? map.LOW;
  return (
    <span
      className={`inline-flex rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${meta.cls}`}
    >
      {meta.label}
    </span>
  );
}

export function DemoTag() {
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase bg-gold-500/10 text-gold-300 ring-1 ring-inset ring-gold-500/25">
      Demo
    </span>
  );
}
