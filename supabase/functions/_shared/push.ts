import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function pushToUser(
  supabase: SupabaseClient,
  userId: string,
  title: string,
  body: string,
  data: Record<string, unknown> = {}
) {
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("enabled")
    .eq("user_id", userId)
    .maybeSingle();

  if (!prefs?.enabled) return;

  const { data: tokenRows } = await supabase
    .from("device_tokens")
    .select("token")
    .eq("user_id", userId);

  const messages = (tokenRows ?? []).map(row => ({
    to: row.token,
    sound: "default",
    title,
    body,
    data
  }));

  if (!messages.length) return;

  const headers: Record<string,string> = {
    "Accept": "application/json",
    "Content-Type": "application/json"
  };

  const expoAccessToken = Deno.env.get("EXPO_ACCESS_TOKEN");
  if (expoAccessToken) headers["Authorization"] = "Bearer " + expoAccessToken;

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers,
    body: JSON.stringify(messages)
  });

  if (!response.ok) {
    console.error("Expo push failed", response.status, await response.text());
  }
}
