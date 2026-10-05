import { RevenueOsDemoPage, revenueOsDemoMetadata } from "@/views/RevenueOsDemoPage";

export const metadata = revenueOsDemoMetadata("fr");

export default function Page() {
  return <RevenueOsDemoPage locale="fr" />;
}
