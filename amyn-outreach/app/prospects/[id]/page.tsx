import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge, SeverityBadge, DemoTag } from "@/components/StatusBadge";
import { getProspect } from "@/lib/prospects";
import {
  offerMeta,
  AUDIT_STATUS_META,
  SOURCE_KIND_LABELS,

  statusMeta,
} from "@/lib/constants";
import { formatDate, formatDateTime, formatPrice, prettyDomain } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const prospect = await getProspect(id);

  if (!prospect) notFound();

  const offer = offerMeta(prospect.recommendedOffer);
  const audit = AUDIT_STATUS_META[prospect.auditStatus] ?? AUDIT_STATUS_META.PENDING;
  const draft = prospect.emailDrafts.find((d) => d.isActive) ?? prospect.emailDrafts[0];

  return (
    <div className="space-y-8">
      {/* Fil d'Ariane */}
      <nav className="flex items-center gap-2 text-xs text-zinc-600">
        <Link href="/" className="hover:text-zinc-400">
          Dashboard
        </Link>
        <span>/</span>
        <Link href="/prospects" className="hover:text-zinc-400">
          Prospects
        </Link>
        <span>/</span>
        <span className="text-zinc-500">{prospect.name}</span>
      </nav>

      {/* En-tête */}
      <header className="relative overflow-hidden panel p-6 lg:p-8">
        <div className="gold-rule absolute inset-x-0 top-0 h-px" />
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-light text-zinc-50">{prospect.name}</h1>
              {prospect.isDemo && <DemoTag />}
            </div>
            <p className="mt-2 text-sm text-zinc-500">
              {prospect.sector} · {prospect.city}
              {prospect.region ? ` · ${prospect.region}` : ""}
            </p>
          </div>
          <div className="text-right">
            <StatusBadge status={prospect.status} />
            <p className="mt-2 max-w-[220px] text-xs leading-relaxed text-zinc-600">
              {statusMeta(prospect.status).description}
            </p>
          </div>
        </div>

        {offer && (
          <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-line pt-5">
            <Field label="Offre recommandée" value={offer.label} />
            <Field
              label="Prix"
              value={formatPrice(prospect.recommendedPrice, offer.unit)}
              accent
            />
            <Field label="Audit" value={audit.label} tone={audit.tone} />
            <Field label="Créé le" value={formatDate(prospect.createdAt)} />
          </div>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Colonne principale */}
        <div className="space-y-6 lg:col-span-2">
          {/* Diagnostic */}
          <Section
            title="Diagnostic"
            hint={`${prospect.issues.length} problème${prospect.issues.length > 1 ? "s" : ""} documenté${prospect.issues.length > 1 ? "s" : ""}`}
          >
            {prospect.issues.length === 0 ? (
              <Empty>
                Aucun audit effectué. Le moteur de diagnostic arrive au lot 2.
              </Empty>
            ) : (
              <ul className="divide-y divide-line-soft">
                {prospect.issues.map((issue) => (
                  <li key={issue.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityBadge severity={issue.severity} />
                      <h3 className="text-sm font-medium text-zinc-100">{issue.title}</h3>
                      <span className="ml-auto font-mono text-[10px] text-zinc-700">
                        {issue.type}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                      {issue.summary}
                    </p>

                    {/* LA PREUVE */}
                    <div className="mt-3 rounded-lg border border-line-soft bg-ink-950/60 p-3">
                      <div className="label-xs mb-2 text-zinc-600">Preuve</div>
                      {issue.evidenceUrl && (
                        <a
                          href={issue.evidenceUrl}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="block truncate font-mono text-xs text-gold-400 hover:text-gold-300"
                        >
                          {issue.evidenceUrl}
                        </a>
                      )}
                      {issue.evidenceSnippet && (
                        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-zinc-500">
                          {issue.evidenceSnippet}
                        </pre>
                      )}
                      {issue.evidenceNote && (
                        <p className="mt-2 text-xs text-zinc-500">{issue.evidenceNote}</p>
                      )}
                      <p className="mt-2 text-[11px] text-zinc-700">
                        Constaté le {formatDate(issue.detectedAt)} ·{" "}
                        {issue.detectionMethod === "AUTOMATED"
                          ? "vérification automatique"
                          : issue.detectionMethod === "AI"
                            ? "analyse assistée"
                            : "saisie manuelle"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Email généré */}
          <Section
            title="Email personnalisé"
            hint={draft ? formatDateTime(draft.generatedAt) : undefined}
          >
            {!draft ? (
              <Empty>
                Aucun email généré. La rédaction automatique arrive au lot 4.
              </Empty>
            ) : (
              <div className="px-5 py-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {draft.verificationPassed ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-300 ring-1 ring-inset ring-emerald-400/20">
                      <span className="size-1.5 rounded-full bg-emerald-400" />
                      Vérification anti-invention réussie
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-300 ring-1 ring-inset ring-amber-400/20">
                      <span className="size-1.5 rounded-full bg-amber-400" />
                      Non vérifié
                    </span>
                  )}
                  {draft.approvedAt ? (
                    <span className="text-[11px] text-violet-300">
                      Approuvé le {formatDate(draft.approvedAt)}
                    </span>
                  ) : (
                    <span className="text-[11px] text-zinc-600">
                      En attente d&apos;approbation manuelle
                    </span>
                  )}
                </div>

                <div className="rounded-lg border border-line-soft bg-ink-950/60">
                  <div className="border-b border-line-soft px-4 py-2.5">
                    <span className="label-xs text-zinc-600">Objet</span>
                    <p className="mt-1 text-sm text-zinc-200">{draft.subject}</p>
                  </div>
                  <pre className="whitespace-pre-wrap px-4 py-4 font-sans text-sm leading-relaxed text-zinc-300">
                    {draft.body}
                  </pre>
                </div>

                <p className="mt-3 text-[11px] text-zinc-700">
                  Généré par {draft.model ?? "—"}. Cet email ne peut citer que des
                  problèmes présents ci-dessus avec leur preuve.
                </p>
              </div>
            )}
          </Section>

          {/* Historique */}
          <Section title="Historique">
            {prospect.statusEvents.length === 0 ? (
              <Empty>Aucun événement.</Empty>
            ) : (
              <ol className="px-5 py-4">
                {prospect.statusEvents.map((event, i) => (
                  <li key={event.id} className="relative flex gap-4 pb-5 last:pb-0">
                    {i < prospect.statusEvents.length - 1 && (
                      <span className="absolute left-[3px] top-3 h-full w-px bg-line" />
                    )}
                    <span
                      className={`relative mt-1.5 size-[7px] shrink-0 rounded-full ${statusMeta(event.toStatus).dot}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-sm text-zinc-200">
                          {event.fromStatus
                            ? `${statusMeta(event.fromStatus).label} → ${statusMeta(event.toStatus).label}`
                            : statusMeta(event.toStatus).label}
                        </span>
                        <span className="text-[11px] text-zinc-600">
                          {formatDateTime(event.createdAt)}
                        </span>
                        <span className="rounded bg-ink-800 px-1.5 py-0.5 text-[10px] text-zinc-500">
                          {event.actor === "HUMAN" ? "manuel" : "système"}
                        </span>
                      </div>
                      {event.reason && (
                        <p className="mt-1 text-xs text-zinc-500">{event.reason}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Section>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          <Section title="Coordonnées">
            <dl className="divide-y divide-line-soft">
              <InfoRow label="Email professionnel">
                {prospect.email ? (
                  <span className="font-mono text-xs text-zinc-200" title={prospect.email}>
                    {prospect.email}
                  </span>
                ) : (
                  <span className="text-xs text-zinc-600">non trouvé</span>
                )}
              </InfoRow>
              <InfoRow label="Téléphone">
                {prospect.phone ?? <span className="text-xs text-zinc-600">—</span>}
              </InfoRow>
              <InfoRow label="Site officiel">
                <ExternalLink href={prospect.website} />
              </InfoRow>
              <InfoRow label="Google Business">
                <ExternalLink href={prospect.googleBusinessUrl} label="Voir la fiche" />
              </InfoRow>
              <InfoRow label="Instagram">
                <ExternalLink href={prospect.instagramUrl} label="Voir le compte" />
              </InfoRow>
            </dl>
          </Section>

          <Section title="Sources" hint="Origine de chaque information">
            {prospect.sources.length === 0 ? (
              <Empty>Aucune source enregistrée.</Empty>
            ) : (
              <ul className="divide-y divide-line-soft">
                {prospect.sources.map((source) => (
                  <li key={source.id} className="px-5 py-3">
                    <div className="label-xs text-zinc-600">
                      {SOURCE_KIND_LABELS[source.kind] ?? source.kind}
                    </div>
                    <p className="mt-1 text-sm text-zinc-300">{source.label}</p>
                    {source.url && (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="mt-1 block truncate font-mono text-[11px] text-gold-500 hover:text-gold-400"
                      >
                        {source.url}
                      </a>
                    )}
                    <p className="mt-1 text-[11px] text-zinc-700">
                      Collecté le {formatDate(source.collectedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {offer && (
            <Section title="Offre recommandée">
              <div className="px-5 py-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-base text-zinc-100">{offer.label}</span>
                  <span className="text-lg font-light text-gold-300">
                    {formatPrice(prospect.recommendedPrice, offer.unit)}
                  </span>
                </div>
                {prospect.offerRationale && (
                  <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                    {prospect.offerRationale}
                  </p>
                )}
                <ul className="mt-4 space-y-1.5">
                  {offer.features.map((f) => (
                    <li key={f} className="flex gap-2 text-xs text-zinc-500">
                      <span className="text-gold-500">·</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </Section>
          )}

          <Section title="Journal d'envoi">
            {prospect.sendLogs.length === 0 ? (
              <Empty>Aucun envoi. Aucun email n&apos;a jamais quitté le système.</Empty>
            ) : (
              <ul className="divide-y divide-line-soft">
                {prospect.sendLogs.map((log) => (
                  <li key={log.id} className="px-5 py-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-300">{log.status}</span>
                      <span className="text-zinc-600">{formatDateTime(log.createdAt)}</span>
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-zinc-600">
                      {log.transport} → {log.toEmail}
                      {log.dryRun && " · simulation"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

/* --- petits composants de présentation ------------------------------------ */

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <h2 className="text-sm font-medium text-zinc-200">{title}</h2>
        {hint && <span className="text-[11px] text-zinc-600">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-8 text-center text-xs text-zinc-600">{children}</p>;
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3">
      <dt className="shrink-0 text-xs text-zinc-500">{label}</dt>
      <dd className="min-w-0 truncate text-right text-sm text-zinc-300">{children}</dd>
    </div>
  );
}

function Field({
  label,
  value,
  accent,
  tone,
}: {
  label: string;
  value: string;
  accent?: boolean;
  tone?: string;
}) {
  return (
    <div>
      <div className="label-xs text-zinc-600">{label}</div>
      <div
        className={`mt-1.5 text-sm ${accent ? "text-gold-300" : (tone ?? "text-zinc-200")}`}
      >
        {value}
      </div>
    </div>
  );
}

function ExternalLink({ href, label }: { href?: string | null; label?: string }) {
  if (!href) return <span className="text-xs text-zinc-600">—</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="text-xs text-gold-400 hover:text-gold-300"
    >
      {label ?? prettyDomain(href)}
    </a>
  );
}

