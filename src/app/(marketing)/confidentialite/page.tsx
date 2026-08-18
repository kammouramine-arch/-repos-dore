import type { Metadata } from 'next';
import { LegalPage, LegalSection } from '@/components/marketing/legal';

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description: 'Comment DEVISIA collecte, utilise et protège les données de votre entreprise.',
  alternates: { canonical: '/confidentialite' },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Politique de confidentialité"
      updatedAt="18 août 2026"
      intro="Cette page décrit les données traitées par DEVISIA, leur finalité et les droits dont vous disposez. Elle constitue une information générale et ne remplace pas l'analyse d'un conseil juridique pour votre situation particulière."
    >
      <LegalSection title="Responsable de traitement">
        <p>
          Le service DEVISIA est édité par la société exploitant la plateforme, dont les coordonnées
          complètes figurent dans les conditions d’utilisation. Pour toute question relative à vos
          données, une adresse de contact est mise à disposition dans votre espace client.
        </p>
      </LegalSection>

      <LegalSection title="Données collectées">
        <ul>
          <li>Données de compte : nom, prénom, adresse email, téléphone, mot de passe chiffré.</li>
          <li>
            Données d’entreprise : raison sociale, adresse, SIRET, numéro de TVA, logo, catalogue de
            prix, conditions commerciales.
          </li>
          <li>
            Données commerciales saisies par vous : clients, prospects, chantiers, devis, factures,
            messages et photos de chantier.
          </li>
          <li>
            Données techniques : journaux de connexion, adresse IP sous forme d’empreinte non
            réversible, type de navigateur.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Finalités et bases légales">
        <ul>
          <li>Fourniture du service (exécution du contrat) : création et envoi de devis, suivi client.</li>
          <li>Sécurité et prévention de la fraude (intérêt légitime) : journalisation, limitation de débit.</li>
          <li>Facturation et obligations comptables (obligation légale).</li>
          <li>Amélioration du produit (intérêt légitime), sur des données d’usage agrégées.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Traitements par intelligence artificielle">
        <p>
          Lorsque vous demandez la préparation d’un devis, la description que vous fournissez, les
          photos associées et un extrait de votre catalogue de prix sont transmis au fournisseur d’IA
          configuré, uniquement le temps de produire le résultat.
        </p>
        <ul>
          <li>Les données d’une entreprise ne sont jamais utilisées pour une autre entreprise.</li>
          <li>
            Vos données ne servent pas à entraîner un modèle général sans autorisation explicite et
            distincte.
          </li>
          <li>
            Les montants ne sont jamais calculés par le modèle : ils sont produits par le moteur de
            calcul de l’application.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Sous-traitants">
        <p>
          DEVISIA s’appuie sur des prestataires techniques pour l’hébergement, la base de données,
          l’envoi d’emails, le paiement et l’intelligence artificielle. La liste à jour de ces
          prestataires et de leur localisation est disponible sur demande.
        </p>
      </LegalSection>

      <LegalSection title="Durées de conservation">
        <ul>
          <li>Données de compte : pendant la durée de l’abonnement, puis 12 mois.</li>
          <li>Documents commerciaux et comptables : conservés conformément aux durées légales applicables.</li>
          <li>Journaux techniques : 12 mois maximum.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Vos droits">
        <p>
          Vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation, d’opposition
          et de portabilité. Vos données commerciales sont exportables depuis l’application. Une
          réclamation peut être introduite auprès de l’autorité de contrôle compétente.
        </p>
      </LegalSection>

      <LegalSection title="Sécurité">
        <ul>
          <li>Mots de passe stockés sous forme de condensats salés.</li>
          <li>Sessions serveur révocables, jetons publics de devis non devinables.</li>
          <li>Isolation stricte des données par organisation, vérifiée côté serveur.</li>
          <li>Fichiers stockés dans un espace privé, accessibles uniquement via des liens contrôlés.</li>
        </ul>
      </LegalSection>
    </LegalPage>
  );
}
