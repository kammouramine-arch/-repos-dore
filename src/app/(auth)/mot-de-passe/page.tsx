import type { Metadata } from 'next';
import Link from 'next/link';
import { ResetRequestForm } from './form';

export const metadata: Metadata = {
  title: 'Mot de passe oublié',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="text-[26px] font-semibold tracking-[-0.025em] text-ink">Mot de passe oublié</h1>
      <p className="mt-2 text-[14.5px] text-muted">
        Indiquez votre adresse email : vous recevrez un lien pour choisir un nouveau mot de passe.
      </p>
      <div className="mt-7">
        <ResetRequestForm />
      </div>
      <p className="mt-7 text-center text-[13.5px] text-muted">
        <Link href="/connexion" className="font-medium text-accent hover:underline">
          Retour à la connexion
        </Link>
      </p>
    </div>
  );
}
