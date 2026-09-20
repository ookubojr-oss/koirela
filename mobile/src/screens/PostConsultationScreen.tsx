import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { blockCounselor, rateConsultation, reportCounselor } from "../lib/api";

const C={plum:"#574E66",coral:"#F2837B",pink:"#FBEAE8",bg:"#FCF9FA",text:"#37313F",muted:"#8A8292",line:"#EEE8EF",danger:"#C85858"};

export default function PostConsultationScreen({
  consultationId,counselorId,onDone
}:{consultationId:string;counselorId:string;onDone:()=>void}) {
  const [stars,setStars]=useState(0);
  const [busy,setBusy]=useState(false);

  async function saveRating(){
    if(!stars)return Alert.alert("評価を選んでください");
    try{setBusy(true);await rateConsultation(consultationId,counselorId,stars);onDone()}
    catch(e:any){Alert.alert("保存できませんでした",e?.message||"もう一度お試しください")}
    finally{setBusy(false)}
  }

  async function report(reason:string){
    try{
      setBusy(true);
      await reportCounselor(consultationId,counselorId,reason,[]);
      Alert.alert("通報を受け付けました","運営が内容を確認します。");
    }catch(e:any){Alert.alert("通報できませんでした",e?.message||"もう一度お試しください")}
    finally{setBusy(false)}
  }

  async function block(){
    try{
      setBusy(true);await blockCounselor(counselorId);
      Alert.alert("ブロックしました","この相談員は今後の検索・相談対象から除外されます。");
    }catch(e:any){Alert.alert("ブロックできませんでした",e?.message||"もう一度お試しください")}
    finally{setBusy(false)}
  }

  return <SafeAreaView style={styles.root}><View style={styles.card}>
    <View style={styles.icon}><Text style={styles.heart}>♡</Text></View>
    <Text style={styles.title}>相談が終了しました</Text>
    <Text style={styles.lead}>今回の相談はいかがでしたか？</Text>
    <View style={styles.stars}>
      {[1,2,3,4,5].map(n=><Pressable key={n} onPress={()=>setStars(n)}><Text style={[styles.star,n<=stars&&styles.starOn]}>★</Text></Pressable>)}
    </View>
    <Pressable style={styles.primary} onPress={saveRating} disabled={busy}>{busy?<ActivityIndicator color="#fff"/>:<Text style={styles.primaryText}>評価して終了</Text>}</Pressable>
    <Pressable style={styles.secondary} onPress={()=>report("外部サービスへの勧誘")} disabled={busy}><Text style={styles.dangerText}>外部サービスに誘導された</Text></Pressable>
    <Pressable style={styles.secondary} onPress={()=>report("不適切な発言")} disabled={busy}><Text style={styles.secondaryText}>その他の問題を通報</Text></Pressable>
    <Pressable style={styles.secondary} onPress={block} disabled={busy}><Text style={styles.secondaryText}>この相談員をブロック</Text></Pressable>
    <Pressable style={styles.skip} onPress={onDone}><Text style={styles.skipText}>評価せずホームへ</Text></Pressable>
  </View></SafeAreaView>
}

const styles=StyleSheet.create({
 root:{flex:1,backgroundColor:C.bg,justifyContent:"center",padding:22},card:{backgroundColor:"#fff",borderRadius:30,padding:22,alignItems:"center"},
 icon:{width:62,height:62,borderRadius:24,backgroundColor:C.pink,alignItems:"center",justifyContent:"center"},heart:{fontSize:30,color:C.coral},
 title:{fontSize:20,fontWeight:"800",color:C.plum,marginTop:14},lead:{fontSize:11,color:C.muted,marginTop:6},
 stars:{flexDirection:"row",gap:5,marginVertical:22},star:{fontSize:34,color:"#E9E3EB"},starOn:{color:"#F2B84B"},
 primary:{width:"100%",height:52,borderRadius:999,backgroundColor:C.coral,alignItems:"center",justifyContent:"center"},primaryText:{color:"#fff",fontWeight:"800"},
 secondary:{width:"100%",height:44,alignItems:"center",justifyContent:"center",borderBottomWidth:1,borderBottomColor:C.line},secondaryText:{fontSize:10,fontWeight:"700",color:C.plum},dangerText:{fontSize:10,fontWeight:"700",color:C.danger},
 skip:{padding:13},skipText:{fontSize:10,color:C.muted,fontWeight:"700"}
});
