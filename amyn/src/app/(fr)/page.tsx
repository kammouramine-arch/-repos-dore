import { HomePage, homeMetadata } from "@/views/HomePage";

export const metadata = homeMetadata("fr");

export default function Page() {
  return <HomePage locale="fr" />;
}
