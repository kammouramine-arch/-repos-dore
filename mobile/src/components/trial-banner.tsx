import { useRouter } from 'expo-router';
import { accessStateFor, trialMessage, type SubscriptionDTO } from '@devisia/shared';
import { Banner, Button } from './ui';

/**
 * Bandeau d'abonnement : essai en cours, essai terminé ou paiement en échec.
 * Rien ne s'affiche quand l'abonnement est sain — on ne parasite pas le travail.
 */
export function TrialBanner({ subscription }: { subscription: SubscriptionDTO | null }) {
  const router = useRouter();
  const state = accessStateFor(subscription);

  if (state.trialExpired) {
    return (
      <Banner
        tone="warning"
        title="Votre essai gratuit est terminé."
        description="Choisissez une formule pour continuer à créer et envoyer des devis. Vos données restent intactes."
        action={<Button title="Voir les formules" onPress={() => router.push('/abonnement')} />}
      />
    );
  }

  if (state.paymentIssue) {
    return (
      <Banner
        tone="danger"
        title="Votre dernier paiement n’a pas abouti."
        description="Mettez à jour votre moyen de paiement pour éviter l’interruption."
        action={<Button title="Mettre à jour" variant="secondary" onPress={() => router.push('/abonnement')} />}
      />
    );
  }

  if (state.inTrial && state.trialDaysLeft <= 3) {
    return (
      <Banner
        tone="info"
        title={trialMessage(state.trialDaysLeft)}
        description="Conservez vos relances automatiques et votre suivi de chiffre d’affaires."
        action={<Button title="Choisir ma formule" onPress={() => router.push('/abonnement')} />}
      />
    );
  }

  return null;
}
