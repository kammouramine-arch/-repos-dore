import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { ReviewActions } from "@/components/ReviewActions";
import { StatusBadge } from "@/components/StatusBadge";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { REPLY_META, RECOMMENDED_ACTION, matchedByLabel, type ReplyClass } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ReplyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const reply = await prisma.reply.findUnique({
    where: { id },
    include: {
      prospect: {
        select: { id: true, name: true, city: true, sector: true, status: true, overallScore: true },
      },
      campaign: { select: { id: true, name: true } },
    },
  });
  if (!reply) notFound();

  const meta =
    REPLY_META[reply.classification as ReplyClass] ?? {
      label: reply.classification,
      badge: "bg-zinc-500/10 text-zinc-400 ring-zinc-400/20",
      positive: false,
    };

  let signals: string[] = [];
  try {
    signals = reply.matchedSignals ? (JSON.parse(reply.matchedSignals) as string[]) : [];
  } catch {
    signals = [];
  }

  const suppression = await prisma.suppression.findFirst({ where: { email: reply.fromEmail } });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={
          <Link href="/replies" className="hover:text-gold-300">
            ← Centre de traitement
          </Link>
        }
        title={reply.subject || "(sans objet)"}
        description={`De ${reply.fromName ? `${reply.fromName} <${reply.fromEmail}>` : reply.fromEmail} · reçu le ${formatDateTime(reply.receivedAt)}`}
        action={
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${meta.badge}`}>
            {meta.label}
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section className="space-y-2">
            <h2 className="label-xs text-zinc-500">Message reçu</h2>
            <div className="panel p-4">
              <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-zinc-300">
                {reply.body || "(corps vide)"}
              </pre>
            </div>
            <p className="text-[11px] leading-relaxed text-zinc-600">
              Texte de la personne uniquement : la citation de notre email d&apos;origine a été
              retirée avant analyse, pour que nos propres mots ne soient jamais pris pour les siens.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="label-xs text-zinc-500">Pourquoi ce classement</h2>
            <div className="panel p-4">
              <p className="text-[13px] leading-relaxed text-zinc-300">
                Classée <strong className="text-zinc-100">{meta.label}</strong> avec une confiance{" "}
                {reply.confidence.toLowerCase()}.
              </p>
              {signals.length > 0 ? (
                <div className="mt-3">
                  <div className="label-xs text-zinc-600">Expressions détectées</div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {signals.map((s) => (
                      <code
                        key={s}
                        className="rounded bg-ink-950 px-1.5 py-0.5 text-[11.5px] text-zinc-400 ring-1 ring-inset ring-line"
                      >
                        {s}
                      </code>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-[12px] text-zinc-600">
                  Aucune expression caractéristique n&apos;a été reconnue : le message n&apos;a pas
                  été interprété.
                </p>
              )}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="label-xs text-zinc-500">Action recommandée</h2>
            <div className="panel border-gold-500/20 p-4">
              <p className="text-[15px] text-gold-200">
                {reply.recommendedAction ??
                  RECOMMENDED_ACTION[reply.classification as ReplyClass] ??
                  "À lire : aucune action déterminée."}
              </p>
              <p className="mt-2 text-[12px] leading-relaxed text-zinc-500">
                C&apos;est une suggestion, pas une exécution. AMYN Outreach n&apos;envoie aucune
                réponse automatique : rien ne partira sans que vous l&apos;ayez rédigé et approuvé.
              </p>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="label-xs text-zinc-500">Suivi</h2>
            <div className="panel p-4">
              <ReviewActions replyId={reply.id} current={reply.reviewStatus} />
              <p className="mt-3 text-[11px] text-zinc-600">
                Ce suivi est local : il ne modifie ni la boîte mail ni le message d&apos;origine.
              </p>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="space-y-2">
            <h2 className="label-xs text-zinc-500">Prospect</h2>
            <div className="panel p-4">
              {reply.prospect ? (
                <>
                  <Link
                    href={`/prospects/${reply.prospect.id}`}
                    className="text-[15px] text-zinc-100 hover:text-gold-300"
                  >
                    {reply.prospect.name}
                  </Link>
                  <p className="mt-1 text-[11px] text-zinc-600">
                    {reply.prospect.city} · {reply.prospect.sector}
                  </p>
                  <div className="mt-3">
                    <StatusBadge status={reply.prospect.status} size="sm" />
                  </div>
                  <p className="mt-3 border-t border-line pt-3 text-[11.5px] leading-relaxed text-zinc-500">
                    Rattaché par&nbsp;: {matchedByLabel(reply.matchedBy, true)}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[13px] text-zinc-400">Expéditeur inconnu</p>
                  <p className="mt-2 text-[11.5px] leading-relaxed text-zinc-600">
                    Aucune trace de {reply.fromEmail} : ni contact enregistré, ni envoi effectué à
                    cette adresse. La réponse est conservée telle quelle plutôt que rattachée à un
                    prospect au hasard.
                  </p>
                </>
              )}
            </div>
          </section>

          {suppression && (
            <section className="space-y-2">
              <h2 className="label-xs text-zinc-500">Opposition</h2>
              <div className="panel border-rose-500/25 p-4">
                <p className="text-[13px] text-rose-200">
                  {reply.fromEmail} est en liste d&apos;opposition.
                </p>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-zinc-500">
                  Motif {suppression.reason} · enregistré le {formatDateTime(suppression.createdAt)}.
                  Aucune campagne ne peut plus atteindre cette adresse.
                </p>
              </div>
            </section>
          )}

          <section className="space-y-2">
            <h2 className="label-xs text-zinc-500">Provenance</h2>
            <dl className="panel divide-y divide-line">
              <Row label="Source" value={reply.source === "IMAP" ? "Boîte mail (IMAP)" : "Saisie manuelle"} />
              <Row label="De" value={reply.fromEmail} />
              <Row label="À" value={reply.toEmail ?? "—"} />
              <Row label="Reçu le" value={formatDateTime(reply.receivedAt)} />
              <Row label="Dossier" value={reply.imapFolder ?? "—"} />
              <Row label="UID" value={reply.imapUid !== null ? String(reply.imapUid) : "—"} />
              <Row label="Message-ID" value={reply.messageId ?? "—"} mono />
              <Row label="Campagne" value={reply.campaign?.name ?? "—"} />
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 py-2">
      <dt className="shrink-0 text-[11px] text-zinc-600">{label}</dt>
      <dd
        className={`min-w-0 truncate text-right text-[12px] text-zinc-300 ${mono ? "font-mono text-[11px]" : ""}`}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}
