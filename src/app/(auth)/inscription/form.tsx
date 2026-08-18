'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { signUpAction, type FormState } from '../actions';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';

const initialState: FormState = {};

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUpAction, initialState);

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

      <Field
        label="Nom de votre entreprise"
        htmlFor="companyName"
        error={state.fieldErrors?.companyName?.[0]}
      >
        <Input
          id="companyName"
          name="companyName"
          required
          autoComplete="organization"
          placeholder="Plomberie Martin"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prénom" htmlFor="firstName" error={state.fieldErrors?.firstName?.[0]}>
          <Input id="firstName" name="firstName" autoComplete="given-name" placeholder="Karim" />
        </Field>
        <Field label="Nom" htmlFor="lastName" error={state.fieldErrors?.lastName?.[0]}>
          <Input id="lastName" name="lastName" autoComplete="family-name" placeholder="Benali" />
        </Field>
      </div>

      <Field label="Adresse email" htmlFor="email" error={state.fieldErrors?.email?.[0]}>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="vous@entreprise.fr"
        />
      </Field>

      <Field
        label="Mot de passe"
        htmlFor="password"
        hint="10 caractères minimum"
        error={state.fieldErrors?.password?.[0]}
      >
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          minLength={10}
          placeholder="••••••••••"
        />
      </Field>

      <Button type="submit" size="lg" className="w-full" loading={pending}>
        Créer mon compte
      </Button>

      <p className="text-center text-[12.5px] leading-relaxed text-subtle">
        En créant un compte, vous acceptez les{' '}
        <Link href="/conditions" className="underline hover:text-muted">
          conditions d’utilisation
        </Link>{' '}
        et la{' '}
        <Link href="/confidentialite" className="underline hover:text-muted">
          politique de confidentialité
        </Link>
        .
      </p>
    </form>
  );
}
