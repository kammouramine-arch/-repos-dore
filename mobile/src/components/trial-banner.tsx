import { useRouter } from 'expo-router';
import { accessStateFor, trialMessage, type SubscriptionDTO } from '@devisia/shared';
import { Banner, Button } from './ui';
import { useMobileLocale } from '@/lib/i18n';

/**
 * Bandeau d'abonnement : essai en cours, essai terminé ou paiement en échec.
 * Rien ne s'affiche quand l'abonnement est sain — on ne parasite pas le travail.
 */
export function TrialBanner({ subscription }: { subscription: SubscriptionDTO | null }) {
  const router = useRouter();
  const en = useMobileLocale() === 'en';
  const state = accessStateFor(subscription);

  // Apple already owns the renewal: never sell the same plan a second time.
  if (subscription?.provider === 'apple' && state.canWrite) return null;

  if (state.trialExpired) {
    return (
      <Banner
        tone="warning"
        title={en ? 'Your free trial has ended.' : 'Votre essai gratuit est terminé.'}
        description={en ? 'Choose a plan to keep creating and sending quotes. Your data stays intact.' : 'Choisissez une formule pour continuer à créer et envoyer des devis. Vos données restent intactes.'}
        action={<Button title={en ? 'View plans' : 'Voir les formules'} onPress={() => router.push('/abonnement')} />}
      />
    );
  }

  if (state.paymentIssue) {
    return (
      <Banner
        tone="danger"
        title={en ? 'Your latest payment failed.' : 'Votre dernier paiement n’a pas abouti.'}
        description={en ? 'Update your payment method to avoid an interruption.' : 'Mettez à jour votre moyen de paiement pour éviter l’interruption.'}
        action={<Button title={en ? 'Update' : 'Mettre à jour'} variant="secondary" onPress={() => router.push('/abonnement')} />}
      />
    );
  }

  if (state.inTrial && state.trialDaysLeft <= 3) {
    return (
      <Banner
        tone="info"
        title={en ? `${state.trialDaysLeft} day${state.trialDaysLeft === 1 ? '' : 's'} left in your trial` : trialMessage(state.trialDaysLeft)}
        description={en ? 'Keep your automatic follow-ups and revenue tracking.' : 'Conservez vos relances automatiques et votre suivi de chiffre d’affaires.'}
        action={<Button title={en ? 'Choose a plan' : 'Choisir ma formule'} onPress={() => router.push('/abonnement')} />}
      />
    );
  }

  return null;
}
