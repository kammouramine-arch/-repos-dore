'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, Input, Textarea } from '@/components/ui/field';
import { Alert } from '@/components/ui/feedback';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/lib/i18n/context';

export interface CustomerFormValue {
  id?: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  postalCode: string | null;
  city: string | null;
  notes: string | null;
}

/**
 * Création et modification d'un client dans une modale : un nom ou une
 * raison sociale suffit. En modification, la même API PATCH que l'iPhone.
 */
export function CustomerDialog({
  trigger,
  customer,
  open: controlledOpen,
  onOpenChange,
  onSaved,
}: {
  trigger?: React.ReactNode;
  customer?: CustomerFormValue;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSaved?: (customer: { id: string }) => void;
}) {
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const editing = Boolean(customer?.id);

  async function submit(formData: FormData) {
    setPending(true);
    setError(null);
    const value = (key: string) => String(formData.get(key) ?? '').trim() || null;
    try {
      const response = await fetch(editing ? `/api/customers/${customer!.id}` : '/api/customers', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: value('firstName'),
          lastName: value('lastName'),
          companyName: value('companyName'),
          email: value('email'),
          phone: value('phone'),
          addressLine1: value('addressLine1'),
          postalCode: value('postalCode'),
          city: value('city'),
          notes: value('notes'),
        }),
      });

      const payload = (await response.json()) as { data: { id: string } } | { error: { message: string } };
      if (!response.ok || 'error' in payload) {
        setError('error' in payload ? payload.error.message : t.errors.saveFailed);
        return;
      }

      setOpen(false);
      toast({ title: editing ? t.customers.saved : t.customers.created });
      onSaved?.(payload.data);
      router.refresh();
    } catch {
      setError(t.errors.saveFailed);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {controlledOpen == null ? (
        <span onClick={() => setOpen(true)}>
          {trigger ?? (
            <Button>
              <Plus className="h-4 w-4" aria-hidden />
              {t.customers.new}
            </Button>
          )}
        </span>
      ) : null}

      <DialogContent>
        <form action={submit}>
          <DialogHeader>
            <DialogTitle>{editing ? t.customers.editTitle : t.customers.new}</DialogTitle>
            <DialogDescription>{t.customers.nameOrCompany}</DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            {error ? <Alert tone="danger">{error}</Alert> : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.customers.firstName} htmlFor="firstName">
                <Input id="firstName" name="firstName" autoComplete="given-name" defaultValue={customer?.firstName ?? ''} />
              </Field>
              <Field label={t.customers.lastName} htmlFor="lastName">
                <Input id="lastName" name="lastName" autoComplete="family-name" defaultValue={customer?.lastName ?? ''} />
              </Field>
            </div>

            <Field label={t.customers.company} htmlFor="companyName" hint={t.common.optional}>
              <Input id="companyName" name="companyName" autoComplete="organization" defaultValue={customer?.companyName ?? ''} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.customers.email} htmlFor="email" hint={t.customers.emailHint}>
                <Input id="email" name="email" type="email" autoComplete="email" defaultValue={customer?.email ?? ''} />
              </Field>
              <Field label={t.customers.phone} htmlFor="phone">
                <Input id="phone" name="phone" type="tel" autoComplete="tel" defaultValue={customer?.phone ?? ''} />
              </Field>
            </div>

            <Field label={t.customers.address} htmlFor="addressLine1">
              <Input id="addressLine1" name="addressLine1" autoComplete="address-line1" defaultValue={customer?.addressLine1 ?? ''} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
              <Field label={t.customers.postalCode} htmlFor="postalCode">
                <Input id="postalCode" name="postalCode" autoComplete="postal-code" defaultValue={customer?.postalCode ?? ''} />
              </Field>
              <Field label={t.customers.cityLabel} htmlFor="city">
                <Input id="city" name="city" autoComplete="address-level2" defaultValue={customer?.city ?? ''} />
              </Field>
            </div>

            <Field label={t.customers.notes} htmlFor="notes" hint={t.customers.internal}>
              <Textarea id="notes" name="notes" rows={2} maxLength={4000} defaultValue={customer?.notes ?? ''} />
            </Field>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" loading={pending}>
              {editing ? t.customers.save : t.customers.createCta}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
