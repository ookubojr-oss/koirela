import Stripe from "npm:stripe@17.7.0";
import { serviceClient } from "../_shared/clients.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "");
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing stripe-signature", { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(raw, signature, webhookSecret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const supabase = serviceClient();

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const consultationId = intent.metadata.consultation_id;

    await supabase
      .from("payments")
      .update({ status: intent.status, updated_at: new Date().toISOString() })
      .eq("provider_payment_intent_id", intent.id);

    if (consultationId) {
      await supabase
        .from("consultations")
        .update({ status: "waiting" })
        .eq("id", consultationId)
        .eq("status", "awaiting_payment");
    }
  }

  if (event.type === "payment_intent.payment_failed" || event.type === "payment_intent.canceled") {
    const intent = event.data.object as Stripe.PaymentIntent;
    await supabase
      .from("payments")
      .update({ status: intent.status, updated_at: new Date().toISOString() })
      .eq("provider_payment_intent_id", intent.id);
  }

  return new Response("ok");
});
