import { notFound } from "next/navigation";
import { SERVICE_SLUGS, serviceIdFromSlug } from "@/lib/i18n/routes";
import { ServicePage, serviceMetadata } from "@/views/ServicePage";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.values(SERVICE_SLUGS).map((s) => ({ slug: s.en }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const id = serviceIdFromSlug((await params).slug, "en");
  return id ? serviceMetadata(id, "en") : {};
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const id = serviceIdFromSlug((await params).slug, "en");
  if (!id) notFound();
  return <ServicePage id={id} locale="en" />;
}
