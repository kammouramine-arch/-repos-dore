import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Assistance DEVISERA', alternates: { canonical: '/assistance' } };

export default async function SupportPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const english = (await searchParams).lang === 'en';
  return (
    <article className="container-page mx-auto max-w-3xl space-y-8 py-14" lang={english ? 'en' : 'fr'}>
      <h1 className="text-3xl font-semibold">{english ? 'DEVISERA support' : 'Assistance DEVISERA'}</h1>
      <nav aria-label={english ? 'Language' : 'Langue'}><Link href="/assistance">Français</Link>{' · '}<Link href="/assistance?lang=en">English</Link></nav>
      <p>{english ? 'Need help with your account, a quote or your subscription?' : 'Besoin d’aide pour votre compte, un devis ou votre abonnement ?'}{' '}
        <a className="underline" href="mailto:contact@devisera.fr">contact@devisera.fr</a>
      </p>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{english ? 'Account access' : 'Accès au compte'}</h2>
        <p>{english ? 'Use the email address used to create your DEVISERA account. For a missing verification email, check spam and wait for the resend countdown. Never send your password, verification code or Apple credentials to support.' : 'Utilisez l’adresse de création de votre compte DEVISERA. Pour un email de vérification manquant, consultez les indésirables et attendez la fin du décompte de renvoi. Ne transmettez jamais votre mot de passe, code de vérification ou identifiants Apple au support.'}</p>
        <Link className="underline" href="/mot-de-passe">{english ? 'Reset password' : 'Réinitialiser le mot de passe'}</Link>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{english ? 'Apple subscriptions' : 'Abonnements Apple'}</h2>
        <p>{english ? 'In the app, use Restore Purchases with the Apple account used for the purchase. A subscription already linked to another DEVISERA workspace cannot be reassigned automatically. Contact support instead of purchasing again.' : 'Dans l’application, utilisez Restaurer mes achats avec le compte Apple du premier achat. Un abonnement déjà associé à un autre espace DEVISERA ne peut pas être réattribué automatiquement. Contactez le support plutôt que de payer à nouveau.'}</p>
        <a className="underline" href="https://apps.apple.com/account/subscriptions">{english ? 'Manage or cancel an Apple subscription' : 'Gérer ou résilier un abonnement Apple'}</a>
        <p>{english ? 'Deleting your DEVISERA account does not cancel your Apple subscription. For web billing, use the subscription management entry in your account.' : 'Supprimer votre compte DEVISERA ne résilie pas votre abonnement Apple. Pour la facturation web, utilisez la gestion de l’abonnement dans votre compte.'}</p>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{english ? 'Personal data' : 'Données personnelles'}</h2>
        <p>{english ? 'Account settings provide account export and deletion. For other privacy requests or retained business documents, contact the address above. Describe the problem and app version, without attaching sensitive customer documents.' : 'Les paramètres du compte proposent l’export et la suppression du compte. Pour les autres demandes de confidentialité ou les documents commerciaux conservés, contactez l’adresse ci-dessus. Décrivez le problème et la version de l’application, sans joindre de documents clients sensibles.'}</p>
        <Link className="underline" href="/confidentialite">{english ? 'Privacy policy (French)' : 'Politique de confidentialité'}</Link>
      </section>
    </article>
  );
}
