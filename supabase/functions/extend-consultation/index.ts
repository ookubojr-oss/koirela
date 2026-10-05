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
  const { data: current, error: currentError } = await admin
    .from('consultations')
    .select('*')
    .eq('id', consultationId)
    .single();

  if (currentError || !current) return Response.json({ error: 'not_found' }, { status: 404 });
  if (!['active','completed'].includes(current.status)) {
    return Response.json({ error: 'invalid_status' }, { status: 409 });
  }

  const base = current.ends_at && new Date(current.ends_at) > new Date()
    ? new Date(current.ends_at)
    : new Date();
  const nextEnd = new Date(base.getTime() + 15 * 60 * 1000);

  const { data, error } = await admin
    .from('consultations')
    .update({
      status: 'active',
      ends_at: nextEnd.toISOString(),
      completed_at: null
    })
    .eq('id', consultationId)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });

  await admin.from('payments').insert({
    consultation_id: consultationId,
    user_id: current.user_id,
    amount_yen: 100,
    status: 'paid',
    provider: 'configured_provider',
    provider_payment_id: providerPaymentId || null
  });

  return Response.json({ consultation: data });
});
