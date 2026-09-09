'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { retrySeconds } from '@/lib/retry-seconds';

export function VerificationForm({ email, initialRetryAfterSeconds = 0 }: { email: string; initialRetryAfterSeconds?: number }) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [remaining, setRemaining] = useState(initialRetryAfterSeconds);
  const deadline = useRef(0);
  const mounted = useRef(true);
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    mounted.current = true;
    deadline.current = Date.now() + initialRetryAfterSeconds * 1000;
    const timer = setInterval(() => setRemaining(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000))), 1000);
    return () => { mounted.current = false; clearInterval(timer); request.current?.abort(); };
  }, [initialRetryAfterSeconds]);

  async function submit(resend: boolean) {
    if (request.current || (resend && Date.now() < deadline.current)) return;
    const controller = new AbortController();
    request.current = controller;
    const timer = setTimeout(() => controller.abort(), 20_000);
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/auth/code-email', {
        method: resend ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resend ? { email } : { code }),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => null);
      if (!mounted.current) return;
      const retry = retrySeconds(payload?.error?.retryAfterSeconds ?? payload?.data?.retryAfterSeconds, response.headers.get('Retry-After'));
      if (retry > 0) {
        deadline.current = Date.now() + retry * 1000;
        setRemaining(retry);
      }
      if (!response.ok) {
        setMessage(response.status === 429 ? (retry > 0 ? '' : 'Veuillez patienter avant de réessayer.') : response.status >= 500 || !payload?.error ? 'Le service est momentanément indisponible. Réessayez.' : payload.error.message);
        return;
      }
      if (resend) {
        setMessage('Un nouveau code a été envoyé. Utilisez uniquement le plus récent.');
      } else if (payload?.data?.session?.nextStep === 'app' || payload?.data?.session?.nextStep === 'subscription') {
        router.replace(payload.data.session.nextStep === 'app' ? '/app' : '/app/parametres/abonnement');
        router.refresh();
      } else {
        setMessage('La confirmation doit être vérifiée. Réessayez ou reconnectez-vous.');
      }
    } catch {
      if (mounted.current) setMessage('La connexion n’a pas abouti. Votre code reste dans le formulaire. Réessayez.');
    } finally {
      clearTimeout(timer); request.current = null; if (mounted.current) setBusy(false);
    }
  }

  return <form className="mt-6 space-y-4 text-left" onSubmit={(event) => { event.preventDefault(); void submit(false); }}>
    <Field label="Code de confirmation" htmlFor="verification-code">
      <Input id="verification-code" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} />
    </Field>
    {message ? <p role="status" className="text-sm text-muted">{message}</p> : null}
    {remaining > 0 ? <p className="text-sm text-muted">Vous pourrez demander un nouveau code dans {remaining} s.</p> : null}
    <Button type="submit" className="w-full" loading={busy} disabled={busy || code.length !== 6}>Confirmer mon email</Button>
    <Button type="button" variant="secondary" className="w-full" disabled={busy || remaining > 0} onClick={() => void submit(true)}>{remaining > 0 ? `Renvoyer dans ${remaining} s` : 'Renvoyer le code'}</Button>
  </form>;
}
