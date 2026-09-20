import { corsHeaders } from "../_shared/cors.ts";
import { authenticatedUser, serviceClient } from "../_shared/clients.ts";
import { expireStaleConsultations } from "../_shared/consultations.ts";

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});

  try{
    const user=await authenticatedUser(req);
    const supabase=serviceClient();

    await expireStaleConsultations(supabase,user.id);

    const {data,error}=await supabase
      .from("consultations")
      .select("id,status,user_id,counselor_id,started_at,ends_at,created_at,counselor:counselor_profiles!consultations_counselor_id_fkey(user_id,display_name,counselor_type,gender,specialty,bio,avatar_path,qualification_label)")
      .or("user_id.eq."+user.id+",counselor_id.eq."+user.id)
      .in("status",["waiting","active"])
      .order("created_at",{ascending:false})
      .limit(1)
      .maybeSingle();

    if(error)throw error;
    return Response.json({consultation:data??null},{headers:corsHeaders});
  }catch(error){
    const message=error instanceof Error?error.message:"Unknown error";
    return Response.json({error:message},{status:message==="ACCOUNT_SUSPENDED"?403:400,headers:corsHeaders});
  }
});
