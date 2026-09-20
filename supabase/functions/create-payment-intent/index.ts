import Stripe from "npm:stripe@17.7.0";
import { corsHeaders } from "../_shared/cors.ts";
import { authenticatedUser, serviceClient } from "../_shared/clients.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const user = await authenticatedUser(req);
    const payload = await req.json();
    const counselorId = payload.counselorId;
    if (!counselorId) {
      return Response.json({ error: "counselorId is required" }, { status: 400, headers: corsHeaders });
    }

    const supabase = serviceClient();
    const { data: counselor, error: counselorError } = await supabase
      .from("counselor_profiles")
      .select("user_id,verification_status,is_suspended")
      .eq("user_id", counselorId)
      .single();

    if (counselorError || !counselor || counselor.verification_status !== "approved" || counselor.is_suspended) {
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

    await supabase.from("payments").insert({
      consultation_id: consultation.id,
      payer_id: user.id,
      provider: "stripe",
      provider_payment_intent_id: intent.id,
      amount_jpy: consultation.price_jpy,
      status: intent.status
    });

    return Response.json({
      consultationId: consultation.id,
      paymentIntentClientSecret: intent.client_secret,
      amount: consultation.price_jpy,
      currency: "jpy"
    }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400, headers: corsHeaders });
  }
});
