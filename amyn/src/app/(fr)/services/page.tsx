import { ServicesPage, servicesMetadata } from "@/views/ServicesPage";

export const metadata = servicesMetadata("fr");

export default function Page() {
  return <ServicesPage locale="fr" />;
}
