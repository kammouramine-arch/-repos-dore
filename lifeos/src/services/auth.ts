import { supabase } from '@/lib/supabase';
import { toAppError } from '@/lib/errors';
import { clearAllCaches } from '@/lib/cache';
import { clearOutbox } from '@/lib/outbox';

export async function signUp(email: string, password: string, fullName?: string) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: fullName ? { full_name: fullName.trim() } : undefined },
  });
  if (error) throw toAppError(error);
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw toAppError(error);
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
  await clearAllCaches();
  await clearOutbox();
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
  if (error) throw toAppError(error);
}

/** Deletes the auth user; every table cascades from it. */
export async function deleteAccount() {
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw toAppError(error);
  await signOut();
}

export async function exportData() {
  const { data, error } = await supabase.rpc('export_my_data');
  if (error) throw toAppError(error);
  return data;
}
