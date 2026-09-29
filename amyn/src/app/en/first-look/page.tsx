import { FirstLookPage, firstLookMetadata } from "@/views/FirstLookPage";

export const metadata = firstLookMetadata("en");

export default function Page() {
  return <FirstLookPage locale="en" />;
}
