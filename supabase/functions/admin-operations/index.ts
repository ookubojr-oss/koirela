import Stripe from "npm:stripe@17.7.0";
import { corsHeaders } from "../_shared/cors.ts";
import { authenticatedUser, serviceClient } from "../_shared/clients.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "");

async function requireAdmin(req: Request) {
  const user = await authenticatedUser(req);
  const supabase = serviceClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (error || profile?.role !== "admin") throw new Error("Forbidden");
  return { user, supabase };
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { user, supabase } = await requireAdmin(req);
    const payload = await req.json();
    const action = String(payload.action || "");

    if (action === "suspend_counselor") {
      const counselorId = String(payload.counselorId || "");
      const reason = String(payload.reason || "運営判断による停止").slice(0, 500);
      if (!counselorId) throw new Error("counselorId is required");

      const { error } = await supabase
        .from("counselor_profiles")
        .update({
          is_suspended: true,
          suspended_at: new Date().toISOString(),
          suspension_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", counselorId);
      if (error) throw error;

      await supabase
        .from("counselor_availability")
        .update({ is_accepting: false, updated_at: new Date().toISOString() })
        .eq("counselor_id", counselorId);

      await supabase
        .from("payouts")
        .update({ status: "held" })
        .eq("counselor_id", counselorId)
        .in("status", ["pending", "processing"]);

      await supabase.from("admin_audit_logs").insert({
        admin_id: user.id,
        action: "force_suspend_counselor",
        target_type: "counselor",
        target_id: counselorId,
        metadata: { reason }
      });

      return Response.json({ ok: true, suspended: true }, { headers: corsHeaders });
    }

    if (action === "force_end_consultation") {
      const consultationId = String(payload.consultationId || "");
      if (!consultationId) throw new Error("consultationId is required");

      const { data: consultation, error: loadError } = await supabase
        .from("consultations")
        .select("id,status")
        .eq("id", consultationId)
        .single();
      if (loadError || !consultation) throw new Error("Consultation not found");

      const nextStatus = consultation.status === "active" ? "ended" : "canceled";
      const { error } = await supabase
        .from("consultations")
        .update({
          status: nextStatus,
          ended_at: new Date().toISOString()
        })
        .eq("id", consultationId);
      if (error) throw error;

      if (consultation.status === "active") {
        await supabase.from("messages").insert({
          consultation_id: consultationId,
          sender_id: null,
          kind: "system",
          body: "運営により相談を終了しました"
        });
      }

      await supabase.from("admin_audit_logs").insert({
        admin_id: user.id,
        action: "force_end_consultation",
        target_type: "consultation",
        target_id: consultationId,
        metadata: { previous_status: consultation.status, next_status: nextStatus }
      });

      return Response.json({ ok: true, status: nextStatus }, { headers: corsHeaders });
    }

    if (action === "refund_consultation") {
      const consultationId = String(payload.consultationId || "");
      if (!consultationId) throw new Error("consultationId is required");

      const { data: payments, error: paymentError } = await supabase
        .from("payments")
        .select("id,provider_payment_intent_id,amount_jpy,kind,status")
        .eq("consultation_id", consultationId)
        .eq("status", "succeeded")
        .in("kind", ["initial", "extension"]);

      if (paymentError) throw paymentError;
      if (!payments?.length) throw new Error("No refundable payment found");

      const refunds = [];
      for (const payment of payments) {
        if (!payment.provider_payment_intent_id) continue;

        const { data: existing } = await supabase
          .from("payments")
          .select("id,provider_refund_id,status")
          .eq("refunded_payment_intent_id", payment.provider_payment_intent_id)
          .maybeSingle();

        if (existing) {
          refunds.push(existing);
          continue;
        }

        const refund = await stripe.refunds.create({
          payment_intent: payment.provider_payment_intent_id,
          metadata: {
            consultation_id: consultationId,
            refunded_by_admin: user.id
          }
        });

        const { data: saved, error: saveError } = await supabase
          .from("payments")
          .insert({
            consultation_id: consultationId,
            payer_id: null,
            provider: "stripe",
            provider_payment_intent_id: null,
            provider_refund_id: refund.id,
            refunded_payment_intent_id: payment.provider_payment_intent_id,
            amount_jpy: payment.amount_jpy,
            kind: "refund",
            status: refund.status || "pending"
          })
          .select("id,provider_refund_id,status")
          .single();

        if (saveError) throw saveError;
        refunds.push(saved);
      }

      await supabase
        .from("consultations")
        .update({ status: "refunded", ended_at: new Date().toISOString() })
        .eq("id", consultationId);

      await supabase.from("admin_audit_logs").insert({
        admin_id: user.id,
        action: "refund_consultation",
        target_type: "consultation",
        target_id: consultationId,
        metadata: { refund_count: refunds.length }
      });

      return Response.json({ ok: true, refunds }, { headers: corsHeaders });
    }

    throw new Error("Unknown admin action");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Forbidden" ? 403 : 400;
    return Response.json({ error: message }, { status, headers: corsHeaders });
  }
});
