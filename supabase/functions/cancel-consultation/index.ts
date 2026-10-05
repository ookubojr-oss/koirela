import Stripe from "npm:stripe@17.7.0";
import { corsHeaders } from "../_shared/cors.ts";
import { authenticatedUser, serviceClient } from "../_shared/clients.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const user = await authenticatedUser(req);
    const payload = await req.json();
    const consultationId = payload.consultationId;
    const supabase = serviceClient();

    const { data: consultation, error } = await supabase
      .from("consultations")
      .select("id,user_id,status")
      .eq("id", consultationId)
      .single();

    if (error || !consultation) throw new Error("Consultation not found");
    if (consultation.user_id !== user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });
    }
    if (!["awaiting_payment","waiting"].includes(consultation.status)) {
      return Response.json({ error: "Consultation can no longer be canceled here" }, { status: 409, headers: corsHeaders });
    }

    const { data: payment } = await supabase
      .from("payments")
      .select("id,provider_payment_intent_id,status")
      .eq("consultation_id", consultationId)
      .eq("kind", "initial")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (payment?.provider_payment_intent_id) {
      const intent = await stripe.paymentIntents.retrieve(payment.provider_payment_intent_id);

      if (intent.status === "succeeded") {
        const { data: existingRefund } = await supabase
          .from("payments")
          .select("id")
          .eq("refunded_payment_intent_id", intent.id)
          .maybeSingle();

        if (!existingRefund) {
          const refund = await stripe.refunds.create({
            payment_intent: intent.id,
            metadata: { consultation_id: consultationId, reason: "canceled_before_start" }
          });
          await supabase.from("payments").insert({
            consultation_id: consultationId,
            payer_id: user.id,
            provider: "stripe",
            provider_payment_intent_id: null,
            provider_refund_id: refund.id,
            refunded_payment_intent_id: intent.id,
            amount_jpy: Math.abs(intent.amount_received || 100),
            kind: "refund",
            status: refund.status || "pending"
          });
        }
      } else if (!["canceled","requires_capture"].includes(intent.status)) {
        try { await stripe.paymentIntents.cancel(intent.id); } catch (_) {}
      }
    }

    await supabase
      .from("consultations")
      .update({ status: "canceled", ended_at: new Date().toISOString() })
      .eq("id", consultationId);

    return Response.json({ canceled: true }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400, headers: corsHeaders });
  }
});
