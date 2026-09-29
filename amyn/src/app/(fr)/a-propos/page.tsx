import { AboutPage, aboutMetadata } from "@/views/AboutPage";

export const metadata = aboutMetadata("fr");

export default function Page() {
  return <AboutPage locale="fr" />;
}
