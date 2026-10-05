import { RevenueOsPage, revenueOsMetadata } from "@/views/RevenueOsPage";

export const metadata = revenueOsMetadata("fr");

export default function Page() {
  return <RevenueOsPage locale="fr" />;
}
