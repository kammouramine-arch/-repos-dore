'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';

export function VerificationForm({ email }: { email: string }) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [remaining, setRemaining] = useState(0);
  const deadline = useRef(0);
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    const timer = setInterval(() => setRemaining(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000))), 1000);
    return () => { clearInterval(timer); request.current?.abort(); };
  }, []);

  async function submit(resend: boolean) {
    if (request.current) return;
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
      if (!response.ok) {
        setMessage(response.status === 429 ? 'Veuillez patienter avant de réessayer.' : response.status >= 500 || !payload?.error ? 'Le service est momentanément indisponible. Réessayez.' : payload.error.message);
        return;
      }
      if (resend) {
        deadline.current = Date.now() + 60_000; setRemaining(60);
        setMessage('Un nouveau code a été envoyé. Utilisez uniquement le plus récent.');
      } else if (payload?.data?.session?.nextStep === 'app' || payload?.data?.session?.nextStep === 'subscription') {
        router.replace(payload.data.session.nextStep === 'app' ? '/app' : '/app/parametres/abonnement');
        router.refresh();
      } else {
        setMessage('La confirmation doit être vérifiée. Réessayez ou reconnectez-vous.');
      }
    } catch {
      setMessage('La connexion n’a pas abouti. Votre code reste dans le formulaire. Réessayez.');
    } finally {
      clearTimeout(timer); request.current = null; setBusy(false);
    }
  }

  return <form className="mt-6 space-y-4 text-left" onSubmit={(event) => { event.preventDefault(); void submit(false); }}>
    <Field label="Code de confirmation" htmlFor="verification-code">
      <Input id="verification-code" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} />
    </Field>
    {message ? <p role="status" className="text-sm text-muted">{message}</p> : null}
    <Button type="submit" className="w-full" loading={busy} disabled={busy || code.length !== 6}>Confirmer mon email</Button>
    <Button type="button" variant="secondary" className="w-full" disabled={busy || remaining > 0} onClick={() => void submit(true)}>{remaining > 0 ? `Renvoyer dans ${remaining} s` : 'Renvoyer le code'}</Button>
  </form>;
}
