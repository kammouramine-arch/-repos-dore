import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { ReviewActions } from "@/components/ReviewActions";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { replyInbox } from "@/lib/replies/sync";
import { imapStatus } from "@/lib/imap/config";
import {
  REPLY_CLASSES,
  REPLY_META,
  REVIEW_STATUSES,
  REVIEW_META,
  matchedByLabel,
  RECOMMENDED_ACTION,
  type ReplyClass,
  type ReviewStatus,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

function classMeta(cls: string) {
  return (
    REPLY_META[cls as ReplyClass] ?? {
      label: cls,
      badge: "bg-zinc-500/10 text-zinc-400 ring-zinc-400/20",
      positive: false,
    }
  );
}

export default async function RepliesPage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string; status?: string }>;
}) {
  const params = await searchParams;
  const activeClass =
    params.class && (REPLY_CLASSES as readonly string[]).includes(params.class) ? params.class : null;
  const activeStatus =
    params.status && (REVIEW_STATUSES as readonly string[]).includes(params.status)
      ? params.status
      : null;

  const [replies, byClass, inbox, mailbox, suppressions] = await Promise.all([
    prisma.reply.findMany({
      where: {
        ...(activeClass ? { classification: activeClass } : {}),
        ...(activeStatus ? { reviewStatus: activeStatus } : {}),
      },
      orderBy: [{ reviewStatus: "asc" }, { receivedAt: "desc" }],
      take: 100,
      include: { prospect: { select: { id: true, name: true, city: true, status: true } } },
    }),
    prisma.reply.groupBy({ by: ["classification"], _count: { _all: true } }),
    replyInbox(),
    Promise.resolve(imapStatus()),
    prisma.suppression.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  const classCounts = Object.fromEntries(byClass.map((g) => [g.classification, g._count._all]));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Réponses"
        title="Centre de traitement"
        description="Chaque réponse est classée par un moteur déterministe, rattachée à un prospect uniquement si une trace le prouve, et assortie d'une action suggérée. Aucune réponse n'est envoyée automatiquement."
      />

      {/* --- État de la boîte ------------------------------------------- */}
      <MailboxBanner mailbox={mailbox} inbox={inbox} />

      {/* --- Compteurs ---------------------------------------------------- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Cell label="Nouvelles" value={inbox.new} href="/replies?status=NEW" tone="new" />
        <Cell
          label="Action requise"
          value={inbox.actionRequired}
          href="/replies?status=ACTION_REQUIRED"
          tone={inbox.actionRequired > 0 ? "warn" : undefined}
        />
        <Cell label="Intéressés" value={inbox.interested} tone={inbox.interested > 0 ? "ok" : undefined} />
        <Cell label="Oppositions" value={inbox.optOuts} href="/replies?class=OPT_OUT" />
      </div>

      {/* --- Filtres ------------------------------------------------------ */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Chip href={qs({ class: activeClass })} label="Tous états" count={inbox.total} active={!activeStatus} />
          {REVIEW_STATUSES.map((s) => (
            <Chip
              key={s}
              href={qs({ class: activeClass, status: s })}
              label={REVIEW_META[s as ReviewStatus].label}
              count={
                s === "NEW"
                  ? inbox.new
                  : s === "ACTION_REQUIRED"
                    ? inbox.actionRequired
                    : s === "REVIEWED"
                      ? inbox.reviewed
                      : inbox.resolved
              }
              active={activeStatus === s}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip href={qs({ status: activeStatus })} label="Toutes catégories" count={inbox.total} active={!activeClass} small />
          {REPLY_CLASSES.filter((c) => (classCounts[c] ?? 0) > 0 || activeClass === c).map((c) => (
            <Chip
              key={c}
              href={qs({ class: c, status: activeStatus })}
              label={REPLY_META[c].label}
              count={classCounts[c] ?? 0}
              active={activeClass === c}
              small
            />
          ))}
        </div>
      </div>

      {/* --- Liste -------------------------------------------------------- */}
      {replies.length === 0 ? (
        <EmptyState configured={mailbox.configured} filtered={Boolean(activeClass || activeStatus)} />
      ) : (
        <ul className="space-y-3">
          {replies.map((r) => {
            const meta = classMeta(r.classification);
            const preview = r.body.replace(/\s+/g, " ").trim().slice(0, 220);
            return (
              <li key={r.id} className="panel p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {r.prospect ? (
                        <Link
                          href={`/prospects/${r.prospect.id}`}
                          className="text-[15px] text-zinc-100 hover:text-gold-300"
                        >
                          {r.prospect.name}
                        </Link>
                      ) : (
                        <span className="text-[15px] text-zinc-400">
                          {r.fromName ?? "Expéditeur inconnu"}
                        </span>
                      )}
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] ring-1 ring-inset ${
                          r.source === "IMAP"
                            ? "text-zinc-500 ring-line"
                            : "text-zinc-600 ring-line"
                        }`}
                      >
                        {r.source === "IMAP" ? "boîte mail" : "saisie manuelle"}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-600">
                      {r.fromEmail} · {formatDateTime(r.receivedAt)}
                      {" · "}
                      <span>{matchedByLabel(r.matchedBy, Boolean(r.prospect))}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${meta.badge}`}
                    >
                      {meta.label}
                    </span>
                    <span className="text-[10px] text-zinc-600">
                      confiance {r.confidence.toLowerCase()}
                    </span>
                  </div>
                </div>

                <p className="mt-3 text-[13px] font-medium text-zinc-300">{r.subject}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-zinc-500">
                  {preview}
                  {r.body.length > 220 && "…"}
                </p>

                {(r.recommendedAction ?? RECOMMENDED_ACTION[r.classification as ReplyClass]) && (
                  <p className="mt-3 flex items-start gap-2 text-[12.5px] text-gold-200">
                    <span className="mt-0.5 text-gold-500">→</span>
                    <span>
                      {r.recommendedAction ?? RECOMMENDED_ACTION[r.classification as ReplyClass]}
                      <span className="ml-2 text-[11px] text-zinc-600">
                        (suggestion — rien n&apos;est exécuté automatiquement)
                      </span>
                    </span>
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                  <ReviewActions replyId={r.id} current={r.reviewStatus} />
                  <Link
                    href={`/replies/${r.id}`}
                    className="rounded-lg px-3 py-1.5 text-[12px] text-zinc-400 ring-1 ring-inset ring-line transition-colors hover:bg-ink-850 hover:text-zinc-200"
                  >
                    Ouvrir le détail
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* --- Liste d'opposition ------------------------------------------- */}
      <section className="space-y-2">
        <h2 className="label-xs text-zinc-500">Liste d&apos;opposition</h2>
        <p className="text-[11px] leading-relaxed text-zinc-600">
          Ces adresses et domaines sont définitivement exclus de tout envoi. Le contrôle est
          appliqué avant chaque email, sans exception.
        </p>
        <div className="panel divide-y divide-line">
          {suppressions.length === 0 ? (
            <p className="px-4 py-3 text-[13px] text-zinc-600">Aucune opposition enregistrée.</p>
          ) : (
            suppressions.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                <span className="text-[13px] text-zinc-300">{s.email ?? s.domain}</span>
                <span className="text-[11px] text-zinc-600">
                  {s.reason} · {formatDateTime(s.createdAt)}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function MailboxBanner({
  mailbox,
  inbox,
}: {
  mailbox: ReturnType<typeof imapStatus>;
  inbox: Awaited<ReturnType<typeof replyInbox>>;
}) {
  if (!mailbox.configured) {
    return (
      <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-4 py-3">
        <p className="text-sm text-amber-200">
          Boîte mail non connectée — les réponses ne peuvent être saisies que manuellement.
        </p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-400">
          Manquant dans <code className="text-zinc-300">.env</code> :{" "}
          <code className="text-amber-200">{mailbox.missing.join(", ")}</code>. Une fois renseigné,
          vérifiez avec{" "}
          <code className="rounded bg-ink-950 px-1.5 py-0.5 text-gold-300">
            npm run amyn -- imap-check
          </code>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-ink-900 px-4 py-3">
      <div className="min-w-0">
        <p className="text-[13px] text-zinc-300">
          Boîte <span className="text-zinc-100">{mailbox.user}</span> · dossier {mailbox.folder} ·{" "}
          <span className="text-emerald-300">lecture seule</span>
        </p>
        <p className="mt-0.5 text-[11px] text-zinc-600">
          {inbox.lastSyncAt
            ? `Dernière lecture : ${formatDateTime(inbox.lastSyncAt)}`
            : "La boîte n'a jamais été lue."}
          {inbox.lastSyncError && (
            <span className="ml-2 text-rose-300">Dernière erreur : {inbox.lastSyncError}</span>
          )}
        </p>
      </div>
      <code className="shrink-0 rounded bg-ink-950 px-2.5 py-1 text-[11.5px] text-gold-300 ring-1 ring-inset ring-line">
        npm run amyn -- sync-replies
      </code>
    </div>
  );
}

function EmptyState({ configured, filtered }: { configured: boolean; filtered: boolean }) {
  if (filtered) {
    return <p className="panel p-8 text-center text-sm text-zinc-500">Aucune réponse pour ce filtre.</p>;
  }
  return (
    <div className="panel p-8 text-center">
      <p className="text-sm text-zinc-400">Aucune réponse enregistrée.</p>
      <p className="mx-auto mt-2 max-w-xl text-[13px] leading-relaxed text-zinc-600">
        {configured
          ? "Lisez la boîte pour récupérer les réponses reçues :"
          : "En attendant la connexion de la boîte, une réponse peut être saisie à la main :"}
      </p>
      <code className="mt-3 inline-block rounded bg-ink-950 px-3 py-1.5 text-[12px] text-gold-300 ring-1 ring-inset ring-line">
        {configured
          ? "npm run amyn -- sync-replies"
          : 'npm run amyn -- reply contact@exemple.fr "Bonjour, quel est votre tarif ?"'}
      </code>
    </div>
  );
}

function qs(input: { class?: string | null; status?: string | null }) {
  const p = new URLSearchParams();
  if (input.class) p.set("class", input.class);
  if (input.status) p.set("status", input.status);
  const s = p.toString();
  return s ? `/replies?${s}` : "/replies";
}

function Cell({
  label,
  value,
  href,
  tone,
}: {
  label: string;
  value: number;
  href?: string;
  tone?: "ok" | "warn" | "new";
}) {
  const color =
    tone === "ok"
      ? "text-emerald-300"
      : tone === "warn"
        ? "text-amber-300"
        : tone === "new"
          ? "text-sky-300"
          : "text-zinc-100";
  const body = (
    <div className={`panel p-4 ${href ? "panel-hover hover:border-zinc-600" : ""}`}>
      <div className="label-xs text-zinc-500">{label}</div>
      <div className={`mt-2 text-3xl font-light tabular-nums ${color}`}>{value}</div>
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
