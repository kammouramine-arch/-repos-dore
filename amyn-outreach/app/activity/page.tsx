import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const LEVELS = ["INFO", "WARN", "ERROR"] as const;

const LEVEL_STYLE: Record<string, { dot: string; text: string }> = {
  INFO: { dot: "bg-zinc-600", text: "text-zinc-400" },
  WARN: { dot: "bg-amber-400", text: "text-amber-200" },
  ERROR: { dot: "bg-rose-400", text: "text-rose-200" },
};

const ACTOR_LABEL: Record<string, string> = {
  SYSTEM: "Système",
  AGENT: "Agent",
  HUMAN: "Vous",
};

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; module?: string }>;
}) {
  const params = await searchParams;
  const level = params.level && (LEVELS as readonly string[]).includes(params.level) ? params.level : null;
  const moduleFilter = params.module ?? null;

  const [entries, byLevel, byModule] = await Promise.all([
    prisma.activityLog.findMany({
      where: {
        ...(level ? { level } : {}),
        ...(moduleFilter ? { module: moduleFilter } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.activityLog.groupBy({ by: ["level"], _count: { _all: true } }),
    prisma.activityLog.groupBy({ by: ["module"], _count: { _all: true } }),
  ]);

  const levelCounts = Object.fromEntries(byLevel.map((g) => [g.level, g._count._all]));
  const total = byLevel.reduce((s, g) => s + g._count._all, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Journal"
        title="Toutes les actions du système"
        description="Chaque décision importante laisse une trace horodatée : recherche, audit, découverte d'email, génération, blocage de conformité, envoi, réponse, création de client. Aucune action silencieuse."
      />

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Chip href={qs({ module: moduleFilter })} label="Tous niveaux" count={total} active={!level} />
          {LEVELS.map((l) => (
            <Chip
              key={l}
              href={qs({ level: l, module: moduleFilter })}
              label={l}
              count={levelCounts[l] ?? 0}
              active={level === l}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip href={qs({ level })} label="Tous modules" count={total} active={!moduleFilter} small />
          {byModule
            .sort((a, b) => b._count._all - a._count._all)
            .map((m) => (
              <Chip
                key={m.module}
                href={qs({ level, module: m.module })}
                label={m.module}
                count={m._count._all}
                active={moduleFilter === m.module}
                small
              />
            ))}
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="panel p-8 text-center text-sm text-zinc-500">
          Aucune entrée pour ce filtre.
        </p>
      ) : (
        <ul className="panel divide-y divide-line">
          {entries.map((e) => {
            const style = LEVEL_STYLE[e.level] ?? LEVEL_STYLE.INFO;
            return (
              <li key={e.id} className="flex gap-3 px-4 py-3">
                <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${style.dot}`} />
                <div className="min-w-0 flex-1">
                  <p className={`text-[13px] leading-relaxed ${style.text}`}>{e.summary}</p>
                  <p className="mt-1 text-[11px] text-zinc-700">
                    {formatDateTime(e.createdAt)} · {ACTOR_LABEL[e.actor] ?? e.actor} ·{" "}
                    {e.module} · {e.action}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-[11px] text-zinc-700">
        200 entrées les plus récentes. Le journal complet est en base
        (table <code className="text-zinc-600">ActivityLog</code>).
      </p>
    </div>
  );
}

function qs(input: { level?: string | null; module?: string | null }) {
  const p = new URLSearchParams();
  if (input.level) p.set("level", input.level);
  if (input.module) p.set("module", input.module);
  const s = p.toString();
  return s ? `/activity?${s}` : "/activity";
}

function Chip({
  href,
  label,
  count,
  active,
  small,
}: {
  href: string;
  label: string;
  count: number;
  active: boolean;
  small?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-full ring-1 ring-inset transition-colors ${
        small ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs"
      } ${
        active
          ? "bg-ink-800 text-zinc-100 ring-zinc-600"
          : "text-zinc-500 ring-line hover:bg-ink-850 hover:text-zinc-300"
      }`}
    >
      {label}
      <span className="tabular-nums text-zinc-600">{count}</span>
    </Link>
  );
}
