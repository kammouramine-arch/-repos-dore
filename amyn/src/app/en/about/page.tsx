import { AboutPage, aboutMetadata } from "@/views/AboutPage";

export const metadata = aboutMetadata("en");

export default function Page() {
  return <AboutPage locale="en" />;
}
