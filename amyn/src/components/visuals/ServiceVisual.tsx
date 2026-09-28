import { projectBySlug, type Project } from "@/lib/projects";
import type { VisualKey } from "@/lib/services";
import { COMPACT, ConceptSite, WIDE } from "./ConceptSite";
import { BrowserFrame, PhoneFrame } from "./Frames";
import {
  AppMock,
  BookingMock,
  OnboardingMock,
  PortfolioMock,
  ProfileMock,
  QuoteBoardMock,
} from "./Mocks";

/**
 * Le visuel associé à chaque type de solution. Toujours une illustration,
 * annoncée comme telle aux technologies d'assistance.
 */
export function ServiceVisual({
  visual,
  className = "",
}: {
  visual: VisualKey;
  className?: string;
}) {
  switch (visual) {
    case "website":
      return (
        <ConceptWindow
          project={projectBySlug("cabinet-aurel")!}
          className={className}
        />
      );
    case "quotes":
      return (
        <BrowserFrame
          url="app.thermia-services.fr/demandes"
          width={1280}
          height={800}
          label="Illustration : tableau de suivi des demandes et des devis, classés par étape."
          className={className}
        >
          <QuoteBoardMock />
        </BrowserFrame>
      );
    case "onboarding":
      return (
        <BrowserFrame
          url="espace.cabinet-aurel.fr/bienvenue"
          width={1280}
          height={800}
          label="Illustration : parcours d'accueil d'un nouveau client, avec étapes et documents à fournir."
          className={className}
        >
          <OnboardingMock />
        </BrowserFrame>
      );
    case "portfolio":
      return (
        <BrowserFrame
          url="bois-et-ligne.fr/realisations"
          width={1280}
          height={800}
          label="Illustration : page de réalisation d'un menuisier, avec description, détails et galerie."
          className={className}
        >
          <PortfolioMock />
        </BrowserFrame>
      );
    case "booking":
      return (
        <PhoneCentered className={className}>
          <PhoneFrame label="Illustration : réservation en ligne sur téléphone, choix du jour et du créneau.">
            <BookingMock />
          </PhoneFrame>
        </PhoneCentered>
      );
    case "app":
      return (
        <PhoneCentered className={className}>
          <PhoneFrame label="Illustration : application cliente affichant le prochain rendez-vous et les notifications.">
            <AppMock />
          </PhoneFrame>
        </PhoneCentered>
      );
    case "profile":
      return (
        <PhoneCentered className={className}>
          <PhoneFrame label="Illustration : fiche d'établissement complète, avec horaires, services et actions.">
            <ProfileMock />
          </PhoneFrame>
        </PhoneCentered>
      );
  }
}

function PhoneCentered({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`mx-auto w-full max-w-[19rem] ${className}`}>{children}</div>;
}

/**
 * Un site conceptuel dans sa fenêtre. Deux compositions rendues côte à
 * côte, une seule affichée selon la largeur : la place est réservée dès le
 * premier rendu, et le site reste lisible sur téléphone au lieu d'être
 * une page de 1440 px réduite à l'illisible.
 */
export function ConceptWindow({
  project,
  className = "",
}: {
  project: Project;
  className?: string;
}) {
  const label = `Illustration : page d'accueil du concept ${project.brand} (${project.sector.toLowerCase()}).`;
  return (
    <div className={className}>
      <BrowserFrame
        url={project.domain}
        width={COMPACT.width}
        height={COMPACT.height}
        label={label}
        className="sm:hidden"
      >
        <ConceptSite concept={project} compact />
      </BrowserFrame>
      <BrowserFrame
        url={project.domain}
        width={WIDE.width}
        height={WIDE.height}
        label={label}
        className="hidden sm:block"
      >
        <ConceptSite concept={project} />
      </BrowserFrame>
    </div>
  );
}
