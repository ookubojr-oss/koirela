import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async _req => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(supabaseUrl, serviceKey);

  const now = new Date().toISOString();
  const { data: due, error } = await admin
    .from('consultations')
    .select('id')
    .eq('status', 'active')
    .lte('ends_at', now)
    .limit(200);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  const ids = (due || []).map(row => row.id);
  if (!ids.length) return Response.json({ completed: 0 });

  const { error: updateError } = await admin
    .from('consultations')
    .update({ status: 'completed', completed_at: now })
    .in('id', ids);

  if (updateError) return Response.json({ error: updateError.message }, { status: 500 });
  return Response.json({ completed: ids.length });
});
