import { RevenueOsDemoPage, revenueOsDemoMetadata } from "@/views/RevenueOsDemoPage";

export const metadata = revenueOsDemoMetadata("en");

export default function Page() {
  return <RevenueOsDemoPage locale="en" />;
}
