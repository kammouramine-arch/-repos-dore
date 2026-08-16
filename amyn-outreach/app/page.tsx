import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { ProspectTable } from "@/components/ProspectTable";
import { getStatusCounts, listProspects, getPipelineStats } from "@/lib/prospects";
import { DASHBOARD_STATUSES, STATUS_META } from "@/lib/constants";
import { mailerStatus } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [counts, prospects, stats] = await Promise.all([
    getStatusCounts(),
    listProspects(),
    getPipelineStats(),
  ]);

  const mailer = mailerStatus();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Tableau de bord"
        title="Prospection AMYN"
        description="Chaque fiche ne peut avancer que si le diagnostic repose sur une preuve vérifiable. Rien ne part sans approbation manuelle."
        action={
          <Link
            href="/prospects"
            className="rounded-lg border border-line bg-ink-850 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-600 hover:text-zinc-50"
          >
            Voir toutes les fiches
          </Link>
        }
      />

      {/* Compteurs */}
      <section>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9">
          <StatCard label="Total" value={counts.TOTAL} accent href="/prospects" />
          {DASHBOARD_STATUSES.map((status) => (
            <StatCard
              key={status}
              label={STATUS_META[status].label}
              value={counts[status]}
              dot={STATUS_META[status].dot}
              href={`/prospects?status=${status}`}
            />
          ))}
        </div>
      </section>

      {/* Bandeau d'état du système */}
      <section className="grid gap-3 lg:grid-cols-3">
        <div className="panel p-5">
          <div className="label-xs text-zinc-600">Système d&apos;envoi</div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-lg font-light text-zinc-100">
              {mailer.dryRun ? "Simulation" : mailer.transport}
            </span>
            <span className="text-xs text-emerald-400">verrouillé</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-zinc-600">
            Transport <span className="font-mono text-zinc-500">{mailer.transport}</span>.
            Plafond prévu&nbsp;: {mailer.dailyLimit}/jour, {mailer.minDelaySeconds}s entre
            deux envois.
          </p>
        </div>

        <div className="panel p-5">
          <div className="label-xs text-zinc-600">Données collectées</div>
          <dl className="mt-3 space-y-1.5 text-sm">
            <Row label="Emails publics trouvés" value={stats.withEmail} />
            <Row label="Problèmes documentés" value={stats.issueCount} />
            <Row label="Brouillons générés" value={stats.draftCount} />
          </dl>
        </div>

        <div className="panel p-5">
          <div className="label-xs text-zinc-600">Conformité</div>
          <dl className="mt-3 space-y-1.5 text-sm">
            <Row label="Liste noire" value={stats.suppressed} />
            <Row label="Envois journalisés" value={stats.sendCount} />
            <Row label="Fiches de démonstration" value={stats.demoCount} />
          </dl>
        </div>
      </section>

      {/* Tableau */}
      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <h2 className="text-sm font-medium text-zinc-300">Pipeline</h2>
          <span className="text-xs text-zinc-600">
            {prospects.length} fiche{prospects.length > 1 ? "s" : ""}
          </span>
        </div>
        <ProspectTable prospects={prospects} />
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="tabular-nums text-zinc-200">{value}</dd>
    </div>
  );
}
