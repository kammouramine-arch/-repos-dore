import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { REPLY_CLASSES, REPLY_META, type ReplyClass } from "@/lib/constants";

export const dynamic = "force-dynamic";

function meta(cls: string) {
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
  searchParams: Promise<{ class?: string }>;
}) {
  const params = await searchParams;
  const active =
    params.class && (REPLY_CLASSES as readonly string[]).includes(params.class) ? params.class : null;

  const [replies, grouped, suppressions] = await Promise.all([
    prisma.reply.findMany({
      where: active ? { classification: active } : undefined,
      orderBy: { receivedAt: "desc" },
      take: 100,
      include: { prospect: { select: { id: true, name: true, status: true } } },
    }),
    prisma.reply.groupBy({ by: ["classification"], _count: { _all: true } }),
    prisma.suppression.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  const counts = Object.fromEntries(grouped.map((g) => [g.classification, g._count._all]));
  const total = grouped.reduce((s, g) => s + g._count._all, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Réponses"
        title="Boîte de réception qualifiée"
        description="Chaque réponse enregistrée est classée par un moteur déterministe. Les expressions qui ont déclenché le classement sont conservées : aucune décision n'est prise sans trace."
      />

      <div className="flex flex-wrap gap-2">
        <Chip href="/replies" label="Toutes" count={total} active={!active} />
        {REPLY_CLASSES.map((c) => (
          <Chip
            key={c}
            href={`/replies?class=${c}`}
            label={REPLY_META[c].label}
            count={counts[c] ?? 0}
            active={active === c}
          />
        ))}
      </div>

      {replies.length === 0 ? (
        <div className="panel p-8 text-center">
          <p className="text-sm text-zinc-400">Aucune réponse enregistrée.</p>
          <p className="mx-auto mt-2 max-w-xl text-[13px] leading-relaxed text-zinc-600">
            AMYN Outreach ne lit pas votre boîte mail. Les réponses sont enregistrées manuellement
            (ou par une intégration IMAP à brancher plus tard)&nbsp;:
          </p>
          <code className="mt-3 inline-block rounded bg-ink-950 px-3 py-1.5 text-[12px] text-gold-300 ring-1 ring-inset ring-line">
            npm run amyn -- reply contact@exemple.fr &quot;Bonjour, quel est votre tarif ?&quot;
          </code>
        </div>
      ) : (
        <ul className="space-y-3">
          {replies.map((r) => {
            const m = meta(r.classification);
            let signals: string[] = [];
            try {
              signals = r.matchedSignals ? (JSON.parse(r.matchedSignals) as string[]) : [];
            } catch {
              signals = [];
            }
            return (
              <li key={r.id} className="panel p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/prospects/${r.prospect.id}`}
                      className="text-[15px] text-zinc-100 hover:text-gold-300"
                    >
                      {r.prospect.name}
                    </Link>
                    <p className="mt-1 text-[11px] text-zinc-600">
                      {r.fromEmail} · {formatDateTime(r.receivedAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {r.handled && (
                      <span className="rounded px-1.5 py-0.5 text-[10px] text-zinc-500 ring-1 ring-inset ring-line">
                        traité
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${m.badge}`}
                    >
                      {m.label}
                    </span>
                  </div>
                </div>

                <p className="mt-3 text-[13px] font-medium text-zinc-300">{r.subject}</p>
                <pre className="mt-1.5 max-h-40 overflow-y-auto whitespace-pre-wrap font-sans text-[12.5px] leading-relaxed text-zinc-500">
                  {r.body}
                </pre>

                <div className="mt-3 border-t border-line pt-2.5 text-[11px] text-zinc-600">
                  Confiance {r.confidence.toLowerCase()}
                  {signals.length > 0 ? (
                    <>
                      {" "}
                      · expressions détectées&nbsp;:{" "}
                      {signals.map((s) => (
                        <code key={s} className="mr-1 rounded bg-ink-950 px-1 py-0.5 text-zinc-500">
                          {s}
                        </code>
                      ))}
                    </>
                  ) : (
                    " · aucune expression caractéristique détectée"
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

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

function Chip({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs transition-colors ring-1 ring-inset ${
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
