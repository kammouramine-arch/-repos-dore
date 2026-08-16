import type { Metadata } from "next";
import { LegalBlock, LegalShell, ToFill } from "@/components/layout/LegalShell";
import { contact, site } from "@/lib/content";

/* Tant que la page contient des emplacements vides, elle reste hors des
   moteurs de recherche. Retire `robots` une fois tout renseigné. */
export const metadata: Metadata = {
  title: "Politique de confidentialité",
  robots: { index: false, follow: false },
};

export default function Confidentialite() {
  return (
    <LegalShell title="Politique de confidentialité">
      <LegalBlock heading="Responsable du traitement">
        <ToFill>
          Dénomination sociale et adresse du responsable du traitement.
        </ToFill>
        <p>
          Pour toute question relative à vos données :{" "}
          <a className="text-bone hover:text-gold" href={`mailto:${contact.email}`}>{contact.email}</a>
        </p>
      </LegalBlock>

      <LegalBlock heading="Données collectées">
        <p>
          Le site {site.domain} ne comporte aujourd&apos;hui aucun formulaire et
          ne dépose aucun cookie de mesure d&apos;audience ni de publicité. Les
          seules données que vous transmettez sont celles que vous choisissez
          d&apos;écrire en nous contactant par e-mail.
        </p>
        <ToFill>
          À mettre à jour dès l&apos;ajout d&apos;un formulaire, d&apos;un outil
          de mesure d&apos;audience ou d&apos;un module de réservation.
        </ToFill>
      </LegalBlock>

      <LegalBlock heading="Conservation">
        <ToFill>Durée de conservation des échanges et des demandes.</ToFill>
      </LegalBlock>

      <LegalBlock heading="Vos droits">
        <p>
          Conformément au Règlement général sur la protection des données, vous
          disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement,
          de limitation, d&apos;opposition et de portabilité des données vous
          concernant. Vous pouvez les exercer en écrivant à l&apos;adresse
          ci-dessus. Vous avez également le droit d&apos;introduire une
          réclamation auprès de la CNIL.
        </p>
      </LegalBlock>
    </LegalShell>
  );
}
