import { createClient } from "@supabase/supabase-js";
import "./commit98199-auth.css";
// Exact visual reference: index.html at commit 98199c71b22ac53ab224eb1ad7ca7c302d7e2be9.
// The original seven screens and original CSS are retained; only live data and auth are wired.
const $=(q,root=document)=>root.querySelector(q);
const $$=(q,root=document)=>Array.from(root.querySelectorAll(q));
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const url=import.meta.env.VITE_SUPABASE_URL,key=import.meta.env.VITE_SUPABASE_ANON_KEY;
const db=url&&key?createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
const state={user:null,counselors:[],selected:null,consultation:null,messages:[],filter:"all",channels:[],authMode:"login",busy:false};
const phone=$(".phone");
let toastTimeout;
function toast(msg){
  let el=$("#koirela-notice");
  if(!el){el=document.createElement("div");el.id="koirela-notice";el.setAttribute("role","status");phone.appendChild(el);}
  el.textContent=String(msg);el.classList.add("visible");
  clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.classList.remove("visible"),4500);
}
function errorText(e){return e?.context?.error?.message||e?.message||"通信に失敗しました。";}
const screens=new Set(["welcome","home","find","profile","mypage","history","chat"]);
function show(name){
  if(!screens.has(name))return;
  if(name==="chat"&&state.consultation?.status!=="active"){
    toast(state.consultation?.status==="waiting"?"相談員の受付を待っています。":"進行中の相談はありません。");name="home";
  }
  const target=$("#screen-"+name);
  $$(".screen").forEach(el=>el.classList.toggle("active",el===target));
  $$(".tabbar").forEach(nav=>$$(".tab",nav).forEach((button,index)=>button.classList.toggle("on",["home","find","mypage"][index]===name)));
  if(name==="home")renderHome();
  if(name==="find")void loadCounselors();
  if(name==="mypage"){renderMyPage();if(!state.user)openAuth();}
  if(name==="history")void loadHistory();
  if(name==="profile")renderProfile();
  if(name==="chat")renderChat();
  $(".content",target)?.scrollTo(0,0);
  history.replaceState(null,"","#"+name);
}
window.show=show;
function clearDemos(){
  $$(".listener",$("#screen-find")).forEach(el=>el.remove());
  $("#screen-history .content .card").innerHTML='<div class="koirela-placeholder">相談履歴はまだありません。</div>';
  $("#msgs").innerHTML='<div class="sys">相談が始まるとメッセージを表示します。</div>';
  $("#screen-chat .fee").textContent="15分相談・100円（決済準備中）";
  const profileButton=$("#screen-profile .primary");
  profileButton.textContent="15分100円で相談する";
  profileButton.setAttribute("onclick","requestPayment()");
  const mypage=$("#screen-mypage");
  $(".user-name",mypage).textContent="ゲスト";
  $(".user-sub",mypage).textContent="ログインしていません";
  $(".user-card .avatar",mypage).textContent="♡";
  $(".user-card .outline",mypage).addEventListener("click",()=>state.user?editNickname():openAuth());
  const buttons=$$(".menu-row",mypage);
  if(buttons[1])buttons[1].addEventListener("click",()=>toast("現在、決済は準備中です。"));
  if(buttons[2])buttons[2].addEventListener("click",()=>toast("お問い合わせ窓口は正式公開前にご案内します。"));
  if(buttons[3])buttons[3].addEventListener("click",()=>openSettings());
  $("#screen-find .topbar .iconbtn").addEventListener("click",()=>toast("経験者・資格者のボタンで絞り込めます。"));
  renderHome();
}
function makeAuth(){
  const layer=document.createElement("div");
  layer.id="koirela-auth-layer";layer.setAttribute("role","dialog");layer.setAttribute("aria-modal","true");
  layer.setAttribute("aria-label","ログイン");
  layer.hidden=true;
  layer.innerHTML='<div class="auth-panel">'+
  '<button class="auth-close" type="button" aria-label="閉じる">×</button>'+
  '<div class="auth-heart">♥</div><h2>KoiRelaへようこそ</h2>'+
  '<p>相談履歴や支払い情報を<br>安全に引き継げます。</p>'+
  '<form id="real-auth-form">'+
  '<label>メールアドレス<input name="email" type="email" autocomplete="email" required placeholder="you@example.com"></label>'+
  '<label>パスワード<input name="password" type="password" minlength="8" autocomplete="current-password" required placeholder="8文字以上"></label>'+
  '<label class="signup-only" hidden>ニックネーム<input name="nickname" type="text" maxlength="40" autocomplete="nickname" placeholder="ニックネーム"></label>'+
  '<button type="submit" class="primary auth-submit">ログイン</button></form>'+
  '<button class="auth-toggle" type="button">はじめての方はこちら</button>'+
  '<p class="auth-footnote">メールアドレスとパスワードでログインできます。</p></div>';
  phone.appendChild(layer);
  $(".auth-close",layer).addEventListener("click",closeAuth);
  layer.addEventListener("click",e=>{if(e.target===layer)closeAuth();});
  $(".auth-toggle",layer).addEventListener("click",()=>{
    state.authMode=state.authMode==="signup"?"login":"signup";
    const signup=state.authMode==="signup";
    $(".signup-only",layer).hidden=!signup;
    $(".auth-submit",layer).textContent=signup?"アカウントを作る":"ログイン";
    $(".auth-toggle",layer).textContent=signup?"ログインはこちら":"はじめての方はこちら";
    $("input[name=password]",layer).autocomplete=signup?"new-password":"current-password";
  });
  $("#real-auth-form",layer).addEventListener("submit",async e=>{
    e.preventDefault();
    if(!db){toast("Supabaseの接続情報を確認してください。");return;}
    if(state.busy)return;
    const form=e.currentTarget,email=form.elements.email.value.trim(),password=form.elements.password.value;
    const nickname=form.elements.nickname.value.trim();
    if(state.authMode==="signup"&&!nickname){toast("ニックネームを入力してください。");return;}
    const submit=$(".auth-submit",layer);state.busy=true;submit.disabled=true;
    try{
      const result=state.authMode==="signup"
      ?await db.auth.signUp({email,password,options:{data:{nickname},emailRedirectTo:location.origin}})
      :await db.auth.signInWithPassword({email,password});
      if(result.error)throw result.error;
      if(state.authMode==="signup"&&!result.data.session)toast("確認メールを送信しました。メール内のリンクを開いてください。");
      else{
        state.user=result.data.user||result.data.session?.user||null;
        closeAuth();renderMyPage();
        await Promise.all([loadCounselors(),refreshConsultation()]);
        toast("ログインしました。");
      }
    }catch(err){toast(errorText(err));}
    finally{state.busy=false;submit.disabled=false;}
  });
}
function openAuth(){const layer=$("#koirela-auth-layer");layer.hidden=false;$("input[name=email]",layer).focus();}
function closeAuth(){$("#koirela-auth-layer").hidden=true;}
function editNickname(){
  const next=prompt("ニックネーム",state.user?.user_metadata?.nickname||"");
  if(next===null)return;
  if(!next.trim()||next.length>40){toast("ニックネームは1〜40文字で入力してください。");return;}
  void db.auth.updateUser({data:{nickname:next.trim()}}).then(({data,error})=>{
    if(error)throw error;state.user=data.user;renderMyPage();toast("変更しました。");
  }).catch(e=>toast(errorText(e)));
}
function openSettings(){
  if(!state.user){openAuth();return;}
  if(confirm("ログアウトしますか？"))void db.auth.signOut().catch(e=>toast(errorText(e)));
}
function renderMyPage(){
  const nickname=state.user?.user_metadata?.nickname||state.user?.email?.split("@")[0]||"ゲスト";
  const page=$("#screen-mypage");
  $(".user-name",page).textContent=nickname;
  $(".user-sub",page).textContent=state.user?"匿名で利用中":"ログインしていません";
  $(".user-card .avatar",page).textContent=nickname.slice(0,1);
}
async function loadCounselors(){
  if(!db)return;
  try{
    const {data,error}=await db.from("counselor_profiles").select("user_id,display_name,counselor_type,specialty,bio,qualification_label,counselor_availability!inner(is_accepting)")
    .eq("verification_status","approved").eq("is_suspended",false).eq("counselor_availability.is_accepting",true)
    .order("updated_at",{ascending:false});
    if(error)throw error;state.counselors=data||[];renderCounselors();
  }catch(e){toast("相談員一覧を読み込めませんでした。"+errorText(e));}
}
function renderCounselors(){
  const page=$("#screen-find .content");
  $$(".listener",page).forEach(x=>x.remove());$$(".koirela-placeholder",page).forEach(x=>x.remove());
  const frag=document.createDocumentFragment();
  const list=state.counselors.filter(c=>state.filter==="all"||(state.filter==="pro"?c.counselor_type==="qualified":c.counselor_type!=="qualified"));
  for(const c of list){
    const kind=c.counselor_type==="qualified"?"pro":"exp",node=document.createElement("div");
    node.className="card listener";node.dataset.track=kind;
    node.innerHTML='<div class="listener-top"><span class="avatar">'+esc(c.display_name?.slice(0,1)||"♡")+'<span class="dot"></span></span><div class="listener-info"><div class="listener-name">'+esc(c.display_name||"相談員")+' <span class="badge '+kind+'">'+(kind==="pro"?"資格者":"経験者")+'</span></div><div class="rating">● 受付中</div></div></div>'+
     '<div class="listener-bio">'+esc(c.specialty||c.bio||"お話をお聞きします。")+'</div>'+
     '<div class="listener-foot"><div class="price">15分相談 <b>100円</b></div><button class="small-primary" type="button">プロフィール</button></div>';
    $(".small-primary",node).addEventListener("click",()=>{state.selected=c;show("profile");});
    frag.appendChild(node);
  }
  page.append(frag);
  if(!list.length){const info=document.createElement("div");info.className="card koirela-placeholder";info.textContent="現在、条件に合う受付中の相談員はいません。";page.append(info);}
}
function renderProfile(){
  const c=state.selected;if(!c){show("find");return;}
  $("#profile-name").textContent=c.display_name||"相談員";
  $("#profile-avatar").innerHTML=esc(c.display_name?.slice(0,1)||"♡")+'<span class="dot"></span>';
  $("#profile-role").innerHTML='<span class="badge '+(c.counselor_type==="qualified"?"pro":"exp")+'">'+(c.counselor_type==="qualified"?"資格者":"経験者")+'</span>';
  $("#profile-copy").textContent=c.bio||c.specialty||"お話をお聞きします。";
  $("#screen-profile .tags").innerHTML='<span class="tag">匿名OK</span><span class="tag">チャット相談</span>';
}
window.requestPayment=()=>toast("15分100円の決済は準備中です。現在お支払いはできません。");
async function loadHistory(){
  const page=$("#screen-history .content .card");
  if(!state.user){page.innerHTML='<div class="koirela-placeholder">相談履歴にはログインが必要です。</div>';openAuth();return;}
  const {data,error}=await db.from("consultations").select("id,status,created_at,counselor_id")
    .eq("user_id",state.user.id).order("created_at",{ascending:false}).limit(30);
  if(error){toast(errorText(error));return;}
  page.replaceChildren();
  if(!data?.length){page.innerHTML='<div class="koirela-placeholder">相談履歴はまだありません。</div>';return;}
  for(const c of data){
    const item=document.createElement("div");item.className="history-row";
    const peer=state.counselors.find(v=>v.user_id===c.counselor_id);
    item.innerHTML='<div class="history-top"><div class="history-name">'+esc(peer?.display_name||"相談員")+'</div><div class="history-date">'+esc(new Date(c.created_at).toLocaleDateString("ja-JP"))+'</div></div><div class="history-text">'+esc(c.status==="active"?"相談中":c.status==="waiting"?"受付待ち":"相談記録")+'</div>';
    page.append(item);
  }
}
function renderHome(){
  const row=$("#screen-home .consult-row");if(!row)return;
  const c=state.consultation;
  if(!c){
    row.innerHTML='<span class="consult-main"><span class="consult-name">現在進行中の相談はありません</span><span class="consult-preview">相談員を探して、話してみましょう。</span></span>';
    row.disabled=true;row.removeAttribute("onclick");return;
  }
  const peer=state.counselors.find(x=>x.user_id===c.counselor_id);
  row.disabled=c.status!=="active";
  row.setAttribute("onclick",c.status==="active"?"show('chat')":"show('home')");
  row.innerHTML='<span class="avatar">'+esc(peer?.display_name?.slice(0,1)||"♡")+'<span class="dot"></span></span><span class="consult-main"><span class="consult-name">'+esc(peer?.display_name||"相談員")+'</span><span class="consult-preview">'+(c.status==="waiting"?"相談員の受付を待っています":"相談を再開する")+'</span><span class="consult-meta">'+(c.status==="waiting"?"受付待ち":"相談中")+'</span></span><span style="color:#B9B3C4">›</span>';
}
function closeChannels(){if(!db)return;state.channels.forEach(ch=>void db.removeChannel(ch));state.channels=[];}
async function invoke(name,body){const {data,error}=await db.functions.invoke(name,{body});if(error)throw error;if(data?.error)throw Error(data.error);return data;}
async function refreshConsultation(){
  if(!db||!state.user)return;
  try{
    const {consultation:next=null}=await invoke("sync-consultation-state",{});
    const changed=next?.id!==state.consultation?.id;
    if(changed){closeChannels();state.messages=[];if(next)await loadMessages(next.id);}
    state.consultation=next;
    if(next&&changed)subscribe(next.id);
    renderHome();
    if($("#screen-chat").classList.contains("active"))renderChat();
  }catch(e){console.warn("KoiRela consultation sync: "+errorText(e));}
}
async function loadMessages(id){
  const {data,error}=await db.from("messages").select("id,consultation_id,sender_id,kind,body,created_at")
    .eq("consultation_id",id).order("created_at",{ascending:true}).limit(500);
  if(error)throw error;state.messages=data||[];
}
function subscribe(id){
  const one=db.channel("koirela-98199-message:"+id).on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:"consultation_id=eq."+id},payload=>{
    if(!state.messages.some(x=>x.id===payload.new.id))state.messages.push(payload.new);renderChat();
  }).subscribe();
  const two=db.channel("koirela-98199-consultation:"+id).on("postgres_changes",{event:"UPDATE",schema:"public",table:"consultations",filter:"id=eq."+id},()=>void refreshConsultation()).subscribe();
  state.channels=[one,two];
}
function renderChat(){
  const c=state.consultation;if(!c||c.status!=="active")return;
  const peer=state.counselors.find(x=>x.user_id===c.counselor_id),name=peer?.display_name||"相談員";
  $("#screen-chat .chat-head .avatar").textContent=name.slice(0,1);
  $("#screen-chat .chat-head-name").textContent=name;
  $("#screen-chat .chat-head-sub").textContent="相談中";
  const view=$("#msgs");view.replaceChildren();
  for(const m of state.messages){
    const line=document.createElement("div");
    line.className=m.kind==="system"?"sys":m.sender_id===state.user.id?"msg-r":"msg-l";
    line.textContent=m.body;view.append(line);
  }
  if(!state.messages.length)view.innerHTML='<div class="sys">ここから相談を始めましょう。</div>';
  view.scrollTop=view.scrollHeight;
  if(c.ends_at){const sec=Math.max(0,Math.ceil((new Date(c.ends_at).getTime()-Date.now())/1000));$("#screen-chat .fee").textContent="15分相談・残り "+Math.floor(sec/60)+":"+String(sec%60).padStart(2,"0");}
}
async function sendMessage(){
  const input=$("#chat-input"),body=input?.value.trim();
  if(!body||!state.user||state.consultation?.status!=="active"){toast("有効な相談がありません。");return;}
  input.disabled=true;
  try{
    await invoke("send-message",{consultationId:state.consultation.id,body,context:state.messages.slice(-5).map(m=>m.body)});
    input.value="";await loadMessages(state.consultation.id);renderChat();
  }catch(e){toast("送信できませんでした: "+errorText(e));}
  finally{input.disabled=false;input.focus();}
}
function initialize(){
  clearDemos();makeAuth();renderMyPage();
  $$(".chip").forEach(chip=>chip.addEventListener("click",()=>{
    $$(".chip").forEach(x=>x.classList.toggle("on",x===chip));
    state.filter=chip.dataset.track||"all";renderCounselors();
  }));
  $("#send-btn").addEventListener("click",()=>void sendMessage());
  $("#chat-input").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.isComposing){e.preventDefault();void sendMessage();}});
  if(!db){toast("Supabase Tokyoの接続情報がありません。");}
  else{
    db.auth.onAuthStateChange((_event,session)=>{
      const previous=state.user?.id;state.user=session?.user||null;
      if(previous!==state.user?.id){
        renderMyPage();
        if(!state.user){closeChannels();state.consultation=null;state.messages=[];renderHome();}
        else void Promise.all([loadCounselors(),refreshConsultation()]);
      }
    });
    void db.auth.getSession().then(({data})=>{
      state.user=data?.session?.user||null;renderMyPage();void loadCounselors();
      if(state.user)void refreshConsultation();
    }).catch(e=>toast(errorText(e)));
  }
  const hash=location.hash.slice(1);
  show(hash&&screens.has(hash)&&hash!=="profile"&&hash!=="chat"?hash:"welcome");
}
initialize();
setInterval(()=>{if(state.user)void refreshConsultation();},6500);
setInterval(()=>{if($("#screen-chat").classList.contains("active"))renderChat();},1000);
