import { RevenueAuditPage, revenueAuditMetadata } from "@/views/RevenueAuditPage";

export const metadata = revenueAuditMetadata("en");

export default function Page() {
  return <RevenueAuditPage locale="en" />;
}
