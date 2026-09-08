import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, XCircle } from 'lucide-react';
import { verifyEmail } from '@/server/services/authService';
import { Button } from '@/components/ui/button';
import { getAuthContext } from '@/lib/auth/session';
import { VerificationForm } from './form';

export const metadata: Metadata = {
  title: 'Vérification de votre email',
  robots: { index: false, follow: false },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  let verified = false;
  const pendingAuth = !token ? await getAuthContext() : null;
  const pending = !token && !!pendingAuth && !pendingAuth.user.emailVerified;

  if (token) {
    verified = await verifyEmail(token)
      .then(() => true)
      .catch(() => false);
  }

  return (
    <div className="text-center">
      {pending ? (
        <>
          <h1 className="mt-5 text-[24px] font-semibold tracking-[-0.025em] text-ink">
            Vérifiez votre boîte mail
          </h1>
          <p className="mt-2 text-[14.5px] text-muted">
            Saisissez le code à six chiffres du dernier message reçu pour confirmer votre adresse email.
          </p>
          <VerificationForm email={pendingAuth!.user.email} />
          <Button asChild variant="secondary" size="lg" className="mt-7">
            <Link href="/connexion">Retour à la connexion</Link>
          </Button>
        </>
      ) : verified ? (
        <>
          <CheckCircle2 className="mx-auto h-10 w-10 text-success" aria-hidden />
          <h1 className="mt-5 text-[24px] font-semibold tracking-[-0.025em] text-ink">
            Adresse confirmée
          </h1>
          <p className="mt-2 text-[14.5px] text-muted">
            Votre adresse email est vérifiée. Vous pouvez continuer.
          </p>
          <Button asChild size="lg" className="mt-7">
            <Link href="/app">Ouvrir DEVISERA</Link>
          </Button>
        </>
      ) : (
        <>
          <XCircle className="mx-auto h-10 w-10 text-danger" aria-hidden />
          <h1 className="mt-5 text-[24px] font-semibold tracking-[-0.025em] text-ink">
            Lien invalide ou expiré
          </h1>
          <p className="mt-2 text-[14.5px] text-muted">
            Reconnectez-vous pour recevoir un nouveau lien de vérification.
          </p>
          <Button asChild variant="secondary" size="lg" className="mt-7">
            <Link href="/connexion">Se connecter</Link>
          </Button>
        </>
      )}
    </div>
  );
}
