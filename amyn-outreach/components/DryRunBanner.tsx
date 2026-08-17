import { mailerStatus } from "@/lib/mailer";

/**
 * Bandeau permanent rappelant l'etat reel de la chaine d'envoi.
 * Il ne passe en rouge que si un envoi reel est effectivement possible.
 */
export function DryRunBanner() {
  const status = mailerStatus();

  if (!status.dryRun && status.canDeliver) {
    return (
      <div className="border-b border-rose-500/30 bg-rose-500/10 px-6 py-2.5">
        <p className="text-xs text-rose-200">
          <strong className="font-semibold">ENVOI RÉEL ACTIF</strong> — transport{" "}
          {status.transport}. Les emails partent vraiment.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line bg-ink-900 px-5 py-2.5 lg:px-8">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300 ring-1 ring-inset ring-emerald-400/20">
        <span className="size-1.5 rounded-full bg-emerald-400" />
        DRY RUN
      </span>
      <p className="text-xs text-zinc-500">
        Aucun envoi réel possible — les emails sont simulés et journalisés
        <span className="hidden sm:inline">
          {" "}
          · transport {status.transport} · expéditeur prévu&nbsp;: {status.from}
        </span>
      </p>
    </div>
  );
}
