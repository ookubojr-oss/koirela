import { serviceClient } from "../_shared/clients.ts";

async function sha256(value:string){
  const bytes=new TextEncoder().encode(value);
  const hash=await crypto.subtle.digest("SHA-256",bytes);
  return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,"0")).join("");
}

function syntheticEmail(subject:string){
  const safe=subject.replace(/[^a-zA-Z0-9]/g,"").slice(0,80);
  return "line_"+safe+"@line.koirela.invalid";
}

Deno.serve(async req=>{
  try{
    const url=new URL(req.url);
    const code=url.searchParams.get("code");
    const state=url.searchParams.get("state");
    if(!code||!state)return new Response("Missing code/state",{status:400});

    const clientId=Deno.env.get("LINE_CHANNEL_ID");
    const clientSecret=Deno.env.get("LINE_CHANNEL_SECRET");
    const callbackUrl=Deno.env.get("LINE_CALLBACK_URL");
    if(!clientId||!callbackUrl)throw new Error("LINE login is not configured");

    const supabase=serviceClient();
    const stateHash=await sha256(state);

    const {data:stateRow,error:stateError}=await supabase
      .from("oauth_states")
      .select("*")
      .eq("state_hash",stateHash)
      .eq("provider","line")
      .is("consumed_at",null)
      .single();

    if(stateError||!stateRow)throw new Error("Invalid OAuth state");
    if(new Date(stateRow.expires_at).getTime()<Date.now())throw new Error("OAuth state expired");

    const tokenBody=new URLSearchParams({
      grant_type:"authorization_code",
      code,
      redirect_uri:callbackUrl,
      client_id:clientId
    });
    if(clientSecret)tokenBody.set("client_secret",clientSecret);

    const tokenRes=await fetch("https://api.line.me/oauth2/v2.1/token",{
      method:"POST",
      headers:{"Content-Type":"application/x-www-form-urlencoded"},
      body:tokenBody
    });
    const token=await tokenRes.json();
    if(!tokenRes.ok||!token.id_token)throw new Error("LINE token exchange failed");

    const verifyBody=new URLSearchParams({
      id_token:String(token.id_token),
      client_id:clientId,
      nonce:String(stateRow.nonce)
    });
    const verifyRes=await fetch("https://api.line.me/oauth2/v2.1/verify",{
      method:"POST",
      headers:{"Content-Type":"application/x-www-form-urlencoded"},
      body:verifyBody
    });
    const identity=await verifyRes.json();
    if(!verifyRes.ok||!identity.sub)throw new Error("LINE identity verification failed");

    const subject=String(identity.sub);
    const displayName=String(identity.name||"LINEユーザー").slice(0,40);

    const {data:mapping}=await supabase
      .from("external_identities")
      .select("user_id")
      .eq("provider","line")
      .eq("subject",subject)
      .maybeSingle();

    let userId=mapping?.user_id as string|undefined;
    let email:string|undefined;

    if(userId){
      const {data:userData,error:userError}=await supabase.auth.admin.getUserById(userId);
      if(userError||!userData.user)throw new Error("Mapped user not found");
      email=userData.user.email||undefined;
    }else{
      email=typeof identity.email==="string"&&identity.email.includes("@")
        ? identity.email
        : syntheticEmail(subject);

      const {data:created,error:createError}=await supabase.auth.admin.createUser({
        email,
        email_confirm:true,
        user_metadata:{nickname:displayName,line_subject:subject,line_picture:identity.picture||null}
      });
      if(createError||!created.user)throw createError||new Error("Could not create user");
      userId=created.user.id;

      const {error:mapError}=await supabase.from("external_identities").insert({
        provider:"line",
        subject,
        user_id:userId
      });
      if(mapError)throw mapError;

      await supabase.from("profiles").update({nickname:displayName,updated_at:new Date().toISOString()}).eq("id",userId);
    }

    if(!email)throw new Error("No email available for session handoff");

    await supabase.from("oauth_states")
      .update({consumed_at:new Date().toISOString()})
      .eq("state_hash",stateHash);

    const {data:link,error:linkError}=await supabase.auth.admin.generateLink({
      type:"magiclink",
      email,
      options:{redirectTo:String(stateRow.app_redirect_uri)}
    });
    if(linkError||!link?.properties?.action_link)throw linkError||new Error("Could not generate sign-in link");

    return Response.redirect(link.properties.action_link,302);
  }catch(error){
    return new Response(error instanceof Error?error.message:"Unknown error",{status:400});
  }
});
