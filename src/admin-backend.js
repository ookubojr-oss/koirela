import { supabase, configured } from './koirela-backend.js';

async function requireAdmin() {
  if (!configured || !supabase) throw new Error('Backend is not configured');
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw authError || new Error('Not signed in');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .single();

  if (profileError || profile?.role !== 'admin') throw new Error('Admin access required');
  return authData.user;
}

export async function listModerationEvents({ limit = 100 } = {}) {
  await requireAdmin();
  const { data, error } = await supabase
    .from('moderation_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function listReports({ limit = 100 } = {}) {
  await requireAdmin();
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function reviewCounselor(counselorId, status) {
  const admin = await requireAdmin();
  const { error } = await supabase
    .from('counselor_profiles')
    .update({
      verification_status: status,
      is_discoverable: status === 'approved'
    })
    .eq('user_id', counselorId);
  if (error) throw error;

  await supabase.from('admin_audit').insert({
    admin_id: admin.id,
    action: 'counselor_review',
    target_type: 'counselor',
    target_id: counselorId,
    metadata: { status }
  });
}

export async function restoreCounselor(counselorId) {
  const admin = await requireAdmin();
  const { error } = await supabase
    .from('counselor_profiles')
    .update({
      violation_count: 1,
      suspended_at: null,
      payout_hold: false,
      is_discoverable: true
    })
    .eq('user_id', counselorId);
  if (error) throw error;

  await supabase.from('admin_audit').insert({
    admin_id: admin.id,
    action: 'restore_counselor',
    target_type: 'counselor',
    target_id: counselorId
  });
}
