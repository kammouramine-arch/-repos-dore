'use client';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { confirmLegacyEmail } from './legacy-action';

export function LegacyVerificationForm({ token }: { token: string }) {
  const [error, action, pending] = useActionState(confirmLegacyEmail, '');
  return <form action={action} className="mt-7">
    <input type="hidden" name="token" value={token} />
    {error ? <p role="alert">{error}</p> : null}
    <Button type="submit" loading={pending}>Confirmer mon email</Button>
  </form>;
}
