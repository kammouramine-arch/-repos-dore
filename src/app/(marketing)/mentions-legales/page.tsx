import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, LegalSection } from '@/components/marketing/legal';

export const metadata: Metadata = {
  title: 'Mentions légales',
  description: 'Informations légales relatives à DEVISERA.',
  alternates: { canonical: '/mentions-legales' },
};

/**
 * The route is intentionally present before public launch so app and website
 * links never lead to a 404. The publisher must replace the marked identity
 * fields with the legally correct entity information before selling access.
 */
export default function LegalNoticesPage() {
  return (
    <LegalPage
      title="Mentions légales"
      updatedAt="9 septembre 2026"
      intro="Les informations ci-dessous sont une base technique pour DEVISERA. L’identité de l’éditeur, l’hébergeur et les mentions réglementaires doivent être complétés et relus par l’éditeur avec un conseil juridique avant la commercialisation publique."
    >
      <LegalSection title="Éditeur du service">
        <p>
          DEVISERA est actuellement publié par Kammour Amine, personne physique et directeur
          de la publication, sans société distincte constituée pour ce service. L’adresse
          professionnelle de publication reste à confirmer avec un conseil juridique avant la
          commercialisation publique. Aucun numéro d’immatriculation ni numéro de TVA n’a été
          communiqué pour DEVISERA. Cette situation ne constitue pas une affirmation de dispense
          d’immatriculation ou de TVA. Contact juridique et données personnelles : contact@devisera.fr.
        </p>
      </LegalSection>
      <LegalSection title="Hébergement et prestataires">
        <p>
          Le site et l’API sont hébergés par Vercel Inc., 440 N Barranca Ave #4133,
          Covina, CA 91723, États-Unis. Informations du prestataire :{' '}
          <a className="underline" href="https://vercel.com/legal/dpa">vercel.com/legal/dpa</a>.
          Les autres prestataires et leurs conditions de traitement doivent être confirmés
          dans l’inventaire des sous-traitants avant la commercialisation publique.
        </p>
      </LegalSection>
      <LegalSection title="Propriété intellectuelle">
        <p>
          Les éléments de marque, le logiciel et les contenus propres à DEVISERA sont exploités
          sous réserve des droits documentés dans l’inventaire IP du projet. Les licences des
          composants tiers restent applicables.
        </p>
      </LegalSection>
      <LegalSection title="Signalement et données personnelles">
        <p>
          Pour toute question, demande d’exercice de droits ou signalement, écrivez à
          contact@devisera.fr. Consultez la <Link className="underline" href="/confidentialite">politique de confidentialité</Link>
          {' '}et les <Link className="underline" href="/conditions">conditions d’utilisation</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
