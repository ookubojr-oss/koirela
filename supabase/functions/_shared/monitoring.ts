import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function logError(
  supabase: SupabaseClient,
  input: {
    userId?: string | null;
    source: "mobile" | "web" | "edge" | "payment" | "push";
    severity?: "info" | "warning" | "error" | "fatal";
    name?: string | null;
    message: string;
    stack?: string | null;
    context?: Record<string, unknown>;
    appVersion?: string | null;
  }
) {
  try {
    await supabase.from("error_events").insert({
      user_id: input.userId ?? null,
      source: input.source,
      severity: input.severity ?? "error",
      name: input.name ?? null,
      message: input.message.slice(0, 2000),
      stack: input.stack?.slice(0, 8000) ?? null,
      context: input.context ?? {},
      app_version: input.appVersion ?? null
    });
  } catch {
    // Monitoring must never break the primary request.
  }
}
