import React,{useEffect,useState} from "react";
import {ActivityIndicator,Alert,Pressable,SafeAreaView,ScrollView,StyleSheet,Text,View} from "react-native";
import {getCounselorEarningsSummary,getCounselorPayoutAccount,listCounselorPayouts} from "../lib/api";

const C={plum:"#574E66",coral:"#F2837B",bg:"#FCF9FA",text:"#37313F",muted:"#8A8292",line:"#EEE8EF",danger:"#C85858"};

export default function CounselorEarningsScreen({onBack}:{onBack:()=>void}) {
  const [summary,setSummary]=useState<any>(null);
  const [payouts,setPayouts]=useState<any[]>([]);
  const [account,setAccount]=useState<any>(null);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{void load()},[]);
  async function load(){try{const [s,p,a]=await Promise.all([getCounselorEarningsSummary(),listCounselorPayouts(),getCounselorPayoutAccount()]);setSummary(s);setPayouts(p);setAccount(a)}catch(e:any){Alert.alert("報酬情報を取得できませんでした",e?.message||"もう一度お試しください")}finally{setLoading(false)}}
  return <SafeAreaView style={styles.root}><ScrollView contentContainerStyle={styles.content}>
    <Pressable onPress={onBack}><Text style={styles.back}>‹ 相談員モード</Text></Pressable>
    <Text style={styles.title}>売上・報酬</Text>
    {loading?<ActivityIndicator color={C.coral}/>:null}
    {!loading&&summary?<>
      <View style={styles.hero}><Text style={styles.heroLabel}>今月の受取見込み</Text><Text style={styles.heroValue}>{Number(summary.estimated_net_jpy||0).toLocaleString()}円</Text><Text style={styles.heroSub}>売上 {Number(summary.month_gross_jpy||0).toLocaleString()}円 − 手数料見込み {Number(summary.estimated_platform_fee_jpy||0).toLocaleString()}円</Text></View>
      <View style={styles.grid}><Stat label="今日の相談" value={(summary.today_consultations||0)+"件"}/><Stat label="今月の相談" value={(summary.month_consultations||0)+"件"}/></View>
    </>:null}
    <View style={styles.card}><Text style={styles.section}>振込先</Text><Text style={styles.item}>{account?.bank_label||"未設定"}</Text><Text style={styles.meta}>{account?.account_holder_masked||"本番では振込サービス連携後に設定します"} ・ {account?.status||"not_configured"}</Text></View>
    <View style={styles.card}><Text style={styles.section}>振込履歴</Text>{!payouts.length?<Text style={styles.meta}>まだ振込履歴はありません。</Text>:payouts.map(x=><View key={x.id} style={styles.row}><View><Text style={styles.item}>{x.period_start}〜{x.period_end}</Text><Text style={styles.meta}>{x.status}</Text></View><Text style={styles.amount}>{Number(x.net_jpy).toLocaleString()}円</Text></View>)}</View>
    <Text style={styles.note}>※ 手数料率は現在デモ計算です。本番公開前に相談員への分配率・振込条件を正式決定します。</Text>
  </ScrollView></SafeAreaView>
}
function Stat({label,value}:{label:string;value:string}){return <View style={styles.stat}><Text style={styles.meta}>{label}</Text><Text style={styles.statValue}>{value}</Text></View>}
const styles=StyleSheet.create({
 root:{flex:1,backgroundColor:C.bg},content:{padding:20,paddingBottom:50,gap:12},back:{fontSize:12,fontWeight:"700",color:C.plum},title:{fontSize:23,fontWeight:"800",color:C.plum},hero:{backgroundColor:C.plum,borderRadius:28,padding:22},heroLabel:{fontSize:10,color:"rgba(255,255,255,.6)"},heroValue:{fontSize:32,fontWeight:"800",color:"#fff",marginTop:6},heroSub:{fontSize:10,color:"rgba(255,255,255,.65)",marginTop:8},grid:{flexDirection:"row",gap:10},stat:{flex:1,backgroundColor:"#fff",borderRadius:20,padding:16},statValue:{fontSize:20,fontWeight:"800",color:C.text,marginTop:5},card:{backgroundColor:"#fff",borderRadius:22,padding:16},section:{fontSize:13,fontWeight:"800",color:C.plum,marginBottom:10},item:{fontSize:11,fontWeight:"700",color:C.text},meta:{fontSize:9.5,color:C.muted,lineHeight:16},row:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingVertical:11,borderBottomWidth:1,borderBottomColor:C.line},amount:{fontSize:13,fontWeight:"800",color:C.coral},note:{fontSize:9.5,lineHeight:17,color:C.muted}
});
