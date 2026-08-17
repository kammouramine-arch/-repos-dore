import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { CampaignStatusBadge, MemberStatusBadge, SendStatusBadge } from "@/components/Badges";
import { StatusBadge } from "@/components/StatusBadge";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

type ComplianceReport = {
  allowed: boolean;
  checks: Array<{ name: string; passed: boolean; detail: string }>;
  blockedBy: string[];
};

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const campaign = await prisma.campaign.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: {
      members: {
        orderBy: { addedAt: "asc" },
        include: {
          prospect: {
            include: {
              primaryContact: true,
              emailDrafts: { where: { isActive: true }, take: 1 },
            },
          },
        },
      },
      sends: { orderBy: { createdAt: "desc" }, include: { prospect: true } },
      replies: { orderBy: { receivedAt: "desc" }, include: { prospect: true } },
    },
  });

  if (!campaign) notFound();

  const blocked = campaign.members.filter((m) => m.status === "BLOCKED");
  const approved = campaign.members.filter((m) => m.status === "APPROVED").length;
  const readyToApprove = campaign.members.filter((m) => m.status === "READY").length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={<Link href="/campaigns" className="hover:text-gold-300">← Campagnes</Link>}
        title={campaign.name}
        description={`Expéditeur : ${campaign.fromName} <${campaign.fromEmail}> · limite ${campaign.dailyLimit} envois/jour · délai minimum ${campaign.minDelaySeconds} s entre deux envois.`}
        action={<CampaignStatusBadge status={campaign.status} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Cell label="Membres" value={campaign.members.length} />
        <Cell label="Prêts à approuver" value={readyToApprove} />
        <Cell label="Approuvés" value={approved} />
        <Cell label="Bloqués" value={blocked.length} tone={blocked.length > 0 ? "warn" : undefined} />
      </div>

      {readyToApprove > 0 && (
        <div className="rounded-lg border border-gold-500/25 bg-gold-500/5 px-4 py-3">
          <p className="text-sm text-gold-200">
            {readyToApprove} email{readyToApprove > 1 ? "s" : ""} attendent votre approbation.
          </p>
          <p className="mt-1.5 text-[12px] text-zinc-400">
            Relisez chaque email ci-dessous, puis approuvez en ligne de commande&nbsp;:{" "}
            <code className="rounded bg-ink-950 px-1.5 py-0.5 text-gold-300">
              npm run amyn -- campaign approve {campaign.slug}
            </code>
          </p>
        </div>
      )}

      {blocked.length > 0 && (
        <section className="space-y-2">
          <h2 className="label-xs text-zinc-500">Membres bloqués — aucun envoi possible</h2>
          <ul className="panel divide-y divide-line">
            {blocked.map((m) => (
              <li key={m.id} className="px-4 py-3">
                <Link href={`/prospects/${m.prospectId}`} className="text-sm text-zinc-200 hover:text-gold-300">
                  {m.prospect.name}
                </Link>
                <p className="mt-1 text-[12px] text-rose-300/85">{m.blockedReason ?? "Raison non enregistrée."}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="label-xs text-zinc-500">Membres et emails générés</h2>
        {campaign.members.length === 0 ? (
          <p className="panel p-5 text-sm text-zinc-500">Aucun prospect dans cette campagne.</p>
        ) : (
          <div className="space-y-3">
            {campaign.members.map((m) => {
              const draft = m.prospect.emailDrafts[0];
              return (
                <article key={m.id} className="panel p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/prospects/${m.prospectId}`}
                        className="text-[15px] text-zinc-100 hover:text-gold-300"
                      >
                        {m.prospect.name}
                      </Link>
                      <p className="mt-1 text-[11px] text-zinc-600">
                        {m.prospect.primaryContact?.email ?? "aucun email vérifié"}
                        {m.prospect.city && ` · ${m.prospect.city}`}
                        {m.sequenceStep > 0 && ` · relance ${m.sequenceStep}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge status={m.prospect.status} size="sm" />
                      <MemberStatusBadge status={m.status} size="sm" />
                    </div>
                  </div>

                  {draft ? (
                    <div className="mt-3 rounded-lg border border-line bg-ink-950 p-3">
                      <p className="text-[13px] font-medium text-zinc-200">{draft.subject}</p>
                      <pre className="mt-2 whitespace-pre-wrap font-sans text-[12.5px] leading-relaxed text-zinc-400">
                        {draft.body}
                      </pre>
                    </div>
                  ) : (
                    <p className="mt-3 text-[12px] text-zinc-600">
                      Aucun email actif généré pour ce prospect.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="label-xs text-zinc-500">Journal d&apos;envoi</h2>
        {campaign.sends.length === 0 ? (
          <p className="panel p-5 text-sm text-zinc-500">Aucune tentative d&apos;envoi enregistrée.</p>
        ) : (
          <ul className="panel divide-y divide-line">
            {campaign.sends.map((s) => {
              let checks: ComplianceReport["checks"] = [];
              try {
                checks = s.complianceReport
                  ? ((JSON.parse(s.complianceReport) as ComplianceReport).checks ?? [])
                  : [];
              } catch {
                checks = [];
              }
              const failed = checks.filter((c) => !c.passed);
              return (
                <li key={s.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-sm text-zinc-200">{s.prospect.name}</span>
                      <span className="ml-2 text-[12px] text-zinc-600">{s.toEmail}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {s.dryRun && (
                        <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300 ring-1 ring-inset ring-emerald-400/20">
                          dry run
                        </span>
                      )}
                      <SendStatusBadge status={s.status} size="sm" />
                    </div>
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-600">
                    {formatDateTime(s.createdAt)} · transport {s.transport} · {checks.length} contrôle
                    {checks.length > 1 ? "s" : ""} de conformité
                    {failed.length > 0 && ` · ${failed.length} échoué${failed.length > 1 ? "s" : ""}`}
                  </p>
                  {s.subject && <p className="mt-1 text-[12px] text-zinc-500">« {s.subject} »</p>}
                  {failed.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {failed.map((c) => (
                        <li key={c.name} className="text-[12px] text-rose-300/85">
                          <span className="text-zinc-500">{c.name} —</span> {c.detail}
                        </li>
                      ))}
                    </ul>
                  )}
                  {s.error && <p className="mt-1 text-[12px] text-rose-300/85">{s.error}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {campaign.replies.length > 0 && (
        <section className="space-y-2">
          <h2 className="label-xs text-zinc-500">Réponses reçues</h2>
          <ul className="panel divide-y divide-line">
            {campaign.replies.map((r) => (
              <li key={r.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-zinc-200">{r.prospect.name}</span>
                  <span className="text-[11px] text-zinc-600">{formatDateTime(r.receivedAt)}</span>
                </div>
                <p className="mt-1 text-[12px] text-zinc-500">{r.classification} · {r.subject}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Cell({ label, value, tone }: { label: string; value: number; tone?: "warn" }) {
  return (
    <div className="panel p-4">
      <div className="label-xs text-zinc-500">{label}</div>
      <div
        className={`mt-2 text-3xl font-light tabular-nums ${
          tone === "warn" ? "text-amber-300" : "text-zinc-100"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
