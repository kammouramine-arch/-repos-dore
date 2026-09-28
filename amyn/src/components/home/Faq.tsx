import Link from "next/link";
import { Accordion } from "@/components/ui/Accordion";
import { Container, Heading, Label, Section } from "@/components/ui/Layout";
import { cta, site } from "@/lib/site";

export function Faq({
  items,
  number,
  title = [{ text: "Questions" }, { accent: "fréquentes." }],
}: {
  items: { q: string; a: string }[];
  number?: string;
  title?: { text?: string; accent?: string }[];
}) {
  return (
    <Section labelledBy="faq-titre">
      <Container className="grid gap-12 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-4">
          <div data-reveal="fade">
            <Label number={number}>FAQ</Label>
          </div>
          <Heading id="faq-titre" size="md" className="mt-8" lines={title} />
          <p data-reveal className="mt-8 text-fg-2">
            Une question qui n&apos;est pas ici ?{" "}
            <Link href={cta.project.href} className="text-fg underline underline-offset-4">
              Écrivez-nous
            </Link>{" "}
            ou directement à{" "}
            <a href={`mailto:${site.email}`} className="text-fg underline underline-offset-4">
              {site.email}
            </a>
            .
          </p>
        </div>
        <div className="lg:col-span-7 lg:col-start-6">
          <Accordion items={items} />
        </div>
      </Container>
    </Section>
  );
}
