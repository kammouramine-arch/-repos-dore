import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthContext } from '@/lib/auth/session';
import { TRIAL_DAYS } from '@/lib/billing/plans';
import { SignUpForm } from './form';

export const metadata: Metadata = {
  title: 'Créer mon compte',
  description: `Créez votre compte DEVISIA et testez gratuitement pendant ${TRIAL_DAYS} jours.`,
  robots: { index: false, follow: false },
};

export default async function SignUpPage() {
  if (await getAuthContext()) redirect('/app');

  return (
    <div>
      <h1 className="text-[26px] font-semibold tracking-[-0.025em] text-ink">
        Créez votre compte gratuitement
      </h1>
      <p className="mt-2 text-[14.5px] text-muted">
        {TRIAL_DAYS} jours d’essai, sans carte bancaire. Votre premier devis en moins d’une minute.
      </p>

      <div className="mt-7">
        <SignUpForm />
      </div>

      <p className="mt-7 text-center text-[13.5px] text-muted">
        Déjà un compte ?{' '}
        <Link href="/connexion" className="font-medium text-accent hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
