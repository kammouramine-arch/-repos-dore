'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Check, KeyRound, Mail, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/field';
import { Alert } from '@/components/ui/feedback';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { Avatar } from '@/components/app/shell';
import { useT } from '@/lib/i18n/context';
import { format } from '@/lib/i18n/format';

async function call<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) } });
  const payload = (await response.json().catch(() => null)) as { data?: T; error?: { message?: string } } | null;
  if (!response.ok) throw new Error(payload?.error?.message ?? 'Action impossible.');
  return payload?.data as T;
}

export function NameForm({ firstName, lastName }: { firstName: string; lastName: string }) {
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [first, setFirst] = React.useState(firstName);
  const [last, setLast] = React.useState(lastName);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const dirty = first.trim() !== firstName || last.trim() !== lastName;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await call('/api/auth/compte', { method: 'PATCH', body: JSON.stringify({ firstName: first.trim(), lastName: last.trim() }) });
      toast({ title: t.settings.nameSaved });
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.errors.saveFailed);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.settings.firstName} htmlFor="firstName">
          <Input id="firstName" value={first} onChange={(event) => setFirst(event.target.value)} autoComplete="given-name" maxLength={80} />
        </Field>
        <Field label={t.settings.lastName} htmlFor="lastName">
          <Input id="lastName" value={last} onChange={(event) => setLast(event.target.value)} autoComplete="family-name" maxLength={80} />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" loading={pending} disabled={!dirty}>
          {t.settings.saveName}
        </Button>
      </div>
    </form>
  );
}

export function EmailForm({ email, verified }: { email: string; verified: boolean }) {
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [next, setNext] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [code, setCode] = React.useState('');
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await call('/api/auth/code-email', { method: 'POST', body: JSON.stringify({ email: next.trim(), password: password || undefined }) });
      setSentTo(next.trim());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.errors.saveFailed);
    } finally {
      setPending(false);
    }
  }

  async function confirm(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await call('/api/auth/code-email', { method: 'PATCH', body: JSON.stringify({ code }) });
      toast({ title: t.settings.emailUpdated });
      setSentTo(null);
      setNext('');
      setPassword('');
      setCode('');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.errors.saveFailed);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-line bg-surface px-4 py-3">
        <p className="flex items-center gap-2 text-[14px] font-medium text-ink">
          <Mail className="h-4 w-4 text-subtle" aria-hidden />
          {email}
        </p>
        <Badge tone={verified ? 'success' : 'warning'}>{verified ? t.settings.emailVerified : t.settings.emailUnverified}</Badge>
      </div>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      {sentTo ? (
        <form onSubmit={confirm} className="space-y-3">
          <Alert tone="info">{format(t.settings.codeSent, { email: sentTo })}</Alert>
          <Field label={t.settings.code} htmlFor="email-code">
            <Input id="email-code" value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={8} className="max-w-[200px] tabular" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setSentTo(null)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" loading={pending} disabled={code.replace(/\D/g, '').length < 6}>
              {t.settings.confirmCode}
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={requestCode} className="space-y-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.settings.newEmail} htmlFor="new-email">
              <Input id="new-email" type="email" value={next} onChange={(event) => setNext(event.target.value)} autoComplete="email" placeholder="vous@entreprise.fr" />
            </Field>
            <Field label={t.settings.currentPassword} htmlFor="email-password" hint={t.settings.passwordHint}>
              <Input id="email-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="secondary" loading={pending} disabled={!next.trim() || next.trim().toLowerCase() === email}>
              {t.settings.sendCode}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export function PasswordCard({ email }: { email: string }) {
  const t = useT();
  const { toast } = useToast();
  const [pending, setPending] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  async function request() {
    setPending(true);
    try {
      await call('/api/auth/mot-de-passe', { method: 'POST', body: JSON.stringify({ email }) });
      setSent(true);
      toast({ title: t.settings.resetPassword, description: email });
    } catch (cause) {
      toast({ title: cause instanceof Error ? cause.message : t.errors.saveFailed, tone: 'error' });
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-subtle" aria-hidden />
          {t.settings.password}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <p className="max-w-lg text-[13.5px] leading-relaxed text-muted">{t.settings.passwordBody}</p>
        <Button variant="secondary" loading={pending} disabled={sent} onClick={() => void request()}>
          {sent ? <Check className="h-4 w-4" aria-hidden /> : null}
          {t.settings.resetPassword}
        </Button>
      </CardContent>
    </Card>
  );
}

/** Photo de profil : recadrée en carré et encodée en JPEG dans le navigateur, comme sur iPhone. */
export function AvatarForm({ initial, name }: { initial: string | null; name: string }) {
  const t = useT();
  const { toast } = useToast();
  const [image, setImage] = React.useState<string | null>(initial);
  const [pending, setPending] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function pick(file: File) {
    setPending(true);
    try {
      const bitmap = await createImageBitmap(file);
      const size = Math.min(bitmap.width, bitmap.height);
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('canvas');
      context.drawImage(bitmap, (bitmap.width - size) / 2, (bitmap.height - size) / 2, size, size, 0, 0, 512, 512);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
      const encoded = dataUrl.split(',')[1] ?? '';
      const result = await call<{ image: string | null }>('/api/auth/avatar', { method: 'POST', body: JSON.stringify({ image: encoded }) });
      setImage(result.image);
      toast({ title: t.settings.photoSaved });
    } catch (cause) {
      toast({ title: cause instanceof Error ? cause.message : t.errors.saveFailed, tone: 'error' });
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function remove() {
    setPending(true);
    try {
      await call('/api/auth/avatar', { method: 'DELETE' });
      setImage(null);
    } catch (cause) {
      toast({ title: cause instanceof Error ? cause.message : t.errors.saveFailed, tone: 'error' });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar name={name} url={image} size="lg" />
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-[12.5px] leading-relaxed text-muted">{t.settings.photoHint}</p>
        <div className="flex flex-wrap gap-2">
          <input ref={inputRef} type="file" accept="image/*" className="sr-only" id="avatar-file" onChange={(event) => { const file = event.target.files?.[0]; if (file) void pick(file); }} />
          <Button asChild variant="secondary" size="sm" disabled={pending}>
            <label htmlFor="avatar-file" className="cursor-pointer">
              <Upload className="h-4 w-4" aria-hidden />
              {t.settings.choosePhoto}
            </label>
          </Button>
          {image ? (
            <Button variant="ghost" size="sm" loading={pending} onClick={() => void remove()}>
              <Trash2 className="h-4 w-4" aria-hidden />
              {t.settings.removePhoto}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
