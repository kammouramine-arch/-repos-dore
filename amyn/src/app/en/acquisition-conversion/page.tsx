import { AcquisitionPage, acquisitionMetadata } from "@/views/AcquisitionPage";

export const metadata = acquisitionMetadata("en");

export default function Page() {
  return <AcquisitionPage locale="en" />;
}
