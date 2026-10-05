import Stripe from 'npm:stripe';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async req => {
  const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY') || '';
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  if (!stripeSecret || !webhookSecret) return new Response('not configured', { status: 503 });

  const stripe = new Stripe(stripeSecret);
  const rawBody = await req.text();
  const signature = req.headers.get('stripe-signature') || '';

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch {
    return new Response('invalid signature', { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as Stripe.PaymentIntent;
    const consultationId = intent.metadata.consultation_id;

    const { data: consultation } = await admin
      .from('consultations')
      .select('*')
      .eq('id', consultationId)
      .single();

    if (consultation && consultation.status === 'pending_payment') {
      const startsAt = new Date();
      const endsAt = new Date(startsAt.getTime() + Number(consultation.duration_seconds || 900) * 1000);

      await admin.from('payments').update({
        status: 'paid',
        updated_at: startsAt.toISOString()
      }).eq('provider_payment_id', intent.id);

      await admin.from('consultations').update({
        status: 'active',
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString()
      }).eq('id', consultationId).eq('status', 'pending_payment');
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object as Stripe.PaymentIntent;
    await admin.from('payments').update({
      status: 'failed',
      failure_code: intent.last_payment_error?.code || 'payment_failed',
      updated_at: new Date().toISOString()
    }).eq('provider_payment_id', intent.id);
  }

  return new Response('ok', { status: 200 });
});
