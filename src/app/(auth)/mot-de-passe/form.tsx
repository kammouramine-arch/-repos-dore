'use client';

import { useActionState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { requestResetAction, type FormState } from '../actions';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';

const initialState: FormState = {};

export function ResetRequestForm() {
  const [state, action, pending] = useActionState(requestResetAction, initialState);

  if (state.success) {
    return (
      <div className="flex gap-2.5 rounded-[10px] border border-success/25 bg-success-soft px-4 py-3.5 text-[13.5px] text-success">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>{state.success}</span>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error ? (
        <div
          className="flex gap-2.5 rounded-[10px] border border-danger/25 bg-danger-soft px-4 py-3 text-[13.5px] text-danger"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{state.error}</span>
        </div>
      ) : null}

      <Field label="Adresse email" htmlFor="email">
        <Input id="email" name="email" type="email" required autoComplete="email" placeholder="vous@entreprise.fr" />
      </Field>

      <Button type="submit" size="lg" className="w-full" loading={pending}>
        Recevoir le lien
      </Button>
    </form>
  );
}
