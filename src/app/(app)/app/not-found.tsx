import Link from 'next/link';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getTranslations } from '@/lib/i18n';

export default async function AppNotFound() {
  const { t } = await getTranslations();
  return (
    <div className="mx-auto max-w-md rounded-[16px] border border-line bg-canvas px-6 py-12 text-center shadow-card">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[12px] bg-accent-soft">
        <Compass className="h-5 w-5 text-accent" aria-hidden />
      </div>
      <h1 className="mt-4 text-[17px] font-semibold text-ink">{t.errors.notFoundTitle}</h1>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{t.errors.notFoundBody}</p>
      <Button asChild className="mt-5">
        <Link href="/app">{t.nav.home}</Link>
      </Button>
    </div>
  );
}
