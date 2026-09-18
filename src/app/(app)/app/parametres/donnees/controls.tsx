'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Building2, Download, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, Input } from '@/components/ui/field';
import { Alert } from '@/components/ui/feedback';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/lib/i18n/context';

async function download(path: string, filename: string) {
  const response = await fetch(path);
  const payload = (await response.json().catch(() => null)) as { data?: unknown; error?: { message?: string } } | null;
  if (!response.ok) throw new Error(payload?.error?.message ?? 'Export impossible.');
  const blob = new Blob([JSON.stringify(payload?.data ?? payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function DataControls({ canExportBusiness }: { canExportBusiness: boolean }) {
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);
  const [password, setPassword] = React.useState('');
  const [confirmation, setConfirmation] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  async function run(key: string, task: () => Promise<void>) {
    setPending(key);
    try {
      await task();
    } catch (cause) {
      toast({ title: cause instanceof Error ? cause.message : t.errors.saveFailed, tone: 'error' });
    } finally {
      setPending(null);
    }
  }

  async function remove(event: React.FormEvent) {
    event.preventDefault();
    setPending('delete');
    setError(null);
    try {
      const response = await fetch('/api/auth/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, confirmation }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!response.ok) {
        setError(payload?.error?.message ?? t.errors.saveFailed);
        return;
      }
      toast({ title: t.settings.accountDeleted });
      router.push('/connexion');
      router.refresh();
    } catch {
      setError(t.errors.saveFailed);
    } finally {
      setPending(null);
    }
  }

  const stamp = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>{t.settings.exportsTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-line px-4 py-3">
            <div className="flex items-start gap-3">
              <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-subtle" aria-hidden />
              <div>
                <p className="text-[14px] font-medium text-ink">{t.settings.exportPersonal}</p>
                <p className="text-[12.5px] text-muted">{t.settings.exportPersonalHint}</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" loading={pending === 'personal'} onClick={() => void run('personal', () => download('/api/auth/export', `devisera-compte-${stamp}.json`))}>
              <Download className="h-4 w-4" aria-hidden />
              {t.common.export}
            </Button>
          </div>
          {canExportBusiness ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-line px-4 py-3">
              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-subtle" aria-hidden />
                <div>
                  <p className="text-[14px] font-medium text-ink">{t.settings.exportBusiness}</p>
                  <p className="text-[12.5px] text-muted">{t.settings.exportBusinessHint}</p>
                </div>
              </div>
              <Button variant="secondary" size="sm" loading={pending === 'business'} onClick={() => void run('business', () => download('/api/organization/export', `devisera-entreprise-${stamp}.json`))}>
                <Download className="h-4 w-4" aria-hidden />
                {t.common.export}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-subtle" aria-hidden />
            {t.settings.password}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <p className="text-[13.5px] leading-relaxed text-muted">{t.settings.passwordBody}</p>
        </CardContent>
      </Card>

      <Card className="border-danger/20">
        <CardHeader>
          <CardTitle className="text-danger">{t.settings.dangerTitle}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <p className="max-w-lg text-[13.5px] leading-relaxed text-muted">{t.settings.deleteAccountBody}</p>
          <Button variant="danger" onClick={() => setOpen(true)}>
            <Trash2 className="h-4 w-4" aria-hidden />
            {t.settings.deleteAccount}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(next) => { if (pending !== 'delete') setOpen(next); }}>
        <DialogContent size="sm">
          <form onSubmit={remove}>
            <DialogHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-[12px] bg-danger-soft">
                <AlertTriangle className="h-5 w-5 text-danger" aria-hidden />
              </div>
              <DialogTitle>{t.settings.deleteConfirmTitle}</DialogTitle>
              <DialogDescription>{t.settings.deleteConfirmBody}</DialogDescription>
            </DialogHeader>
            <DialogBody className="space-y-4">
              {error ? <Alert tone="danger">{error}</Alert> : null}
              <Field label={t.settings.currentPassword} htmlFor="delete-password">
                <Input id="delete-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              </Field>
              <Field label={t.settings.typeToConfirm} htmlFor="delete-confirm">
                <Input id="delete-confirm" value={confirmation} onChange={(event) => setConfirmation(event.target.value.toUpperCase())} autoComplete="off" placeholder="SUPPRIMER" />
              </Field>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button type="submit" variant="danger" loading={pending === 'delete'} disabled={confirmation !== 'SUPPRIMER' || !password}>
                {t.settings.deleteAccount}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
