import Link from "next/link";
import { Accordion } from "@/components/ui/Accordion";
import { Container, Heading, Label, Section, type HeadingLine } from "@/components/ui/Layout";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { href } from "@/lib/i18n/routes";
import { site } from "@/lib/site";

export function Faq({
  locale,
  items,
  number,
  title,
  size = "md",
}: {
  locale: Locale;
  items: { q: string; a: string }[];
  number?: string;
  title?: HeadingLine[];
  size?: "lg" | "md";
}) {
  const t = getDictionary(locale).home.faq;
  return (
    <Section labelledBy="faq-titre" className="seam">
      <Container className="grid gap-12 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-4">
          <div data-reveal="fade">
            <Label number={number}>{t.label}</Label>
          </div>
          <Heading id="faq-titre" size={size} className="mt-8" lines={title ?? t.title} />
          <p data-reveal className="mt-8 text-fg-2">
            {t.notHere}{" "}
            <Link href={href("firstLook", locale)} className="text-fg underline underline-offset-4">
              {t.write}
            </Link>{" "}
            {t.direct}{" "}
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
