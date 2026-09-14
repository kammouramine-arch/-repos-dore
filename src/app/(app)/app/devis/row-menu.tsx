'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Copy, ExternalLink, FileDown, MoreHorizontal, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/lib/i18n/context';
import { format } from '@/lib/i18n/format';

/** Menu d'actions d'une ligne de devis : ouvrir, PDF, lien client, suppression confirmée. */
export function QuoteRowMenu({
  quoteId,
  number,
  publicUrl,
  canDelete,
}: {
  quoteId: string;
  number: string;
  publicUrl: string;
  canDelete: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [confirm, setConfirm] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast({ title: t.quotes.linkCopied });
    } catch {
      toast({ title: t.common.error, tone: 'error' });
    }
  }

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
      setConfirm(false);
      router.refresh();
    } catch {
      toast({ title: t.errors.saveFailed, tone: 'error' });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="rounded-[8px] p-1.5 text-subtle transition-colors hover:bg-surface-2 hover:text-ink data-[state=open]:bg-surface-2 data-[state=open]:text-ink"
            aria-label={`${t.quotes.actions} ${number}`}
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[220px]">
          <DropdownMenuItem asChild>
            <Link href={`/app/devis/${quoteId}`}>
              <ExternalLink className="h-4 w-4" aria-hidden />
              {t.quotes.open}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={`/api/quotes/${quoteId}/pdf`} target="_blank" rel="noreferrer">
              <FileDown className="h-4 w-4" aria-hidden />
              {t.quotes.downloadPdf}
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void copy()}>
            <Copy className="h-4 w-4" aria-hidden />
            {t.quotes.copyLink}
          </DropdownMenuItem>
          {canDelete ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onSelect={() => setConfirm(true)}>
                <Trash2 className="h-4 w-4" aria-hidden />
                {t.quotes.delete}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
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
