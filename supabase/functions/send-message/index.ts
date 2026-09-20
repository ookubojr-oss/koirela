import { corsHeaders } from "../_shared/cors.ts";
import { authenticatedUser, serviceClient } from "../_shared/clients.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { pushToUser } from "../_shared/push.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const user = await authenticatedUser(req);
    const payload = await req.json();
    const consultationId = payload.consultationId;
    const body = payload.body;
    const context = Array.isArray(payload.context) ? payload.context : [];

    if (!consultationId || typeof body !== "string" || !body.trim()) {
      return Response.json({ error: "Invalid message" }, { status: error instanceof Error && error.message === "RATE_LIMITED" ? 429 : 400, headers: corsHeaders });
    }

    const supabase = serviceClient();
    await enforceRateLimit(supabase,"message-send",user.id,45,60);
    const { data: consultation, error } = await supabase
      .from("consultations")
      .select("id,user_id,counselor_id,status,ends_at")
      .eq("id", consultationId)
      .single();

    if (error || !consultation) throw new Error("Consultation not found");

    if (consultation.user_id !== user.id && consultation.counselor_id !== user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });
    }

    if (consultation.status !== "active" || !consultation.ends_at || new Date(consultation.ends_at).getTime() <= Date.now()) {
      return Response.json({ error: "Consultation ended" }, { status: 409, headers: corsHeaders });
    }

    if (consultation.counselor_id === user.id) {
      const moderateUrl = String(Deno.env.get("SUPABASE_URL")) + "/functions/v1/moderate-message";
      const auth = req.headers.get("Authorization") ?? "";
      const moderationResponse = await fetch(moderateUrl, {
        method: "POST",
        headers: {
          "Authorization": auth,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ consultationId, body, context })
      });

      const moderation = await moderationResponse.json();
      if (!moderation.allowed) {
        return Response.json({
          error: "OFF_PLATFORM_BLOCKED",
          category: moderation.category,
          strikeCount: moderation.strikeCount,
          suspended: moderation.suspended
        }, { status: 422, headers: corsHeaders });
      }
    }

    const { data: message, error: insertError } = await supabase
      .from("messages")
      .insert({
        consultation_id: consultationId,
        sender_id: user.id,
        body: body.trim(),
        kind: "text"
      })
      .select("id,consultation_id,sender_id,body,kind,created_at")
      .single();

    if (insertError) throw insertError;

    const recipientId = consultation.user_id === user.id ? consultation.counselor_id : consultation.user_id;
    void pushToUser(
      supabase,
      recipientId,
      "KoiRela",
      body.trim().slice(0, 90),
      { type: "message", consultationId }
    );

    return Response.json({ message }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400, headers: corsHeaders });
  }
});
