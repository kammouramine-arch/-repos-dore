import Link from 'next/link';
import { Logo, BRAND } from '@/components/brand';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-5 py-8 sm:px-10">
        <Link href="/" aria-label="DEVISIA, accueil">
          <Logo />
        </Link>
        <main id="contenu" className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[400px]">{children}</div>
        </main>
        <p className="text-center text-[12.5px] text-subtle">
          © {new Date().getFullYear()} DEVISIA ·{' '}
          <Link href="/conditions" className="hover:text-muted">
            Conditions
          </Link>{' '}
          ·{' '}
          <Link href="/confidentialite" className="hover:text-muted">
            Confidentialité
          </Link>
        </p>
      </div>

      <aside className="relative hidden overflow-hidden bg-ink lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
          aria-hidden
        />
        <div className="relative">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-white/40">
            {BRAND.positioning}
          </p>
        </div>

        <div className="relative">
          <p className="max-w-md text-[30px] font-semibold leading-[1.2] tracking-[-0.03em] text-white">
            {BRAND.signature}
          </p>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/60">
            Décrivez le chantier à voix haute, ajoutez une photo, vérifiez le devis et envoyez-le
            avant même d’avoir rangé vos outils.
          </p>
        </div>

        <div className="relative grid grid-cols-3 gap-4">
          {[
            ['Devis', 'préparé en 1 min'],
            ['Relances', 'suivies pour vous'],
            ['CA en attente', 'toujours visible'],
          ].map(([title, body]) => (
            <div key={title} className="rounded-[12px] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[13px] font-semibold text-white">{title}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-white/50">{body}</p>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
