import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { deleteAccountNow, listBlockedCounselors, loadNotificationPreferences, saveNotificationPreferences, unblockCounselor } from "../lib/api";
import { signOut } from "../lib/auth";
import { supabase } from "../lib/supabase";

const C={plum:"#574E66",coral:"#F2837B",pink:"#FBEAE8",bg:"#FCF9FA",text:"#37313F",muted:"#8A8292",line:"#EEE8EF",danger:"#C85858"};

export default function SettingsScreen({onBack}:{onBack:()=>void}) {
  const [prefs,setPrefs]=useState({enabled:false,one_minute_warning:true,counselor_online:false});
  const [blocked,setBlocked]=useState<any[]>([]);
  const [names,setNames]=useState<Record<string,string>>({});
  const [loading,setLoading]=useState(true);

  useEffect(()=>{void load()},[]);

  async function load(){
    try{
      const [p,b]=await Promise.all([loadNotificationPreferences(),listBlockedCounselors()]);
      setPrefs(p);
      setBlocked(b);
      const ids=b.map((x:any)=>x.blocked_id);
      if(ids.length){
        const {data}=await supabase.from("counselor_profiles").select("user_id,display_name").in("user_id",ids);
        setNames(Object.fromEntries((data||[]).map((x:any)=>[x.user_id,x.display_name])));
      }
    }catch(e:any){
      Alert.alert("設定を取得できませんでした",e?.message||"もう一度お試しください");
    }finally{
      setLoading(false);
    }
  }

  async function change(next:any){
    setPrefs(next);
    try{
      await saveNotificationPreferences(next);
    }catch(e:any){
      Alert.alert("保存できませんでした",e?.message||"もう一度お試しください");
    }
  }

  async function removeBlock(id:string){
    try{
      await unblockCounselor(id);
      setBlocked(v=>v.filter(x=>x.blocked_id!==id));
    }catch(e:any){
      Alert.alert("解除できませんでした",e?.message||"もう一度お試しください");
    }
  }

  async function openLegal(path:string){
    const base=(process.env.EXPO_PUBLIC_LEGAL_BASE_URL||"").replace(/\/$/,"");
    if(!base)return Alert.alert("法務ページのURLが未設定です");
    const url=base+"/legal/"+path;
    const supported=await Linking.canOpenURL(url);
    if(!supported)return Alert.alert("ページを開けませんでした");
    await Linking.openURL(url);
  }

  function deletion(){
    Alert.alert(
      "アカウントを完全に削除しますか？",
      "進行中の相談がない場合、プロフィール・通知情報・アップロード画像などを削除し、必要な取引記録は個人を特定しにくい形で保持します。この操作は元に戻せません。",
      [
        {text:"キャンセル",style:"cancel"},
        {text:"完全に削除",style:"destructive",onPress:async()=>{
          try{
            setLoading(true);
            await deleteAccountNow();
            await signOut().catch(()=>{});
            Alert.alert("アカウントを削除しました");
          }catch(e:any){
            const msg=e?.message==="ACTIVE_CONSULTATION_EXISTS"
              ?"進行中または待機中の相談を終了・キャンセルしてから削除してください。"
              :e?.message||"もう一度お試しください";
            Alert.alert("削除できませんでした",msg);
          }finally{
            setLoading(false);
          }
        }}
      ]
    );
  }

  if(loading)return <SafeAreaView style={styles.center}><ActivityIndicator color={C.coral}/></SafeAreaView>;

  return <SafeAreaView style={styles.root}><ScrollView contentContainerStyle={styles.content}>
    <Pressable onPress={onBack}><Text style={styles.back}>‹ マイページ</Text></Pressable>
    <Text style={styles.title}>設定</Text>

    <View style={styles.card}>
      <Text style={styles.sectionTitle}>通知</Text>
      <Row label="通知を受け取る"><Switch value={prefs.enabled} onValueChange={v=>void change({...prefs,enabled:v})} trackColor={{true:C.coral}}/></Row>
      <Row label="相談終了1分前"><Switch value={prefs.one_minute_warning} onValueChange={v=>void change({...prefs,one_minute_warning:v})} trackColor={{true:C.coral}}/></Row>
      <Row label="お気に入り相談員の受付開始"><Switch value={prefs.counselor_online} onValueChange={v=>void change({...prefs,counselor_online:v})} trackColor={{true:C.coral}}/></Row>
    </View>

    <View style={styles.card}>
      <Text style={styles.sectionTitle}>ブロック中</Text>
      {!blocked.length?<Text style={styles.muted}>ブロック中の相談員はいません。</Text>:blocked.map((x:any)=><View key={x.blocked_id} style={styles.blockRow}>
        <Text style={styles.blockName}>{names[x.blocked_id]||"相談員"}</Text>
        <Pressable onPress={()=>void removeBlock(x.blocked_id)}><Text style={styles.unblock}>解除</Text></Pressable>
      </View>)}
    </View>

    <View style={styles.card}>
      <Text style={styles.sectionTitle}>規約・運営情報</Text>
      <LegalRow label="利用規約" onPress={()=>void openLegal("terms.html")}/>
      <LegalRow label="プライバシーポリシー" onPress={()=>void openLegal("privacy.html")}/>
      <LegalRow label="特定商取引法に基づく表記" onPress={()=>void openLegal("commercial-law.html")}/>
      <LegalRow label="返金・キャンセルポリシー" onPress={()=>void openLegal("refund.html")}/>
      <LegalRow label="相談員利用規約" onPress={()=>void openLegal("counselor-terms.html")}/>
    </View>

    <Pressable style={styles.logout} onPress={()=>void signOut()}><Text style={styles.logoutText}>ログアウト</Text></Pressable>
    <Pressable style={styles.delete} onPress={deletion}><Text style={styles.deleteText}>アカウントを削除</Text></Pressable>
  </ScrollView></SafeAreaView>
}

function Row({label,children}:{label:string;children:React.ReactNode}){
  return <View style={styles.row}><Text style={styles.rowLabel}>{label}</Text>{children}</View>;
}

function LegalRow({label,onPress}:{label:string;onPress:()=>void}){
  return <Pressable style={styles.row} onPress={onPress}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.chevron}>›</Text></Pressable>;
}

const styles=StyleSheet.create({
 root:{flex:1,backgroundColor:C.bg},center:{flex:1,alignItems:"center",justifyContent:"center",backgroundColor:C.bg},
 content:{padding:20,paddingBottom:50,gap:12},back:{fontSize:12,fontWeight:"700",color:C.plum},title:{fontSize:23,fontWeight:"800",color:C.plum,marginBottom:4},
 card:{backgroundColor:"#fff",borderRadius:22,padding:17},sectionTitle:{fontSize:13,fontWeight:"800",color:C.plum,marginBottom:8},
 row:{minHeight:50,flexDirection:"row",alignItems:"center",justifyContent:"space-between",borderBottomWidth:1,borderBottomColor:C.line},rowLabel:{fontSize:11,fontWeight:"700",color:C.text},chevron:{fontSize:18,color:C.muted},
 muted:{fontSize:10,color:C.muted},blockRow:{flexDirection:"row",justifyContent:"space-between",paddingVertical:12,borderBottomWidth:1,borderBottomColor:C.line},
 blockName:{fontSize:11,fontWeight:"700"},unblock:{fontSize:10,color:C.coral,fontWeight:"800"},
 logout:{height:50,borderRadius:999,backgroundColor:"#fff",alignItems:"center",justifyContent:"center"},logoutText:{fontSize:11,fontWeight:"800",color:C.plum},
 delete:{height:50,alignItems:"center",justifyContent:"center"},deleteText:{fontSize:10,fontWeight:"800",color:C.danger}
});
