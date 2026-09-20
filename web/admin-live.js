import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const config = window.KOIRELA_CONFIG || {};
const configured = Boolean(config.supabaseUrl && config.supabaseAnonKey);
const supabase = configured ? createClient(config.supabaseUrl, config.supabaseAnonKey) : null;

const state = {
  profile: null,
  moderation: [],
  reports: [],
  counselors: new Map(),
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

  const [moderationRes, reportsRes, counselorsRes, auditRes] = await Promise.all([
    supabase.from("moderation_events").select("*").order("created_at",{ascending:false}).limit(200),
    supabase.from("reports").select("*").order("created_at",{ascending:false}).limit(200),
    supabase.from("counselor_profiles").select("user_id,display_name,is_suspended,verification_status").limit(500),
    supabase.from("admin_audit_logs").select("*").order("created_at",{ascending:false}).limit(100)
  ]);

  const firstError = moderationRes.error || reportsRes.error || counselorsRes.error || auditRes.error;
  if (firstError) {
    setStatus(firstError.message, true);
    return;
  }

  state.moderation = moderationRes.data || [];
  state.reports = reportsRes.data || [];
  state.counselors = new Map((counselorsRes.data || []).map(row => [row.user_id,row]));
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

  const audit = document.getElementById("audit-list");
  audit.innerHTML = state.audit.length
    ? state.audit.map(row =>
        '<div class="audit-row"><time>'+esc(fmt(row.created_at))+'</time><b>'+esc(row.action)+'</b><span>'+esc(row.target_type)+" "+esc(row.target_id || "")+'</span></div>'
      ).join("")
    : '<div class="empty">運営操作履歴はまだありません。</div>';

  bindActions();
}

function bindActions() {
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
