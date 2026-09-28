import { notFound } from "next/navigation";
import { ConceptSite } from "@/components/visuals/ConceptSite";
import {
  AppMock,
  BookingMock,
  MenuMock,
  OnboardingMock,
  PortfolioMock,
  ProfileMock,
  QuoteBoardMock,
  QuoteDetailMock,
  TableBookingMock,
  TechnicianMock,
} from "@/components/visuals/Mocks";
import { photo } from "@/lib/photos";
import { projectBySlug } from "@/lib/projects";
import { shots } from "@/lib/visuals";

/**
 * Route de CAPTURE — développement uniquement.
 *
 * Rend un écran seul, à sa taille réelle, pour `scripts/capture-visuals.mjs`.
 * En production elle répond 404 et n'est ni indexée ni liée.
 */
export const metadata = { robots: { index: false, follow: false } };

export default async function Capture({ params }: { params: Promise<{ id: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { id } = await params;
  const s = shots.find((x) => x.id === id);
  if (!s) notFound();

  let screen: React.ReactNode;
  const [kind, ...rest] = id.split("-");
  const slug = rest.join("-");
  if (kind === "site" || kind === "mobile") {
    const project = projectBySlug(slug);
    if (!project) notFound();
    screen = kind === "site" ? <ConceptSite concept={project} /> : <ConceptSite concept={project} compact height={s.height} />;
  } else {
    screen = {
      menu: <MenuMock photo={photo("restaurant-salle")} />,
      "table-booking": <TableBookingMock />,
      quotes: <QuoteBoardMock />,
      "quote-detail": <QuoteDetailMock />,
      technician: <TechnicianMock />,
      booking: <BookingMock />,
      app: <AppMock />,
      profile: <ProfileMock photo={photo("barbier-salon")} />,
      onboarding: <OnboardingMock />,
      portfolio: <PortfolioMock photos={[photo("menuiserie-cuisine"), photo("menuiserie-sejour"), photo("artisan-plans")]} />,
    }[id];
  }

  return (
    <div
      id="capture"
      data-capture
      style={{ width: s.width, height: s.height, position: "fixed", inset: 0, zIndex: 100, overflow: "hidden" }}
    >
      {screen}
    </div>
  );
}
