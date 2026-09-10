import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Check } from 'lucide-react';
import { SEO_PAGES, getSeoPage } from '@/content/seo-pages';
import { Button } from '@/components/ui/button';
import { FaqItem } from '@/components/marketing/sections';

export function generateStaticParams() {
  return SEO_PAGES.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = getSeoPage(slug);
  if (!page) return {};
  return {
    title: page.metaTitle,
    description: page.metaDescription,
    alternates: { canonical: `/${page.slug}` },
    openGraph: {
      title: page.metaTitle,
      description: page.metaDescription,
      type: 'article',
      url: `/${page.slug}`,
    },
  };
}

export default async function SeoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = getSeoPage(slug);
  if (!page) notFound();

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: page.faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <article className="container-page py-14 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">
            {page.eyebrow}
          </p>
          <h1 className="mt-3 text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-[42px]">
            {page.h1}
          </h1>
          <p className="mt-5 text-[16.5px] leading-relaxed text-muted">{page.intro}</p>

          <div className="mt-12 space-y-12">
            {page.sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-[21px] font-semibold tracking-[-0.02em] text-ink">
                  {section.title}
                </h2>
                {section.body ? (
                  <p className="mt-3 text-[15.5px] leading-relaxed text-muted">{section.body}</p>
                ) : null}
                {section.bullets ? (
                  <ul className="mt-4 space-y-2.5">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-3 text-[15px] leading-relaxed text-ink-soft">
                        <Check className="mt-1 h-4 w-4 shrink-0 text-accent" aria-hidden />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>

          <section className="mt-16">
            <h2 className="text-[21px] font-semibold tracking-[-0.02em] text-ink">
              Questions fréquentes
            </h2>
            <div className="mt-4 border-t border-line">
              {page.faq.map((item) => (
                <FaqItem key={item.question} question={item.question} answer={item.answer} />
              ))}
            </div>
          </section>

          <section className="mt-16 rounded-[18px] border border-line bg-surface/60 px-6 py-10 text-center sm:px-10">
            <h2 className="text-[24px] font-semibold tracking-[-0.025em] text-ink">{page.ctaTitle}</h2>
            <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-muted">{page.ctaBody}</p>
            <Button asChild size="lg" className="mt-7">
              <Link href="/inscription">
                Créer mon compte gratuitement
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </section>

          <nav className="mt-14 border-t border-line pt-8" aria-label="Autres guides">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-subtle">
              À lire aussi
            </h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {SEO_PAGES.filter((other) => other.slug !== page.slug)
                .slice(0, 4)
                .map((other) => (
                  <li key={other.slug}>
                    <Link
                      href={`/${other.slug}`}
                      className="flex items-center justify-between gap-3 rounded-[10px] border border-line bg-canvas px-4 py-3 text-[14px] text-ink-soft transition-colors hover:border-line-strong hover:bg-surface"
                    >
                      {other.eyebrow}
                      <ArrowRight className="h-3.5 w-3.5 text-subtle" aria-hidden />
                    </Link>
                  </li>
                ))}
            </ul>
          </nav>
        </div>
      </article>
    </>
  );
}
