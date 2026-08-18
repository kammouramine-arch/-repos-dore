'use client';

import { useActionState } from 'react';
import { AlertCircle } from 'lucide-react';
import { resetPasswordAction, type FormState } from '../../actions';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';

const initialState: FormState = {};

export function NewPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, initialState);

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />

      {state.error ? (
        <div
          className="flex gap-2.5 rounded-[10px] border border-danger/25 bg-danger-soft px-4 py-3 text-[13.5px] text-danger"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{state.error}</span>
        </div>
      ) : null}

      <Field
        label="Nouveau mot de passe"
        htmlFor="password"
        hint="10 caractères minimum"
        error={state.fieldErrors?.password?.[0]}
      >
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          placeholder="••••••••••"
        />
      </Field>

      <Button type="submit" size="lg" className="w-full" loading={pending}>
        Enregistrer le mot de passe
      </Button>
    </form>
  );
}
