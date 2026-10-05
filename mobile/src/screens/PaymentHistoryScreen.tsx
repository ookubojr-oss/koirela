import React,{useEffect,useState} from "react";
import {ActivityIndicator,Alert,Pressable,SafeAreaView,ScrollView,StyleSheet,Text,View} from "react-native";
import {listPaymentHistory} from "../lib/api";

const C={plum:"#574E66",coral:"#F2837B",bg:"#FCF9FA",text:"#37313F",muted:"#8A8292",line:"#EEE8EF",green:"#5F9B78",danger:"#C85858"};

function kindLabel(kind:string){
  return kind==="extension"?"15分延長":kind==="refund"?"返金":"15分相談";
}
function statusLabel(status:string){
  if(status==="succeeded")return "支払い済み";
  if(status==="pending")return "処理中";
  if(status==="failed")return "失敗";
  if(status==="canceled")return "キャンセル";
  return status;
}

export default function PaymentHistoryScreen({onBack}:{onBack:()=>void}){
  const [items,setItems]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{void load()},[]);
  async function load(){
    try{setItems(await listPaymentHistory())}
    catch(e:any){Alert.alert("決済履歴を取得できませんでした",e?.message||"もう一度お試しください")}
    finally{setLoading(false)}
  }

  return <SafeAreaView style={styles.root}><ScrollView contentContainerStyle={styles.content}>
    <Pressable onPress={onBack}><Text style={styles.back}>‹ マイページ</Text></Pressable>
    <Text style={styles.title}>決済履歴・領収情報</Text>
    <Text style={styles.lead}>支払い・延長・返金の記録を確認できます。</Text>

    {loading?<ActivityIndicator color={C.coral}/>:null}
    {!loading&&!items.length?<View style={styles.empty}><Text style={styles.emptyIcon}>¥</Text><Text style={styles.itemTitle}>まだ決済履歴がありません</Text></View>:null}

    {items.map(item=>{
      const date=new Date(item.created_at).toLocaleString("ja-JP",{year:"numeric",month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"});
      const receipt="KR-"+String(item.id).slice(0,8).toUpperCase();
      const isRefund=item.kind==="refund";
      return <View key={item.id} style={styles.card}>
        <View style={styles.row}><View><Text style={styles.itemTitle}>{kindLabel(item.kind)}</Text><Text style={styles.meta}>{date}</Text></View><Text style={[styles.amount,isRefund&&styles.refund]}>{isRefund?"−":""}{Number(item.amount_jpy||0).toLocaleString()}円</Text></View>
        <View style={styles.rule}/>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>状態</Text><Text style={styles.detailValue}>{statusLabel(item.status)}</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>領収番号</Text><Text style={styles.detailValue}>{receipt}</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>相談ID</Text><Text style={styles.detailValue}>{String(item.consultation_id||"").slice(0,8)}…</Text></View>
        <Text style={styles.note}>本番の適格請求書・領収書記載事項は運営主体・税務情報の確定後に正式化します。</Text>
      </View>
    })}
  </ScrollView></SafeAreaView>
}

const styles=StyleSheet.create({
 root:{flex:1,backgroundColor:C.bg},content:{padding:20,paddingBottom:50,gap:11},back:{fontSize:12,fontWeight:"700",color:C.plum},title:{fontSize:23,fontWeight:"800",color:C.plum},lead:{fontSize:10.5,lineHeight:18,color:C.muted,marginBottom:4},
 card:{backgroundColor:"#fff",borderRadius:22,padding:16},row:{flexDirection:"row",justifyContent:"space-between",alignItems:"flex-start",gap:12},itemTitle:{fontSize:13,fontWeight:"800",color:C.text},meta:{fontSize:9.5,color:C.muted,marginTop:4},amount:{fontSize:17,fontWeight:"800",color:C.coral},refund:{color:C.green},rule:{height:1,backgroundColor:C.line,marginVertical:13},detailRow:{flexDirection:"row",justifyContent:"space-between",paddingVertical:4},detailLabel:{fontSize:9.5,color:C.muted},detailValue:{fontSize:9.5,fontWeight:"700",color:C.text},note:{fontSize:8.5,lineHeight:14,color:C.muted,marginTop:10},empty:{backgroundColor:"#fff",borderRadius:22,padding:34,alignItems:"center"},emptyIcon:{fontSize:28,fontWeight:"800",color:C.coral,marginBottom:8}
});
