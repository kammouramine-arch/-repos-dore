import { PageHeader } from "@/components/PageHeader";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { nationalReport, type Metric } from "@/lib/reporting/national";
import { territoryProgress } from "@/lib/territory";

export const dynamic = "force-dynamic";

const COULEUR_STATUT: Record<string, string> = {
  DONE: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20",
  SATURATED: "bg-amber-500/10 text-amber-300 ring-amber-400/25",
  RUNNING: "bg-indigo-500/10 text-indigo-300 ring-indigo-400/20",
  PENDING: "bg-zinc-500/10 text-zinc-400 ring-zinc-400/20",
  FAILED: "bg-rose-500/10 text-rose-300 ring-rose-400/20",
  PAUSED: "bg-stone-500/10 text-stone-300 ring-stone-400/20",
};

/**
 * Une métrique non mesurée ne s'affiche PAS comme un zéro.
 *
 * Un zéro est un résultat : « personne n'a répondu ». Une absence de mesure
 * est une ignorance : « la boîte n'est pas lue ». Les afficher de la même
 * façon transformerait la seconde en la première, et donnerait à une lacune
 * l'apparence rassurante d'un fait établi.
 */
function MetricCell({ metric }: { metric: Metric }) {
  const valeur = metric.value;
  const nonMesure = valeur === null;

  return (
    <div className="panel p-4">
      <div className="label-xs text-zinc-500">{metric.label}</div>
      {nonMesure ? (
        <>
          <div className="mt-2.5 text-lg font-light text-amber-300/80">non mesuré</div>
          {metric.indisponible && (
            <div className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
              {metric.indisponible}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mt-2.5 text-3xl font-light tabular-nums text-zinc-100">
            {valeur.toLocaleString("fr-FR")}
          </div>
          {metric.detail && (
            <div className="mt-1.5 text-[11px] leading-relaxed text-zinc-600">{metric.detail}</div>
          )}
        </>
      )}
    </div>
  );
}

export default async function NationalPage() {
  const [rapport, progression, territoires, parDepartement] = await Promise.all([
    nationalReport(),
    territoryProgress(),
    prisma.territory.findMany({
      where: { OR: [{ discovered: { gt: 0 } }, { status: { in: ["SATURATED", "FAILED", "RUNNING"] } }] },
      orderBy: [{ status: "asc" }, { discovered: "desc" }],
      take: 30,
    }),
    prisma.prospect.groupBy({
      by: ["departement"],
      where: { isDemo: false, departement: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { departement: "desc" } },
      take: 12,
    }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Prospection"
        title="France entière"
        description={
          "Avancement réel du balayage national. Tous les chiffres sont comptés en base — " +
          "aucun n'est estimé. Une donnée qui n'a pas pu être mesurée le dit, plutôt que " +
          "de s'afficher à zéro."
        }
      />

      {rapport.alerts.length > 0 && (
        <section className="panel border-amber-500/25 bg-amber-500/[0.04] p-5">
          <div className="label-xs text-amber-300">À votre attention</div>
          <ul className="mt-3 space-y-2">
            {rapport.alerts.map((a) => (
              <li key={a} className="text-sm leading-relaxed text-zinc-300">
                {a}
              </li>
            ))}
          </ul>
        </section>
      )}

      {progression.total === 0 ? (
        <section className="panel p-6">
          <h2 className="text-lg font-light text-zinc-100">Aucun balayage planifié</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-500">
            La France n&apos;est jamais interrogée d&apos;un bloc : aucun registre ne sert plus de
            10 000 résultats pour une même requête. Le balayage se planifie donc en territoires —
            un département, un secteur — que le worker parcourt page par page, en enregistrant
            son point de reprise après chacune.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-lg border border-line bg-ink-900 px-4 py-3 text-xs text-zinc-400">
npm run amyn -- territory plan
npm run amyn -- territory sweep
          </pre>
        </section>
      ) : (
        <section className="panel p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="label-xs text-zinc-500">Avancement du balayage</div>
              <div className="mt-2 text-3xl font-light tabular-nums text-zinc-100">
                {progression.termines.toLocaleString("fr-FR")}
                <span className="text-zinc-600"> / {progression.total.toLocaleString("fr-FR")}</span>
                <span className="ml-3 text-lg text-gold-300">{progression.progression}%</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(progression.parStatut)
                .sort()
                .map(([statut, n]) => (
                  <span
                    key={statut}
                    className={`rounded-full px-2.5 py-1 text-[11px] ring-1 ${
                      COULEUR_STATUT[statut] ?? COULEUR_STATUT.PENDING
                    }`}
                  >
                    {statut} {n}
                  </span>
                ))}
            </div>
          </div>

          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-ink-800">
            <div
              className="h-full bg-gold-500/70"
              style={{ width: `${progression.progression ?? 0}%` }}
            />
          </div>
        </section>
      )}

      {rapport.groups.map((groupe) => (
        <section key={groupe.title}>
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="text-lg font-light text-zinc-100">{groupe.title}</h2>
            {groupe.note && <p className="text-xs text-zinc-600">{groupe.note}</p>}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {groupe.metrics.map((m) => (
              <MetricCell key={m.key} metric={m} />
            ))}
          </div>
        </section>
      ))}

      {parDepartement.length > 0 && (
        <section>
          <h2 className="text-lg font-light text-zinc-100">Départements les plus couverts</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {parDepartement.map((d) => (
              <span
                key={d.departement}
                className="rounded-lg border border-line bg-ink-850 px-3 py-1.5 text-sm text-zinc-300"
              >
                {d.departement}
                <span className="ml-2 tabular-nums text-zinc-500">{d._count._all}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {territoires.length > 0 && (
        <section>
          <h2 className="text-lg font-light text-zinc-100">Territoires en cours</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-line text-left label-xs text-zinc-600">
                  <th className="pb-2 pr-4">Territoire</th>
                  <th className="pb-2 pr-4">Secteur</th>
                  <th className="pb-2 pr-4">Statut</th>
                  <th className="pb-2 pr-4 text-right">Reprise</th>
                  <th className="pb-2 pr-4 text-right">Vues</th>
                  <th className="pb-2 pr-4 text-right">Nouvelles</th>
                  <th className="pb-2 pr-4 text-right">Doublons</th>
                  <th className="pb-2">Dernier passage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {territoires.map((t) => (
                  <tr key={t.id} className="text-zinc-300">
                    <td className="py-2.5 pr-4">{t.label}</td>
                    <td className="py-2.5 pr-4 text-zinc-500">{t.sectorLabel}</td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] ring-1 ${
                          COULEUR_STATUT[t.status] ?? COULEUR_STATUT.PENDING
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-zinc-500">
                      page {t.nextPage}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{t.discovered}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{t.created}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-zinc-500">
                      {t.duplicates}
                    </td>
                    <td className="py-2.5 text-zinc-600">
                      {t.lastRunAt ? formatDateTime(t.lastRunAt) : "jamais"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-zinc-600">
            Un territoire <span className="text-amber-300">SATURÉ</span> contient plus
            d&apos;entreprises que la source n&apos;accepte d&apos;en servir. Il n&apos;est pas
            terminé : ses entreprises manquent à la base tant qu&apos;il n&apos;est pas subdivisé.
          </p>
        </section>
      )}

      <p className="text-xs text-zinc-600">
        Rapport établi le {formatDateTime(rapport.generatedAt)}. {rapport.demoExclus} prospect(s)
        de démonstration exclus de tous les comptages.
      </p>
    </div>
  );
}
