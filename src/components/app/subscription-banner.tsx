import Link from 'next/link';
import { AlertTriangle, CreditCard, Sparkles } from 'lucide-react';
import { accessStateFor, trialMessage, type SubscriptionSnapshot } from '@devisia/shared';
import { Button } from '@/components/ui/button';

/**
 * Bandeau d'abonnement affiché en tête de l'espace applicatif.
 * Rien ne s'affiche tant que l'abonnement est sain : on ne parasite pas le travail.
 */
export function SubscriptionBanner({ subscription }: { subscription: SubscriptionSnapshot | null }) {
  const state = accessStateFor(subscription);

  if (state.trialExpired) {
    return (
      <Bar
        tone="warning"
        icon={AlertTriangle}
        title="Votre essai gratuit est terminé."
        description="Choisissez une formule pour continuer à créer et envoyer des devis. Vos données restent intactes."
        cta="Voir les formules"
      />
    );
  }

  if (state.paymentIssue) {
    return (
      <Bar
        tone="danger"
        icon={CreditCard}
        title="Votre dernier paiement n’a pas abouti."
        description="Mettez à jour votre moyen de paiement pour éviter toute interruption."
        cta="Mettre à jour"
      />
    );
  }

  if (state.inTrial && state.trialDaysLeft <= 3) {
    return (
      <Bar
        tone="accent"
        icon={Sparkles}
        title={trialMessage(state.trialDaysLeft)}
        description="Conservez vos relances automatiques et votre suivi de chiffre d’affaires."
        cta="Choisir ma formule"
      />
    );
  }

  return null;
}

function Bar({
  tone,
  icon: Icon,
  title,
  description,
  cta,
}: {
  tone: 'accent' | 'warning' | 'danger';
  icon: React.ElementType;
  title: string;
  description: string;
  cta: string;
}) {
  const tones = {
    accent: 'border-accent-border bg-accent-soft text-accent-hover',
    warning: 'border-warning/25 bg-warning-soft text-warning',
    danger: 'border-danger/25 bg-danger-soft text-danger',
  };

  return (
    <div
      className={`mb-5 flex flex-wrap items-center gap-3 rounded-[12px] border px-4 py-3 ${tones[tone]}`}
      role="status"
    >
      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold">{title}</p>
        <p className="text-[13px] leading-relaxed opacity-90">{description}</p>
      </div>
      <Button asChild size="sm" variant={tone === 'accent' ? 'primary' : 'secondary'}>
        <Link href="/app/parametres/abonnement">{cta}</Link>
      </Button>
    </div>
  );
}
