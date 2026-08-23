import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { OperatorActions } from "@/components/OperatorActions";
import { StatusBadge } from "@/components/StatusBadge";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { getPolicy, checkSendWindow, remainingToday, POLICY_LABELS } from "@/lib/policy";
import { recentJobs } from "@/lib/scheduler";
import { imapStatus } from "@/lib/imap/config";
import { mailerStatus } from "@/lib/mailer";
import { REPLY_META, type ReplyClass } from "@/lib/constants";

export const dynamic = "force-dynamic";

const DECISION_META: Record<string, { label: string; cls: string }> = {
  REPLY: { label: "Répondre", cls: "bg-gold-500/10 text-gold-300 ring-gold-500/25" },
  SCHEDULE_FOLLOWUP: { label: "Reprogrammer", cls: "bg-indigo-500/10 text-indigo-300 ring-indigo-400/20" },
  STOP_SEQUENCE: { label: "Arrêter la séquence", cls: "bg-stone-500/10 text-stone-300 ring-stone-400/20" },
  BLACKLIST: { label: "Ne plus contacter", cls: "bg-rose-500/10 text-rose-300 ring-rose-400/20" },
  HUMAN_REVIEW: { label: "Votre intervention", cls: "bg-amber-500/10 text-amber-300 ring-amber-400/25" },
  NONE: { label: "Rien à faire", cls: "bg-zinc-500/10 text-zinc-400 ring-zinc-400/20" },
};

export default async function OperatorPage() {
  const policy = await getPolicy();

  const [conversations, missions, jobs, quota, attente, oppositions] = await Promise.all([
    prisma.reply.findMany({
      where: { decisionAction: { not: "BLACKLIST" } },
      orderBy: [{ reviewStatus: "asc" }, { receivedAt: "desc" }],
      take: 40,
      include: {
        prospect: {
          select: { id: true, name: true, city: true, status: true, overallScore: true, recommendedOffer: true },
        },
      },
    }),
    prisma.mission.findMany({ orderBy: { startedAt: "desc" }, take: 5, include: { steps: { orderBy: { position: "asc" } } } }),
    recentJobs(8),
    remainingToday(policy),
    prisma.campaignMember.count({ where: { status: "READY" } }),
    prisma.reply.count({ where: { decisionAction: "BLACKLIST" } }),
  ]);

  const fenetre = checkSendWindow(policy);
  const imap = imapStatus();
  const mail = mailerStatus();

  const parDecision = (a: string) => conversations.filter((c) => c.decisionAction === a).length;
  const aTraiter = conversations.filter(
    (c) => c.reviewStatus === "ACTION_REQUIRED" || c.reviewStatus === "NEW",
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Opérateur"
        title="Centre de contrôle"
        description="Ce que l'agent a fait seul, ce qu'il propose, et ce qui attend votre décision. Rien ne part sans votre approbation."
      />

      {/* --- État du système --------------------------------------------- */}
      <div className="grid gap-3 lg:grid-cols-4">
        <Panneau titre="Chaîne d'envoi">
          <Ligne label="Mode" valeur={mail.dryRun ? "Simulation" : "ENVOI RÉEL"} etat={mail.dryRun ? "ok" : "warn"} />
          <Ligne label="Quota du jour" valeur={`${quota.used} / ${policy.dailyLimit}`} />
          <Ligne label="Fenêtre" valeur={fenetre.open ? "ouverte" : "fermée"} etat={fenetre.open ? "ok" : "todo"} />
        </Panneau>

        <Panneau titre="Boîte mail">
          <Ligne
            label="IMAP"
            valeur={imap.configured ? "connectée" : "non connectée"}
            etat={imap.configured ? "ok" : "todo"}
          />
          <Ligne label="Dernier tour" valeur={jobs[0] ? formatDateTime(jobs[0].startedAt) : "jamais"} />
        </Panneau>

        <Panneau titre="En attente de vous">
          <Ligne label="Conversations" valeur={String(aTraiter.length)} etat={aTraiter.length > 0 ? "warn" : "ok"} />
          <Ligne label="Emails à approuver" valeur={String(attente)} etat={attente > 0 ? "warn" : "ok"} />
        </Panneau>

        <Panneau titre="Décisions de l'agent">
          <Ligne label="À répondre" valeur={String(parDecision("REPLY"))} />
          <Ligne label="Votre lecture" valeur={String(parDecision("HUMAN_REVIEW"))} />
          <Ligne label="Oppositions" valeur={String(oppositions)} />
        </Panneau>
      </div>

      {/* --- Missions ------------------------------------------------------ */}
      {missions.length > 0 && (
        <section className="space-y-2">
          <h2 className="label-xs text-zinc-500">Missions récentes</h2>
          <ul className="space-y-2">
            {missions.map((m) => {
              let needs: string[] = [];
              try { needs = m.needsHuman ? (JSON.parse(m.needsHuman) as string[]) : []; } catch { needs = []; }
              return (
                <li key={m.id} className="panel p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm text-zinc-200">« {m.brief} »</p>
                    <span className="shrink-0 text-[11px] text-zinc-600">
                      {formatDateTime(m.startedAt)} · {m.status}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[12.5px] text-zinc-500">{m.summary}</p>
                  {m.steps.length > 0 && (
                    <ol className="mt-2.5 space-y-1 border-t border-line pt-2.5">
                      {m.steps.map((s) => (
                        <li key={s.id} className="flex gap-2 text-[11.5px]">
                          <span className="w-20 shrink-0 text-zinc-700">{s.stage}</span>
                          <span className="min-w-0 flex-1 text-zinc-400">{s.description}</span>
                          <span
                            className={`shrink-0 ${s.status === "FAILED" ? "text-rose-300" : s.status === "SKIPPED" ? "text-zinc-600" : "text-emerald-300/80"}`}
                          >
                            {s.status}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                  {needs.map((n) => (
                    <p key={n} className="mt-2 text-[12px] text-gold-200">→ {n}</p>
                  ))}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* --- Conversations -------------------------------------------------- */}
      <section className="space-y-2">
        <h2 className="label-xs text-zinc-500">Conversations</h2>
        {conversations.length === 0 ? (
          <div className="panel p-8 text-center">
            <p className="text-sm text-zinc-400">Aucune conversation en cours.</p>
            <code className="mt-3 inline-block rounded bg-ink-950 px-3 py-1.5 text-[12px] text-gold-300 ring-1 ring-inset ring-line">
              npm run amyn -- tick
            </code>
          </div>
        ) : (
          <ul className="space-y-3">
            {conversations.map((c) => {
              const cls = REPLY_META[c.classification as ReplyClass];
              const dec = c.decisionAction ? DECISION_META[c.decisionAction] : null;
              return (
                <li key={c.id} className="panel p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {c.prospect ? (
                          <Link href={`/prospects/${c.prospect.id}`} className="text-[15px] text-zinc-100 hover:text-gold-300">
                            {c.prospect.name}
                          </Link>
                        ) : (
                          <span className="text-[15px] text-zinc-400">{c.fromName ?? "Expéditeur inconnu"}</span>
                        )}
                        {c.prospect && <StatusBadge status={c.prospect.status} size="sm" />}
                      </div>
                      <p className="mt-1 text-[11px] text-zinc-600">
                        {c.fromEmail}
                        {c.prospect?.city && ` · ${c.prospect.city}`}
                        {c.prospect?.overallScore !== null && c.prospect?.overallScore !== undefined && ` · score ${c.prospect.overallScore}`}
                        {c.prospect?.recommendedOffer && ` · ${c.prospect.recommendedOffer}`}
                        {" · "}{formatDateTime(c.receivedAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      {cls && (
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${cls.badge}`}>
                          {cls.label}
                        </span>
                      )}
                      {dec && (
                        <span className={`rounded px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${dec.cls}`}>
                          {dec.label}
                          {c.decisionAuto ? "" : " · validation"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ce que le prospect a écrit */}
                  <div className="mt-3 rounded-lg border border-line bg-ink-950 p-3">
                    <div className="label-xs text-zinc-600">Message reçu — {c.subject}</div>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-zinc-400">
                      {c.body.replace(/\s+/g, " ").trim().slice(0, 300)}
                      {c.body.length > 300 && "…"}
                    </p>
                  </div>

                  {/* Pourquoi cette décision */}
                  {c.decisionReason && (
                    <p className="mt-2.5 text-[12px] leading-relaxed text-zinc-500">
                      <span className="text-zinc-600">Décision : </span>
                      {c.decisionReason}
                      <span className="ml-1.5 text-zinc-700">(confiance {c.confidence.toLowerCase()})</span>
                    </p>
                  )}

                  {/* La réponse proposée */}
                  {c.proposedBody && (
                    <div
                      className={`mt-3 rounded-lg border p-3 ${
                        c.proposedStatus === "APPROVED"
                          ? "border-emerald-500/25 bg-emerald-500/5"
                          : c.proposedStatus === "REJECTED"
                            ? "border-line bg-ink-950 opacity-60"
                            : "border-gold-500/20 bg-gold-500/5"
                      }`}
                    >
                      <div className="label-xs text-zinc-600">
                        Réponse proposée — {c.proposedStatus}
                        {c.proposedStatus === "APPROVED" && " (en file d'attente, non envoyée)"}
                      </div>
                      <p className="mt-1.5 text-[12.5px] font-medium text-zinc-300">{c.proposedSubject}</p>
                      <pre className="mt-1.5 whitespace-pre-wrap font-sans text-[12px] leading-relaxed text-zinc-400">
                        {c.proposedBody}
                      </pre>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                    <OperatorActions
                      replyId={c.id}
                      decisionAction={c.decisionAction}
                      proposedStatus={c.proposedStatus}
                    />
                    <Link
                      href={`/replies/${c.id}`}
                      className="text-[12px] text-zinc-600 hover:text-zinc-400"
                    >
                      historique complet →
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* --- Jobs ---------------------------------------------------------- */}
      <section className="space-y-2">
        <h2 className="label-xs text-zinc-500">Derniers tours d&apos;opérateur</h2>
        <div className="panel divide-y divide-line">
          {jobs.length === 0 ? (
            <p className="px-4 py-3 text-[13px] text-zinc-600">
              Aucun tour effectué. Lancez&nbsp;: <code className="text-gold-300">npm run amyn -- tick</code>
            </p>
          ) : (
            jobs.map((j) => (
              <div key={j.id} className="flex flex-wrap items-start justify-between gap-2 px-4 py-2.5">
                <div className="min-w-0">
                  <span className="text-[12.5px] text-zinc-300">{j.job}</span>
                  <p className="mt-0.5 text-[11.5px] text-zinc-600">{j.summary ?? j.error ?? "—"}</p>
                </div>
                <span
                  className={`shrink-0 text-[11px] ${j.status === "FAILED" ? "text-rose-300" : "text-zinc-600"}`}
                >
                  {formatDateTime(j.startedAt)} · {j.status}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* --- Politique ------------------------------------------------------ */}
      <section className="space-y-2">
        <h2 className="label-xs text-zinc-500">Politique d&apos;envoi</h2>
        <div className="panel grid gap-x-8 gap-y-1 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(policy) as Array<keyof typeof policy>).map((k) => (
            <div key={k} className="flex items-baseline justify-between gap-3 border-b border-line/60 py-1.5">
              <span className="text-[12px] text-zinc-500" title={POLICY_LABELS[k].hint}>
                {POLICY_LABELS[k].label}
              </span>
              <span className="shrink-0 text-[12.5px] tabular-nums text-zinc-300">
                {String(policy[k])}
                {POLICY_LABELS[k].unit ? ` ${POLICY_LABELS[k].unit}` : ""}
              </span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-zinc-700">
          Modifiable à chaud&nbsp;: <code className="text-zinc-600">npm run amyn -- policy dailyLimit 25</code>.
          La réponse automatique est désactivée : toute réponse rédigée attend votre validation.
        </p>
      </section>
    </div>
  );
}

function Panneau({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="panel p-4">
      <div className="label-xs text-zinc-600">{titre}</div>
      <dl className="mt-2.5 space-y-1">{children}</dl>
    </div>
  );
}

function Ligne({ label, valeur, etat }: { label: string; valeur: string; etat?: "ok" | "warn" | "todo" }) {
  const couleur =
    etat === "ok" ? "text-emerald-300" : etat === "warn" ? "text-amber-300" : etat === "todo" ? "text-zinc-500" : "text-zinc-300";
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-[11.5px] text-zinc-600">{label}</dt>
      <dd className={`text-[12.5px] tabular-nums ${couleur}`}>{valeur}</dd>
    </div>
  );
}
