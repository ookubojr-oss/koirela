import { corsHeaders } from "../_shared/cors.ts";
import { authenticatedUser, serviceClient } from "../_shared/clients.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { logError } from "../_shared/monitoring.ts";

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok",{headers:corsHeaders});
  try {
    const user=await authenticatedUser(req);
    const body=await req.json();
    const supabase=serviceClient();

    await enforceRateLimit(supabase,"client-error",user.id,30,300);

    await logError(supabase,{
      userId:user.id,
      source:body.source==="web"?"web":"mobile",
      severity:["info","warning","error","fatal"].includes(body.severity)?body.severity:"error",
      name:typeof body.name==="string"?body.name:null,
      message:String(body.message||"Unknown client error"),
      stack:typeof body.stack==="string"?body.stack:null,
      context:body.context&&typeof body.context==="object"?body.context:{},
      appVersion:typeof body.appVersion==="string"?body.appVersion:null
    });

    return Response.json({ok:true},{headers:corsHeaders});
  } catch (error) {
    const message=error instanceof Error?error.message:"Unknown error";
    const status=message==="RATE_LIMITED"?429:400;
    return Response.json({error:message},{status,headers:corsHeaders});
  }
});
