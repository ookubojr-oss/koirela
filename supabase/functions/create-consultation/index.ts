import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authHeader = req.headers.get('Authorization') || '';
  const admin = createClient(supabaseUrl, serviceKey);

  const token = authHeader.replace(/^Bearer\s+/i, '');
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) {
    return Response.json({ error: 'unauthorized' }, { status: 401, headers: corsHeaders });
  }

  const { counselorId } = await req.json();
  if (!counselorId) {
    return Response.json({ error: 'counselorId is required' }, { status: 400, headers: corsHeaders });
  }

  const { data: counselor } = await admin
    .from('counselor_profiles')
    .select('user_id,is_accepting,is_discoverable,verification_status,suspended_at')
    .eq('user_id', counselorId)
    .single();

  if (
    !counselor ||
    !counselor.is_accepting ||
    !counselor.is_discoverable ||
    counselor.verification_status !== 'approved' ||
    counselor.suspended_at
  ) {
    return Response.json({ error: 'counselor_unavailable' }, { status: 409, headers: corsHeaders });
  }

  const { data, error } = await admin
    .from('consultations')
    .insert({
      user_id: userData.user.id,
      counselor_id: counselorId,
      status: 'pending_payment',
      price_yen: 100,
      duration_seconds: 900
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
  return Response.json({ consultation: data }, { status: 201, headers: corsHeaders });
});
