import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function expireStaleConsultations(
  supabase: SupabaseClient,
  participantId?: string
) {
  let request = supabase
    .from("consultations")
    .select("id,user_id,counselor_id,ends_at")
    .eq("status","active")
    .lte("ends_at",new Date().toISOString())
    .limit(50);

  if(participantId){
    request=request.or("user_id.eq."+participantId+",counselor_id.eq."+participantId);
  }

  const {data:stale,error}=await request;
  if(error)throw error;
  if(!stale?.length)return [];

  const ids=stale.map((x:any)=>x.id);
  const endedAt=new Date().toISOString();

  const {data:updated,error:updateError}=await supabase
    .from("consultations")
    .update({status:"ended",ended_at:endedAt})
    .in("id",ids)
    .eq("status","active")
    .lte("ends_at",endedAt)
    .select("id,user_id,counselor_id");

  if(updateError)throw updateError;
  if(!updated?.length)return [];

  await supabase.from("messages").insert(
    updated.map((row:any)=>({
      consultation_id:row.id,
      sender_id:null,
      kind:"system",
      body:"15分の相談時間が終了しました"
    }))
  );

  return updated;
}
