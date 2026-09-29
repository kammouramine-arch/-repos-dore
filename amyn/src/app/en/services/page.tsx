import { ServicesPage, servicesMetadata } from "@/views/ServicesPage";

export const metadata = servicesMetadata("en");

export default function Page() {
  return <ServicesPage locale="en" />;
}
