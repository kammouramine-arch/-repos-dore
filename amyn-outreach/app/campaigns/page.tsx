import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { CampaignStatusBadge } from "@/components/Badges";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      members: { select: { status: true } },
      sends: { select: { status: true } },
      replies: { select: { id: true } },
    },
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Campagnes"
        title="Envois groupés"
        description="Une campagne regroupe des prospects, leurs emails générés et l'historique d'envoi. Aucun email ne part sans que chaque membre ait passé les 12 contrôles de conformité et reçu votre approbation."
      />

      {campaigns.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const count = (s: string) => c.members.filter((m) => m.status === s).length;
            const sent = c.sends.filter((s) => s.status === "SENT").length;
            const simulated = c.sends.filter((s) => s.status === "SIMULATED").length;
            const blocked = c.sends.filter((s) => s.status === "BLOCKED").length;

            return (
              <Link key={c.id} href={`/campaigns/${c.id}`} className="block panel panel-hover p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-[15px] text-zinc-100">{c.name}</h2>
                      {c.isDemo && (
                        <span className="rounded bg-gold-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold-300 ring-1 ring-inset ring-gold-500/25">
                          Demo
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-600">
                      {c.fromName} &lt;{c.fromEmail}&gt; · créée le {formatDateTime(c.createdAt)}
                    </p>
                  </div>
                  <CampaignStatusBadge status={c.status} />
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-6">
                  <Metric label="Membres" value={c.members.length} />
                  <Metric label="Prêts" value={count("READY")} />
                  <Metric label="Approuvés" value={count("APPROVED")} />
                  <Metric label="Bloqués" value={count("BLOCKED") + blocked} tone="warn" />
                  <Metric label="Envoyés" value={sent} tone={sent > 0 ? "ok" : undefined} />
                  <Metric label="Simulés" value={simulated} />
                </dl>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "ok" | "warn";
}) {
  const color =
    tone === "ok" ? "text-emerald-300" : tone === "warn" && value > 0 ? "text-amber-300" : "text-zinc-200";
  return (
    <div>
      <dt className="label-xs text-zinc-600">{label}</dt>
      <dd className={`mt-0.5 text-lg font-light tabular-nums ${color}`}>{value}</dd>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="panel p-8 text-center">
      <p className="text-sm text-zinc-400">Aucune campagne pour l&apos;instant.</p>
      <p className="mx-auto mt-2 max-w-lg text-[13px] leading-relaxed text-zinc-600">
        Créez-en une depuis la console agent («&nbsp;Prépare une campagne pour Lille&nbsp;») ou en
        ligne de commande&nbsp;:
      </p>
      <code className="mt-3 inline-block rounded bg-ink-950 px-3 py-1.5 text-[12px] text-gold-300 ring-1 ring-inset ring-line">
        npm run amyn -- &quot;Prépare une campagne pour Lille&quot;
      </code>
    </div>
  );
}
