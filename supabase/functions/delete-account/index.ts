import { corsHeaders } from "../_shared/cors.ts";
import { authenticatedUser, serviceClient } from "../_shared/clients.ts";

async function removeFolder(
  supabase: ReturnType<typeof serviceClient>,
  bucket: string,
  prefix: string
) {
  let offset = 0;
  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: 100,
      offset,
      sortBy: { column: "name", order: "asc" }
    });
    if (error) throw error;
    if (!data?.length) break;

    const paths = data.filter(item => item.name && item.id).map(item => prefix + "/" + item.name);
    if (paths.length) {
      const { error: removeError } = await supabase.storage.from(bucket).remove(paths);
      if (removeError) throw removeError;
    }

    if (data.length < 100) break;
    offset = 0;
  }
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const user = await authenticatedUser(req);
    const supabase = serviceClient();
    const userId = user.id;

    const { data: active, error: activeError } = await supabase
      .from("consultations")
      .select("id,status")
      .or("user_id.eq." + userId + ",counselor_id.eq." + userId)
      .in("status", ["awaiting_payment", "waiting", "active"])
      .limit(1);

    if (activeError) throw activeError;
    if (active?.length) {
      return Response.json(
        { error: "ACTIVE_CONSULTATION_EXISTS" },
        { status: 409, headers: corsHeaders }
      );
    }

    // Public/private uploaded files.
    for (const folder of ["profile", "counselor"]) {
      await removeFolder(supabase, "avatars", userId + "/" + folder).catch(() => {});
    }
    for (const folder of ["identity", "qualification"]) {
      await removeFolder(supabase, "counselor-verification", userId + "/" + folder).catch(() => {});
    }

    // Remove personal content while keeping de-identified transaction/safety records.
    await supabase.from("messages")
      .update({ sender_id: null, body: "[アカウント削除済み]" })
      .eq("sender_id", userId);

    await supabase.from("ratings").delete().or("user_id.eq." + userId + ",counselor_id.eq." + userId);
    await supabase.from("blocks").delete().or("blocker_id.eq." + userId + ",blocked_id.eq." + userId);
    await supabase.from("favorites").delete().or("user_id.eq." + userId + ",counselor_id.eq." + userId);
    await supabase.from("support_tickets").delete().eq("user_id", userId);
    await supabase.from("device_tokens").delete().eq("user_id", userId);
    await supabase.from("notification_preferences").delete().eq("user_id", userId);

    await supabase.from("payments").update({ payer_id: null }).eq("payer_id", userId);
    await supabase.from("reports").update({ reporter_id: null }).eq("reporter_id", userId);
    await supabase.from("reports").update({ counselor_id: null }).eq("counselor_id", userId);
    await supabase.from("reports").update({ reviewed_by: null }).eq("reviewed_by", userId);
    await supabase.from("app_settings").update({ updated_by: null }).eq("updated_by", userId);
    await supabase.from("moderation_events").update({ counselor_id: null }).eq("counselor_id", userId);
    await supabase.from("moderation_events").update({ reviewed_by: null }).eq("reviewed_by", userId);
    await supabase.from("admin_audit_logs").update({ admin_id: null }).eq("admin_id", userId);
    await supabase.from("payouts").update({ counselor_id: null }).eq("counselor_id", userId);
    await supabase.from("consultations").update({ user_id: null }).eq("user_id", userId);
    await supabase.from("consultations").update({ counselor_id: null }).eq("counselor_id", userId);

    await supabase.from("account_deletion_requests").delete().eq("user_id", userId);
    await supabase.from("counselor_payout_accounts").delete().eq("counselor_id", userId);
    await supabase.from("identity_verifications").delete().eq("counselor_id", userId);
    await supabase.from("counselor_availability").delete().eq("counselor_id", userId);
    await supabase.from("counselor_profiles").delete().eq("user_id", userId);

    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return Response.json({ deleted: true }, { headers: corsHeaders });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400, headers: corsHeaders }
    );
  }
});
