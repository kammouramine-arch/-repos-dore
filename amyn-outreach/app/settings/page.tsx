import { PageHeader } from "@/components/PageHeader";
import { mailerStatus } from "@/lib/mailer";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

const ROADMAP = [
  {
    lot: 1,
    title: "Socle & dashboard",
    items: [
      "Next.js 15 + TypeScript + Tailwind",
      "Base SQLite + Prisma, schéma complet",
      "Dashboard, compteurs, fiche prospect",
      "Couche mailer interchangeable (simulation uniquement)",
    ],
  },
  {
    lot: 2,
    title: "Moteur d'audit",
    items: [
      "Diagnostic technique déterministe du site",
      "Preuve obligatoire pour chaque problème",
      "Recommandation d'offre automatique",
    ],
  },
  {
    lot: 3,
    title: "Recherche de prospects",
    items: [
      "Sources officielles (Google Places, Sirene, OSM)",
      "Recherche d'email professionnel public",
      "Déduplication",
    ],
  },
  {
    lot: 4,
    title: "Rédaction",
    items: [
      "Génération par claude-opus-5",
      "Vérification automatique anti-invention",
    ],
  },
  {
    lot: 5,
    title: "Transport email",
    items: [
      "SMTP OVHcloud / Zimbra",
      "Test d'envoi vers soi-même uniquement",
    ],
  },
  {
    lot: 6,
    title: "Campagne",
    items: [
      "Écran d'approbation APPROVE & SEND",
      "Envoi progressif, plafond quotidien",
      "Liste noire et désinscription",
    ],
  },
];

export default function SettingsPage() {
  const mailer = mailerStatus();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Système"
        title="Configuration & feuille de route"
        description="État réel du système d'envoi et avancement de la construction."
      />

      {/* Sécurité d'envoi */}
      <section className="relative overflow-hidden panel p-6">
        <div className="gold-rule absolute inset-x-0 top-0 h-px" />
        <h2 className="text-sm font-medium text-zinc-200">Sécurité d&apos;envoi</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Mode"
            value={mailer.dryRun ? "DRY RUN" : "RÉEL"}
            tone={mailer.dryRun ? "text-emerald-400" : "text-rose-400"}
          />
          <Metric label="Transport" value={mailer.transport} />
          <Metric
            label="Peut envoyer ?"
            value={mailer.canDeliver ? "oui" : "non"}
            tone={mailer.canDeliver ? "text-rose-400" : "text-emerald-400"}
          />
          <Metric label="Expéditeur prévu" value={config.from.email} small />
        </div>

        <div className="mt-6 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-xs leading-relaxed text-emerald-200/80">
            <strong className="font-semibold text-emerald-300">
              Aucun email ne peut partir.
            </strong>{" "}
            Deux verrous indépendants : <code className="text-emerald-300">DRY_RUN=true</code>{" "}
            force le transport de simulation, et aucun transport réel n&apos;est
            implémenté. Passer <code className="text-emerald-300">DRY_RUN=false</code> ne
            suffirait pas — c&apos;est volontaire jusqu&apos;au lot 5.
          </p>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Metric label="Plafond quotidien prévu" value={`${mailer.dailyLimit} / jour`} />
          <Metric
            label="Délai minimum entre envois"
            value={`${mailer.minDelaySeconds} s`}
          />
        </div>
      </section>

      {/* Transport interchangeable */}
      <section className="panel p-6">
        <h2 className="text-sm font-medium text-zinc-200">Transport interchangeable</h2>
        <p className="mt-2 text-xs leading-relaxed text-zinc-500">
          Tout le code métier ne connaît que l&apos;interface{" "}
          <code className="text-zinc-400">Mailer</code>. Changer de fournisseur
          n&apos;impacte aucun autre fichier.
        </p>
        <div className="mt-5 space-y-2">
          <TransportRow
            name="dry-run"
            state="actif"
            tone="text-emerald-400"
            note="Simulation. Aucune connexion réseau."
          />
          <TransportRow
            name="smtp"
            state="lot 5"
            tone="text-zinc-600"
            note="OVHcloud / Zimbra — ssl0.ovh.net:465. Emplacement réservé, non implémenté."
          />
        </div>
      </section>

      {/* Feuille de route */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-300">Feuille de route</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {ROADMAP.map((step) => {
            const done = step.lot < config.currentLot;
            const current = step.lot === config.currentLot;
            return (
              <div
                key={step.lot}
                className={`panel p-5 ${current ? "border-gold-500/30 bg-ink-850" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className="label-xs text-zinc-600">Lot {step.lot}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      current
                        ? "bg-gold-500/10 text-gold-300 ring-1 ring-inset ring-gold-500/25"
                        : done
                          ? "bg-emerald-500/10 text-emerald-300"
                          : "bg-ink-800 text-zinc-600"
                    }`}
                  >
                    {current ? "en cours" : done ? "terminé" : "à venir"}
                  </span>
                </div>
                <h3
                  className={`mt-2 text-sm ${current ? "text-zinc-50" : "text-zinc-300"}`}
                >
                  {step.title}
                </h3>
                <ul className="mt-3 space-y-1">
                  {step.items.map((item) => (
                    <li key={item} className="flex gap-2 text-xs text-zinc-500">
                      <span className={current ? "text-gold-500" : "text-zinc-700"}>·</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
  small,
}: {
  label: string;
  value: string;
  tone?: string;
  small?: boolean;
}) {
  return (
    <div>
      <div className="label-xs text-zinc-600">{label}</div>
      <div
        className={`mt-1.5 font-mono ${small ? "text-xs" : "text-sm"} ${tone ?? "text-zinc-200"}`}
      >
        {value}
      </div>
    </div>
  );
}

function TransportRow({
  name,
  state,
  tone,
  note,
}: {
  name: string;
  state: string;
  tone: string;
  note: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-line-soft bg-ink-950/50 px-4 py-3">
      <code className="text-sm text-zinc-200">{name}</code>
      <span className={`label-xs ${tone}`}>{state}</span>
      <span className="w-full text-xs text-zinc-600 sm:w-auto">{note}</span>
    </div>
  );
}
