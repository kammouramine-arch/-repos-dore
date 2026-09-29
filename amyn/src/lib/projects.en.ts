import type { ProjectText } from "./projects.ts";

/**
 * Case studies, in English. The concept websites themselves (menus,
 * buttons, brand names) stay in French: they are French businesses.
 */
export const projectsEn: Record<string, ProjectText> = {
  "maison-elan": {
    sector: "Restaurant",
    summary: "A seasonal restaurant that wants to fill its evening tables without taking bookings by phone mid-service.",
    context:
      "A neighbourhood restaurant with a short, ever-changing menu and around twenty covers. The menu changes weekly and most guests book on the day.",
    problem:
      "The online menu is never up to date, bookings come in by phone during service, and the business profile shows conflicting opening hours.",
    direction:
      "A dark, warm homepage built around the current menu. Booking is one tap away from every screen, and practical details match the business profile.",
    features: ["Easy-to-update menu", "Online booking", "Hours and directions", "Gallery"],
  },
  "institut-lys": {
    sector: "Beauty salon",
    summary: "A salon that wants clients to book and find their appointments without having to call.",
    context:
      "A treatment salon with three rooms and a loyal clientele who come back every four to six weeks.",
    problem:
      "Appointments are booked by message at all hours, no-shows are frequent, and treatments aren't presented anywhere with their duration.",
    direction:
      "A bright, calm website where every treatment has its duration and description. A client app to book, find appointments and receive a reminder.",
    features: ["Detailed treatments", "Booking by treatment", "Client area", "Appointment reminders"],
  },
  "barberie-aubin": {
    sector: "Barber",
    summary: "A neighbourhood barber who wants online bookings and a business profile that feels like the shop.",
    context:
      "Two chairs, a mix of regulars and walk-ins, and word of mouth that relies heavily on local search.",
    problem:
      "Without online booking, walk-in customers go elsewhere. The business profile has no recent photos and no list of services.",
    direction:
      "A bold identity — deep green on a light background — with services and availability up front. The business profile carries the same information and links straight to booking.",
    features: ["Services and durations", "Booking by barber", "Complete business profile", "Directions and hours"],
  },
  "bois-et-ligne": {
    sector: "Joinery workshop",
    summary: "A joinery workshop that wants to show its work and receive complete quote requests.",
    context:
      "A bespoke joinery workshop: kitchens, dressing rooms, staircases. Beautifully finished projects that rarely get shown.",
    problem:
      "Project photos sit on a phone. Requests arrive by phone without dimensions or pictures, and quotes are never followed up.",
    direction:
      "A clear, warm website where the work takes centre stage. A quote form that asks for the right information, and a board that tracks every request until it's signed.",
    features: ["Project gallery", "Guided quote request", "Quote tracking", "Service area"],
  },
  thermia: {
    sector: "Plumbing & heating",
    summary: "A call-out company that receives a lot of requests and doesn't want to lose a single one.",
    context:
      "A plumbing and heating company with four technicians, taking requests by phone, email and web form.",
    problem:
      "Requests arrive incomplete and through too many channels. Nobody knows which ones are waiting for a quote or a follow-up.",
    direction:
      "A direct website that separates emergencies from planned work right from the homepage. Every request lands on a tracking board, with missing information flagged and the next action shown.",
    features: ["Emergency or project from the start", "Qualifying form", "Request board", "Quote follow-ups"],
  },
  "cabinet-aurel": {
    sector: "Consultancy",
    summary: "A consultancy that wants to earn trust online and welcome new clients without the back-and-forth.",
    context:
      "A consultancy advising SME leaders on strategy, organisation and business succession.",
    problem:
      "The website doesn't say clearly what the firm does. Every new engagement starts with a string of emails to gather documents.",
    direction:
      "A sober, precise website where every area of expertise is explained simply. An onboarding journey guides each new client: steps, documents to provide, first meeting.",
    features: ["Detailed expertise", "Qualified first contact", "Onboarding journey", "Document collection"],
  },
};
