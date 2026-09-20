import Stripe from "npm:stripe@17.7.0";
import { serviceClient } from "../_shared/clients.ts";
import { pushToUser } from "../_shared/push.ts";
import { logError } from "../_shared/monitoring.ts";

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
    const purpose = intent.metadata.purpose;

    await supabase
      .from("payments")
      .update({ status: intent.status, updated_at: new Date().toISOString() })
      .eq("provider_payment_intent_id", intent.id);

    if (consultationId && purpose === "koirela_15min_extension") {
      const { error } = await supabase.rpc("apply_paid_extension", {
        p_consultation_id: consultationId,
        p_payment_intent_id: intent.id
      });
      if (error) {
        await logError(supabase,{
          source:"payment",
          message:"Extension apply failed",
          context:{consultationId,paymentIntentId:intent.id,error:error.message}
        });
        return new Response("Extension apply failed", { status: 500 });
      }

      const {data:extended}=await supabase
        .from("consultations")
        .select("user_id,counselor_id,ends_at")
        .eq("id",consultationId)
        .maybeSingle();

      if(extended?.user_id){
        void pushToUser(
          supabase,
          extended.user_id,
          "相談を15分延長しました",
          "新しい終了時刻までそのまま相談を続けられます。",
          {type:"consultation_extended",consultationId,endsAt:extended.ends_at}
        );
      }
      if(extended?.counselor_id){
        void pushToUser(
          supabase,
          extended.counselor_id,
          "相談が15分延長されました",
          "相談者が15分の延長を購入しました。",
          {type:"consultation_extended",consultationId,endsAt:extended.ends_at}
        );
      }
    } else if (consultationId) {
      const { data: waitingConsultation } = await supabase
        .from("consultations")
        .update({ status: "waiting" })
        .eq("id", consultationId)
        .eq("status", "awaiting_payment")
        .select("id,counselor_id")
        .maybeSingle();

      if (waitingConsultation?.counselor_id) {
        void pushToUser(
          supabase,
          waitingConsultation.counselor_id,
          "新しい相談リクエスト",
          "15分相談のリクエストが届きました。",
          { type: "consultation_request", consultationId }
        );
      }
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
