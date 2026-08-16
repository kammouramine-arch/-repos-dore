import Link from "next/link";

export function StatCard({
  label,
  value,
  href,
  accent = false,
  dot,
  hint,
}: {
  label: string;
  value: number;
  href?: string;
  accent?: boolean;
  dot?: string;
  hint?: string;
}) {
  const body = (
    <div
      className={`relative overflow-hidden panel panel-hover p-4 ${
        href ? "hover:border-zinc-600 hover:bg-ink-850" : ""
      } ${accent ? "bg-ink-850" : ""}`}
    >
      {accent && <div className="gold-rule absolute inset-x-0 top-0 h-px" />}
      <div className="flex items-center gap-1.5">
        {dot && <span className={`size-1.5 rounded-full ${dot}`} />}
        <span className="label-xs text-zinc-500">{label}</span>
      </div>
      <div
        className={`mt-2.5 font-light tabular-nums ${
          accent ? "text-3xl text-gold-300" : "text-3xl text-zinc-100"
        }`}
      >
        {value}
      </div>
      {hint && <div className="mt-1 text-[11px] text-zinc-600">{hint}</div>}
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}
