import { corsHeaders } from "../_shared/cors.ts";
import { authenticatedUser, serviceClient } from "../_shared/clients.ts";

const allowedGender = new Set(["female","male","other",null]);
const allowedType = new Set(["experience","qualified"]);

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0,max) : "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const user = await authenticatedUser(req);
    const body = await req.json();
    const supabase = serviceClient();

    const displayName = clean(body.displayName,40);
    const counselorType = clean(body.counselorType,20);
    const gender = body.gender ? clean(body.gender,20) : null;
    const specialty = clean(body.specialty,120);
    const bio = clean(body.bio,1000);
    const qualificationLabel = clean(body.qualificationLabel,120) || null;
    const documentPath = clean(body.documentPath,500);
    const qualificationDocumentPath = clean(body.qualificationDocumentPath,500) || null;

    if (!displayName || !allowedType.has(counselorType)) {
      return Response.json({ error: "Invalid counselor profile" }, { status: 400, headers: corsHeaders });
    }
    if (!allowedGender.has(gender)) {
      return Response.json({ error: "Invalid gender" }, { status: 400, headers: corsHeaders });
    }
    if (!documentPath || !documentPath.startsWith(user.id + "/")) {
      return Response.json({ error: "Identity document is required" }, { status: 400, headers: corsHeaders });
    }
    if (counselorType === "qualified" && (!qualificationLabel || !qualificationDocumentPath)) {
      return Response.json({ error: "Qualification evidence is required" }, { status: 400, headers: corsHeaders });
    }
    if (qualificationDocumentPath && !qualificationDocumentPath.startsWith(user.id + "/")) {
      return Response.json({ error: "Invalid qualification document path" }, { status: 400, headers: corsHeaders });
    }

    const { data: existing } = await supabase
      .from("counselor_profiles")
      .select("is_suspended")
      .eq("user_id",user.id)
      .maybeSingle();

    if (existing?.is_suspended) {
      return Response.json({ error: "Suspended counselor accounts cannot reapply" }, { status: 403, headers: corsHeaders });
    }

    const { error: profileError } = await supabase
      .from("counselor_profiles")
      .upsert({
        user_id:user.id,
        display_name:displayName,
        counselor_type:counselorType,
        gender,
        specialty:specialty || null,
        bio:bio || null,
        qualification_label:qualificationLabel,
        verification_status:"pending",
        is_suspended:false,
        updated_at:new Date().toISOString()
      },{onConflict:"user_id"});
    if (profileError) throw profileError;

    const { error: identityError } = await supabase
      .from("identity_verifications")
      .upsert({
        counselor_id:user.id,
        provider:"manual_review",
        document_path:documentPath,
        qualification_document_path:qualificationDocumentPath,
        status:"pending"
      },{onConflict:"counselor_id"});
    if (identityError) throw identityError;

    await supabase
      .from("counselor_availability")
      .upsert({counselor_id:user.id,is_accepting:false,updated_at:new Date().toISOString()},{onConflict:"counselor_id"});

    return Response.json({ submitted:true, status:"pending" }, { headers: corsHeaders });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400, headers: corsHeaders }
    );
  }
});
