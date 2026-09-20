import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, Pressable, View } from "react-native";
import { listConsultationHistory, type Counselor } from "../lib/api";

const C={plum:"#574E66",coral:"#F2837B",bg:"#FCF9FA",text:"#37313F",muted:"#8A8292",line:"#EEE8EF"};

export default function HistoryScreen({onBack,onReconsult}:{onBack:()=>void;onReconsult:(counselor:Counselor)=>void}) {
  const [items,setItems]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{void load()},[]);
  async function load(){
    try{setItems(await listConsultationHistory())}
    catch(e:any){Alert.alert("履歴を取得できませんでした",e?.message||"もう一度お試しください")}
    finally{setLoading(false)}
  }
  return <SafeAreaView style={styles.root}><ScrollView contentContainerStyle={styles.content}>
    <Pressable onPress={onBack}><Text style={styles.back}>‹ マイページ</Text></Pressable>
    <Text style={styles.title}>相談履歴</Text>
    {loading?<ActivityIndicator color={C.coral}/>:null}
    {!loading&&!items.length?<View style={styles.empty}><Text style={styles.emptyHeart}>♡</Text><Text style={styles.itemName}>まだ相談履歴がありません</Text></View>:null}
    {items.map(item=>{
      const counselor=Array.isArray(item.counselor)?item.counselor[0]:item.counselor;
      const date=new Date(item.started_at||item.created_at).toLocaleString("ja-JP",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"});
      const minutes=Math.round((item.duration_seconds||900)/60);
      return <View key={item.id} style={styles.item}>
        <View style={styles.row}><Text style={styles.itemName}>{counselor?.display_name||"相談員"}</Text><Text style={styles.date}>{date}</Text></View>
        <Text style={styles.meta}>{minutes}分相談 ・ {item.price_jpy||100}円 ・ {statusLabel(item.status)}</Text>
        {item.status==="ended"&&counselor&&!counselor.is_suspended&&counselor.verification_status==="approved"?<Pressable style={styles.reconsult} onPress={()=>onReconsult({
          user_id:item.counselor_id,
          display_name:counselor.display_name,
          counselor_type:counselor.counselor_type,
          gender:counselor.gender??null,
          specialty:counselor.specialty??null,
          bio:counselor.bio??null,
          avatar_path:counselor.avatar_path??null,
          qualification_label:counselor.qualification_label??null
        })}><Text style={styles.reconsultText}>この人にもう一度相談する</Text></Pressable>:null}
      </View>
    })}
  </ScrollView></SafeAreaView>
}
function statusLabel(value:string){return value==="ended"?"完了":value==="refunded"?"返金":value==="canceled"?"キャンセル":value==="active"?"相談中":"処理中"}
const styles=StyleSheet.create({
 root:{flex:1,backgroundColor:C.bg},content:{padding:20,paddingBottom:40,gap:10},back:{fontSize:12,fontWeight:"700",color:C.plum,marginBottom:6},title:{fontSize:23,fontWeight:"800",color:C.plum,marginBottom:8},
 item:{backgroundColor:"#fff",borderRadius:20,padding:16},reconsult:{height:42,borderRadius:999,backgroundColor:C.coral,alignItems:"center",justifyContent:"center",marginTop:12},reconsultText:{fontSize:10,fontWeight:"800",color:"#fff"},row:{flexDirection:"row",justifyContent:"space-between",gap:10},itemName:{fontSize:13,fontWeight:"800",color:C.text},date:{fontSize:9,color:C.muted},meta:{fontSize:10,color:C.muted,marginTop:7},
 empty:{backgroundColor:"#fff",borderRadius:24,padding:34,alignItems:"center"},emptyHeart:{fontSize:32,color:C.coral,marginBottom:8}
});
