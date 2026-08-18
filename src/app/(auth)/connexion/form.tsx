'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { signInAction, type FormState } from '../actions';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';

const initialState: FormState = {};

export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signInAction, initialState);

  return (
    <form action={action} className="space-y-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {state.error ? (
        <div
          className="flex gap-2.5 rounded-[10px] border border-danger/25 bg-danger-soft px-4 py-3 text-[13.5px] text-danger"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{state.error}</span>
        </div>
      ) : null}

      <Field label="Adresse email" htmlFor="email" error={state.fieldErrors?.email?.[0]}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="vous@entreprise.fr"
          aria-invalid={Boolean(state.fieldErrors?.email)}
        />
      </Field>

      <Field label="Mot de passe" htmlFor="password" error={state.fieldErrors?.password?.[0]}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••••"
          aria-invalid={Boolean(state.fieldErrors?.password)}
        />
      </Field>

      <div className="flex justify-end">
        <Link href="/mot-de-passe" className="text-[13px] text-muted hover:text-accent">
          Mot de passe oublié ?
        </Link>
      </div>

      <Button type="submit" size="lg" className="w-full" loading={pending}>
        Se connecter
      </Button>
    </form>
  );
}
