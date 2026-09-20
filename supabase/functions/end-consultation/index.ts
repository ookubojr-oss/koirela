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
      .select("id,user_id,counselor_id,status")
      .eq("id", consultationId)
      .single();

    if (error || !consultation) throw new Error("Consultation not found");
    if (consultation.user_id !== user.id && consultation.counselor_id !== user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });
    }
    if (consultation.status === "ended") {
      return Response.json(consultation, { headers: corsHeaders });
    }
    if (consultation.status !== "active") {
      return Response.json({ error: "Consultation is not active" }, { status: 409, headers: corsHeaders });
    }

    const endedAt = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from("consultations")
      .update({ status: "ended", ended_at: endedAt })
      .eq("id", consultationId)
      .eq("status", "active")
      .select("id,status,ended_at,ends_at")
      .single();

    if (updateError) throw updateError;

    await supabase.from("messages").insert({
      consultation_id: consultationId,
      sender_id: user.id,
      kind: "system",
      body: "相談を終了しました"
    });

    return Response.json(updated, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400, headers: corsHeaders });
  }
});
