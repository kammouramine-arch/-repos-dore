'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { signInSchema, signUpSchema, passwordSchema, emailSchema } from '@/server/validation';
import {
  requestPasswordReset,
  resetPassword,
  signIn as signInService,
  signUp as signUpService,
} from '@/server/services/authService';
import { createSession, destroySession, clientIpFrom } from '@/lib/auth/session';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { toUserMessage } from '@/lib/errors';
import { z } from 'zod';

export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: string;
}

function zodErrors(error: z.ZodError): FormState {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'global';
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
  }
  return { error: 'Vérifiez les informations saisies.', fieldErrors };
}

async function requestIp(): Promise<string> {
  return clientIpFrom(await headers()) ?? 'anonyme';
}

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    firstName: formData.get('firstName') || undefined,
    lastName: formData.get('lastName') || undefined,
    companyName: formData.get('companyName'),
    phone: formData.get('phone') || undefined,
  });
  if (!parsed.success) return zodErrors(parsed.error);

  const ip = await requestIp();
  try {
    await enforceRateLimit({ key: `signup:${ip}`, ...RATE_LIMITS.signup });
    const { user } = await signUpService({ ...parsed.data, ip });
    await createSession(user.id);
  } catch (error) {
    return { error: toUserMessage(error) };
  }

  redirect('/app/bienvenue');
}

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) return zodErrors(parsed.error);

  const ip = await requestIp();
  try {
    await enforceRateLimit({ key: `login:${ip}:${parsed.data.email}`, ...RATE_LIMITS.login });
    const { user } = await signInService({ ...parsed.data, ip });
    await createSession(user.id);
  } catch (error) {
    return { error: toUserMessage(error) };
  }

  const next = String(formData.get('next') || '/app');
  redirect(next.startsWith('/app') ? next : '/app');
}

export async function signOutAction(): Promise<void> {
  await destroySession();
  redirect('/connexion');
}

export async function requestResetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = emailSchema.safeParse(formData.get('email'));
  if (!parsed.success) return { error: 'Adresse email invalide.' };

  const ip = await requestIp();
  try {
    await enforceRateLimit({ key: `reset:${ip}`, ...RATE_LIMITS.passwordReset });
    await requestPasswordReset(parsed.data);
  } catch (error) {
    return { error: toUserMessage(error) };
  }

  // Réponse volontairement identique, que le compte existe ou non.
  return {
    success:
      'Si un compte existe avec cette adresse, un lien de réinitialisation vient d’être envoyé.',
  };
}

export async function resetPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({ token: z.string().min(10), password: passwordSchema })
    .safeParse({ token: formData.get('token'), password: formData.get('password') });
  if (!parsed.success) return zodErrors(parsed.error);

  try {
    await resetPassword(parsed.data.token, parsed.data.password, await requestIp());
  } catch (error) {
    return { error: toUserMessage(error) };
  }

  redirect('/connexion?reinitialise=1');
}
