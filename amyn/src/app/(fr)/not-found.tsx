import { NotFoundPage, notFoundMetadata } from "@/views/NotFoundPage";

export const metadata = notFoundMetadata("fr");

export default function NotFound() {
  return <NotFoundPage locale="fr" />;
}
