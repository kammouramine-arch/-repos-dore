import { WorkPage, workMetadata } from "@/views/WorkPage";

export const metadata = workMetadata("en");

export default function Page() {
  return <WorkPage locale="en" />;
}
