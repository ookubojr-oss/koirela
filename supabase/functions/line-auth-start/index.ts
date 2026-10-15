import { corsHeaders } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/clients.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";

function randomToken(bytes=32){
  const arr=new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}

async function sha256(value:string){
  const bytes=new TextEncoder().encode(value);
  const hash=await crypto.subtle.digest("SHA-256",bytes);
  return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,"0")).join("");
}

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  try{
    const supabase=serviceClient();
    const body=await req.json().catch(()=>({}));
    const appRedirect=String(body.appRedirect||"koirela://auth/line");

    if(!appRedirect.startsWith("koirela://")){
      return Response.json({error:"Invalid app redirect"},{status:400,headers:corsHeaders});
    }

    const ip=req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown";
    await enforceRateLimit(supabase,"line-auth-start",ip,20,600);

    const clientId=Deno.env.get("LINE_CHANNEL_ID");
    const callbackUrl=Deno.env.get("LINE_CALLBACK_URL");
    if(!clientId||!callbackUrl)throw new Error("LINE login is not configured");

    const state=randomToken(32);
    const nonce=randomToken(24);
    const stateHash=await sha256(state);

    const {error}=await supabase.from("oauth_states").insert({
      state_hash:stateHash,
      provider:"line",
      nonce,
      app_redirect_uri:appRedirect,
      expires_at:new Date(Date.now()+10*60*1000).toISOString()
    });
    if(error)throw error;

    const url=new URL("https://access.line.me/oauth2/v2.1/authorize");
    url.searchParams.set("response_type","code");
    url.searchParams.set("client_id",clientId);
    url.searchParams.set("redirect_uri",callbackUrl);
    url.searchParams.set("state",state);
    url.searchParams.set("scope","profile openid email");
    url.searchParams.set("nonce",nonce);

    return Response.json({authorizeUrl:url.toString()},{headers:corsHeaders});
  }catch(error){
    const message=error instanceof Error?error.message:"Unknown error";
    const status=message==="RATE_LIMITED"?429:400;
    return Response.json({error:message},{status,headers:corsHeaders});
  }
});
