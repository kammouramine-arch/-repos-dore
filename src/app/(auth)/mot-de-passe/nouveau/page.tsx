import type { Metadata } from 'next';
import Link from 'next/link';
import { NewPasswordForm } from './form';

export const metadata: Metadata = {
  title: 'Nouveau mot de passe',
  robots: { index: false, follow: false },
};

export default async function NewPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.025em] text-ink">Lien invalide</h1>
        <p className="mt-2 text-[14.5px] text-muted">
          Ce lien de réinitialisation est incomplet ou a expiré.
        </p>
        <Link href="/mot-de-passe" className="mt-6 inline-block font-medium text-accent hover:underline">
          Demander un nouveau lien
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-[26px] font-semibold tracking-[-0.025em] text-ink">
        Choisissez un nouveau mot de passe
      </h1>
      <p className="mt-2 text-[14.5px] text-muted">
        Toutes vos sessions ouvertes seront déconnectées par sécurité.
      </p>
      <div className="mt-7">
        <NewPasswordForm token={token} />
      </div>
    </div>
  );
}
