'use client';

import { useActionState } from 'react';
import { AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { acceptInvitationAction, type InvitationFormState } from './actions';

export function AcceptInvitationForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<InvitationFormState, FormData>(acceptInvitationAction, {});
  return <form action={action} className="space-y-4">{state.error ? <div className="flex gap-2 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-[13px] text-danger"><AlertCircle className="h-4 w-4" aria-hidden />{state.error}</div> : null}<input type="hidden" name="token" value={token} /><Button type="submit" size="lg" className="w-full" loading={pending}><Check className="h-4 w-4" aria-hidden />Accepter l’invitation</Button></form>;
}
