'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Check, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/field';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/lib/i18n/context';
import { format } from '@/lib/i18n/format';
import { CustomerDialog, type CustomerFormValue } from '../dialog';

/** Modifier / supprimer depuis la fiche client. */
export function CustomerActions({ customer, name, canDelete }: { customer: CustomerFormValue; name: string; canDelete: boolean }) {
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = React.useState(false);
  const [confirm, setConfirm] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  async function remove() {
    setPending(true);
    try {
      const response = await fetch(`/api/customers/${customer.id}`, { method: 'DELETE' });
      const payload = (await response.json().catch(() => null)) as { error?: { message: string } } | null;
      if (!response.ok) {
        toast({ title: payload?.error?.message ?? t.errors.saveFailed, tone: 'error' });
        return;
      }
      toast({ title: t.customers.deleted });
      router.push('/app/clients');
      router.refresh();
    } catch {
      toast({ title: t.errors.saveFailed, tone: 'error' });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
        <Pencil className="h-4 w-4" aria-hidden />
        {t.customers.edit}
      </Button>
      {canDelete ? (
        <Button variant="ghost" size="sm" className="text-muted hover:bg-danger-soft hover:text-danger" onClick={() => setConfirm(true)}>
          <Trash2 className="h-4 w-4" aria-hidden />
          <span className="sr-only sm:not-sr-only">{t.common.delete}</span>
        </Button>
      ) : null}
      <CustomerDialog customer={customer} open={editOpen} onOpenChange={setEditOpen} />
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={t.customers.deleteConfirmTitle}
        description={format(t.customers.deleteConfirmBody, { name })}
        confirmLabel={t.customers.delete}
        cancelLabel={t.common.cancel}
        destructive
        pending={pending}
        onConfirm={() => void remove()}
      />
    </>
  );
}

/** Notes internes, enregistrées en place : un clic, un texte, une coche. */
export function CustomerNotes({ customerId, initial }: { customerId: string; initial: string }) {
  const t = useT();
  const { toast } = useToast();
  const [value, setValue] = React.useState(initial);
  const [saved, setSaved] = React.useState(initial);
  const [state, setState] = React.useState<'idle' | 'saving' | 'saved'>('idle');
  const dirty = value !== saved;

  async function save() {
    setState('saving');
    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: value.trim() || null }),
      });
      if (!response.ok) throw new Error('save');
      setSaved(value);
      setState('saved');
      setTimeout(() => setState('idle'), 1800);
    } catch {
      setState('idle');
      toast({ title: t.errors.saveFailed, tone: 'error' });
    }
  }

  return (
    <div className="space-y-2.5">
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        rows={4}
        maxLength={4000}
        placeholder={t.customers.notesPlaceholder}
        aria-label={t.customers.notes}
        className="text-[13.5px]"
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] text-subtle">{t.customers.notesHint}</p>
        {dirty || state !== 'idle' ? (
          <Button size="sm" variant={state === 'saved' ? 'secondary' : 'primary'} loading={state === 'saving'} disabled={!dirty && state !== 'saved'} onClick={() => void save()}>
            {state === 'saved' ? (
              <>
                <Check className="h-4 w-4" aria-hidden />
                {t.common.copied.replace(t.common.copied, t.customers.saved)}
              </>
            ) : (
              t.common.save
            )}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
