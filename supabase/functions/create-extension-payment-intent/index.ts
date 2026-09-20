import Stripe from "npm:stripe@17.7.0";
import { corsHeaders } from "../_shared/cors.ts";
import { authenticatedUser, serviceClient } from "../_shared/clients.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const user = await authenticatedUser(req);
    const payload = await req.json();
    const consultationId = payload.consultationId;
    const supabase = serviceClient();
    await enforceRateLimit(supabase,"payment-extension",user.id,8,600);

    const { data: consultation, error } = await supabase
      .from("consultations")
      .select("id,user_id,counselor_id,status,ends_at")
      .eq("id", consultationId)
      .single();

    if (error || !consultation) throw new Error("Consultation not found");
    if (consultation.user_id !== user.id) {
      return Response.json({ error: "Only the customer can purchase an extension" }, { status: 403, headers: corsHeaders });
    }
    if (consultation.status !== "active") {
      return Response.json({ error: "Consultation is not active" }, { status: 409, headers: corsHeaders });
    }

    const { data: counselor } = await supabase
      .from("counselor_profiles")
      .select("is_suspended")
      .eq("user_id", consultation.counselor_id)
      .single();

    if (!counselor || counselor.is_suspended) {
      return Response.json({ error: "Counselor unavailable" }, { status: 409, headers: corsHeaders });
    }

    const intent = await stripe.paymentIntents.create({
      amount: 100,
      currency: "jpy",
      automatic_payment_methods: { enabled: true },
      metadata: {
        consultation_id: consultation.id,
        user_id: user.id,
        counselor_id: consultation.counselor_id,
        purpose: "koirela_15min_extension"
      }
    });

    await supabase.from("payments").insert({
      consultation_id: consultation.id,
      payer_id: user.id,
      provider: "stripe",
      provider_payment_intent_id: intent.id,
      amount_jpy: 100,
      kind: "extension",
      status: intent.status
    });

    return Response.json({
      consultationId: consultation.id,
      paymentIntentClientSecret: intent.client_secret,
      amount: 100,
      currency: "jpy"
    }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: error instanceof Error && error.message === "RATE_LIMITED" ? 429 : 400, headers: corsHeaders });
  }
});
