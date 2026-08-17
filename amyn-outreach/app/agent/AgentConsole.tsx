"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { runAgentAction, type AgentFormState } from "./actions";

const EXAMPLES = [
  "Trouve 20 coiffeurs à Lille",
  "Audite les prospects trouvés",
  "Cherche les emails professionnels",
  "Prépare les emails",
  "Prépare une campagne pour Lille",
  "Nouveau client. Entreprise : Studio Nord. Offre : PREMIUM. Prends le relais.",
  "Fais le point",
];

const INITIAL: AgentFormState = { ok: true, message: "" };

export function AgentConsole() {
  const [state, formAction] = useActionState(runAgentAction, INITIAL);

  return (
    <div className="space-y-4">
      <form action={formAction} className="panel p-4">
        <label htmlFor="instruction" className="label-xs text-zinc-500">
          Instruction
        </label>
        <textarea
          id="instruction"
          name="instruction"
          rows={3}
          placeholder="Trouve 20 restaurants à Lille avec un site lent"
          className="mt-2 w-full resize-y rounded-lg border border-line bg-ink-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-700 focus:border-gold-500/50 focus:outline-none"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-zinc-600">
            Aucune action classée « validation requise » ne sera exécutée sans votre accord.
          </p>
          <SubmitButton />
        </div>
      </form>

      {state.message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            state.ok
              ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-200"
              : "border-amber-500/25 bg-amber-500/5 text-amber-200"
          }`}
        >
          {state.message}
          <span className="mt-1 block text-[11px] text-zinc-500">
            Le détail complet de l&apos;exécution apparaît ci-dessous après rechargement.
          </span>
        </div>
      )}

      <div className="panel p-4">
        <div className="label-xs text-zinc-500">Instructions reconnues</div>
        <ul className="mt-3 space-y-1.5">
          {EXAMPLES.map((e) => (
            <li key={e} className="text-[13px] text-zinc-400">
              <span className="mr-2 text-gold-500">›</span>
              {e}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-gold-500/15 px-4 py-2 text-sm font-medium text-gold-200 ring-1 ring-inset ring-gold-500/30 transition-colors hover:bg-gold-500/25 disabled:opacity-50"
    >
      {pending ? "Exécution en cours…" : "Exécuter"}
    </button>
  );
}
