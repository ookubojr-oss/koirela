import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async req => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const webhookSecret = Deno.env.get('PAYMENT_WEBHOOK_SECRET') || '';
  const supplied = req.headers.get('x-koirela-webhook-secret') || '';

  if (!webhookSecret || supplied !== webhookSecret) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { consultationId, providerPaymentId } = await req.json();
  if (!consultationId) return Response.json({ error: 'consultationId is required' }, { status: 400 });

  const admin = createClient(supabaseUrl, serviceKey);
  const now = new Date();
  const endsAt = new Date(now.getTime() + 15 * 60 * 1000);

  const { data: consultation, error } = await admin
    .from('consultations')
    .update({
      status: 'active',
      starts_at: now.toISOString(),
      ends_at: endsAt.toISOString()
    })
    .eq('id', consultationId)
    .eq('status', 'pending_payment')
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });

  await admin.from('payments').update({
    status: 'paid',
    provider_payment_id: providerPaymentId || null,
    updated_at: now.toISOString()
  }).eq('consultation_id', consultationId);

  return Response.json({ consultation });
});
