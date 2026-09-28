import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logError } from "./monitoring.ts";

export async function pushToUser(
  supabase: SupabaseClient,
  userId: string,
  title: string,
  body: string,
  data: Record<string, unknown> = {}
) {
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("enabled")
    .eq("user_id", userId)
    .maybeSingle();

  if (!prefs?.enabled) return;

  const { data: tokenRows } = await supabase
    .from("device_tokens")
    .select("token")
    .eq("user_id", userId);

  const rows=tokenRows??[];
  const messages = rows.map(row => ({
    to: row.token,
    sound: "default",
    title,
    body,
    data
  }));

  if (!messages.length) return;

  const headers: Record<string,string> = {
    "Accept": "application/json",
    "Content-Type": "application/json"
  };

  const expoAccessToken = Deno.env.get("EXPO_ACCESS_TOKEN");
  if (expoAccessToken) headers["Authorization"] = "Bearer " + expoAccessToken;

  try{
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers,
      body: JSON.stringify(messages)
    });

    if (!response.ok) {
      const responseText=await response.text();
      await logError(supabase,{
        userId,
        source:"push",
        message:"Expo push request failed",
        context:{status:response.status,response:responseText.slice(0,1000)}
      });
      return;
    }

    const payload=await response.json().catch(()=>null);
    const tickets=Array.isArray(payload?.data)?payload.data:[payload?.data].filter(Boolean);

    for(let i=0;i<tickets.length;i++){
      const ticket=tickets[i];
      const token=rows[i]?.token;
      if(ticket?.status==="error"&&ticket?.details?.error==="DeviceNotRegistered"&&token){
        await supabase.from("device_tokens").delete().eq("token",token);
      }
      if(ticket?.status==="error"){
        await logError(supabase,{
          userId,
          source:"push",
          severity:"warning",
          message:String(ticket?.message||"Expo push ticket error"),
          context:{error:ticket?.details?.error||null}
        });
      }
    }
  }catch(error){
    await logError(supabase,{
      userId,
      source:"push",
      message:error instanceof Error?error.message:String(error),
      stack:error instanceof Error?error.stack:null
    });
  }
}
