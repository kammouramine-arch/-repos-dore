import Link from 'next/link';
import { Logo, LogoMark, BRAND } from '@/components/brand';

/**
 * Coque des écrans d'authentification : le formulaire à gauche, la surface
 * de marque à droite — le même bleu que l'écran d'accueil et de lancement
 * de l'application iPhone.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div className="flex flex-col px-5 py-8 sm:px-10">
        <Link href="/" aria-label="DEVISERA, accueil" className="w-fit">
          <Logo />
        </Link>
        <main id="contenu" className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[400px] animate-in-up">{children}</div>
        </main>
        <p className="text-center text-[12.5px] text-subtle">
          © {new Date().getFullYear()} DEVISERA ·{' '}
          <Link href="/conditions" className="hover:text-muted">
            Conditions
          </Link>{' '}
          ·{' '}
          <Link href="/confidentialite" className="hover:text-muted">
            Confidentialité
          </Link>
        </p>
      </div>

      <aside className="relative hidden overflow-hidden bg-accent-deep text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(900px 600px at 80% -10%, rgba(111,140,255,0.55), transparent 60%), radial-gradient(700px 500px at -10% 110%, rgba(47,82,232,0.65), transparent 55%), linear-gradient(180deg, #2a4be4 0%, #2f52e8 42%, #14245a 100%)',
          }}
          aria-hidden
        />
        <div className="relative flex items-center gap-3">
          <span className="rounded-[12px] bg-white/12 p-2 backdrop-blur">
            <LogoMark className="h-8 w-8 text-white [&_rect]:fill-white [&_path]:stroke-accent" />
          </span>
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-white/70">{BRAND.positioning}</p>
        </div>

        <div className="relative">
          <p className="max-w-md text-[34px] font-bold leading-[1.15] tracking-[-0.03em]">{BRAND.signature}</p>
          <p className="mt-5 max-w-md text-[15.5px] leading-relaxed text-white/80">
            Décrivez le chantier à voix haute, ajoutez une photo, vérifiez le devis et envoyez-le avant même d’avoir rangé vos outils.
          </p>
        </div>

        <div className="relative grid grid-cols-3 gap-3">
          {[
            ['Devis', 'préparé en 1 min'],
            ['Relances', 'suivies pour vous'],
            ['CA en attente', 'toujours visible'],
          ].map(([title, body]) => (
            <div key={title} className="rounded-[14px] border border-white/15 bg-white/10 p-4 backdrop-blur">
              <p className="text-[13.5px] font-semibold">{title}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-white/70">{body}</p>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
