import Stripe from "npm:stripe@17.7.0";
import { corsHeaders } from "../_shared/cors.ts";
import { authenticatedUser, serviceClient } from "../_shared/clients.ts";
import { logError } from "../_shared/monitoring.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const user = await authenticatedUser(req);
    const payload = await req.json();
    const counselorId = payload.counselorId;

    if (!counselorId || counselorId === user.id) {
      return Response.json({ error: "Invalid counselor" }, { status: error instanceof Error && error.message === "RATE_LIMITED" ? 429 : 400, headers: corsHeaders });
    }

    const supabase = serviceClient();
    await enforceRateLimit(supabase,"payment-create",user.id,5,600);

    const { data: counselor, error: counselorError } = await supabase
      .from("counselor_profiles")
      .select("user_id,verification_status,is_suspended")
      .eq("user_id", counselorId)
      .single();

    const { data: availability } = await supabase
      .from("counselor_availability")
      .select("is_accepting")
      .eq("counselor_id", counselorId)
      .maybeSingle();

    if (
      counselorError ||
      !counselor ||
      counselor.verification_status !== "approved" ||
      counselor.is_suspended ||
      !availability?.is_accepting
    ) {
      return Response.json({ error: "Counselor unavailable" }, { status: 409, headers: corsHeaders });
    }

    const { data: blockRows } = await supabase
      .from("blocks")
      .select("blocker_id,blocked_id")
      .or(
        "and(blocker_id.eq." + user.id + ",blocked_id.eq." + counselorId + ")," +
        "and(blocker_id.eq." + counselorId + ",blocked_id.eq." + user.id + ")"
      )
      .limit(1);

    if (blockRows?.length) {
      return Response.json({ error: "Counselor unavailable" }, { status: 409, headers: corsHeaders });
    }

    const { data: existingUser } = await supabase
      .from("consultations")
      .select("id,status")
      .eq("user_id", user.id)
      .in("status", ["awaiting_payment","waiting","active"])
      .limit(1);

    if (existingUser?.length) {
      return Response.json({ error: "Another consultation is already in progress" }, { status: 409, headers: corsHeaders });
    }

    const { data: existingCounselor } = await supabase
      .from("consultations")
      .select("id,status")
      .eq("counselor_id", counselorId)
      .in("status", ["waiting","active"])
      .limit(1);

    if (existingCounselor?.length) {
      return Response.json({ error: "Counselor unavailable" }, { status: 409, headers: corsHeaders });
    }

    const { data: consultation, error: consultationError } = await supabase
      .from("consultations")
      .insert({
        user_id: user.id,
        counselor_id: counselorId,
        status: "awaiting_payment",
        price_jpy: 100,
        duration_seconds: 900
      })
      .select("id,price_jpy")
      .single();

    if (consultationError) throw consultationError;

    const intent = await stripe.paymentIntents.create({
      amount: consultation.price_jpy,
      currency: "jpy",
      automatic_payment_methods: { enabled: true },
      metadata: {
        consultation_id: consultation.id,
        user_id: user.id,
        counselor_id: counselorId,
        purpose: "koirela_15min_consultation"
      }
    });

    const { error: paymentError } = await supabase.from("payments").insert({
      consultation_id: consultation.id,
      payer_id: user.id,
      provider: "stripe",
      provider_payment_intent_id: intent.id,
      amount_jpy: consultation.price_jpy,
      kind: "initial",
      status: intent.status
    });

    if (paymentError) throw paymentError;

    return Response.json({
      consultationId: consultation.id,
      paymentIntentClientSecret: intent.client_secret,
      amount: consultation.price_jpy,
      currency: "jpy"
    }, { headers: corsHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (!["Counselor unavailable","Consultation ended","Forbidden","RATE_LIMITED"].includes(message)) {
      await logError(serviceClient(), {
        source: "payment",
        message,
        stack: error instanceof Error ? error.stack : null,
        context: { function: "create-payment-intent" }
      });
    }
    return Response.json(
      { error: message },
      { status: 400, headers: corsHeaders }
    );
  }
});
