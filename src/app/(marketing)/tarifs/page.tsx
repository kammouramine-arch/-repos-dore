import type { Metadata } from 'next';
import { PricingGrid } from '@/components/marketing/pricing';
import { SectionHeading, FaqItem } from '@/components/marketing/sections';
import { TRIAL_DAYS } from '@/lib/billing/plans';

export const metadata: Metadata = {
  title: 'Tarifs',
  description:
    'Trois formules simples pour créer, envoyer et relancer vos devis. Essai gratuit sans carte bancaire.',
  alternates: { canonical: '/tarifs' },
};

const FAQ = [
  {
    question: 'Y a-t-il un engagement ?',
    answer: 'Non. Les abonnements sont mensuels et résiliables à tout moment depuis vos paramètres.',
  },
  {
    question: 'Que se passe-t-il si je dépasse mes générations IA ?',
    answer:
      "L'application vous prévient avant la limite. Vous pouvez continuer à créer des devis manuellement, et passer à la formule supérieure à tout moment.",
  },
  {
    question: 'Les prix sont-ils hors taxes ?',
    answer: 'Oui, tous les tarifs affichés sont hors taxes et destinés aux professionnels.',
  },
  {
    question: 'Puis-je ajouter des collaborateurs ?',
    answer:
      'Les formules Pro et Entreprise incluent plusieurs utilisateurs, avec des rôles distincts : propriétaire, administrateur et membre.',
  },
];

export default function PricingPage() {
  return (
    <div className="container-page py-16 sm:py-20">
      <SectionHeading
        eyebrow="Tarifs"
        title="Un tarif clair, remboursé par un seul chantier récupéré."
        description={`Essai de ${TRIAL_DAYS} jours, sans carte bancaire. Vos données restent exportables à tout moment.`}
      />
      <div className="mt-14">
        <PricingGrid />
      </div>
      <div className="mx-auto mt-20 max-w-3xl">
        <h2 className="text-[21px] font-semibold tracking-[-0.02em] text-ink">Questions sur l’abonnement</h2>
        <div className="mt-4 border-t border-line">
          {FAQ.map((item) => (
            <FaqItem key={item.question} question={item.question} answer={item.answer} />
          ))}
        </div>
      </div>
    </div>
  );
}
