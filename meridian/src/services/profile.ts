import { supabase } from '@/lib/supabase';
import { toAppError } from '@/lib/errors';
import type { Profile, Subscription, UserPreferences } from '@/types/database';

export async function fetchProfile(): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').maybeSingle();
  if (error) throw toAppError(error);
  return data;
}

export async function updateProfile(patch: Partial<Profile>): Promise<Profile> {
  const { data: session } = await supabase.auth.getUser();
  const id = session.user?.id;
  if (!id) throw toAppError(new Error('not authenticated'));
  const { data, error } = await supabase.from('profiles').update(patch).eq('id', id).select('*').single();
  if (error) throw toAppError(error);
  return data;
}

export async function fetchPreferences(): Promise<UserPreferences | null> {
  const { data, error } = await supabase.from('user_preferences').select('*').maybeSingle();
  if (error) throw toAppError(error);
  return data;
}

export async function updatePreferences(patch: Partial<UserPreferences>): Promise<UserPreferences> {
  const { data: session } = await supabase.auth.getUser();
  const id = session.user?.id;
  if (!id) throw toAppError(new Error('not authenticated'));
  const { data, error } = await supabase
    .from('user_preferences')
    .update(patch)
    .eq('user_id', id)
    .select('*')
    .single();
  if (error) throw toAppError(error);
  return data;
}

export async function fetchSubscription(): Promise<Subscription | null> {
  const { data, error } = await supabase.from('subscriptions').select('*').maybeSingle();
  if (error) throw toAppError(error);
  return data;
}

export async function fetchAiUsage(date: string): Promise<number> {
  const { data, error } = await supabase
    .from('ai_usage')
    .select('message_count')
    .eq('date', date)
    .maybeSingle();
  if (error) return 0;
  return data?.message_count ?? 0;
}
