import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { ClientStatusBadge, PhaseBadge } from "@/components/Badges";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime, formatPrice } from "@/lib/format";
import { TASK_STATUS_META } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      prospect: { select: { id: true, name: true } },
      projects: {
        orderBy: { createdAt: "asc" },
        include: {
          tasks: { orderBy: { position: "asc" } },
          onboarding: { orderBy: { position: "asc" } },
        },
      },
      documents: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { createdAt: "asc" } },
      care: { include: { events: { orderBy: { createdAt: "desc" }, take: 10 } } },
    },
  });

  if (!client) notFound();

  const project = client.projects[0];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={<Link href="/clients" className="hover:text-gold-300">← Clients</Link>}
        title={client.companyName}
        description={`${client.offer} — ${formatPrice(client.offerPrice)} · ${client.contactEmail}${
          client.contactPhone ? ` · ${client.contactPhone}` : ""
        }${client.city ? ` · ${client.city}` : ""}`}
        action={
          <div className="flex items-center gap-2">
            <ClientStatusBadge status={client.status} />
            {project && <PhaseBadge status={project.phase} />}
          </div>
        }
      />

      {client.prospect && (
        <p className="text-[12px] text-zinc-600">
          Issu du prospect{" "}
          <Link href={`/prospects/${client.prospect.id}`} className="text-zinc-400 hover:text-gold-300">
            {client.prospect.name}
          </Link>
          .
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-8">
          {project ? (
            <>
              <Section
                title="Onboarding — informations à récupérer"
                hint="Une tâche qui dépend d'une information manquante reste bloquée : l'agent n'invente jamais un contenu client."
              >
                <ul className="divide-y divide-line">
                  {project.onboarding.map((item) => (
                    <li key={item.id} className="flex flex-wrap items-start gap-3 px-4 py-2.5">
                      <span
                        className={`mt-1 size-1.5 shrink-0 rounded-full ${
                          item.status === "RECEIVED"
                            ? "bg-emerald-400"
                            : item.status === "NOT_APPLICABLE"
                              ? "bg-zinc-600"
                              : item.required
                                ? "bg-amber-400"
                                : "bg-zinc-600"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] text-zinc-200">
                          {item.label}
                          {!item.required && (
                            <span className="ml-2 text-[11px] text-zinc-600">optionnel</span>
                          )}
                        </p>
                        {item.hint && <p className="text-[11px] text-zinc-600">{item.hint}</p>}
                        {item.value && (
                          <p className="mt-1 truncate text-[12px] text-zinc-400">{item.value}</p>
                        )}
                      </div>
                      <span className="shrink-0 text-[11px] text-zinc-600">
                        {item.status === "RECEIVED"
                          ? "reçu"
                          : item.status === "NOT_APPLICABLE"
                            ? "sans objet"
                            : "manquant"}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-line px-4 py-2.5 text-[11px] text-zinc-600">
                  Renseigner un élément&nbsp;:{" "}
                  <code className="text-zinc-500">
                    npm run amyn -- client onboarding {project.id} &lt;clé&gt; &quot;valeur&quot;
                  </code>
                </div>
              </Section>

              <Section
                title={`Plan de production — ${project.tasks.filter((t) => t.status === "DONE").length}/${project.tasks.length} terminées`}
              >
                <ul className="divide-y divide-line">
                  {project.tasks.map((task) => {
                    const meta = TASK_STATUS_META[task.status] ?? TASK_STATUS_META.TODO;
                    return (
                      <li key={task.id} className="flex flex-wrap items-start gap-3 px-4 py-2.5">
                        <span className="mt-0.5 w-16 shrink-0 text-[10px] uppercase tracking-wider text-zinc-700">
                          {task.phase}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] text-zinc-200">{task.title}</p>
                          {task.description && (
                            <p className="text-[11px] text-zinc-600">{task.description}</p>
                          )}
                          {task.blockedReason && (
                            <p className="mt-0.5 text-[11px] text-amber-300/85">{task.blockedReason}</p>
                          )}
                          {task.requiresApproval && (
                            <p className="mt-0.5 text-[11px] text-gold-400/80">
                              Nécessite votre validation avant exécution.
                            </p>
                          )}
                        </div>
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${meta.badge}`}
                        >
                          {meta.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </Section>
            </>
          ) : (
            <p className="panel p-5 text-sm text-zinc-500">Aucun projet rattaché à ce client.</p>
          )}

          <Section title="Documents">
            <ul className="divide-y divide-line">
              {client.documents.map((doc) => (
                <li key={doc.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                  <span className="w-20 shrink-0 text-[10px] uppercase tracking-wider text-zinc-700">
                    {doc.type}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-zinc-200">{doc.title}</span>
                  <span className="shrink-0 text-[11px] text-zinc-500">{doc.status}</span>
                  {doc.requiresApproval && doc.status !== "SIGNED" && (
                    <span className="shrink-0 rounded bg-gold-500/10 px-1.5 py-0.5 text-[10px] text-gold-300 ring-1 ring-inset ring-gold-500/25">
                      validation requise
                    </span>
                  )}
                </li>
              ))}
              {client.documents.length === 0 && (
                <li className="px-4 py-3 text-[13px] text-zinc-600">Aucun document.</li>
              )}
            </ul>
            <div className="border-t border-line px-4 py-2.5 text-[11px] leading-relaxed text-zinc-600">
              Aucun contrat n&apos;est signé et aucun paiement n&apos;est encaissé automatiquement.
              Les documents restent en brouillon jusqu&apos;à votre validation explicite.
            </div>
          </Section>
        </div>

        <aside className="space-y-6">
          <Section title="Échéancier">
            <ul className="divide-y divide-line">
              {client.payments.map((p) => (
                <li key={p.id} className="px-4 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-[13px] text-zinc-200">{p.label}</span>
                    <span className="shrink-0 text-[13px] tabular-nums text-zinc-100">
                      {formatPrice(p.amount)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-zinc-600">
                    {p.status === "PAYMENT_RECEIVED"
                      ? `encaissé le ${formatDate(p.paidAt)}`
                      : p.status === "PAYMENT_PENDING"
                        ? `en attente${p.dueAt ? ` · échéance ${formatDate(p.dueAt)}` : ""}`
                        : p.status}
                  </p>
                </li>
              ))}
              {client.payments.length === 0 && (
                <li className="px-4 py-3 text-[13px] text-zinc-600">Aucune échéance.</li>
              )}
            </ul>
          </Section>

          <Section title="AMYN Care">
            {client.care ? (
              <div className="px-4 py-3">
                <p className="text-[13px] text-zinc-200">
                  {formatPrice(client.care.monthlyPrice)}/mois · {client.care.status}
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-600">
                  Démarré le {formatDate(client.care.startedAt)}
                  {client.care.renewsAt && ` · renouvellement ${formatDate(client.care.renewsAt)}`}
                </p>
                {client.care.events.length > 0 && (
                  <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
                    {client.care.events.map((e) => (
                      <li key={e.id} className="text-[11px] text-zinc-500">
                        <span className="text-zinc-700">{formatDate(e.createdAt)}</span> — {e.title}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <p className="px-4 py-3 text-[13px] text-zinc-600">
                Aucun abonnement AMYN Care. Il est proposé à la livraison.
              </p>
            )}
          </Section>

          <Section title="Fiche">
            <dl className="divide-y divide-line">
              <Row label="Contact" value={client.contactName ?? "—"} />
              <Row label="Email" value={client.contactEmail} />
              <Row label="Téléphone" value={client.contactPhone ?? "—"} />
              <Row label="Secteur" value={client.sector ?? "—"} />
              <Row label="Créé le" value={formatDateTime(client.createdAt)} />
            </dl>
          </Section>
        </aside>
      </div>
    </div>
  );
}

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
    <section className="space-y-2">
      <h2 className="label-xs text-zinc-500">{title}</h2>
      {hint && <p className="text-[11px] leading-relaxed text-zinc-600">{hint}</p>}
      <div className="panel overflow-hidden">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 py-2">
      <dt className="shrink-0 text-[11px] text-zinc-600">{label}</dt>
      <dd className="min-w-0 truncate text-right text-[12.5px] text-zinc-300">{value}</dd>
    </div>
  );
}
