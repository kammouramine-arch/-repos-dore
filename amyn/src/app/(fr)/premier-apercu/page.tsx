import { FirstLookPage, firstLookMetadata } from "@/views/FirstLookPage";

export const metadata = firstLookMetadata("fr");

export default function Page() {
  return <FirstLookPage locale="fr" />;
}
