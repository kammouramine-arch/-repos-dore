import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthContext } from '@/lib/auth/session';
import { SignInForm } from './form';

export const metadata: Metadata = {
  title: 'Connexion',
  description: 'Connectez-vous à votre espace DEVISIA.',
  robots: { index: false, follow: false },
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reinitialise?: string }>;
}) {
  if (await getAuthContext()) redirect('/app');
  const params = await searchParams;

  return (
    <div>
      <h1 className="text-[26px] font-semibold tracking-[-0.025em] text-ink">Content de vous revoir</h1>
      <p className="mt-2 text-[14.5px] text-muted">
        Connectez-vous pour retrouver vos devis et vos clients.
      </p>

      {params.reinitialise ? (
        <div className="mt-5 rounded-[10px] border border-success/25 bg-success-soft px-4 py-3 text-[13.5px] text-success">
          Votre mot de passe a été mis à jour. Vous pouvez vous connecter.
        </div>
      ) : null}

      <div className="mt-7">
        <SignInForm next={params.next} />
      </div>

      <p className="mt-7 text-center text-[13.5px] text-muted">
        Pas encore de compte ?{' '}
        <Link href="/inscription" className="font-medium text-accent hover:underline">
          Créer mon compte
        </Link>
      </p>
    </div>
  );
}
