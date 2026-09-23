import React,{useEffect,useState} from "react";
import {ActivityIndicator,Alert,Pressable,SafeAreaView,ScrollView,StyleSheet,Text,View} from "react-native";
import * as WebBrowser from "expo-web-browser";
import {
  createPayoutOnboardingLink,
  getCounselorEarningsSummary,
  getCounselorPayoutAccount,
  listCounselorPayouts,
  syncPayoutAccountStatus
} from "../lib/api";

const C={plum:"#574E66",coral:"#F2837B",bg:"#FCF9FA",text:"#37313F",muted:"#8A8292",line:"#EEE8EF",green:"#5F9B78",danger:"#C85858"};

export default function CounselorEarningsScreen({onBack}:{onBack:()=>void}) {
  const [summary,setSummary]=useState<any>(null);
  const [payouts,setPayouts]=useState<any[]>([]);
  const [account,setAccount]=useState<any>(null);
  const [loading,setLoading]=useState(true);
  const [connecting,setConnecting]=useState(false);

  useEffect(()=>{void load()},[]);

  async function load(){
    try{
      const [s,p,a]=await Promise.all([
        getCounselorEarningsSummary(),
        listCounselorPayouts(),
        getCounselorPayoutAccount()
      ]);
      setSummary(s);
      setPayouts(p);
      setAccount(a);
    }catch(e:any){
      Alert.alert("報酬情報を取得できませんでした",e?.message||"もう一度お試しください");
    }finally{
      setLoading(false);
    }
  }

  async function connectPayout(){
    try{
      setConnecting(true);
      const link=await createPayoutOnboardingLink();
      await WebBrowser.openBrowserAsync(link.url);
      const status=await syncPayoutAccountStatus();
      setAccount((current:any)=>({
        ...(current||{}),
        provider:"stripe_connect",
        status:status.status,
        details_submitted:status.detailsSubmitted,
        payouts_enabled:status.payoutsEnabled,
        charges_enabled:status.chargesEnabled
      }));
      if(status.payoutsEnabled){
        Alert.alert("振込先を確認しました","Stripe Connectの振込設定が利用可能になりました。");
      }else{
        Alert.alert("設定を確認中です","必要な入力が残っている場合は、もう一度「振込先を設定」を開いてください。");
      }
    }catch(e:any){
      Alert.alert("振込先設定を開けませんでした",e?.message||"もう一度お試しください");
    }finally{
      setConnecting(false);
    }
  }

  const payoutReady=Boolean(account?.payouts_enabled)||account?.status==="verified";

  return <SafeAreaView style={styles.root}><ScrollView contentContainerStyle={styles.content}>
    <Pressable onPress={onBack}><Text style={styles.back}>‹ 相談員モード</Text></Pressable>
    <Text style={styles.title}>売上・報酬</Text>
    {loading?<ActivityIndicator color={C.coral}/>:null}

    {!loading&&summary?<>
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>{summary.fee_configured?"今月の受取見込み":"今月の売上"}</Text>
        <Text style={styles.heroValue}>
          {Number(summary.fee_configured?summary.estimated_net_jpy:summary.month_gross_jpy||0).toLocaleString()}円
        </Text>
        <Text style={styles.heroSub}>
          {summary.fee_configured
            ? "売上 "+Number(summary.month_gross_jpy||0).toLocaleString()+"円 − 手数料見込み "+Number(summary.estimated_platform_fee_jpy||0).toLocaleString()+"円"
            : "手数料率は公開前に確定します。現在は受取見込み額を表示していません。"}
        </Text>
      </View>
      <View style={styles.grid}>
        <Stat label="今日の相談" value={(summary.today_consultations||0)+"件"}/>
        <Stat label="今月の相談" value={(summary.month_consultations||0)+"件"}/>
      </View>
    </>:null}

    <View style={styles.card}>
      <View style={styles.sectionRow}>
        <Text style={styles.section}>振込先</Text>
        <Text style={[styles.status,payoutReady?styles.ready:styles.pending]}>{payoutReady?"利用可能":"設定が必要"}</Text>
      </View>
      <Text style={styles.item}>{account?.provider==="stripe_connect"?"Stripe Connect":"未設定"}</Text>
      <Text style={styles.meta}>
        {payoutReady
          ?"本人確認・振込設定が利用可能です。"
          :"Stripeの安全な画面で本人確認と振込先を設定します。銀行情報はKoiRela側では直接保持しません。"}
      </Text>
      <Pressable style={styles.primary} onPress={()=>void connectPayout()} disabled={connecting}>
        {connecting?<ActivityIndicator color="#fff"/>:<Text style={styles.primaryText}>{payoutReady?"振込先を確認・変更":"振込先を設定"}</Text>}
      </Pressable>
    </View>

    <View style={styles.card}>
      <Text style={styles.section}>振込履歴</Text>
      {!payouts.length?<Text style={styles.meta}>まだ振込履歴はありません。</Text>:payouts.map(x=><View key={x.id} style={styles.row}>
        <View><Text style={styles.item}>{x.period_start}〜{x.period_end}</Text><Text style={styles.meta}>{statusLabel(x.status)}</Text></View>
        <Text style={styles.amount}>{Number(x.net_jpy).toLocaleString()}円</Text>
      </View>)}
    </View>

    <Text style={styles.note}>※ 手数料率・締め日・振込日は公開前に相談員規約へ正式に記載します。手数料設定が確定するまでは運営からの送金処理は実行できません。振込機能の本番利用にはStripe Connectの審査・本番アカウント設定が必要です。</Text>
  </ScrollView></SafeAreaView>
}

function Stat({label,value}:{label:string;value:string}){return <View style={styles.stat}><Text style={styles.meta}>{label}</Text><Text style={styles.statValue}>{value}</Text></View>}
function statusLabel(v:string){return v==="paid"?"Stripe Connectへ送金済み":v==="processing"?"送金処理中":v==="held"?"運営確認中":v==="failed"?"失敗":"振込予定"}

const styles=StyleSheet.create({
 root:{flex:1,backgroundColor:C.bg},content:{padding:20,paddingBottom:50,gap:12},back:{fontSize:12,fontWeight:"700",color:C.plum},title:{fontSize:23,fontWeight:"800",color:C.plum},
 hero:{backgroundColor:C.plum,borderRadius:28,padding:22},heroLabel:{fontSize:10,color:"rgba(255,255,255,.6)"},heroValue:{fontSize:32,fontWeight:"800",color:"#fff",marginTop:6},heroSub:{fontSize:10,color:"rgba(255,255,255,.65)",marginTop:8},
 grid:{flexDirection:"row",gap:10},stat:{flex:1,backgroundColor:"#fff",borderRadius:20,padding:16},statValue:{fontSize:20,fontWeight:"800",color:C.text,marginTop:5},
 card:{backgroundColor:"#fff",borderRadius:22,padding:16},sectionRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:10},section:{fontSize:13,fontWeight:"800",color:C.plum,marginBottom:10},
 status:{fontSize:9,fontWeight:"800",paddingHorizontal:8,paddingVertical:5,borderRadius:999,overflow:"hidden"},ready:{backgroundColor:"#EDF8F1",color:C.green},pending:{backgroundColor:"#FFF5EA",color:"#A96B27"},
 item:{fontSize:11,fontWeight:"700",color:C.text},meta:{fontSize:9.5,color:C.muted,lineHeight:16},row:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingVertical:11,borderBottomWidth:1,borderBottomColor:C.line},
 amount:{fontSize:13,fontWeight:"800",color:C.coral},primary:{height:46,borderRadius:999,backgroundColor:C.coral,alignItems:"center",justifyContent:"center",marginTop:12},primaryText:{fontSize:10,fontWeight:"800",color:"#fff"},
 note:{fontSize:9.5,lineHeight:17,color:C.muted}
});
