import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY') || '';
  if (!stripeSecret) return Response.json({ error: 'payment_not_configured' }, { status: 503, headers: corsHeaders });

  const admin = createClient(supabaseUrl, serviceKey);
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i,'');
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) return Response.json({ error: 'unauthorized' }, { status: 401, headers: corsHeaders });

  const { consultationId } = await req.json();
  const { data: consultation, error: consultationError } = await admin
    .from('consultations')
    .select('*')
    .eq('id', consultationId)
    .eq('user_id', userData.user.id)
    .eq('status', 'pending_payment')
    .single();

  if (consultationError || !consultation) {
    return Response.json({ error: 'consultation_not_payable' }, { status: 409, headers: corsHeaders });
  }

  const params = new URLSearchParams();
  params.set('amount', String(consultation.price_yen));
  params.set('currency', 'jpy');
  params.set('automatic_payment_methods[enabled]', 'true');
  params.set('metadata[consultation_id]', consultation.id);
  params.set('metadata[user_id]', consultation.user_id);
  params.set('description', 'KoiRela 15分相談');

  const stripeRes = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + stripeSecret,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });

  const paymentIntent = await stripeRes.json();
  if (!stripeRes.ok) {
    return Response.json({ error: paymentIntent?.error?.message || 'payment_provider_error' }, { status: 502, headers: corsHeaders });
  }

  const { error: paymentError } = await admin.from('payments').insert({
    consultation_id: consultation.id,
    user_id: consultation.user_id,
    amount_yen: consultation.price_yen,
    status: 'pending',
    provider: 'stripe',
    provider_payment_id: paymentIntent.id
  });

  if (paymentError) return Response.json({ error: paymentError.message }, { status: 400, headers: corsHeaders });

  return Response.json({
    paymentIntentId: paymentIntent.id,
    clientSecret: paymentIntent.client_secret,
    amount: consultation.price_yen,
    currency: 'jpy'
  }, { headers: corsHeaders });
});
