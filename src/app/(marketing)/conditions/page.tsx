import type { Metadata } from 'next';
import { LegalPage, LegalSection } from '@/components/marketing/legal';
import { PLANS, PLAN_ORDER, TRIAL_DAYS } from '@/lib/billing/plans';
import { formatCents } from '@/lib/money';

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation",
  description: "Conditions d'utilisation du service DEVISIA.",
  alternates: { canonical: '/conditions' },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Conditions générales d’utilisation"
      updatedAt="18 août 2026"
      intro="Ces conditions encadrent l'utilisation de DEVISIA. Elles constituent un cadre général et doivent être adaptées par l'éditeur avec son conseil juridique avant toute commercialisation."
    >
      <LegalSection title="Objet du service">
        <p>
          DEVISIA est un logiciel en ligne d’aide à la création, à l’envoi et au suivi de devis
          destiné aux professionnels. Le service est réservé à un usage professionnel.
        </p>
      </LegalSection>

      <LegalSection title="Compte et responsabilité de l’utilisateur">
        <ul>
          <li>Les informations fournies lors de l’inscription doivent être exactes et à jour.</li>
          <li>Les identifiants sont personnels ; leur confidentialité relève de l’utilisateur.</li>
          <li>
            L’utilisateur reste seul responsable du contenu de ses devis, de leur conformité et des
            engagements qu’ils créent vis-à-vis de ses clients.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Devis préparés par intelligence artificielle">
        <p>
          Les projets de devis produits par l’application sont des propositions destinées à être
          vérifiées. L’utilisateur doit contrôler les désignations, quantités, prix, taux de TVA et
          mentions légales avant tout envoi à un client. Aucun devis n’est transmis sans validation
          explicite de l’utilisateur.
        </p>
      </LegalSection>

      <LegalSection title="Abonnements et facturation">
        <ul>
          {PLAN_ORDER.map((id) => (
            <li key={id}>
              {PLANS[id].name} : {formatCents(PLANS[id].monthlyPriceCents)} HT par mois.
            </li>
          ))}
          <li>Période d’essai de {TRIAL_DAYS} jours, sans carte bancaire.</li>
          <li>Les abonnements sont sans engagement et résiliables depuis l’espace client.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Disponibilité">
        <p>
          L’éditeur met en œuvre les moyens raisonnables pour assurer la disponibilité du service. Des
          interruptions peuvent survenir pour maintenance ou du fait de prestataires tiers. Aucune
          garantie de disponibilité chiffrée n’est accordée en dehors d’un engagement contractuel
          spécifique.
        </p>
      </LegalSection>

      <LegalSection title="Propriété des données">
        <p>
          Les données saisies restent la propriété de l’entreprise utilisatrice. Elles sont
          exportables à tout moment et supprimées sur demande, sous réserve des obligations légales de
          conservation.
        </p>
      </LegalSection>

      <LegalSection title="Usages interdits">
        <ul>
          <li>Utiliser le service pour émettre des documents frauduleux ou trompeurs.</li>
          <li>Tenter de contourner les limitations techniques ou d’accéder aux données d’une autre entreprise.</li>
          <li>Envoyer des messages non sollicités en masse à des destinataires sans lien commercial.</li>
        </ul>
      </LegalSection>
    </LegalPage>
  );
}
