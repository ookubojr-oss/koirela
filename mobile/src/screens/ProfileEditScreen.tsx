import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,Alert,Image,Pressable,SafeAreaView,ScrollView,StyleSheet,Text,TextInput,View
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../lib/supabase";
import { deleteAvatar, publicAvatarUrl, uploadLocalFile } from "../lib/uploads";

const C={plum:"#574E66",coral:"#F2837B",pink:"#FBEAE8",bg:"#FCF9FA",text:"#37313F",muted:"#8A8292",line:"#EEE8EF",danger:"#C85858"};

export default function ProfileEditScreen({onBack}:{onBack:()=>void}) {
  const [nickname,setNickname]=useState("");
  const [ageBand,setAgeBand]=useState("");
  const [avatarPath,setAvatarPath]=useState<string|null>(null);
  const [preview,setPreview]=useState<string|null>(null);
  const [busy,setBusy]=useState(true);

  useEffect(()=>{void load()},[]);

  async function load(){
    const {data:auth}=await supabase.auth.getUser();
    if(!auth.user)return;
    const {data,error}=await supabase.from("profiles").select("nickname,age_band,avatar_path").eq("id",auth.user.id).single();
    if(error)Alert.alert("取得できませんでした",error.message);
    setNickname(data?.nickname||"");setAgeBand(data?.age_band||"");setAvatarPath(data?.avatar_path||null);setPreview(publicAvatarUrl(data?.avatar_path));setBusy(false);
  }

  async function choose(camera=false){
    try{
      if(camera){const p=await ImagePicker.requestCameraPermissionsAsync();if(!p.granted)return Alert.alert("カメラを許可してください")}
      const r=camera
        ? await ImagePicker.launchCameraAsync({mediaTypes:["images"],allowsEditing:true,aspect:[1,1],quality:.85})
        : await ImagePicker.launchImageLibraryAsync({mediaTypes:["images"],allowsEditing:true,aspect:[1,1],quality:.85});
      if(r.canceled)return;
      const a=r.assets[0];
      setBusy(true);
      const path=await uploadLocalFile({bucket:"avatars",uri:a.uri,mimeType:a.mimeType,fileName:a.fileName||"avatar.jpg",folder:"profile"});
      const {data:auth}=await supabase.auth.getUser();
      if(!auth.user)throw new Error("ログインが必要です");
      const {error}=await supabase.from("profiles").update({avatar_path:path,updated_at:new Date().toISOString()}).eq("id",auth.user.id);
      if(error)throw error;
      if(avatarPath)await deleteAvatar(avatarPath).catch(()=>{});
      setAvatarPath(path);setPreview(publicAvatarUrl(path));
    }catch(e:any){Alert.alert("画像を変更できませんでした",e?.message||"もう一度お試しください")}finally{setBusy(false)}
  }

  async function remove(){
    try{
      setBusy(true);
      const {data:auth}=await supabase.auth.getUser();if(!auth.user)return;
      const old=avatarPath;
      const {error}=await supabase.from("profiles").update({avatar_path:null,updated_at:new Date().toISOString()}).eq("id",auth.user.id);
      if(error)throw error;
      if(old)await deleteAvatar(old).catch(()=>{});
      setAvatarPath(null);setPreview(null);
    }catch(e:any){Alert.alert("削除できませんでした",e?.message||"もう一度お試しください")}finally{setBusy(false)}
  }

  async function save(){
    try{
      setBusy(true);
      const {data:auth}=await supabase.auth.getUser();if(!auth.user)throw new Error("ログインが必要です");
      const {error}=await supabase.from("profiles").update({nickname:nickname.trim()||"ユーザー",age_band:ageBand.trim()||null,updated_at:new Date().toISOString()}).eq("id",auth.user.id);
      if(error)throw error;
      Alert.alert("保存しました");
    }catch(e:any){Alert.alert("保存できませんでした",e?.message||"もう一度お試しください")}finally{setBusy(false)}
  }

  if(busy&&!nickname)return <SafeAreaView style={styles.center}><ActivityIndicator color={C.coral}/></SafeAreaView>;

  return <SafeAreaView style={styles.root}><ScrollView contentContainerStyle={styles.content}>
    <Pressable onPress={onBack}><Text style={styles.back}>‹ マイページ</Text></Pressable>
    <Text style={styles.title}>プロフィール編集</Text>
    <View style={styles.card}>
      {preview?<Image source={{uri:preview}} style={styles.avatar}/>:<View style={styles.placeholder}><Text style={styles.initial}>{(nickname||"も").slice(0,1)}</Text></View>}
      <Text style={styles.label}>画像を変更</Text>
      <View style={styles.row}>
        <Pressable style={styles.secondary} onPress={()=>choose(false)}><Text style={styles.secondaryText}>写真を選ぶ</Text></Pressable>
        <Pressable style={styles.secondary} onPress={()=>choose(true)}><Text style={styles.secondaryText}>写真を撮る</Text></Pressable>
      </View>
      <Pressable style={styles.delete} onPress={remove} disabled={!avatarPath}><Text style={styles.deleteText}>現在の画像を削除</Text></Pressable>
      <Text style={styles.label}>ニックネーム</Text>
      <TextInput style={styles.field} value={nickname} onChangeText={setNickname} maxLength={40}/>
      <Text style={styles.label}>年代</Text>
      <TextInput style={styles.field} value={ageBand} onChangeText={setAgeBand} placeholder="例：20代"/>
      <Pressable style={styles.primary} onPress={save} disabled={busy}>{busy?<ActivityIndicator color="#fff"/>:<Text style={styles.primaryText}>保存する</Text>}</Pressable>
    </View>
  </ScrollView></SafeAreaView>;
}

const styles=StyleSheet.create({
 root:{flex:1,backgroundColor:C.bg},center:{flex:1,alignItems:"center",justifyContent:"center",backgroundColor:C.bg},content:{padding:20},back:{fontSize:12,fontWeight:"700",color:C.plum,marginBottom:14},
 title:{fontSize:23,fontWeight:"800",color:C.plum,marginBottom:14},card:{backgroundColor:"#fff",borderRadius:26,padding:18,gap:10},
 avatar:{width:92,height:92,borderRadius:46,alignSelf:"center"},placeholder:{width:92,height:92,borderRadius:46,alignSelf:"center",backgroundColor:C.pink,alignItems:"center",justifyContent:"center"},initial:{fontSize:28,fontWeight:"800",color:C.plum},
 label:{fontSize:10,fontWeight:"800",color:C.muted,marginTop:4},row:{flexDirection:"row",gap:8},secondary:{flex:1,height:43,borderWidth:1,borderColor:C.line,borderRadius:999,alignItems:"center",justifyContent:"center"},secondaryText:{fontSize:10,fontWeight:"700",color:C.plum},
 delete:{height:42,alignItems:"center",justifyContent:"center",opacity:1},deleteText:{fontSize:10,fontWeight:"700",color:C.danger},
 field:{height:50,borderWidth:1,borderColor:C.line,borderRadius:16,paddingHorizontal:13},primary:{height:52,borderRadius:999,backgroundColor:C.coral,alignItems:"center",justifyContent:"center",marginTop:8},primaryText:{color:"#fff",fontWeight:"800"}
});
