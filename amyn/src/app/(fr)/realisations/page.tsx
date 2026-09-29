import { WorkPage, workMetadata } from "@/views/WorkPage";

export const metadata = workMetadata("fr");

export default function Page() {
  return <WorkPage locale="fr" />;
}
