import { AcquisitionPage, acquisitionMetadata } from "@/views/AcquisitionPage";

export const metadata = acquisitionMetadata("fr");

export default function Page() {
  return <AcquisitionPage locale="fr" />;
}
