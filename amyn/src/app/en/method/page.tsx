import { MethodPage, methodMetadata } from "@/views/MethodPage";

export const metadata = methodMetadata("en");

export default function Page() {
  return <MethodPage locale="en" />;
}
