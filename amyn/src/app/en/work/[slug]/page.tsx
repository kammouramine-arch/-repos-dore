import { notFound } from "next/navigation";
import { projectBySlug, projects } from "@/lib/projects";
import { ProjectPage, projectMetadata } from "@/views/ProjectPage";

export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return projectMetadata((await params).slug, "en");
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!projectBySlug(slug)) notFound();
  return <ProjectPage slug={slug} locale="en" />;
}
