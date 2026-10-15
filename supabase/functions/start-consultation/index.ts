import { corsHeaders } from "../_shared/cors.ts";
import { authenticatedUser, serviceClient } from "../_shared/clients.ts";
import { expireStaleConsultations } from "../_shared/consultations.ts";
import { logError } from "../_shared/monitoring.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { pushToUser } from "../_shared/push.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const user = await authenticatedUser(req);
    const payload = await req.json();
    const consultationId = payload.consultationId;
    const supabase = serviceClient();
    await expireStaleConsultations(supabase,user.id);
    await enforceRateLimit(supabase,"consultation-start",user.id,20,300);

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

    const { data: availability } = await supabase
      .from("counselor_availability")
      .select("is_accepting")
      .eq("counselor_id", user.id)
      .maybeSingle();

    if (
      !counselor ||
      counselor.is_suspended ||
      counselor.verification_status !== "approved" ||
      !availability?.is_accepting
    ) {
      return Response.json({ error: "Counselor unavailable" }, { status: 409, headers: corsHeaders });
    }

    const { data: otherActive } = await supabase
      .from("consultations")
      .select("id")
      .eq("counselor_id", user.id)
      .eq("status", "active")
      .neq("id", consultationId)
      .limit(1);

    if (otherActive?.length) {
      return Response.json({ error: "Another consultation is already active" }, { status: 409, headers: corsHeaders });
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
      .select("id,status,user_id,counselor_id,started_at,ends_at")
      .single();

    if (updateError) throw updateError;

    await supabase
      .from("counselor_availability")
      .update({ is_accepting: false, updated_at: new Date().toISOString() })
      .eq("counselor_id", user.id);

    void pushToUser(
      supabase,
      consultation.user_id,
      "相談が始まりました",
      "15分相談を開始しました。",
      { type: "consultation_started", consultationId }
    );

    return Response.json(updated, { headers: corsHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (!["Counselor unavailable","Consultation ended","Forbidden","RATE_LIMITED"].includes(message)) {
      await logError(serviceClient(), {
        source: "edge",
        message,
        stack: error instanceof Error ? error.stack : null,
        context: { function: "start-consultation" }
      });
    }
    return Response.json(
      { error: message },
      { status: error instanceof Error && error.message === "RATE_LIMITED" ? 429 : 400, headers: corsHeaders }
    );
  }
});
