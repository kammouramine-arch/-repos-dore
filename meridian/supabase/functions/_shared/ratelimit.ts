import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Abuse protection in front of the usage meter: it stops a client hammering an
 * endpoint even when it still has allowance. Counted server-side in Postgres, so it
 * survives across isolates and cannot be reset from a device.
 */
export async function checkRateLimit(
  admin: SupabaseClient,
  userId: string,
  action: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; retryAfter: number }> {
  const { data, error } = await admin.rpc('check_rate_limit', {
    p_user: userId,
    p_action: action,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  // A failure in the limiter must not take the endpoint down; the usage meter is
  // still enforcing the real limits behind it.
  if (error) return { allowed: true, retryAfter: 0 };

  const row = Array.isArray(data) ? data[0] : data;
  return {
    allowed: row?.allowed !== false,
    retryAfter: Number(row?.retry_after_seconds ?? 0),
  };
}
