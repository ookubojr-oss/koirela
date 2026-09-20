import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const config = window.KOIRELA_CONFIG || {};
const configured = Boolean(config.supabaseUrl && config.supabaseAnonKey);
const supabase = configured ? createClient(config.supabaseUrl, config.supabaseAnonKey) : null;

const state = {
  profile: null,
  moderation: [],
  reports: [],
  counselors: new Map(),
  verifications: new Map(),
  consultations: [],
  payments: [],
  support: [],
  deletions: [],
  analytics: {},
  maintenance: {enabled:false,title:"メンテナンス中",message:""},
  audit: [],
  filter: "all",
  query: ""
};

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

function fmt(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ja-JP", {
    year:"numeric", month:"numeric", day:"numeric", hour:"2-digit", minute:"2-digit"
  }).format(new Date(value));
}

function setStatus(message, danger=false) {
  const el = document.getElementById("admin-status");
  el.textContent = message;
  el.classList.toggle("danger", danger);
}

function renderAuth() {
  document.getElementById("auth-view").hidden = false;
  document.getElementById("dashboard-view").hidden = true;
  if (!configured) setStatus("web/config.js にSupabaseの公開設定を入れてください。", true);
}

async function ensureAdmin() {
  if (!supabase) return false;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id,role,nickname")
    .eq("id", auth.user.id)
    .single();

  if (error || profile?.role !== "admin") {
    await supabase.auth.signOut();
    setStatus("このアカウントには運営権限がありません。", true);
    return false;
  }

  state.profile = profile;
  return true;
}

async function loadAll() {
  if (!await ensureAdmin()) {
    renderAuth();
    return;
  }

  const [moderationRes, reportsRes, counselorsRes, verificationRes, consultationRes, paymentRes, supportRes, deletionRes, analyticsRes, maintenanceRes, auditRes] = await Promise.all([
    supabase.from("moderation_events").select("*").order("created_at",{ascending:false}).limit(200),
    supabase.from("reports").select("*").order("created_at",{ascending:false}).limit(200),
    supabase.from("counselor_profiles").select("user_id,display_name,counselor_type,gender,specialty,bio,qualification_label,is_suspended,verification_status,created_at").limit(500),
    supabase.from("identity_verifications").select("counselor_id,document_path,qualification_document_path,status,created_at,reviewed_at").limit(500),
    supabase.from("consultations").select("id,status,price_jpy,created_at,user_id,counselor_id").order("created_at",{ascending:false}).limit(100),
    supabase.from("payments").select("consultation_id,amount_jpy,status,kind,created_at").order("created_at",{ascending:false}).limit(200),
    supabase.from("support_tickets").select("*").order("created_at",{ascending:false}).limit(100),
    supabase.from("account_deletion_requests").select("*").order("requested_at",{ascending:false}).limit(100),
    supabase.rpc("admin_analytics_summary"),
    supabase.from("app_settings").select("value").eq("key","maintenance").maybeSingle(),
    supabase.from("admin_audit_logs").select("*").order("created_at",{ascending:false}).limit(100)
  ]);

  const firstError = moderationRes.error || reportsRes.error || counselorsRes.error || verificationRes.error || consultationRes.error || paymentRes.error || supportRes.error || deletionRes.error || analyticsRes.error || maintenanceRes.error || auditRes.error;
  if (firstError) {
    setStatus(firstError.message, true);
    return;
  }

  state.moderation = moderationRes.data || [];
  state.reports = reportsRes.data || [];
  state.counselors = new Map((counselorsRes.data || []).map(row => [row.user_id,row]));
  state.verifications = new Map((verificationRes.data || []).map(row => [row.counselor_id,row]));
  state.consultations = consultationRes.data || [];
  state.payments = paymentRes.data || [];
  state.support = supportRes.data || [];
  state.deletions = deletionRes.data || [];
  state.analytics = analyticsRes.data || {};
  state.maintenance = maintenanceRes.data?.value || {enabled:false,title:"メンテナンス中",message:""};
  state.audit = auditRes.data || [];
  renderDashboard();
}

function rows() {
  const moderation = state.moderation.map(row => ({
    id: row.id,
    kind: "moderation",
    counselor_id: row.counselor_id,
    type: row.category,
    message: row.attempted_message || "",
    context: row.context || [],
    strike: row.strike_number || 0,
    action: row.action,
    status: row.status,
    reviewed_at: row.reviewed_at,
    created_at: row.created_at
  }));

  const reports = state.reports
    .filter(row => row.status !== "confirmed")
    .map(row => ({
      id: row.id,
      kind: "report",
      counselor_id: row.counselor_id,
      type: "ユーザー通報: " + row.reason,
      message: "",
      context: row.context || [],
      strike: 0,
      action: "運営確認待ち",
      status: row.status,
      reviewed_at: row.reviewed_at,
      created_at: row.created_at
    }));

  return [...moderation, ...reports].sort((a,b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

function filteredRows() {
  const q = state.query.trim().toLowerCase();
  return rows().filter(row => {
    const counselor = state.counselors.get(row.counselor_id);
    if (state.filter === "unreviewed" && row.reviewed_at) return false;
    if (state.filter === "warning" && row.strike !== 1) return false;
    if (state.filter === "suspended" && row.strike < 2) return false;
    if (state.filter === "report" && row.kind !== "report") return false;
    if (!q) return true;

    const hay = [
      counselor?.display_name,
      row.counselor_id,
      row.type,
      row.message,
      row.action,
      ...(Array.isArray(row.context) ? row.context : [])
    ].join(" ").toLowerCase();

    return hay.includes(q);
  });
}

function renderDashboard() {
  document.getElementById("auth-view").hidden = true;
  document.getElementById("dashboard-view").hidden = false;
  setStatus("接続済み：" + (state.profile?.nickname || "運営"));

  const allRows = rows();
  document.getElementById("stat-unreviewed").textContent = String(allRows.filter(x => !x.reviewed_at).length);
  document.getElementById("stat-suspended").textContent = String([...state.counselors.values()].filter(x => x.is_suspended).length);
  document.getElementById("stat-events").textContent = String(state.moderation.length);
  document.getElementById("stat-reports").textContent = String(state.reports.filter(x => x.status === "open").length);
  document.getElementById("analytics-users").textContent = String(state.analytics.users || 0);
  document.getElementById("analytics-completed").textContent = String(state.analytics.completed_month || 0);
  document.getElementById("analytics-gross").textContent = Number(state.analytics.gross_month_jpy || 0).toLocaleString() + "円";

  const list = filteredRows();
  const box = document.getElementById("live-logs");

  if (!list.length) {
    box.innerHTML = '<div class="empty">該当するログはありません。</div>';
  } else {
    box.innerHTML = list.map(row => {
      const counselor = state.counselors.get(row.counselor_id);
      const suspended = Boolean(counselor?.is_suspended);
      const label = row.kind === "report" ? "ユーザー通報" : (row.strike >= 2 ? "2回目・停止" : "1回目・警告");
      const context = (Array.isArray(row.context) ? row.context : [])
        .map(x => "<div>"+esc(x)+"</div>")
        .join("");

      return '<article class="live-log">'+
        '<button class="live-log-head" data-toggle="'+esc(row.id)+'">'+
          '<span><b>'+esc(counselor?.display_name || "相談員")+'</b><small>'+esc(row.type)+'</small></span>'+
          '<span class="pill '+(row.strike>=2?"danger":"")+'">'+esc(label)+'</span>'+
          '<time>'+esc(fmt(row.created_at))+'</time><i>⌄</i>'+
        '</button>'+
        '<div class="live-log-body" id="body-'+esc(row.id)+'" hidden>'+
          (row.message ? '<h4>検知した内容</h4><div class="message">'+esc(row.message)+'</div>' : '')+
          '<h4>前後ログ</h4><div class="context">'+(context || '<div>記録なし</div>')+'</div>'+
          '<div class="actions">'+
            (row.kind === "report" ? '<button data-confirm-report="'+esc(row.id)+'">違反として確定</button>' : '')+
            (row.kind === "moderation" && row.status !== "overturned" ? '<button data-overturn="'+esc(row.id)+'">誤検知として取り消す</button>' : '')+
            (suspended ? '<button class="danger-button" data-restore="'+esc(row.counselor_id)+'">停止を解除</button>' : '')+
          '</div>'+
        '</div>'+
      '</article>';
    }).join("");
  }

  renderApplications();
  renderOperations();

  const audit = document.getElementById("audit-list");
  audit.innerHTML = state.audit.length
    ? state.audit.map(row =>
        '<div class="audit-row"><time>'+esc(fmt(row.created_at))+'</time><b>'+esc(row.action)+'</b><span>'+esc(row.target_type)+" "+esc(row.target_id || "")+'</span></div>'
      ).join("")
    : '<div class="empty">運営操作履歴はまだありません。</div>';

  bindActions();
}


function renderOperations() {
  const paymentByConsultation = new Map();
  state.payments.forEach(p => {
    const current = paymentByConsultation.get(p.consultation_id);
    if (!current || Date.parse(p.created_at) > Date.parse(current.created_at)) paymentByConsultation.set(p.consultation_id,p);
  });

  const consultationRows = document.getElementById("consultation-rows");
  consultationRows.innerHTML = state.consultations.length ? state.consultations.map(c => {
    const p = paymentByConsultation.get(c.id);
    return '<tr><td>'+esc(fmt(c.created_at))+'</td><td>'+esc(c.id.slice(0,8))+'…</td><td>'+esc(c.status)+'</td><td>'+Number(c.price_jpy||0).toLocaleString()+'円</td><td>'+esc(p?.status||"—")+'</td></tr>';
  }).join("") : '<tr><td colspan="5">相談履歴はまだありません。</td></tr>';

  const support = document.getElementById("support-list");
  support.innerHTML = state.support.length ? state.support.map(t =>
    '<article class="ticket-card"><div class="ticket-top"><b>'+esc(t.subject)+'</b><span>'+esc(t.status)+'</span></div><div class="ticket-body">'+esc(t.message)+'</div>'+
    '<textarea class="ticket-reply" id="reply-'+esc(t.id)+'" placeholder="運営からの返信">'+esc(t.admin_reply||"")+'</textarea>'+
    '<div class="actions"><button data-support-answer="'+esc(t.id)+'">返信して回答済みにする</button><button data-support-close="'+esc(t.id)+'">完了にする</button></div></article>'
  ).join("") : '<div class="empty">お問い合わせはありません。</div>';

  const deletions = document.getElementById("deletion-rows");
  deletions.innerHTML = state.deletions.length ? state.deletions.map(d =>
    '<tr><td>'+esc(fmt(d.requested_at))+'</td><td>'+esc(d.user_id)+'</td><td>'+esc(d.status)+'</td><td>'+
    (d.status==="pending"?'<button data-deletion-processing="'+esc(d.user_id)+'">処理中にする</button> ':'')+
    (d.status!=="completed"?'<button data-deletion-complete="'+esc(d.user_id)+'">完了にする</button>':'')+
    '</td></tr>'
  ).join("") : '<tr><td colspan="4">削除申請はありません。</td></tr>';

  document.getElementById("maintenance-enabled").checked = Boolean(state.maintenance.enabled);
  document.getElementById("maintenance-title").value = state.maintenance.title || "メンテナンス中";
  document.getElementById("maintenance-message").value = state.maintenance.message || "";
}

function genderLabel(value) {
  return value === "female" ? "女性" : value === "male" ? "男性" : value === "other" ? "その他" : "回答しない";
}

function renderApplications() {
  const box = document.getElementById("application-list");
  const pending = [...state.counselors.values()].filter(row => row.verification_status === "pending");

  if (!pending.length) {
    box.innerHTML = '<div class="empty">審査待ちの申請はありません。</div>';
    return;
  }

  box.innerHTML = pending.map(row => {
    const verification = state.verifications.get(row.user_id);
    return '<article class="application-card">'+
      '<div class="application-head"><div><b>'+esc(row.display_name)+'</b><small>'+esc(row.user_id)+'</small></div><span class="pill">審査待ち</span></div>'+
      '<div class="application-meta">'+
        '<div><span>活動タイプ</span><strong>'+esc(row.counselor_type === "qualified" ? "資格者" : "経験者")+'</strong></div>'+
        '<div><span>性別</span><strong>'+esc(genderLabel(row.gender))+'</strong></div>'+
        '<div><span>得意な相談</span><strong>'+esc(row.specialty || "未入力")+'</strong></div>'+
      '</div>'+
      '<div class="message" style="margin-top:10px">'+esc(row.bio || "自己紹介なし")+'</div>'+
      '<div class="application-docs">'+
        (verification?.document_path ? '<button data-open-doc="'+esc(verification.document_path)+'">本人確認書類</button>' : '<span class="pill danger">本人確認書類なし</span>')+
        (verification?.qualification_document_path ? '<button data-open-doc="'+esc(verification.qualification_document_path)+'">資格証明</button>' : '')+
      '</div>'+
      '<div class="application-actions">'+
        '<button class="approve" data-review-counselor="'+esc(row.user_id)+'" data-review-status="approved">承認する</button>'+
        '<button class="reject" data-review-counselor="'+esc(row.user_id)+'" data-review-status="rejected">却下する</button>'+
      '</div>'+
    '</article>';
  }).join("");
}

async function openVerificationDocument(path) {
  const { data, error } = await supabase.storage.from("counselor-verification").createSignedUrl(path, 60);
  if (error) return alert(error.message);
  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}

function bindActions() {
  document.querySelectorAll("[data-support-answer]").forEach(btn => btn.addEventListener("click", async () => {
    const id=btn.dataset.supportAnswer;
    const reply=document.getElementById("reply-"+id)?.value?.trim()||"";
    if(!reply)return alert("返信内容を入力してください");
    btn.disabled=true;
    const {error}=await supabase.from("support_tickets").update({admin_reply:reply,status:"answered",updated_at:new Date().toISOString()}).eq("id",id);
    if(error)alert(error.message);await loadAll();
  }));
  document.querySelectorAll("[data-support-close]").forEach(btn => btn.addEventListener("click", async () => {
    btn.disabled=true;const {error}=await supabase.from("support_tickets").update({status:"closed",updated_at:new Date().toISOString()}).eq("id",btn.dataset.supportClose);
    if(error)alert(error.message);await loadAll();
  }));
  document.querySelectorAll("[data-deletion-processing]").forEach(btn => btn.addEventListener("click", async () => {
    const {error}=await supabase.from("account_deletion_requests").update({status:"processing"}).eq("user_id",btn.dataset.deletionProcessing);
    if(error)alert(error.message);await loadAll();
  }));
  document.querySelectorAll("[data-deletion-complete]").forEach(btn => btn.addEventListener("click", async () => {
    if(!confirm("削除処理完了として記録しますか？ 実データ削除処理は別途バックエンドで完了している必要があります。"))return;
    const {error}=await supabase.from("account_deletion_requests").update({status:"completed",completed_at:new Date().toISOString()}).eq("user_id",btn.dataset.deletionComplete);
    if(error)alert(error.message);await loadAll();
  }));

  document.querySelectorAll("[data-open-doc]").forEach(btn => btn.addEventListener("click", () => {
    void openVerificationDocument(btn.dataset.openDoc);
  }));

  document.querySelectorAll("[data-review-counselor]").forEach(btn => btn.addEventListener("click", async () => {
    const counselorId = btn.dataset.reviewCounselor;
    const reviewStatus = btn.dataset.reviewStatus;
    const counselor = state.counselors.get(counselorId);
    if (!confirm((reviewStatus === "approved" ? "承認" : "却下") + "しますか？")) return;
    btn.disabled = true;
    const { error } = await supabase.rpc("admin_review_counselor", {
      p_counselor_id: counselorId,
      p_status: reviewStatus,
      p_qualification_label: counselor?.qualification_label || null
    });
    if (error) alert(error.message);
    await loadAll();
  }));

  document.querySelectorAll("[data-toggle]").forEach(btn => btn.addEventListener("click", () => {
    const body = document.getElementById("body-"+btn.dataset.toggle);
    if (body) body.hidden = !body.hidden;
  }));

  document.querySelectorAll("[data-confirm-report]").forEach(btn => btn.addEventListener("click", async () => {
    btn.disabled = true;
    const { error } = await supabase.rpc("admin_confirm_report",{p_report_id:btn.dataset.confirmReport});
    if (error) alert(error.message);
    await loadAll();
  }));

  document.querySelectorAll("[data-overturn]").forEach(btn => btn.addEventListener("click", async () => {
    btn.disabled = true;
    const { error } = await supabase.rpc("admin_overturn_moderation",{p_event_id:btn.dataset.overturn});
    if (error) alert(error.message);
    await loadAll();
  }));

  document.querySelectorAll("[data-restore]").forEach(btn => btn.addEventListener("click", async () => {
    if (!confirm("相談員アカウントの停止を解除しますか？")) return;
    btn.disabled = true;
    const { error } = await supabase.rpc("admin_restore_counselor",{p_counselor_id:btn.dataset.restore});
    if (error) alert(error.message);
    await loadAll();
  }));
}

document.getElementById("admin-login-form").addEventListener("submit", async event => {
  event.preventDefault();
  if (!supabase) return setStatus("Supabase設定がありません。", true);

  const email = document.getElementById("admin-email").value.trim();
  const password = document.getElementById("admin-password").value;
  const { error } = await supabase.auth.signInWithPassword({email,password});

  if (error) return setStatus(error.message, true);
  await loadAll();
});

document.getElementById("admin-refresh").addEventListener("click", loadAll);
document.getElementById("maintenance-save").addEventListener("click", async () => {
  const enabled=document.getElementById("maintenance-enabled").checked;
  const title=document.getElementById("maintenance-title").value.trim()||"メンテナンス中";
  const message=document.getElementById("maintenance-message").value.trim();
  const {error}=await supabase.rpc("admin_update_maintenance",{p_enabled:enabled,p_title:title,p_message:message});
  if(error)return alert(error.message);
  await loadAll();
});
document.getElementById("admin-logout").addEventListener("click", async () => {
  if (supabase) await supabase.auth.signOut();
  state.profile = null;
  renderAuth();
});
document.getElementById("admin-search").addEventListener("input", event => {
  state.query = event.target.value;
  renderDashboard();
});
document.querySelectorAll("[data-filter]").forEach(btn => btn.addEventListener("click", () => {
  document.querySelectorAll("[data-filter]").forEach(x => x.classList.remove("on"));
  btn.classList.add("on");
  state.filter = btn.dataset.filter;
  renderDashboard();
}));

if (configured) {
  supabase.auth.onAuthStateChange(() => setTimeout(loadAll,0));
  loadAll();
} else {
  renderAuth();
}
