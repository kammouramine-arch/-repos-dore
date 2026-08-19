import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Builds a Supabase client that acts *as the calling user*: the caller's JWT is
 * forwarded, so every query is still filtered by row level security. The service
 * role key is never used for user data — only for the server-owned counters below.
 */
export function userClient(req: Request): SupabaseClient | null {
  const authorization = req.headers.get('Authorization');
  if (!authorization) return null;

  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

/** Service-role client, used only for tables the user may not write (ai_usage). */
export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function requireUser(req: Request) {
  const client = userClient(req);
  if (!client) return { client: null, user: null, error: 'Missing Authorization header' };

  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return { client: null, user: null, error: 'Invalid or expired session' };

  return { client, user: data.user, error: null };
}
