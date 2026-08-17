import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { ProspectTable } from "@/components/ProspectTable";
import { listProspects } from "@/lib/prospects";
import { pipelineSnapshot } from "@/lib/analytics";
import { recentActivity } from "@/lib/activity";
import { DASHBOARD_STATUSES, STATUS_META, REPLY_META, type ReplyClass } from "@/lib/constants";
import { mailerStatus } from "@/lib/mailer";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [snap, prospects, activity] = await Promise.all([
    pipelineSnapshot(),
    listProspects(undefined, 25),
    recentActivity(8),
  ]);
  const mailer = mailerStatus();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Tableau de bord"
        title="AMYN Outreach"
        description="Chaque fiche n'avance que si le constat repose sur une preuve vérifiable. Aucun email ne part sans approbation et sans passer les contrôles de conformité."
        action={
          <div className="flex gap-2">
            <Link href="/agent" className="rounded-lg border border-gold-500/40 bg-gold-500/10 px-4 py-2 text-sm text-gold-200 transition-colors hover:bg-gold-500/15">
              Console agent
            </Link>
            <Link href="/prospects" className="rounded-lg border border-line bg-ink-850 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-600 hover:text-zinc-50">
              Tous les prospects
            </Link>
          </div>
        }
      />

      {/* Pipeline de prospection */}
      <section className="space-y-3">
        <h2 className="label-xs text-zinc-600">Prospection</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
          <StatCard label="Total" value={snap.prospects.total} accent href="/prospects" />
          {DASHBOARD_STATUSES.map((s) => (
            <StatCard key={s} label={STATUS_META[s].label} value={snap.prospects.byStatus[s]} dot={STATUS_META[s].dot} href={`/prospects?status=${s}`} />
          ))}
        </div>
      </section>

      {/* Activité commerciale */}
      <section className="space-y-3">
        <h2 className="label-xs text-zinc-600">Activité commerciale</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <StatCard label="Emails prêts" value={snap.emails.drafts} href="/campaigns" />
          <StatCard label="Envoyés" value={snap.emails.realSends} href="/campaigns" />
          <StatCard label="Bloqués" value={snap.emails.blockedSends} hint="conformité" />
          <StatCard label="Réponses" value={snap.replies.total} href="/replies" />
          <StatCard label="Clients" value={snap.clients.total} href="/clients" accent={snap.clients.total > 0} />
          <StatCard label="CARE actifs" value={snap.care.active} href="/clients" />
          <StatCard label="Opposition" value={snap.compliance.suppressions} hint="jamais recontactés" />
        </div>
      </section>

      {/* Revenus + système */}
      <section className="grid gap-3 lg:grid-cols-4">
        <div className="panel p-5">
          <div className="label-xs text-zinc-600">Revenus signés</div>
          <div className="mt-2.5 text-2xl font-light text-gold-300">{snap.revenue.signed} €</div>
          <p className="mt-1 text-[11px] text-zinc-600">
            encaissé {snap.revenue.paid} € · en attente {snap.revenue.pending} €
          </p>
        </div>
        <div className="panel p-5">
          <div className="label-xs text-zinc-600">Récurrent (CARE)</div>
          <div className="mt-2.5 text-2xl font-light text-zinc-100">{snap.revenue.recurring} €<span className="text-sm text-zinc-600">/mois</span></div>
          <p className="mt-1 text-[11px] text-zinc-600">{snap.care.active} abonnement(s) actif(s)</p>
        </div>
        <div className="panel p-5">
          <div className="label-xs text-zinc-600">Projets</div>
          <div className="mt-2.5 text-sm text-zinc-300">
            {Object.keys(snap.projects).length === 0 ? (
              <span className="text-zinc-600">aucun projet en cours</span>
            ) : (
              Object.entries(snap.projects).map(([phase, n]) => (
                <div key={phase} className="flex justify-between"><span className="text-zinc-500">{phase}</span><span>{n}</span></div>
              ))
            )}
          </div>
        </div>
        <div className="panel p-5">
          <div className="label-xs text-zinc-600">Système d&apos;envoi</div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-lg font-light text-zinc-100">{mailer.dryRun ? "Simulation" : mailer.transport}</span>
            <span className={`text-xs ${mailer.dryRun ? "text-emerald-400" : "text-amber-400"}`}>
              {mailer.dryRun ? "verrouillé" : "actif"}
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">
            {mailer.smtpConfigured ? `SMTP ${mailer.smtpHost}` : `SMTP non configuré (${mailer.smtpMissing.join(", ")})`}
          </p>
        </div>
      </section>

      {/* Réponses par catégorie */}
      {snap.replies.total > 0 && (
        <section className="space-y-3">
          <h2 className="label-xs text-zinc-600">Réponses reçues</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(snap.replies.byClass).map(([cls, n]) => {
              const meta = REPLY_META[cls as ReplyClass];
              return (
                <span key={cls} className={`rounded-lg px-3 py-1.5 text-sm ring-1 ring-inset ${meta?.badge ?? "bg-zinc-500/10 text-zinc-400 ring-zinc-400/20"}`}>
                  {meta?.label ?? cls} <span className="tabular-nums opacity-70">{n}</span>
                </span>
              );
            })}
          </div>
        </section>
      )}

      {/* Pipeline */}
      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <h2 className="text-sm font-medium text-zinc-300">Pipeline</h2>
          <Link href="/prospects" className="text-xs text-zinc-600 hover:text-zinc-400">
            {snap.prospects.total} fiche(s) — tout voir
          </Link>
        </div>
        <ProspectTable prospects={prospects} />
      </section>

      {/* Journal */}
      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <h2 className="text-sm font-medium text-zinc-300">Ce que l&apos;agent a fait</h2>
          <Link href="/activity" className="text-xs text-zinc-600 hover:text-zinc-400">journal complet</Link>
        </div>
        <div className="panel divide-y divide-line-soft">
          {activity.length === 0 ? (
            <p className="px-5 py-8 text-center text-xs text-zinc-600">Aucune activité enregistrée.</p>
          ) : (
            activity.map((a) => (
              <div key={a.id} className="flex gap-4 px-5 py-3">
                <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${a.level === "ERROR" ? "bg-rose-400" : a.level === "WARN" ? "bg-amber-400" : "bg-zinc-600"}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-zinc-300">{a.summary}</p>
                  <p className="mt-0.5 text-[11px] text-zinc-600">
                    {a.module} · {a.actor} · {formatDateTime(a.createdAt)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
