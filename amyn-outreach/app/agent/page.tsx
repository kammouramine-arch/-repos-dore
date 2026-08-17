import { PageHeader } from "@/components/PageHeader";
import { AgentConsole } from "./AgentConsole";
import { prisma } from "@/lib/db";
import { autonomyMatrix } from "@/lib/agent/autonomy";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const RUN_STATUS: Record<string, { label: string; cls: string }> = {
  DONE: { label: "Terminé", cls: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20" },
  PARTIAL: { label: "Partiel", cls: "bg-amber-500/10 text-amber-300 ring-amber-400/20" },
  WAITING_APPROVAL: { label: "Attend validation", cls: "bg-gold-500/10 text-gold-300 ring-gold-500/25" },
  RUNNING: { label: "En cours", cls: "bg-sky-500/10 text-sky-300 ring-sky-400/20" },
  FAILED: { label: "Échec", cls: "bg-rose-500/10 text-rose-300 ring-rose-400/20" },
  PLANNED: { label: "Planifié", cls: "bg-zinc-500/10 text-zinc-400 ring-zinc-400/20" },
};

const ACTION_STATUS: Record<string, string> = {
  DONE: "text-emerald-300",
  FAILED: "text-rose-300",
  WAITING_APPROVAL: "text-gold-300",
  SKIPPED: "text-zinc-500",
  REJECTED: "text-rose-300",
  RUNNING: "text-sky-300",
  PENDING: "text-zinc-500",
};

export default async function AgentPage() {
  const [runs, matrix] = await Promise.all([
    prisma.agentRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 15,
      include: { actions: { orderBy: { position: "asc" } } },
    }),
    autonomyMatrix(),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Agent"
        title="Console d'instruction"
        description="Donnez une instruction en français. L'agent la traduit en plan d'actions, exécute ce qu'il a le droit d'exécuter et s'arrête sur tout ce qui demande votre validation. Chaque exécution est tracée."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <AgentConsole />

          <section className="space-y-3">
            <h2 className="label-xs text-zinc-500">Exécutions récentes</h2>
            {runs.length === 0 ? (
              <p className="panel p-5 text-sm text-zinc-500">
                Aucune exécution pour l&apos;instant.
              </p>
            ) : (
              <ul className="space-y-3">
                {runs.map((run) => {
                  const meta = RUN_STATUS[run.status] ?? RUN_STATUS.PLANNED;
                  return (
                    <li key={run.id} className="panel p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm text-zinc-200">« {run.instruction} »</p>
                          <p className="mt-1 text-[11px] text-zinc-600">
                            {formatDateTime(run.startedAt)} · intention {run.intent}
                            {run.durationMs !== null && ` · ${(run.durationMs / 1000).toFixed(1)} s`}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${meta.cls}`}
                        >
                          {meta.label}
                        </span>
                      </div>

                      {run.summary && (
                        <p className="mt-3 text-[13px] leading-relaxed text-zinc-400">
                          {run.summary}
                        </p>
                      )}

                      {run.actions.length > 0 && (
                        <ol className="mt-3 space-y-1.5 border-t border-line pt-3">
                          {run.actions.map((action) => (
                            <li key={action.id} className="flex gap-2 text-[12px]">
                              <span className="w-4 shrink-0 text-right text-zinc-700 tabular-nums">
                                {action.position + 1}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="text-zinc-300">{action.description}</span>
                                <span className="ml-2 text-zinc-700">[{action.module}]</span>
                                {action.error && (
                                  <span className="mt-0.5 block text-rose-300/80">{action.error}</span>
                                )}
                              </span>
                              <span
                                className={`shrink-0 ${ACTION_STATUS[action.status] ?? "text-zinc-500"}`}
                              >
                                {action.status}
                              </span>
                            </li>
                          ))}
                        </ol>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-3">
          <h2 className="label-xs text-zinc-500">Matrice d&apos;autonomie</h2>
          <div className="panel divide-y divide-line">
            {matrix.map((row) => (
              <div key={row.action} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="min-w-0 truncate text-[12px] text-zinc-400">{row.action}</span>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${
                    row.level === "AUTOMATIC"
                      ? "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20"
                      : "bg-gold-500/10 text-gold-300 ring-gold-500/25"
                  }`}
                >
                  {row.level === "AUTOMATIC" ? "auto" : "validation"}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-600">
            Modifiable sans redéploiement : table <code className="text-zinc-500">Setting</code>,
            clé <code className="text-zinc-500">autonomy.&lt;ACTION&gt;</code>.
          </p>
        </aside>
      </div>
    </div>
  );
}
