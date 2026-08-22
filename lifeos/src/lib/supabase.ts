import 'react-native-url-polyfill/auto';
import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { env, isSupabaseConfigured } from '@/config/env';
import { brand } from '@/config/brand';
import type { Database } from '@/types/database';
import { secureStorage } from './secureStorage';

/**
 * The single Supabase client. Auth tokens live in the keychain, and every query is
 * subject to row level security — the anon key grants no data access by itself.
 */
export const supabase = createClient<Database>(
  env.supabaseUrl || 'http://localhost:54321',
  env.supabaseAnonKey || 'public-anon-key-not-configured',
  {
    auth: {
      storage: secureStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: { headers: { 'x-client-info': `${brand.slug}-mobile` } },
  },
);

// Refresh tokens only while the app is in the foreground.
AppState.addEventListener('change', (state) => {
  if (!isSupabaseConfigured) return;
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

export { isSupabaseConfigured };
