import Stripe from "npm:stripe@17.7.0";
import { corsHeaders } from "../_shared/cors.ts";
import { authenticatedUser, serviceClient } from "../_shared/clients.ts";

const stripe=new Stripe(Deno.env.get("STRIPE_SECRET_KEY")??"");

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  try{
    const user=await authenticatedUser(req);
    const supabase=serviceClient();
    const body=await req.json().catch(()=>({}));
    const action=String(body.action||"status");

    const {data:counselor,error:counselorError}=await supabase
      .from("counselor_profiles")
      .select("user_id,verification_status,is_suspended")
      .eq("user_id",user.id)
      .single();

    if(counselorError||!counselor)throw new Error("Counselor profile not found");
    if(counselor.verification_status!=="approved"||counselor.is_suspended){
      return Response.json({error:"Counselor payout setup is unavailable"},{status:409,headers:corsHeaders});
    }

    const {data:existing}=await supabase
      .from("counselor_payout_accounts")
      .select("*")
      .eq("counselor_id",user.id)
      .maybeSingle();

    let accountId=existing?.provider_account_id as string|undefined;

    if(!accountId){
      const account=await stripe.accounts.create({
        type:"express",
        country:"JP",
        email:user.email||undefined,
        capabilities:{transfers:{requested:true}},
        metadata:{koirela_counselor_id:user.id}
      });
      accountId=account.id;

      await supabase.from("counselor_payout_accounts").upsert({
        counselor_id:user.id,
        provider:"stripe_connect",
        provider_account_id:account.id,
        status:"pending",
        details_submitted:Boolean(account.details_submitted),
        payouts_enabled:Boolean(account.payouts_enabled),
        charges_enabled:Boolean(account.charges_enabled),
        last_synced_at:new Date().toISOString(),
        updated_at:new Date().toISOString()
      },{onConflict:"counselor_id"});
    }

    const account=await stripe.accounts.retrieve(accountId);

    await supabase.from("counselor_payout_accounts").upsert({
      counselor_id:user.id,
      provider:"stripe_connect",
      provider_account_id:account.id,
      status:account.payouts_enabled?"verified":"pending",
      details_submitted:Boolean(account.details_submitted),
      payouts_enabled:Boolean(account.payouts_enabled),
      charges_enabled:Boolean(account.charges_enabled),
      last_synced_at:new Date().toISOString(),
      updated_at:new Date().toISOString()
    },{onConflict:"counselor_id"});

    if(action==="onboarding"){
      const refreshUrl=Deno.env.get("STRIPE_CONNECT_REFRESH_URL");
      const returnUrl=Deno.env.get("STRIPE_CONNECT_RETURN_URL");
      if(!refreshUrl||!returnUrl)throw new Error("Stripe Connect return URLs are not configured");

      const link=await stripe.accountLinks.create({
        account:account.id,
        refresh_url:refreshUrl,
        return_url:returnUrl,
        type:"account_onboarding"
      });

      return Response.json({url:link.url,expiresAt:link.expires_at},{headers:corsHeaders});
    }

    return Response.json({
      status:account.payouts_enabled?"verified":"pending",
      detailsSubmitted:Boolean(account.details_submitted),
      payoutsEnabled:Boolean(account.payouts_enabled),
      chargesEnabled:Boolean(account.charges_enabled)
    },{headers:corsHeaders});
  }catch(error){
    return Response.json({error:error instanceof Error?error.message:"Unknown error"},{status:400,headers:corsHeaders});
  }
});
