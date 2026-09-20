import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export class KoiRelaAPI {
  constructor(config) {
    if (!config?.supabaseUrl || !config?.supabaseAnonKey) {
      throw new Error("Missing KoiRela public configuration");
    }
    this.supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
  }

  async signInWithPassword(email, password) {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }

  async signInWithOAuth(provider, redirectTo) {
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo }
    });
    if (error) throw error;
    return data;
  }

  async listCounselors({ track = "all", gender = "all", query = "" } = {}) {
    let request = this.supabase
      .from("counselor_profiles")
      .select("user_id,display_name,counselor_type,gender,specialty,bio,avatar_path,qualification_label")
      .eq("verification_status", "approved")
      .eq("is_suspended", false);

    if (track === "exp") request = request.eq("counselor_type", "experience");
    if (track === "pro") request = request.eq("counselor_type", "qualified");
    if (gender !== "all") request = request.eq("gender", gender);

    const q = query.trim();
    if (q) {
      const escaped = q.replace(/[%_,()]/g, " ");
      request = request.or("display_name.ilike.%" + escaped + "%,specialty.ilike.%" + escaped + "%,bio.ilike.%" + escaped + "%");
    }

    const { data, error } = await request.order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async createPaymentIntent(counselorId) {
    const { data, error } = await this.supabase.functions.invoke("create-payment-intent", {
      body: { counselorId }
    });
    if (error) throw error;
    return data;
  }

  async acceptConsultation(consultationId) {
    const { data, error } = await this.supabase.functions.invoke("start-consultation", {
      body: { consultationId }
    });
    if (error) throw error;
    return data;
  }

  async sendMessage(consultationId, body, context = []) {
    const { data, error } = await this.supabase.functions.invoke("send-message", {
      body: { consultationId, body, context }
    });
    if (error) {
      const contextBody = error?.context?.body;
      if (contextBody) {
        try {
          const parsed = typeof contextBody === "string" ? JSON.parse(contextBody) : contextBody;
          const wrapped = new Error(parsed.error || error.message);
          Object.assign(wrapped, parsed);
          throw wrapped;
        } catch (_) {}
      }
      throw error;
    }
    return data;
  }

  subscribeMessages(consultationId, onMessage) {
    const channel = this.supabase
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

    return () => this.supabase.removeChannel(channel);
  }

  subscribeConsultation(consultationId, onChange) {
    const channel = this.supabase
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

    return () => this.supabase.removeChannel(channel);
  }

  async createReport({ consultationId, counselorId, reason, context = [] }) {
    const { data: auth } = await this.supabase.auth.getUser();
    if (!auth.user) throw new Error("Not signed in");

    const { data, error } = await this.supabase
      .from("reports")
      .insert({
        consultation_id: consultationId,
        reporter_id: auth.user.id,
        counselor_id: counselorId,
        reason,
        context
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
