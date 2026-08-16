import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="label-xs text-gold-500">Erreur 404</div>
      <h1 className="mt-3 text-2xl font-light text-zinc-100">Page introuvable</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Cette fiche ou cette page n&apos;existe pas.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg border border-line bg-ink-850 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-600 hover:text-zinc-50"
      >
        Retour au dashboard
      </Link>
    </div>
  );
}
