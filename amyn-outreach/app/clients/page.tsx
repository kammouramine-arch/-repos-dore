import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { ClientStatusBadge, PhaseBadge } from "@/components/Badges";
import { prisma } from "@/lib/db";
import { formatDate, formatPrice } from "@/lib/format";
import { OFFERS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      projects: {
        include: {
          tasks: { select: { status: true } },
          onboarding: { select: { status: true, required: true } },
        },
      },
      payments: { select: { amount: true, status: true } },
      care: { select: { status: true, monthlyPrice: true } },
    },
  });

  const signed = clients.reduce((s, c) => s + c.offerPrice, 0);
  const cashed = clients.reduce(
    (s, c) => s + c.payments.filter((p) => p.status === "PAYMENT_RECEIVED").reduce((a, p) => a + p.amount, 0),
    0,
  );
  const pending = clients.reduce(
    (s, c) => s + c.payments.filter((p) => p.status === "PAYMENT_PENDING").reduce((a, p) => a + p.amount, 0),
    0,
  );
  const careActive = clients.filter((c) => c.care?.status === "ACTIVE").length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Clients"
        title="Portefeuille et production"
        description="Chaque client signé génère automatiquement un projet, ses tâches, sa checklist d'onboarding, ses documents et son échéancier. Rien n'est facturé ni signé sans votre validation."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Cell label="Clients" value={String(clients.length)} />
        <Cell label="Chiffre d'affaires signé" value={formatPrice(signed)} accent />
        <Cell label="Encaissé / en attente" value={`${formatPrice(cashed)} / ${formatPrice(pending)}`} />
        <Cell
          label="AMYN Care actif"
          value={`${careActive} × ${formatPrice(OFFERS.CARE.price)}/mois`}
        />
      </div>

      {clients.length === 0 ? (
        <div className="panel p-8 text-center">
          <p className="text-sm text-zinc-400">Aucun client enregistré.</p>
          <p className="mx-auto mt-2 max-w-lg text-[13px] leading-relaxed text-zinc-600">
            Quand un prospect accepte, dites-le à l&apos;agent&nbsp;— il crée le client, le projet,
            les tâches, l&apos;onboarding et les documents&nbsp;:
          </p>
          <code className="mt-3 inline-block rounded bg-ink-950 px-3 py-1.5 text-[12px] text-gold-300 ring-1 ring-inset ring-line">
            npm run amyn -- &quot;Nouveau client. Entreprise : X. Offre : PREMIUM. Prends le relais.&quot;
          </code>
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map((c) => {
            const project = c.projects[0];
            const tasks = project?.tasks ?? [];
            const done = tasks.filter((t) => t.status === "DONE").length;
            const onboarding = project?.onboarding ?? [];
            const missing = onboarding.filter((o) => o.required && o.status === "MISSING").length;

            return (
              <Link key={c.id} href={`/clients/${c.id}`} className="block panel panel-hover p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-[15px] text-zinc-100">{c.companyName}</h2>
                    <p className="mt-1 text-[11px] text-zinc-600">
                      {c.contactEmail}
                      {c.city && ` · ${c.city}`} · client depuis le {formatDate(c.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded px-2 py-0.5 text-[11px] font-medium text-zinc-300 ring-1 ring-inset ring-line">
                      {c.offer} · {formatPrice(c.offerPrice)}
                    </span>
                    <ClientStatusBadge status={c.status} size="sm" />
                    {project && <PhaseBadge status={project.phase} size="sm" />}
                  </div>
                </div>

                {project && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-zinc-500">
                      <span>
                        {done}/{tasks.length} tâches terminées
                      </span>
                      {missing > 0 && (
                        <span className="text-amber-300">
                          {missing} élément{missing > 1 ? "s" : ""} d&apos;onboarding manquant
                          {missing > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-ink-800">
                      <div
                        className="h-full rounded-full bg-gold-500/70"
                        style={{ width: `${tasks.length ? (done / tasks.length) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Cell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`relative overflow-hidden panel p-4 ${accent ? "bg-ink-850" : ""}`}>
      {accent && <div className="gold-rule absolute inset-x-0 top-0 h-px" />}
      <div className="label-xs text-zinc-500">{label}</div>
      <div
        className={`mt-2 text-2xl font-light tabular-nums ${accent ? "text-gold-300" : "text-zinc-100"}`}
      >
        {value}
      </div>
    </div>
  );
}
