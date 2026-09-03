import type { Metadata } from 'next';
import { LegalPage, LegalSection } from '@/components/marketing/legal';

export const metadata: Metadata = {
  title: 'Politique cookies',
  description: 'Les cookies utilisés par DEVISIA et leur finalité.',
  alternates: { canonical: '/cookies' },
};

export default function CookiesPage() {
  return (
    <LegalPage
      title="Politique cookies"
      updatedAt="18 août 2026"
      intro="DEVISIA limite volontairement l'usage des cookies à ce qui est nécessaire au fonctionnement du service."
    >
      <LegalSection title="Cookies strictement nécessaires">
        <ul>
          <li>
            <strong>devisia_session</strong> : maintient votre session connectée. Cookie httpOnly,
            durée 30 jours.
          </li>
          <li>
            <strong>devisia_org</strong> : mémorise l’entreprise active lorsque vous appartenez à
            plusieurs organisations.
          </li>
          <li>
            <strong>devisia_locale</strong> : mémorise la langue d’affichage choisie.
          </li>
        </ul>
        <p>
          Ces cookies ne nécessitent pas de consentement préalable car ils sont indispensables à la
          fourniture du service demandé.
        </p>
      </LegalSection>

      <LegalSection title="Mesure d’audience">
        <p>
          Les statistiques d’usage sont enregistrées côté serveur sous forme d’événements produit
          rattachés à une organisation, sans traceur publicitaire ni revente de données. Aucun cookie
          tiers de publicité n’est déposé.
        </p>
      </LegalSection>

      <LegalSection title="Gestion depuis votre navigateur">
        <p>
          Vous pouvez supprimer les cookies déposés depuis les réglages de votre navigateur. La
          suppression du cookie de session entraîne simplement votre déconnexion.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
