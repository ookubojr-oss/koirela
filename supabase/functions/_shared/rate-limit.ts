import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function enforceRateLimit(
  supabase: SupabaseClient,
  scope: string,
  key: string,
  limit: number,
  windowSeconds: number
) {
  const { data, error } = await supabase.rpc("consume_rate_limit", {
    p_scope: scope,
    p_bucket_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.allowed) {
    const err = new Error("RATE_LIMITED");
    Object.assign(err, { retryAfterSeconds: row?.retry_after_seconds ?? windowSeconds });
    throw err;
  }

  return {
    remaining: Number(row?.remaining ?? 0),
    retryAfterSeconds: Number(row?.retry_after_seconds ?? 0)
  };
}
