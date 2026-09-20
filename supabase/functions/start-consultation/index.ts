import { corsHeaders } from "../_shared/cors.ts";
import { authenticatedUser, serviceClient } from "../_shared/clients.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const user = await authenticatedUser(req);
    const payload = await req.json();
    const consultationId = payload.consultationId;
    const supabase = serviceClient();

    const { data: consultation, error } = await supabase
      .from("consultations")
      .select("id,user_id,counselor_id,status,duration_seconds")
      .eq("id", consultationId)
      .single();

    if (error || !consultation) throw new Error("Consultation not found");
    if (consultation.counselor_id !== user.id) {
      return Response.json({ error: "Only the counselor can accept" }, { status: 403, headers: corsHeaders });
    }
    if (consultation.status !== "waiting") {
      return Response.json({ error: "Consultation is not ready" }, { status: 409, headers: corsHeaders });
    }

    const { data: counselor } = await supabase
      .from("counselor_profiles")
      .select("is_suspended,verification_status")
      .eq("user_id", user.id)
      .single();

    if (!counselor || counselor.is_suspended || counselor.verification_status !== "approved") {
      return Response.json({ error: "Counselor unavailable" }, { status: 409, headers: corsHeaders });
    }

    const startedAt = new Date();
    const endsAt = new Date(startedAt.getTime() + Number(consultation.duration_seconds) * 1000);

    const { data: updated, error: updateError } = await supabase
      .from("consultations")
      .update({
        status: "active",
        started_at: startedAt.toISOString(),
        ends_at: endsAt.toISOString()
      })
      .eq("id", consultationId)
      .eq("status", "waiting")
      .select("id,status,started_at,ends_at")
      .single();

    if (updateError) throw updateError;
    return Response.json(updated, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400, headers: corsHeaders });
  }
});
