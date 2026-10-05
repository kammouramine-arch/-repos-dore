import { RevenueAuditPage, revenueAuditMetadata } from "@/views/RevenueAuditPage";

export const metadata = revenueAuditMetadata("fr");

export default function Page() {
  return <RevenueAuditPage locale="fr" />;
}
