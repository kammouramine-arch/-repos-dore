import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { businessComplete } from '../../mobile/src/features/setup-facts';

describe('setup progress facts', () => {
  it('marks the business complete only with a legal identifier and a way to reach it', () => {
    expect(businessComplete(null)).toBe(false);
    expect(businessComplete({ siret: '123', addressLine1: null, city: null, phone: null })).toBe(false);
    expect(businessComplete({ siret: '123', addressLine1: '1 rue', city: 'Lyon' })).toBe(true);
    expect(businessComplete({ vatNumber: 'FR1', phone: '06' })).toBe(true);
    expect(businessComplete({ addressLine1: '1 rue', city: 'Lyon' })).toBe(false);
  });
});

describe('home personalization contracts', () => {
  const home = readFileSync('mobile/app/(app)/index.tsx', 'utf8');
  const carousel = readFileSync('mobile/src/components/quote-carousel.tsx', 'utf8');
  const progress = readFileSync('mobile/src/components/setup-progress.tsx', 'utf8');
  it('renders the quote carousel from the API and never a hard-coded amount', () => {
    expect(home).toContain("api.quotes.list({ take: 8 })");
    expect(home).toContain('<QuoteCarousel quotes={quotesQuery.data?.items} loading={quotesQuery.loading} en={en} onBrand />');
    expect(carousel).toContain('snapToInterval={cardWidth + GAP}');
    expect(carousel).toContain('formatCents(quote.totalCents)');
    expect(carousel).not.toMatch(/\b(39|79|149|1 ?200) ?€/);
    expect(carousel).toContain('<PageDots');
    expect(carousel).toContain('function EmptyQuotes');
  });
  it('keeps completed setup items visible with a check state and links each to its screen', () => {
    expect(progress).toContain("accessibilityState={{ checked: done }}");
    expect(progress).toContain('<SuccessCheck size={22} />');
    expect(progress).toContain("href: '/entreprise' as const");
    expect(progress).toContain("href: '/catalogue' as const");
    expect(progress).toContain("href: '/clients' as const");
    expect(home).toContain('{setup && setupPending ? <SetupProgress status={setup} en={en} /> : null}');
  });
  it('greets contextually and reveals the header once', () => {
    expect(home).toContain('Votre atelier est prêt. Votre premier devis commence ici.');
    expect(home).toContain('attend${data.toRecover.quoteCount > 1 ? \'ent\' : \'\'} une réponse');
    expect(home).toContain('On chiffre quoi aujourd’hui ?');
    expect(home).toMatch(/function HomeHeader[\s\S]*<Enter delay=\{60\}/);
  });
  it('centres the Mon espace identity with a larger portrait', () => {
    const espace = readFileSync('mobile/app/(app)/plus.tsx', 'utf8');
    expect(espace).toContain('centered');
    expect(espace).toContain('size={88}');
    expect(readFileSync('mobile/src/components/settings.tsx', 'utf8')).toContain("justifyContent: 'center', gap: spacing.sm }}>{chips}");
  });
});
