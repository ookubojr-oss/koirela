import { createClient } from "@supabase/supabase-js";

/* The complete original screen markup and CSS live in web/index.html.
   This adapter ONLY connects the restored UI to KoiRela Tokyo.
   No demo payment, demo account, invented ratings, or fake consultations. */
const url=import.meta.env.VITE_SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_ANON_KEY;
const db=url&&key?createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
const $=id=>document.getElementById(id);
const state={user:null,counselors:[],selected:null,consultation:null,messages:[],authMode:"login",track:"all",gender:"all",channels:[],poll:null,clock:null};
const testPayment=true; // No KoiRela test Stripe account is connected to this Web deployment.
const statusEl=$("app-toast");
let lastScreen="welcome";
function toast(message){
  if(!statusEl)return;
  statusEl.textContent=message;
  Object.assign(statusEl.style,{opacity:"1",visibility:"visible",display:"block",pointerEvents:"none",zIndex:"90",background:"#574E66",color:"#fff",padding:"13px 18px",borderRadius:"18px",position:"absolute",bottom:"95px",left:"18px",right:"18px",fontSize:"12px",lineHeight:"1.65",boxShadow:"0 10px 24px #574e6640"});
  clearTimeout(toast.timer); toast.timer=setTimeout(()=>{statusEl.style.opacity="0";statusEl.style.visibility="hidden";},4500);
}
function errorMessage(e){return e?.context?.error?.message||e?.message||"通信に失敗しました。";}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function currentScreen(){return document.querySelector(".screen.active")?.id?.replace("screen-","")||lastScreen;}
function protectPage(name){return ["mypage","history","edit-profile","settings","billing","connections","blocked","counselor","counselor-register","counselor-profile","payout","counselor-history","receipt","chat","waiting"].includes(name);}
function show(name){
  if(name==="home")name="talk";
  if(name==="chat"&&state.consultation?.status==="waiting")name="waiting";
  if(name==="chat"&&state.consultation?.status!=="active"){toast("現在進行中の相談はありません。");name="talk";}
  if(name==="waiting"&&state.consultation?.status!=="waiting")name="talk";
  if(name==="counselor"||name==="payout"||name==="counselor-history"||name==="counselor-profile"){toast("相談員向けの管理機能はWeb版で準備中です。");return;}
  if(protectPage(name)&&!state.user){toast("この画面の利用にはログインが必要です。");name="auth";}
  const target=$(name==="talk"?"screen-home":"screen-"+name);
  if(!target){toast("この画面は準備中です。");return;}
  document.querySelectorAll(".screen").forEach(el=>{el.classList.toggle("active",el===target);el.setAttribute("aria-hidden",el===target?"false":"true");});
  lastScreen=name;
  document.querySelectorAll(".tabbar").forEach(nav=>{
    nav.querySelectorAll("button.tab").forEach(btn=>{
      const action=btn.getAttribute("onclick")||"";
      const isActive=action.includes("'"+name+"'")||(name==="talk"&&action.includes("'talk'"));
      btn.classList.toggle("on",isActive);
    });
  });
  if(name==="mypage")renderAccount();
  if(name==="history")void loadHistory();
  if(name==="find")void loadCounselors();
  if(name==="talk")renderTalk();
  if(name==="profile")renderProfile();
  if(name==="chat"||name==="waiting")renderConsultation();
  if(name==="billing")clearPlaceholderBilling();
  const content=target.querySelector(".content");if(content)content.scrollTop=0;
  target.querySelectorAll(".motion-reveal").forEach(el=>el.classList.add("is-visible"));
  try{history.replaceState(null,"","#"+name)}catch{}
}
window.show=show;
function prepareTabs(){
  const chatIcon='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5.5h16v11H9l-5 3v-14Z" stroke-width="1.8" stroke-linejoin="round"/></svg>';
  document.querySelectorAll(".tabbar").forEach(nav=>{
    const tabs=nav.querySelectorAll("button.tab");
    if(tabs.length!==3)return;
    tabs[0].innerHTML=chatIcon+"トーク";
    tabs[0].setAttribute("onclick","show('talk')");
    tabs[1].innerHTML=tabs[1].innerHTML.replace("さがす","探す");
    tabs[1].setAttribute("onclick","show('find')");
    tabs[2].setAttribute("onclick","show('mypage')");
  });
  if(!$("screen-home")?.querySelector(".tabbar"))return;
  const home=$("screen-home");
  const top=home.querySelector(".topbar");
  if(top)top.innerHTML='<div class="title">トーク</div><div style="width:42px"></div>';
  const content=home.querySelector(".content");
  if(content)content.innerHTML='<div class="section reveal-item"><div class="section-head"><div class="section-title">トーク</div><button class="link" onclick="show(\'history\')">相談履歴</button></div><div id="live-talk-content" class="card"><div class="empty-state"><div class="empty-bubble">♡</div><h3>相談を始めると、ここに表示されます。</h3><p>相談員を探して、お話ししてみましょう。</p><button class="primary" onclick="show(\'find\')">相談員を探す</button></div></div></div>';
  const nav=home.querySelector(".tabbar");
  if(nav){nav.querySelectorAll(".tab").forEach((el,i)=>el.classList.toggle("on",i===0));}
}
function prepareAuth(){
  const form=$("signin-form");if(!form)return;
  const social=$("screen-auth")?.querySelectorAll(".social-btn,.method-divider");
  social?.forEach(el=>{el.hidden=true;el.style.display="none";});
  const guest=$("screen-auth").querySelector(".text-btn");
  if(guest){guest.textContent="ログインせずに相談員を見る";guest.setAttribute("onclick","show('find')");guest.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();show("find");},true); }
  form.querySelector("button[type=submit]").textContent="ログイン";
  const toggle=document.createElement("button");toggle.id="auth-mode-toggle";toggle.type="button";toggle.className="text-btn";toggle.textContent="はじめての方はこちら";
  form.after(toggle);
  toggle.addEventListener("click",()=>{
    state.authMode=state.authMode==="signup"?"login":"signup";
    const nickname=$("signup-nickname");
    if(state.authMode==="signup"){
      if(!nickname){
        const section=document.createElement("div");section.className="field-group";section.id="signup-nickname";
        section.innerHTML='<label class="field-label" for="nickname">ニックネーム</label><input id="nickname" class="field" name="nickname" maxlength="40" autocomplete="nickname" required>';
        form.querySelector("button[type=submit]").before(section);
      }
    }else{nickname?.remove();}
    const signup=state.authMode==="signup";
    $("screen-auth").querySelector(".topbar .title").textContent=signup?"新規登録":"ログイン";
    form.querySelector("button[type=submit]").textContent=signup?"アカウントを作る":"ログイン";
    toggle.textContent=signup?"ログインはこちら":"はじめての方はこちら";
  });
  $("password-toggle")?.addEventListener("click",()=>{
    const p=$("signin-password");if(!p)return;
    p.type=p.type==="password"?"text":"password";
    $("password-toggle").textContent=p.type==="password"?"表示":"非表示";
  });
  form.addEventListener("submit",async e=>{
    e.preventDefault();
    if(!db){toast("Supabaseへの接続設定が必要です。");return;}
    const email=$("signin-email")?.value.trim(),password=$("signin-password")?.value;
    if(!email||!password){toast("メールアドレスとパスワードを入力してください。");return;}
    if(password.length<8){toast("パスワードは8文字以上にしてください。");return;}
    const btn=form.querySelector("button[type=submit]");btn.disabled=true;
    const st=$("signin-status");if(st)st.textContent="認証しています…";
    try{
      const signup=state.authMode==="signup";
      const result=signup
        ? await db.auth.signUp({email,password,options:{data:{nickname:$("nickname")?.value.trim()||""},emailRedirectTo:location.origin}})
        : await db.auth.signInWithPassword({email,password});
      if(result.error)throw result.error;
      if(signup&&!result.data.session){if(st)st.textContent="確認メールを送信しました。メール内のリンクをご確認ください。";}
      else{if(st)st.textContent="";state.user=result.data.user??result.data.session?.user??null;await loggedIn();}
    }catch(err){if(st)st.textContent=errorMessage(err);toast(errorMessage(err));}finally{btn.disabled=false;}
  });
}
async function loggedIn(){
  renderAccount();
  await Promise.all([loadCounselors(),refreshConsultation()]);
  show(state.consultation?.status==="active"?"chat":state.consultation?.status==="waiting"?"waiting":"find");
}
function renderAccount(){
 const nickname=state.user?.user_metadata?.nickname||state.user?.email?.split("@")[0]||"ゲスト";
 const name=$("screen-mypage")?.querySelector(".user-name");
 if(name)name.textContent=nickname;
 const avatar=$("mypage-avatar")?.querySelector(".avatar-initial");
 if(avatar)avatar.textContent=nickname.slice(0,1);
 const editable=$("screen-edit-profile")?.querySelector('input.field');
 if(editable)editable.value=nickname;
 const email=$("screen-mypage")?.querySelector(".user-sub");
 if(email)email.textContent=state.user?"匿名で利用中":"ログインしていません";
}
async function saveProfile(){
 if(!db||!state.user)return;
 const input=$("screen-edit-profile")?.querySelector("input.field");const nickname=input?.value.trim();
 if(!nickname){toast("ニックネームを入力してください。");return;}
 const {data,error}=await db.auth.updateUser({data:{nickname}});
 if(error){toast(errorMessage(error));return;}
 state.user=data.user;renderAccount();show("mypage");toast("変更しました。");
}
function renderTalk(){
 const target=$("live-talk-content");if(!target)return;
 const c=state.consultation;
 if(c&&["waiting","active"].includes(c.status)){
  const counselor=state.counselors.find(x=>x.user_id===c.counselor_id);
  const label=c.status==="waiting"?"受付待ち":"相談中";
  target.innerHTML='<button class="consult-row" id="live-resume"><span class="avatar">'+esc(counselor?.display_name?.slice(0,1)||"♡")+'<span class="dot"></span></span><span class="consult-main"><span class="consult-name">'+esc(counselor?.display_name||"相談員")+' <span class="badge exp">'+label+'</span></span><span class="consult-preview">タップして相談に戻る</span></span><span>›</span></button>';
  $("live-resume")?.addEventListener("click",()=>show(c.status==="waiting"?"waiting":"chat"));
 }else target.innerHTML='<div class="empty-state"><div class="empty-bubble">♡</div><h3>現在進行中の相談はありません。</h3><p>経験者・資格者から相談相手を探せます。</p><button class="primary" onclick="show(\'find\')">相談員を探す</button></div>';
}
async function loadCounselors(){
 if(!db)return;
 const {data,error}=await db.from("counselor_profiles")
 .select("user_id,display_name,counselor_type,gender,specialty,bio,qualification_label,counselor_availability!inner(is_accepting)")
 .eq("verification_status","approved").eq("is_suspended",false)
 .eq("counselor_availability.is_accepting",true).order("updated_at",{ascending:false});
 if(error){toast("相談員一覧を読み込めませんでした: "+errorMessage(error));return;}
 state.counselors=data||[];renderCounselors();
}
function renderCounselors(){
 const area=$("screen-find")?.querySelector(".content"),empty=$("listener-empty");if(!area||!empty)return;
 area.querySelectorAll(".card.listener").forEach(el=>el.remove());
 const frag=document.createDocumentFragment();
 const q=$("listener-search")?.value.trim().toLowerCase()||"";
 let count=0;
 for(const c of state.counselors){
   const kind=c.counselor_type==="qualified"?"pro":"exp";
   if(state.gender!=="all"&&(c.gender||"other")!==state.gender)continue;
   const searchable=[c.display_name,c.specialty,c.bio,c.qualification_label].filter(Boolean).join(" ").toLowerCase();
   if(state.track!=="all"&&state.track!==kind)continue;
   if(q&&!searchable.includes(q))continue;
   count++;
   const node=document.createElement("div");node.className="card listener reveal-item";node.dataset.track=kind;
   node.innerHTML='<div class="listener-top"><span class="avatar">'+esc(c.display_name?.slice(0,1)||"♡")+'<span class="dot"></span></span><div class="listener-info"><div class="listener-name">'+esc(c.display_name||"相談員")+' <span class="badge '+kind+'">'+(kind==="pro"?"資格者":"経験者")+'</span></div><div class="rating" style="color:#7BC493">● 受付中</div></div></div><div class="listener-bio">'+esc(c.specialty||c.bio||"お話しをお聞きします。")+'</div><div class="listener-foot"><div class="price">15分相談 <b>100円</b></div><button class="small-primary" type="button">プロフィール</button></div>';
   node.querySelector(".small-primary").addEventListener("click",()=>{state.selected=c;show("profile");});
   frag.appendChild(node);
 }
 empty.before(frag);empty.hidden=count>0;
 if(!count){empty.querySelector("p").textContent=state.counselors.length?"検索条件を変えてお試しください。":"現在受付中の相談員はいません。";}
}
function renderProfile(){
 const c=state.selected;if(!c){show("find");return;}
 $("profile-name").textContent=c.display_name||"相談員";
 $("profile-avatar").innerHTML=esc(c.display_name?.slice(0,1)||"♡")+'<span class="dot"></span>';
 $("profile-role").innerHTML='<span class="badge '+(c.counselor_type==="qualified"?"pro":"exp")+'">'+(c.counselor_type==="qualified"?"資格者":"経験者")+'</span>';
 $("profile-copy").textContent=c.bio||c.specialty||"お話しをお聞きします。";
 const tags=$("screen-profile").querySelector(".tags");
 if(tags)tags.innerHTML='<span class="tag">匿名OK</span><span class="tag">チャット相談</span>';
 const btn=$("screen-profile").querySelector(".primary");if(btn){btn.textContent="15分100円で相談する（準備中）";btn.disabled=testPayment;}
}
async function loadHistory(){
 const section=$("screen-history")?.querySelector(".content>.card");if(!section||!db||!state.user)return;
 const {data,error}=await db.from("consultations").select("id,status,created_at,started_at,ended_at,counselor_id").eq("user_id",state.user.id).order("created_at",{ascending:false}).limit(30);
 if(error){section.textContent="相談履歴を読み込めませんでした。";return;}
 section.replaceChildren();
 if(!data?.length){section.innerHTML='<p class="muted" style="text-align:center;padding:20px">相談履歴はまだありません。</p>';return;}
 for(const row of data){
  const counselor=state.counselors.find(c=>c.user_id===row.counselor_id);
  const item=document.createElement("div");item.className="history-row";
  item.innerHTML='<div class="history-top"><div class="history-name">'+esc(counselor?.display_name||"相談員")+'</div><div class="history-date">'+esc(new Date(row.created_at).toLocaleDateString("ja-JP"))+'</div></div><div class="history-text">'+esc(row.status==="active"?"相談中":row.status==="waiting"?"受付待ち":"相談記録")+'</div>';
  section.appendChild(item);
 }
}
function clearPlaceholderBilling(){
 const section=$("screen-billing")?.querySelector(".content");if(section) section.innerHTML='<div class="card" style="text-align:center;color:#9A93A6">Web版のお支払い履歴表示は準備中です。決済は現在利用できません。</div>';
}
function closeChannels(){for(const ch of state.channels)void db?.removeChannel(ch);state.channels=[];}
async function invoke(name,body){if(!db)throw Error("接続情報がありません。");const {data,error}=await db.functions.invoke(name,{body});if(error)throw error;if(data?.error)throw Error(data.error);return data;}
async function refreshConsultation(){
 if(!db||!state.user)return;
 try{
  const result=await invoke("sync-consultation-state",{});
  const next=result?.consultation||null;
  const changed=next?.id!==state.consultation?.id;
  const changedState=next?.status!==state.consultation?.status;
  if(changed){closeChannels();state.messages=[];if(next)await loadMessages(next.id);}
  state.consultation=next;
  if(next&&changed){subscribe(next.id);}
  if(changed||changedState){renderTalk();renderConsultation();}
 }catch(e){console.warn("KoiRela sync",errorMessage(e));}
}
async function loadMessages(id){
 const {data,error}=await db.from("messages").select("id,consultation_id,sender_id,kind,body,created_at").eq("consultation_id",id).order("created_at",{ascending:true}).limit(500);
 if(error)throw error;state.messages=data||[];
}
function subscribe(id){
 const one=db.channel("koirela-original-messages:"+id).on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:"consultation_id=eq."+id},payload=>{if(!state.messages.some(x=>x.id===payload.new.id))state.messages.push(payload.new);renderConsultation();}).subscribe();
 const two=db.channel("koirela-original-consultation:"+id).on("postgres_changes",{event:"UPDATE",schema:"public",table:"consultations",filter:"id=eq."+id},()=>void refreshConsultation()).subscribe();
 state.channels=[one,two];
}
function renderConsultation(){
 const c=state.consultation;if(!c)return;
 const counselor=state.counselors.find(x=>x.user_id===c.counselor_id),name=counselor?.display_name||"相談員";
 const waiting=$("screen-waiting");const card=waiting?.querySelector(".waiting-card");if(card)card.querySelector("b").textContent=name;
 $("chat-peer-name").textContent=name;
 $("chat-peer-avatar").innerHTML=esc(name.slice(0,1))+'<span class="dot"></span>';
 $("chat-connection").textContent=c.status==="active"?"相談中":"接続待ち";
 const msgs=$("msgs");if(!msgs)return;
 msgs.innerHTML=state.messages.length?state.messages.map(m=>'<div class="'+(m.kind==="system"?"sys":m.sender_id===state.user.id?"msg-r":"msg-l")+'">'+esc(m.body)+'</div>').join(""):'<div class="sys">ここからお話しを始められます。</div>';
 msgs.scrollTop=msgs.scrollHeight;
 const remaining=c.ends_at?Math.max(0,Math.ceil((new Date(c.ends_at).getTime()-Date.now())/1000)):900;
 $("chat-timer").textContent=Math.floor(remaining/60)+":"+String(remaining%60).padStart(2,"0");
}
async function sendMessage(){
 const input=$("chat-input"),body=input?.value.trim();
 if(!body||state.consultation?.status!=="active")return;
 input.disabled=true;
 try{await invoke("send-message",{consultationId:state.consultation.id,body,context:state.messages.slice(-5).map(m=>m.body)});input.value="";await loadMessages(state.consultation.id);renderConsultation();}
 catch(e){toast("送信に失敗しました: "+errorMessage(e));}finally{input.disabled=false;input.focus();}
}
async function cancelWaiting(){
 const c=state.consultation;if(c?.status!=="waiting"){show("talk");return;}
 if(!confirm("受付待ちの相談をキャンセルしますか？"))return;
 try{await invoke("cancel-consultation",{consultationId:c.id});state.consultation=null;closeChannels();renderTalk();show("talk");}
 catch(e){toast(errorMessage(e));}
}
async function finishConsult(){
 if(state.consultation?.status!=="active")return show("talk");
 if(!confirm("相談を終了しますか？"))return;
 try{await invoke("end-consultation",{consultationId:state.consultation.id});state.consultation=null;closeChannels();renderTalk();show("talk");}
 catch(e){toast(errorMessage(e));}
}
function openSheet(id){
 if(["consult-sheet","payment-sheet","payment-error-sheet"].includes(id)){toast("テスト公開中のため決済機能は停止しています。");return;}
 document.querySelectorAll(".bottom-sheet").forEach(el=>el.classList.remove("on"));
 $("sheet-backdrop")?.classList.toggle("on",Boolean($(id)));
 $(id)?.classList.add("on");
}
function closeSheet(){
 document.querySelectorAll(".bottom-sheet").forEach(el=>el.classList.remove("on"));
 $("sheet-backdrop")?.classList.remove("on");
}
function notReady(){closeSheet();toast("この機能はWeb版で準備中です。デモデータは使用していません。");}
Object.assign(window,{
 openProfile(id){const c=state.counselors.find(x=>x.user_id===id);if(c){state.selected=c;show("profile");}else toast("相談員が見つかりません。");},
 openSheet,closeSheet,
 socialLogin:notReady,connectProvider:notReady,openPhotoSheet:notReady,choosePhotoFromLibrary:notReady,
 takeProfilePhoto:notReady,deleteProfilePhoto:notReady,demoUpload:notReady,
 selectReportReason:notReady,submitReport:notReady,blockFromReport:notReady,
 submitSupport:notReady,toggleCounselor:notReady,startCounselorChat:notReady,nextCounselorStep:notReady,
 submitCounselor:notReady,saveCounselorProfile:notReady,savePayout:notReady,
 deleteAccountDemo:notReady,completeRegistration:notReady,markBlocked:notReady,
 reportExternalFromEnd:notReady,allowNotifications:notReady,declineNotifications:notReady,
 finishOnboarding:notReady,applyGenderFilterAndClose(){state.gender=document.querySelector('input[name="listener-gender-filter"]:checked')?.value||"all";closeSheet();renderCounselors();$("listener-filter-dot").hidden=state.gender==="all";},clearGenderFilter(){state.gender="all";document.querySelector('input[name="listener-gender-filter"][value="all"]')?.click();closeSheet();renderCounselors();$("listener-filter-dot").hidden=true;},
 rate:notReady,resetListenerSearch(){const el=$("listener-search");if(el)el.value="";state.track="all";document.querySelectorAll("#screen-find .chip").forEach(x=>x.classList.toggle("on",x.dataset.track==="all"));renderCounselors();},
 startPaidConsult(){toast("テスト公開中のため決済機能は停止しています。");},
 extendConsult(){toast("テスト公開中のため延長決済は停止しています。");},
 cancelWaiting,finishConsult,
 retryWaiting(){void refreshConsultation();},
 showToast:toast
});
document.querySelectorAll("#screen-find .chip").forEach(chip=>chip.addEventListener("click",()=>{state.track=chip.dataset.track||"all";document.querySelectorAll("#screen-find .chip").forEach(c=>c.classList.toggle("on",c===chip));renderCounselors();}));
$("listener-search")?.addEventListener("input",renderCounselors);
$("clear-listener-search")?.addEventListener("click",()=>{$("listener-search").value="";renderCounselors();});
$("send-btn")?.addEventListener("click",()=>void sendMessage());
$("chat-input")?.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.isComposing){e.preventDefault();void sendMessage();}});
$("sheet-backdrop")?.addEventListener("click",closeSheet);
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeSheet();});
document.addEventListener("click",e=>{
 const button=e.target.closest("button");
 if(!button)return;
 if(button.matches("#screen-edit-profile .primary")){e.preventDefault();e.stopImmediatePropagation();void saveProfile();return;}
 if(button.closest("#screen-settings")&&button.textContent.includes("ログアウト")){e.preventDefault();e.stopImmediatePropagation();void db?.auth.signOut();return;}
 // Prevent tapping static prototype screens to fabricate state changes.
 if(button.closest("#screen-chat")&&button.classList.contains("chat-more")){e.preventDefault();e.stopImmediatePropagation();openSheet("safety-sheet");return;}
},true);
prepareTabs();prepareAuth();renderCounselors();clearPlaceholderBilling();
if(!db){toast("Supabase Tokyoの接続情報がありません。");show("welcome");}
else{
 db.auth.onAuthStateChange((event,session)=>{
   const before=state.user?.id;state.user=session?.user||null;
   if(before!==state.user?.id){
     if(!state.user){closeChannels();state.consultation=null;state.messages=[];show("welcome");}
     else void loggedIn();
   }
 });
 void db.auth.getSession().then(({data})=>{
   state.user=data?.session?.user||null;
   if(state.user)void loggedIn();
   else {show("welcome");void loadCounselors();}
 }).catch(e=>toast(errorMessage(e)));
}
state.poll=setInterval(()=>{if(state.user)void refreshConsultation();},6500);
state.clock=setInterval(()=>{if(currentScreen()==="chat"&&state.consultation)renderTimerOnly();},1000);
function renderTimerOnly(){
 const c=state.consultation;
 if(!c?.ends_at)return;
 const rem=Math.max(0,Math.ceil((new Date(c.ends_at).getTime()-Date.now())/1000));
 $("chat-timer").textContent=Math.floor(rem/60)+":"+String(rem%60).padStart(2,"0");
}
