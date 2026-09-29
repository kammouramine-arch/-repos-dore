import { MethodPage, methodMetadata } from "@/views/MethodPage";

export const metadata = methodMetadata("fr");

export default function Page() {
  return <MethodPage locale="fr" />;
}
