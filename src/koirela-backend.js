import { createClient } from '@supabase/supabase-js';

const url = import.meta.env?.VITE_SUPABASE_URL || '';
const anonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

export const configured = Boolean(url && anonKey);
export const supabase = configured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

function requireBackend() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

export async function signInWithPassword(email, password) {
  const client = requireBackend();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithPassword(email, password) {
  const client = requireBackend();
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithOAuth(provider, redirectTo = window.location.origin) {
  const client = requireBackend();
  if (!['google', 'apple'].includes(provider)) {
    throw new Error('This OAuth provider requires a custom server flow');
  }
  const { data, error } = await client.auth.signInWithOAuth({
    provider,
    options: { redirectTo }
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const client = requireBackend();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function listCounselors({ track = 'all', gender = 'all', query = '' } = {}) {
  const client = requireBackend();
  let request = client
    .from('counselor_directory')
    .select('*')
    .eq('is_discoverable', true)
    .order('is_accepting', { ascending: false })
    .order('rating_avg', { ascending: false });

  if (track !== 'all') request = request.eq('track', track);
  if (gender !== 'all') request = request.eq('gender', gender);
  if (query.trim()) {
    const q = query.trim().replaceAll(',', ' ');
    request = request.or('display_name.ilike.%' + q + '%,bio.ilike.%' + q + '%,specialties_text.ilike.%' + q + '%');
  }

  const { data, error } = await request;
  if (error) throw error;
  return data || [];
}

export async function createConsultation(counselorId) {
  const client = requireBackend();
  const { data, error } = await client.functions.invoke('create-consultation', {
    body: { counselorId }
  });
  if (error) throw error;
  return data;
}

export async function getConsultation(consultationId) {
  const client = requireBackend();
  const { data, error } = await client
    .from('consultations')
    .select('*')
    .eq('id', consultationId)
    .single();
  if (error) throw error;
  return data;
}

export async function sendMessage(consultationId, body) {
  const client = requireBackend();
  const text = String(body || '').trim();
  if (!text) return null;
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData.user) throw authError || new Error('Not signed in');
  const { data, error } = await client
    .from('messages')
    .insert({ consultation_id: consultationId, sender_id: authData.user.id, body: text })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function subscribeToMessages(consultationId, onMessage) {
  const client = requireBackend();
  const channel = client
    .channel('consultation:' + consultationId)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: 'consultation_id=eq.' + consultationId },
      payload => onMessage(payload.new)
    )
    .subscribe();
  return () => client.removeChannel(channel);
}

export async function setCounselorPresence(isAccepting) {
  const client = requireBackend();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData.user) throw authError || new Error('Not signed in');
  const { error } = await client
    .from('counselor_profiles')
    .update({ is_accepting: Boolean(isAccepting), last_seen_at: new Date().toISOString() })
    .eq('user_id', authData.user.id);
  if (error) throw error;
}

export async function createReport({ consultationId, counselorId, reason, details = '' }) {
  const client = requireBackend();
  const { data, error } = await client
    .from('reports')
    .insert({ consultation_id: consultationId || null, counselor_id: counselorId, reason, details })
    .select()
    .single();
  if (error) throw error;
  return data;
}

if (typeof window !== 'undefined') {
  window.KoiRelaBackend = {
    configured, signInWithPassword, signUpWithPassword, signInWithOAuth, signOut, getSession,
    listCounselors, createConsultation, getConsultation, sendMessage, subscribeToMessages,
    setCounselorPresence, createReport
  };
}
