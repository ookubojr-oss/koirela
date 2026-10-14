import { createClient } from "@supabase/supabase-js";
import { loadStripe } from "@stripe/stripe-js";
import "./style.css";

const root = document.querySelector("#app");
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const configured = Boolean(url && key);
const db = configured ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
const stripePromise = stripeKey ? loadStripe(stripeKey) : Promise.resolve(null);

const seenWelcome = (() => { try { return localStorage.getItem("koirela_seen_welcome") === "1"; } catch { return false; } })();
const state = { user: null, counselors: [], consultation: null, messages: [], screen: seenWelcome ? "login" : "welcome", filter: "all", query: "", selected: null, busy: false, error: "", notice: "", payment: null, countdown: 0 };
let channels = [];
let refreshTimer;
let paymentElements;
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[c]);
const yen = n => "¥" + Number(n).toLocaleString("ja-JP");
const time = s => new Date(s).toLocaleTimeString("ja-JP", { hour:"2-digit", minute:"2-digit" });
const errorText = e => e?.context?.error?.message || e?.message || "通信に失敗しました。もう一度お試しください。";
function alertError(e) { state.error = errorText(e); render(); }
function setBusy(value) { state.busy = value; render(); }
async function invoke(name, body) {
  const { data, error } = await db.functions.invoke(name, { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
async function loadCounselors() {
  const { data, error } = await db.from("counselor_profiles")
    .select("user_id,display_name,counselor_type,specialty,bio,qualification_label,counselor_availability!inner(is_accepting)")
    .eq("verification_status","approved").eq("is_suspended",false)
    .eq("counselor_availability.is_accepting",true).order("updated_at",{ascending:false});
  if (error) throw error;
  state.counselors = data || [];
  render();
}
async function refreshConsultation() {
  const data = await invoke("sync-consultation-state", {});
  const next = data?.consultation || null;
  if (next?.id !== state.consultation?.id) {
    closeChannels();
    state.messages = [];
    if (next) {
      await loadMessages(next.id);
      subscribe(next.id);
    }
  }
  state.consultation = next;
  if (next) state.screen = "talk";
  render();
}
async function loadMessages(id) {
  const { data, error } = await db.from("messages").select("id,consultation_id,sender_id,kind,body,created_at")
    .eq("consultation_id", id).order("created_at", { ascending:true }).limit(500);
  if (error) throw error;
  state.messages = data || [];
}
function closeChannels() {
  channels.forEach(channel => { void db.removeChannel(channel); });
  channels = [];
}
function subscribe(id) {
  const messageChannel = db.channel("web-messages:" + id).on("postgres_changes",
    { event:"INSERT", schema:"public", table:"messages", filter:"consultation_id=eq." + id },
    payload => {
      if (!state.messages.some(m => m.id === payload.new.id)) state.messages.push(payload.new);
      render();
      scrollChat();
    }).subscribe();
  const consultationChannel = db.channel("web-consultation:" + id).on("postgres_changes",
    { event:"UPDATE", schema:"public", table:"consultations", filter:"id=eq." + id },
    () => { void refreshConsultation().catch(alertError); }).subscribe();
  channels = [messageChannel, consultationChannel];
}
function scrollChat() { requestAnimationFrame(() => { const el = document.querySelector(".messages"); if (el) el.scrollTop = el.scrollHeight; }); }

const tabIcons = {
  find: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke-width="1.8"/><path d="m21 21-4.35-4.35" stroke-width="1.8" stroke-linecap="round"/></svg>',
  talk: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5.5h16v11H9l-5 3v-14Z" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  mypage: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="4" stroke-width="1.8"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" stroke-width="1.8" stroke-linecap="round"/></svg>'
};
function layout(body) {
  const welcome = !state.user && state.screen === "welcome";
  const sectionTitle = !state.user ? "ログイン" : state.payment ? "お支払い" : state.screen === "find" ? "相談相手をさがす" : state.screen === "talk" ? "トーク" : "マイページ";
  root.innerHTML = `<main class="shell ${welcome ? "welcome-shell" : ""}">
  ${welcome ? "" : `<header class="topbar"><div class="topbar-title">${sectionTitle}</div><span class="header-brand">KoiRela</span></header>`}
  ${state.error ? `<div class="banner error" role="alert">${esc(state.error)}<button data-action="dismiss" aria-label="閉じる">×</button></div>` : ""}
  ${state.notice ? `<div class="banner" role="status">${esc(state.notice)}<button data-action="dismiss" aria-label="閉じる">×</button></div>` : ""}
  ${!stripeKey && !welcome ? '<div class="banner preview-banner" role="status">テスト公開中：現在、決済は利用できません。</div>' : ""}
  ${body}</main>`;
}
function render() {
  if (!configured) { layout('<section class="empty">Web版の接続設定が必要です。Vercelの環境変数を設定してください。</section>'); return; }
  if (!state.user) {
    if (state.screen === "welcome") {
      layout(`<section class="welcome">
        <div class="welcome-logo">KoiRela</div><div class="welcome-sub">恋愛相談</div>
        <div class="welcome-visual" aria-hidden="true"><svg viewBox="0 0 230 170" fill="none">
          <rect x="8" y="18" width="128" height="82" rx="24" fill="#fff"/>
          <path d="M40 98l-8 26 30-24" fill="#fff"/>
          <path d="M72 44c-4.5-6.5-13.5-7-18-1.7-4 4.7-3 11.7 1.6 16L72 74l16.4-15.7c4.6-4.3 5.6-11.3 1.6-16-4.5-5.3-13.5-4.8-18 1.7Z" fill="#F2837B"/>
          <rect x="104" y="66" width="118" height="72" rx="22" fill="#F2837B"/>
          <path d="M196 136l6 24-26-20" fill="#F2837B"/>
          <circle cx="140" cy="102" r="6" fill="#fff"/><circle cx="163" cy="102" r="6" fill="#ffffffb3"/><circle cx="186" cy="102" r="6" fill="#ffffff70"/>
          <circle cx="210" cy="30" r="4" fill="#F9D9D5"/><path d="M24 132l3 8 8 3-8 3-3 8-3-8-8-3 8-3 3-8Z" fill="#F9D9D5"/>
        </svg></div>
        <div class="welcome-copy"><h1>恋の悩みを、<br>話せる相手がいる。</h1><p>匿名で、気軽に。<br>経験者や資格を持つ相談員に<br>チャットで相談できます。</p></div>
        <div class="welcome-actions"><button class="primary" data-action="start-auth">はじめる <span aria-hidden="true">→</span></button><button class="welcome-login" data-action="already-auth">すでにアカウントをお持ちの方</button></div>
      </section>`);
      return;
    }
    layout(`<section class="auth"><div class="auth-mark" aria-hidden="true">♡</div><h1>KoiRelaへようこそ</h1><p>恋愛の悩みを、あなたのペースで。<br>相談履歴を安全に引き継げます。</p>
      <form id="auth-form"><label>メールアドレス<input name="email" type="email" autocomplete="email" placeholder="you@example.com" required></label>
      <label>パスワード<input name="password" type="password" autocomplete="${state.screen==="signup"?"new-password":"current-password"}" minlength="6" placeholder="6文字以上" required></label>
      ${state.screen === "signup" ? '<label>ニックネーム<input name="nickname" autocomplete="nickname" required maxlength="40"></label>' : ""}
      <button class="primary" type="submit" ${state.busy ? "disabled" : ""}>${state.screen === "signup" ? "アカウントを作る" : "ログイン"}</button></form>
      <button class="link auth-toggle" data-action="toggle-auth">${state.screen === "signup" ? "ログインはこちら" : "はじめての方はこちら"}</button></section>`);
    return;
  }
  const c = state.consultation;
  const active = c && ["waiting", "active"].includes(c.status);
  let body = "";
  if (state.payment) body = paymentView();
  else if (active) body = talkView(c);
  else if (state.screen === "mypage") {
    const nickname = esc(state.user.user_metadata?.nickname || state.user.email?.split("@")[0] || "ゲスト");
    body = `<section class="page mypage"><div class="card user-card"><div class="avatar mypage-avatar">${esc(nickname.slice(0,1))}</div><div class="user-info"><strong>${nickname}</strong><small>匿名で利用中</small></div></div>
      <div class="menu"><button class="menu-row" data-action="tab-talk"><span class="menu-icon">${tabIcons.talk}</span><span>相談・トーク</span><span class="chevron">›</span></button>
      <button class="menu-row" data-action="logout"><span class="menu-icon">↪</span><span>ログアウト</span><span class="chevron">›</span></button></div>
      <div class="account-email">${esc(state.user.email)}</div></section>`;
  }
  else if (state.screen === "talk") body = `<section class="page"><h1>トーク</h1><div class="empty">相談を始めると、ここに表示されます。</div></section>`;
  else body = findView();
  layout(body + `<nav class="tabs" aria-label="メイン"><button data-action="tab-find" class="${state.screen==="find"&&!active?"current":""}">${tabIcons.find}<span>探す</span></button><button data-action="tab-talk" class="${active||state.screen==="talk"?"current":""}">${tabIcons.talk}<span>トーク</span></button><button data-action="tab-mypage" class="${state.screen==="mypage"&&!active?"current":""}">${tabIcons.mypage}<span>マイページ</span></button></nav>`);
  if (state.payment) void mountPayment();
  if (active) scrollChat();
}
function findView() {
  const visible = state.counselors.filter(c => (state.filter === "all" || (state.filter === "pro" ? c.counselor_type === "qualified" : c.counselor_type !== "qualified")) &&
    (!state.query || [c.display_name,c.specialty,c.bio,c.qualification_label].filter(Boolean).join(" ").toLowerCase().includes(state.query.toLowerCase())));
  return `<section class="page find-page"><div class="search-box"><span class="search-symbol" aria-hidden="true">⌕</span><input id="listener-search" type="search" placeholder="名前・相談内容で検索" aria-label="相談員を検索" value="${esc(state.query)}"></div>
  <div class="filters" aria-label="相談員の種類"><button class="chip ${state.filter==="all"?"on":""}" data-action="filter-all">すべて</button><button class="chip ${state.filter==="exp"?"on":""}" data-action="filter-exp">経験者</button><button class="chip ${state.filter==="pro"?"on":""}" data-action="filter-pro">資格者</button></div>
  <div class="price-summary"><span>15分相談</span><strong>100円</strong><small>延長15分も100円</small></div>
  ${visible.length ? visible.map(c => `<article class="card counselor" data-search="${esc([c.display_name,c.specialty,c.bio,c.qualification_label].filter(Boolean).join(" ").toLowerCase())}"><div class="counselor-top"><div class="avatar">${esc(c.display_name?.slice(0,1)||"♡")}<span class="online-dot"></span></div><div class="details"><div class="name">${esc(c.display_name)} <span class="kind-badge ${c.counselor_type==="qualified"?"pro":"exp"}">${c.counselor_type==="qualified"?"資格者":"経験者"}</span></div><small>● 受付中</small></div></div>
  <p class="counselor-bio">${esc(c.specialty||c.bio||"あなたの気持ちを聞かせてください。")}</p>
  <div class="counselor-foot"><div class="counselor-price">15分相談 <strong>100円</strong></div><button class="small-primary" data-action="select" data-id="${esc(c.user_id)}" ${!stripeKey?'disabled':''}>${stripeKey?'相談する':'決済準備中'}</button></div></article>`).join("") : '<div class="empty">条件に合う受付中の相談員はいません。</div>'}
  <button class="link reload" data-action="reload">一覧を更新 ↻</button></section>`;
}

function talkView(c) {
  const waiting = c.status === "waiting";
  const remaining = c.ends_at ? Math.max(0, Math.ceil((new Date(c.ends_at).getTime()-Date.now())/1000)) : 0;
  const name = c.counselor?.display_name || state.counselors.find(x => x.user_id===c.counselor_id)?.display_name || "相談員";
  return `<section class="talk"><div class="talk-head"><div><div class="eyebrow">${waiting?"WAITING":"IN SESSION"}</div><h1>${esc(name)}さん</h1></div><span class="pill">${waiting?"お返事を待っています":`残り ${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,"0")}`}</span></div>
  ${waiting ? `<div class="waiting"><div class="pulse">♡</div><h2>相談員を待っています</h2><p>決済を確認しました。相談員が受け付けると15分が始まります。</p><button class="link" data-action="refresh">状態を更新</button><button class="link muted" data-action="cancel">相談をキャンセル</button></div>` :
  `<div class="messages" aria-live="polite">${state.messages.length ? state.messages.map(m => `<div class="message ${m.kind==="system"?"system":m.sender_id===state.user.id?"mine":"theirs"}"><span>${esc(m.body)}</span>${m.kind!=="system"?`<small>${time(m.created_at)}</small>`:""}</div>`).join("") : '<p class="hint">ここから相談を始めましょう。</p>'}</div>
  <form id="message-form" class="composer"><input name="body" aria-label="メッセージ" placeholder="メッセージを入力" maxlength="2000" required><button type="submit" ${state.busy?"disabled":""}>送信</button></form>
  <div class="actions"><button class="secondary" data-action="extend" ${state.busy||!stripeKey?"disabled":""}>15分延長 · ¥100</button><button class="link muted" data-action="end">相談を終了</button></div>`}
  </section>`;
}
function paymentView() {
  const ext = state.payment.kind === "extension";
  return `<section class="page payment"><button class="back" data-action="payment-back">← 戻る</button><div class="eyebrow">SECURE PAYMENT</div><h1>${ext?"15分延長":"相談を始める"}</h1><p>${ext?"現在の相談を15分延長します。":"相談員が受け付けると15分の相談が始まります。"}</p><div class="price"><span>${ext?"追加15分":"はじめの15分"}</span><strong>${yen(state.payment.amount)}</strong></div><form id="payment-form"><div id="payment-element"></div><button class="primary" type="submit" ${state.busy?"disabled":""}>¥100を支払う</button></form><p class="fine">Stripeの安全な決済画面でお支払いします。</p></section>`;
}
async function mountPayment() {
  if (!state.payment || document.querySelector("#payment-element")?.children.length) return;
  const stripe = await stripePromise;
  if (!stripe || !state.payment || !document.querySelector("#payment-element")) return;
  paymentElements = stripe.elements({ clientSecret:state.payment.paymentIntentClientSecret, appearance:{ theme:"stripe", variables:{ colorPrimary:"#bf698e", borderRadius:"12px" } } });
  paymentElements.create("payment", { layout:"tabs" }).mount("#payment-element");
}
async function startPayment(kind, counselorId) {
  setBusy(true);
  try {
    if (!stripeKey) throw new Error("現在、決済機能は準備中です。設定が完了するまでお支払いできません。");
    if (kind==="initial" && state.consultation) throw new Error("進行中の相談があります。");
    const data = await invoke(kind==="initial"?"create-payment-intent":"create-extension-payment-intent",
      kind==="initial"?{counselorId}:{consultationId:state.consultation.id});
    state.payment = { ...data, kind };
    state.error = "";
  } catch(e) { state.error=errorText(e); }
  state.busy=false; render();
}
async function submitPayment() {
  const stripe = await stripePromise;
  if (!stripe || !paymentElements) throw new Error("決済画面を読み込めませんでした。");
  state.busy=true;
  const button = document.querySelector("#payment-form button");
  if (button) button.disabled=true;
  const { error } = await stripe.confirmPayment({ elements:paymentElements,
    confirmParams:{ return_url:location.origin + location.pathname + "?payment_return=1" },
    redirect:"if_required" });
  state.busy=false;
  if (error) throw error;
  state.payment=null; paymentElements=null;
  state.notice="決済を確認しています。少しお待ちください。";
  await refreshConsultation();
}
async function sendMessage(form) {
  const body = form.elements.body.value.trim();
  if (!body || !state.consultation) return;
  form.elements.body.value="";
  setBusy(true);
  try {
    await invoke("send-message", { consultationId:state.consultation.id, body, context:state.messages.slice(-5).map(m=>m.body) });
    await loadMessages(state.consultation.id);
    state.error="";
  } catch(e) { form.elements.body.value=body; state.error=errorText(e); }
  state.busy=false; render();
}
root.addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.target;
  if (state.busy) return;
  try {
    if (form.id==="auth-form") {
      setBusy(true);
      const email=form.elements.email.value.trim(), password=form.elements.password.value;
      const result=state.screen==="signup"
        ? await db.auth.signUp({ email,password,options:{ data:{nickname:form.elements.nickname.value.trim()},emailRedirectTo:location.origin } })
        : await db.auth.signInWithPassword({email,password});
      if (result.error) throw result.error;
      if (state.screen==="signup" && !result.data.session) state.notice="確認メールを送信しました。メール内のリンクを開いてください。";
      state.busy=false; render();
    } else if (form.id==="message-form") await sendMessage(form);
    else if (form.id==="payment-form") await submitPayment();
  } catch(e) { state.busy=false; alertError(e); }
});
root.addEventListener("click", async event => {
  const button=event.target.closest("[data-action]");
  if (!button || state.busy) return;
  const action=button.dataset.action;
  if (action==="dismiss") { state.error=""; state.notice=""; render(); return; }
  if (action==="start-auth" || action==="already-auth") { try { localStorage.setItem("koirela_seen_welcome","1"); } catch {} state.screen="login"; render(); return; }
  if (action==="toggle-auth") { state.screen=state.screen==="signup"?"login":"signup"; render(); return; }
  if (action.startsWith("filter-")) { state.filter=action.slice(7); render(); return; }
  if (action.startsWith("tab-")) { if (state.consultation && action!=="tab-mypage") state.screen="talk"; else state.screen=action.slice(4); render(); return; }
  if (action==="payment-back") {
    if (state.payment?.kind==="initial") {
      // A created intent is intentionally retained; reuse it on return instead of creating another.
      state.notice="決済を続ける場合は、もう一度相談を選んでください。";
    }
    state.payment=null; paymentElements=null; render(); return;
  }
  try {
    if (action==="select") {
      if (state.pendingPayment?.counselorId===button.dataset.id) { state.payment=state.pendingPayment.value; render(); return; }
      await startPayment("initial",button.dataset.id);
      if (state.payment) state.pendingPayment={counselorId:button.dataset.id,value:state.payment};
    }
    else if (action==="extend") await startPayment("extension");
    else if (action==="refresh") await refreshConsultation();
    else if (action==="reload") await loadCounselors();
    else if (action==="cancel" && confirm("待機中の相談をキャンセルしますか？")) {
      setBusy(true); await invoke("cancel-consultation",{consultationId:state.consultation.id}); state.consultation=null; closeChannels(); state.screen="find"; state.busy=false; render();
    }
    else if (action==="end" && confirm("相談を終了しますか？")) {
      setBusy(true); await invoke("end-consultation",{consultationId:state.consultation.id}); state.consultation=null; closeChannels(); state.screen="talk"; state.busy=false; render();
    }
    else if (action==="logout") await db.auth.signOut();
  } catch(e) { state.busy=false; alertError(e); }
});
async function initialize() {
  render();
  if (!configured) return;
  const { data:{ session } }=await db.auth.getSession();
  state.user=session?.user||null;
  db.auth.onAuthStateChange((_event,session) => {
    const changed=state.user?.id!==session?.user?.id;
    state.user=session?.user||null;
    if (changed) { closeChannels(); state.consultation=null; state.messages=[]; state.payment=null; state.pendingPayment=null; state.screen=state.user?"find":"login"; }
    render();
    if (changed && state.user) void Promise.all([loadCounselors(),refreshConsultation()]).catch(alertError);
  });
  if (state.user) await Promise.all([loadCounselors(),refreshConsultation()]);
  if (new URLSearchParams(location.search).has("payment_return")) {
    history.replaceState(null,"",location.pathname);
    state.notice="決済状況を確認しています。";
    render();
  }
  refreshTimer=setInterval(() => { if (state.user && !state.payment) void refreshConsultation().catch(()=>{}); },5000);
  setInterval(() => { if (state.consultation?.status==="active" && !state.payment) {
    const el=document.querySelector(".pill");
    if (el && state.consultation.ends_at) {
      const remaining=Math.max(0,Math.ceil((new Date(state.consultation.ends_at).getTime()-Date.now())/1000));
      el.textContent=`残り ${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,"0")}`;
    }
  } },1000);
}
initialize().catch(alertError);
