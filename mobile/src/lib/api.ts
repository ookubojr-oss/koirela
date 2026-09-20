import { supabase } from "./supabase";

export type Counselor = {
  user_id: string;
  display_name: string;
  counselor_type: "experience" | "qualified";
  gender: "female" | "male" | "other" | null;
  specialty: string | null;
  bio: string | null;
  avatar_path: string | null;
  qualification_label: string | null;
};

export async function listCounselors(params?: {
  track?: "all" | "exp" | "pro";
  gender?: "all" | "female" | "male" | "other";
  query?: string;
}) {
  const track = params?.track ?? "all";
  const gender = params?.gender ?? "all";
  const query = params?.query?.trim() ?? "";

  let request = supabase
    .from("counselor_profiles")
    .select("user_id,display_name,counselor_type,gender,specialty,bio,avatar_path,qualification_label,counselor_availability!inner(is_accepting)")
    .eq("verification_status", "approved")
    .eq("is_suspended", false)
    .eq("counselor_availability.is_accepting", true);

  if (track === "exp") request = request.eq("counselor_type", "experience");
  if (track === "pro") request = request.eq("counselor_type", "qualified");
  if (gender !== "all") request = request.eq("gender", gender);
  if (query) {
    const safe = query.replace(/[%_,()]/g, " ");
    request = request.or(
      "display_name.ilike.%" + safe + "%,specialty.ilike.%" + safe + "%,bio.ilike.%" + safe + "%"
    );
  }

  const { data, error } = await request.order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Counselor[];
}

export async function createPaymentIntent(counselorId: string) {
  const { data, error } = await supabase.functions.invoke("create-payment-intent", {
    body: { counselorId }
  });
  if (error) throw error;
  return data as {
    consultationId: string;
    paymentIntentClientSecret: string;
    amount: number;
    currency: string;
  };
}

export async function createExtensionPaymentIntent(consultationId: string) {
  const { data, error } = await supabase.functions.invoke("create-extension-payment-intent", {
    body: { consultationId }
  });
  if (error) throw error;
  return data;
}

export async function submitCounselorApplication(payload: {
  displayName: string;
  counselorType: "experience" | "qualified";
  gender: "female" | "male" | "other" | null;
  specialty?: string;
  bio?: string;
  qualificationLabel?: string | null;
  documentPath: string;
  qualificationDocumentPath?: string | null;
  avatarPath?: string | null;
}) {
  const { data, error } = await supabase.functions.invoke("submit-counselor-application", { body: payload });
  if (error) throw error;
  return data;
}

export async function setCounselorAvailability(isAccepting: boolean) {
  const { data, error } = await supabase.functions.invoke("set-counselor-availability", {
    body: { isAccepting }
  });
  if (error) throw error;
  return data as { counselor_id: string; is_accepting: boolean; updated_at: string };
}

export async function acceptConsultation(consultationId: string) {
  const { data, error } = await supabase.functions.invoke("start-consultation", {
    body: { consultationId }
  });
  if (error) throw error;
  return data;
}

export async function cancelConsultation(consultationId: string) {
  const { data, error } = await supabase.functions.invoke("cancel-consultation", {
    body: { consultationId }
  });
  if (error) throw error;
  return data;
}

export async function endConsultation(consultationId: string) {
  const { data, error } = await supabase.functions.invoke("end-consultation", {
    body: { consultationId }
  });
  if (error) throw error;
  return data;
}

export async function sendMessage(consultationId: string, body: string, context: string[] = []) {
  const { data, error } = await supabase.functions.invoke("send-message", {
    body: { consultationId, body, context }
  });
  if (error) throw error;
  return data;
}


export async function rateConsultation(consultationId: string, counselorId: string, stars: number) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("ログインが必要です");
  const { data, error } = await supabase.from("ratings").upsert({
    consultation_id: consultationId,
    user_id: auth.user.id,
    counselor_id: counselorId,
    stars
  }, { onConflict: "consultation_id" }).select().single();
  if (error) throw error;
  return data;
}

export async function reportCounselor(
  consultationId: string,
  counselorId: string,
  reason: string,
  context: string[] = []
) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("ログインが必要です");
  const { data, error } = await supabase.from("reports").insert({
    consultation_id: consultationId,
    reporter_id: auth.user.id,
    counselor_id: counselorId,
    reason,
    context
  }).select().single();
  if (error) throw error;
  return data;
}

export async function blockCounselor(counselorId: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("ログインが必要です");
  const { error } = await supabase.from("blocks").upsert({
    blocker_id: auth.user.id,
    blocked_id: counselorId
  }, { onConflict: "blocker_id,blocked_id" });
  if (error) throw error;
}

export async function unblockCounselor(counselorId: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("ログインが必要です");
  const { error } = await supabase.from("blocks")
    .delete()
    .eq("blocker_id", auth.user.id)
    .eq("blocked_id", counselorId);
  if (error) throw error;
}

export async function listBlockedCounselors() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("ログインが必要です");
  const { data, error } = await supabase.from("blocks")
    .select("blocked_id,created_at")
    .eq("blocker_id", auth.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listConsultationHistory() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("ログインが必要です");
  const { data, error } = await supabase
    .from("consultations")
    .select("id,status,price_jpy,duration_seconds,started_at,ends_at,ended_at,created_at,counselor_id,counselor:counselor_profiles!consultations_counselor_id_fkey(display_name,avatar_path,counselor_type,gender,specialty,bio,qualification_label,is_suspended,verification_status)")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function loadNotificationPreferences() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("ログインが必要です");
  const { data, error } = await supabase.from("notification_preferences")
    .select("enabled,one_minute_warning,counselor_online")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error) throw error;
  return data ?? { enabled: false, one_minute_warning: true, counselor_online: false };
}

export async function saveNotificationPreferences(values: {
  enabled: boolean;
  one_minute_warning: boolean;
  counselor_online: boolean;
}) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("ログインが必要です");
  const { data, error } = await supabase.from("notification_preferences").upsert({
    user_id: auth.user.id,
    ...values,
    updated_at: new Date().toISOString()
  }, { onConflict: "user_id" }).select().single();
  if (error) throw error;
  return data;
}

export async function requestAccountDeletion() {
  const { data, error } = await supabase.rpc("request_account_deletion");
  if (error) throw error;
  return data;
}


export async function listFavoriteCounselors() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("ログインが必要です");
  const { data, error } = await supabase
    .from("favorites")
    .select("counselor_id,created_at,counselor:counselor_profiles!favorites_counselor_id_fkey(user_id,display_name,counselor_type,gender,specialty,bio,avatar_path,qualification_label,is_suspended,verification_status)")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).filter((row: any) => {
    const counselor = Array.isArray(row.counselor) ? row.counselor[0] : row.counselor;
    return counselor && counselor.verification_status === "approved" && !counselor.is_suspended;
  });
}

export async function listFavoriteIds() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [] as string[];
  const { data, error } = await supabase
    .from("favorites")
    .select("counselor_id")
    .eq("user_id", auth.user.id);
  if (error) throw error;
  return (data ?? []).map((x: any) => x.counselor_id as string);
}

export async function setFavoriteCounselor(counselorId: string, favorite: boolean) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("ログインが必要です");
  if (favorite) {
    const { error } = await supabase.from("favorites").upsert({
      user_id: auth.user.id,
      counselor_id: counselorId
    }, { onConflict: "user_id,counselor_id" });
    if (error) throw error;
  } else {
    const { error } = await supabase.from("favorites")
      .delete()
      .eq("user_id", auth.user.id)
      .eq("counselor_id", counselorId);
    if (error) throw error;
  }
}

export async function getCounselorEarningsSummary() {
  const { data, error } = await supabase.rpc("counselor_earnings_summary");
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function listCounselorPayouts() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("ログインが必要です");
  const { data, error } = await supabase
    .from("payouts")
    .select("id,period_start,period_end,gross_jpy,platform_fee_jpy,net_jpy,status,paid_at,created_at")
    .eq("counselor_id", auth.user.id)
    .order("period_end", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getCounselorPayoutAccount() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("ログインが必要です");
  const { data, error } = await supabase
    .from("counselor_payout_accounts")
    .select("provider,bank_label,account_holder_masked,status,updated_at")
    .eq("counselor_id", auth.user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function submitSupportTicket(values: {
  category: "payment" | "counselor" | "bug" | "account" | "other";
  subject: string;
  message: string;
}) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("ログインが必要です");
  const { data, error } = await supabase.from("support_tickets").insert({
    user_id: auth.user.id,
    ...values
  }).select().single();
  if (error) throw error;
  return data;
}

export async function listSupportTickets() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("ログインが必要です");
  const { data, error } = await supabase
    .from("support_tickets")
    .select("id,category,subject,message,status,admin_reply,created_at,updated_at")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function loadMaintenanceSetting() {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value,updated_at")
    .eq("key", "maintenance")
    .maybeSingle();
  if (error) throw error;
  return (data?.value ?? { enabled: false }) as {
    enabled?: boolean;
    title?: string;
    message?: string;
  };
}

export function subscribeToMessages(consultationId: string, onMessage: (message: any) => void) {
  const channel = supabase
    .channel("messages:" + consultationId)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: "consultation_id=eq." + consultationId
      },
      payload => onMessage(payload.new)
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function subscribeToConsultation(consultationId: string, onChange: (row: any) => void) {
  const channel = supabase
    .channel("consultation:" + consultationId)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "consultations",
        filter: "id=eq." + consultationId
      },
      payload => onChange(payload.new)
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
