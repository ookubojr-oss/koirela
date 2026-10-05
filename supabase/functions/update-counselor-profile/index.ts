import { corsHeaders } from "../_shared/cors.ts";
import { authenticatedUser, serviceClient } from "../_shared/clients.ts";

function classify(input: string) {
  const normalized = input.normalize("NFKC").toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g, "");
  const compact = normalized.replace(/[\s._\-ー−・*☆★♡♥]/g, "");
  const rules = [
    ["URL", /(https?:\/\/|www\.|line\.me|instagram\.com|discord\.gg|discord\.com|t\.me|telegram\.me|x\.com|twitter\.com|threads\.net)/i, normalized],
    ["email", /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i, normalized],
    ["phone", /(?:\+?81[-\s]?)?0?\d{1,4}[-ー−\s]?\d{1,4}[-ー−\s]?\d{3,4}|\b0\d{9,10}\b/, normalized],
    ["LINE", /(line|l1ne|ライン|らいん).{0,14}(id|交換|追加|連絡|友だち|友達|教え|送る|dm)|(?:id|交換|追加|連絡|dm).{0,14}(line|l1ne|ライン|らいん)/i, compact],
    ["Instagram", /(instagram|insta|インスタ|いんすた).{0,14}(id|交換|dm|フォロー|連絡|教え)|(?:id|交換|dm|フォロー|連絡).{0,14}(instagram|insta|インスタ|いんすた)/i, compact],
    ["Discord", /(discord|ディスコード).{0,14}(id|交換|追加|連絡|教え)|(?:id|交換|追加|連絡).{0,14}(discord|ディスコード)/i, compact],
    ["Telegram", /(telegram|テレグラム).{0,14}(id|交換|追加|連絡|教え)|(?:id|交換|追加|連絡).{0,14}(telegram|テレグラム)/i, compact]
  ] as const;
  for (const [category,regex,target] of rules) if (regex.test(target)) return category;
  return null;
}

function clean(value: unknown,max:number) {
  return typeof value === "string" ? value.trim().slice(0,max) : "";
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok",{headers:corsHeaders});
  try {
    const user = await authenticatedUser(req);
    const body = await req.json();
    const supabase = serviceClient();

    const { data: counselor, error: counselorError } = await supabase
      .from("counselor_profiles")
      .select("user_id,is_suspended,verification_status")
      .eq("user_id",user.id)
      .single();

    if (counselorError || !counselor) {
      return Response.json({error:"Counselor profile not found"},{status:404,headers:corsHeaders});
    }
    if (counselor.is_suspended) {
      return Response.json({error:"Counselor account is suspended"},{status:403,headers:corsHeaders});
    }

    const displayName=clean(body.displayName,40);
    const specialty=clean(body.specialty,120);
    const bio=clean(body.bio,1000);
    const gender=body.gender ? clean(body.gender,20) : null;
    const avatarPath = typeof body.avatarPath === "string" ? clean(body.avatarPath,500) : body.avatarPath === null ? null : undefined;
    if (!displayName || ![null,"female","male","other"].includes(gender)) {
      return Response.json({error:"Invalid profile"},{status:400,headers:corsHeaders});
    }

    const text=[displayName,specialty,bio].join(" ");
    const category=classify(text);
    if (category) {
      const {data,error}=await supabase.rpc("record_counselor_violation",{
        p_counselor_id:user.id,
        p_consultation_id:null,
        p_category:category,
        p_attempted_message:text,
        p_context:[],
        p_detector:"profile-rule-v1"
      });
      if (error) throw error;
      const result=Array.isArray(data)?data[0]:data;
      return Response.json({
        error:"OFF_PLATFORM_PROFILE_BLOCKED",
        category,
        strikeCount:result?.strike_count??1,
        suspended:Boolean(result?.suspended)
      },{status:422,headers:corsHeaders});
    }

    const updates: Record<string, unknown> = {
      display_name:displayName,
      specialty:specialty||null,
      bio:bio||null,
      gender,
      updated_at:new Date().toISOString()
    };
    if (avatarPath !== undefined) updates.avatar_path = avatarPath;

    const {data,error}=await supabase
      .from("counselor_profiles")
      .update(updates)
      .eq("user_id",user.id)
      .select("user_id,display_name,counselor_type,gender,specialty,bio,avatar_path,qualification_label,verification_status,is_suspended")
      .single();

    if (error) throw error;
    return Response.json(data,{headers:corsHeaders});
  } catch (error) {
    return Response.json({error:error instanceof Error?error.message:"Unknown error"},{status:400,headers:corsHeaders});
  }
});
