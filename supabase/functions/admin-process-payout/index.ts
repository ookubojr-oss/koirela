import Stripe from "npm:stripe@17.7.0";
import { corsHeaders } from "../_shared/cors.ts";
import { authenticatedUser, serviceClient } from "../_shared/clients.ts";

const stripe=new Stripe(Deno.env.get("STRIPE_SECRET_KEY")??"");

async function requireAdmin(req:Request){
  const user=await authenticatedUser(req);
  const supabase=serviceClient();
  const {data:profile}=await supabase.from("profiles").select("role").eq("id",user.id).single();
  if(profile?.role!=="admin")throw new Error("Forbidden");
  return {user,supabase};
}

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  try{
    const {user,supabase}=await requireAdmin(req);
    const body=await req.json();
    const counselorId=String(body.counselorId||"");
    const periodStart=String(body.periodStart||"");
    const periodEnd=String(body.periodEnd||"");
    if(!counselorId||!periodStart||!periodEnd)throw new Error("counselorId, periodStart and periodEnd are required");

    const {data:account,error:accountError}=await supabase
      .from("counselor_payout_accounts")
      .select("provider_account_id,payouts_enabled,status")
      .eq("counselor_id",counselorId)
      .single();

    if(accountError||!account?.provider_account_id||!account.payouts_enabled){
      return Response.json({error:"Payout account is not ready"},{status:409,headers:corsHeaders});
    }

    const {data:eligible,error:eligibleError}=await supabase
      .from("payments")
      .select("id,amount_jpy,consultation_id,created_at,consultation:consultations!inner(counselor_id,status)")
      .eq("status","succeeded")
      .in("kind",["initial","extension"])
      .eq("consultation.counselor_id",counselorId)
      .eq("consultation.status","ended")
      .gte("created_at",periodStart+"T00:00:00+09:00")
      .lte("created_at",periodEnd+"T23:59:59+09:00");

    if(eligibleError)throw eligibleError;

    const ids=(eligible??[]).map((x:any)=>x.id);
    if(!ids.length)return Response.json({error:"No eligible payments"},{status:409,headers:corsHeaders});

    const {data:used,error:usedError}=await supabase
      .from("payout_items")
      .select("payment_id")
      .in("payment_id",ids);
    if(usedError)throw usedError;

    const usedIds=new Set((used??[]).map((x:any)=>x.payment_id));
    const fresh=(eligible??[]).filter((x:any)=>!usedIds.has(x.id));
    if(!fresh.length)return Response.json({error:"All eligible payments are already allocated"},{status:409,headers:corsHeaders});

    const gross=fresh.reduce((sum:number,x:any)=>sum+Number(x.amount_jpy||0),0);
    const feePercent=Math.min(100,Math.max(0,Number(Deno.env.get("PLATFORM_FEE_PERCENT")||20)));
    const platformFee=Math.floor(gross*feePercent/100);
    const net=Math.max(0,gross-platformFee);
    if(net<1)return Response.json({error:"Payout amount is zero"},{status:409,headers:corsHeaders});

    const {data:payout,error:payoutError}=await supabase
      .from("payouts")
      .insert({
        counselor_id:counselorId,
        period_start:periodStart,
        period_end:periodEnd,
        gross_jpy:gross,
        platform_fee_jpy:platformFee,
        net_jpy:net,
        status:"processing",
        processed_by:user.id
      })
      .select()
      .single();
    if(payoutError)throw payoutError;

    const {error:itemError}=await supabase.from("payout_items").insert(
      fresh.map((x:any)=>({payout_id:payout.id,payment_id:x.id,amount_jpy:x.amount_jpy}))
    );
    if(itemError)throw itemError;

    const transfer=await stripe.transfers.create({
      amount:net,
      currency:"jpy",
      destination:account.provider_account_id,
      metadata:{
        koirela_payout_id:payout.id,
        counselor_id:counselorId,
        period_start:periodStart,
        period_end:periodEnd
      }
    });

    await supabase.from("payouts").update({
      provider_transfer_id:transfer.id,
      status:"paid",
      paid_at:new Date().toISOString()
    }).eq("id",payout.id);

    await supabase.from("admin_audit_logs").insert({
      admin_id:user.id,
      action:"process_counselor_payout",
      target_type:"payout",
      target_id:payout.id,
      metadata:{counselorId,gross,platformFee,net,transferId:transfer.id}
    });

    return Response.json({
      payoutId:payout.id,
      grossJpy:gross,
      platformFeeJpy:platformFee,
      netJpy:net,
      transferId:transfer.id
    },{headers:corsHeaders});
  }catch(error){
    const message=error instanceof Error?error.message:"Unknown error";
    return Response.json({error:message},{status:message==="Forbidden"?403:400,headers:corsHeaders});
  }
});
