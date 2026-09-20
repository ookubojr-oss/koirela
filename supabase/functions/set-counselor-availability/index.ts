import { corsHeaders } from "../_shared/cors.ts";
import { authenticatedUser, serviceClient } from "../_shared/clients.ts";
import { pushToUser } from "../_shared/push.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const user = await authenticatedUser(req);
    const payload = await req.json();
    const isAccepting = Boolean(payload.isAccepting);
    const supabase = serviceClient();

    const { data: counselor, error } = await supabase
      .from("counselor_profiles")
      .select("display_name,verification_status,is_suspended")
      .eq("user_id", user.id)
      .single();

    if (error || !counselor) {
      return Response.json({ error: "Counselor profile not found" }, { status: 404, headers: corsHeaders });
    }

    if (isAccepting && (counselor.verification_status !== "approved" || counselor.is_suspended)) {
      return Response.json({ error: "Counselor cannot accept consultations" }, { status: 409, headers: corsHeaders });
    }

    if (isAccepting) {
      const { data: active } = await supabase
        .from("consultations")
        .select("id")
        .eq("counselor_id", user.id)
        .in("status", ["waiting","active"])
        .limit(1);

      if (active?.length) {
        return Response.json({ error: "Consultation already in progress" }, { status: 409, headers: corsHeaders });
      }
    }

    const { data, error: upsertError } = await supabase
      .from("counselor_availability")
      .upsert(
        { counselor_id: user.id, is_accepting: isAccepting, updated_at: new Date().toISOString() },
        { onConflict: "counselor_id" }
      )
      .select("counselor_id,is_accepting,updated_at")
      .single();

    if (upsertError) throw upsertError;

    if (isAccepting) {
      const { data: followers } = await supabase
        .from("favorites")
        .select("user_id")
        .eq("counselor_id", user.id);

      for (const follower of followers ?? []) {
        const { data: prefs } = await supabase
          .from("notification_preferences")
          .select("enabled,counselor_online")
          .eq("user_id", follower.user_id)
          .maybeSingle();

        if (prefs?.enabled && prefs?.counselor_online) {
          void pushToUser(
            supabase,
            follower.user_id,
            "お気に入りの相談員が受付を開始しました",
            (counselor.display_name || "相談員") + "さんが相談受付を開始しました。",
            { type: "favorite_counselor_online", counselorId: user.id }
          );
        }
      }
    }

    return Response.json(data, { headers: corsHeaders });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400, headers: corsHeaders }
    );
  }
});
