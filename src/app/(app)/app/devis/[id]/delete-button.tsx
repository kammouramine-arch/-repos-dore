'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/lib/i18n/context';
import { format } from '@/lib/i18n/format';

/** Suppression d'un devis depuis sa fiche : confirmation, puis retour à la liste. */
export function DeleteQuoteButton({ quoteId, number }: { quoteId: string; number: string }) {
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  async function remove() {
    setPending(true);
    try {
      const response = await fetch(`/api/quotes/${quoteId}`, { method: 'DELETE' });
      const payload = (await response.json().catch(() => null)) as { error?: { message: string } } | null;
      if (!response.ok) {
        toast({ title: payload?.error?.message ?? t.errors.saveFailed, tone: 'error' });
        return;
      }
      toast({ title: t.quotes.deleted });
      router.push('/app/devis');
      router.refresh();
    } catch {
      toast({ title: t.errors.saveFailed, tone: 'error' });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button variant="ghost" size="sm" className="text-muted hover:bg-danger-soft hover:text-danger" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" aria-hidden />
        {t.quotes.delete}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t.quotes.deleteConfirmTitle}
        description={format(t.quotes.deleteConfirmBody, { number })}
        confirmLabel={t.quotes.delete}
        cancelLabel={t.common.cancel}
        destructive
        pending={pending}
        onConfirm={() => void remove()}
      />
    </>
  );
}
