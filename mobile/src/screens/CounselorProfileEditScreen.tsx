import React,{useEffect,useState} from "react";
import {
  ActivityIndicator,Alert,Image,Pressable,SafeAreaView,ScrollView,StyleSheet,Text,TextInput,View
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {getCounselorProfile,updateCounselorProfile} from "../lib/api";
import {deleteAvatar,publicAvatarUrl,uploadLocalFile} from "../lib/uploads";

const C={plum:"#574E66",coral:"#F2837B",pink:"#FBEAE8",bg:"#FCF9FA",text:"#37313F",muted:"#8A8292",line:"#EEE8EF",danger:"#C85858"};

export default function CounselorProfileEditScreen({onBack}:{onBack:()=>void}) {
  const [displayName,setDisplayName]=useState("");
  const [specialty,setSpecialty]=useState("");
  const [bio,setBio]=useState("");
  const [gender,setGender]=useState<any>(null);
  const [avatarPath,setAvatarPath]=useState<string|null>(null);
  const [avatarUrl,setAvatarUrl]=useState<string|null>(null);
  const [busy,setBusy]=useState(true);

  useEffect(()=>{void load()},[]);

  async function load(){
    try{
      const x=await getCounselorProfile();
      setDisplayName(x.display_name||"");
      setSpecialty(x.specialty||"");
      setBio(x.bio||"");
      setGender(x.gender||null);
      setAvatarPath(x.avatar_path||null);
      setAvatarUrl(publicAvatarUrl(x.avatar_path));
    }catch(e:any){
      Alert.alert("取得できませんでした",e?.message||"もう一度お試しください");
    }finally{
      setBusy(false);
    }
  }

  async function choosePhoto(camera=false){
    try{
      if(camera){
        const permission=await ImagePicker.requestCameraPermissionsAsync();
        if(!permission.granted)return Alert.alert("カメラを許可してください");
      }
      const result=camera
        ? await ImagePicker.launchCameraAsync({mediaTypes:["images"],allowsEditing:true,aspect:[1,1],quality:.85})
        : await ImagePicker.launchImageLibraryAsync({mediaTypes:["images"],allowsEditing:true,aspect:[1,1],quality:.85});
      if(result.canceled)return;

      const asset=result.assets[0];
      setBusy(true);
      const newPath=await uploadLocalFile({
        bucket:"avatars",
        uri:asset.uri,
        mimeType:asset.mimeType,
        fileName:asset.fileName||"counselor-avatar.jpg",
        folder:"counselor"
      });

      await updateCounselorProfile({displayName,specialty,bio,gender,avatarPath:newPath});
      const oldPath=avatarPath;
      setAvatarPath(newPath);
      setAvatarUrl(publicAvatarUrl(newPath));
      if(oldPath&&oldPath!==newPath)await deleteAvatar(oldPath).catch(()=>{});
    }catch(e:any){
      Alert.alert("画像を変更できませんでした",e?.message||"もう一度お試しください");
    }finally{
      setBusy(false);
    }
  }

  async function removePhoto(){
    if(!avatarPath)return;
    try{
      setBusy(true);
      const oldPath=avatarPath;
      await updateCounselorProfile({displayName,specialty,bio,gender,avatarPath:null});
      setAvatarPath(null);
      setAvatarUrl(null);
      await deleteAvatar(oldPath).catch(()=>{});
    }catch(e:any){
      Alert.alert("画像を削除できませんでした",e?.message||"もう一度お試しください");
    }finally{
      setBusy(false);
    }
  }

  async function save(){
    try{
      setBusy(true);
      await updateCounselorProfile({displayName,specialty,bio,gender});
      Alert.alert("保存しました");
    }catch(e:any){
      const msg=e?.message==="OFF_PLATFORM_PROFILE_BLOCKED"
        ?"外部SNS・連絡先・URLをプロフィールに掲載することはできません。"
        :e?.message||"もう一度お試しください";
      Alert.alert("保存できませんでした",msg);
    }finally{
      setBusy(false);
    }
  }

  if(busy&&!displayName)return <SafeAreaView style={styles.center}><ActivityIndicator color={C.coral}/></SafeAreaView>;

  return <SafeAreaView style={styles.root}><ScrollView contentContainerStyle={styles.content}>
    <Pressable onPress={onBack}><Text style={styles.back}>‹ 相談員モード</Text></Pressable>
    <Text style={styles.title}>相談員プロフィール</Text>
    <View style={styles.notice}><Text style={styles.noticeText}>外部SNS・電話番号・メール・URLの掲載は禁止されています。違反は相談員の違反回数に加算されます。</Text></View>
    <View style={styles.card}>
      <Text style={styles.label}>プロフィール画像</Text>
      {avatarUrl
        ?<Image source={{uri:avatarUrl}} style={styles.avatar}/>
        :<View style={styles.avatarPlaceholder}><Text style={styles.avatarInitial}>{(displayName||"相").slice(0,1)}</Text></View>}
      <View style={styles.photoRow}>
        <Pressable style={styles.secondary} onPress={()=>void choosePhoto(false)} disabled={busy}><Text style={styles.secondaryText}>写真を選ぶ</Text></Pressable>
        <Pressable style={styles.secondary} onPress={()=>void choosePhoto(true)} disabled={busy}><Text style={styles.secondaryText}>写真を撮る</Text></Pressable>
      </View>
      <Pressable style={styles.removePhoto} onPress={()=>void removePhoto()} disabled={!avatarPath||busy}><Text style={styles.removePhotoText}>現在の画像を削除</Text></Pressable>

      <Text style={styles.label}>表示名</Text>
      <TextInput style={styles.field} value={displayName} onChangeText={setDisplayName} maxLength={40}/>
      <Text style={styles.label}>性別（任意）</Text>
      <View style={styles.row}>{[[null,"回答しない"],["female","女性"],["male","男性"],["other","その他"]].map(([v,l])=><Pressable key={String(v)} style={[styles.chip,gender===v&&styles.chipOn]} onPress={()=>setGender(v)}><Text style={[styles.chipText,gender===v&&styles.chipTextOn]}>{l}</Text></Pressable>)}</View>
      <Text style={styles.label}>得意な相談</Text>
      <TextInput style={styles.field} value={specialty} onChangeText={setSpecialty} maxLength={120}/>
      <Text style={styles.label}>自己紹介</Text>
      <TextInput style={[styles.field,styles.area]} value={bio} onChangeText={setBio} maxLength={1000} multiline/>
      <Pressable style={styles.primary} onPress={()=>void save()} disabled={busy}>{busy?<ActivityIndicator color="#fff"/>:<Text style={styles.primaryText}>保存する</Text>}</Pressable>
    </View>
  </ScrollView></SafeAreaView>
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:C.bg},center:{flex:1,alignItems:"center",justifyContent:"center",backgroundColor:C.bg},
  content:{padding:20,paddingBottom:50,gap:11},back:{fontSize:12,fontWeight:"700",color:C.plum},title:{fontSize:23,fontWeight:"800",color:C.plum},
  notice:{backgroundColor:"#FFF8F7",borderRadius:15,padding:11},noticeText:{fontSize:9.5,lineHeight:16,color:"#7A6670"},
  card:{backgroundColor:"#fff",borderRadius:24,padding:17,gap:9},label:{fontSize:10,fontWeight:"800",color:C.muted},
  avatar:{width:92,height:92,borderRadius:46,alignSelf:"center"},avatarPlaceholder:{width:92,height:92,borderRadius:46,alignSelf:"center",backgroundColor:C.pink,alignItems:"center",justifyContent:"center"},
  avatarInitial:{fontSize:28,fontWeight:"800",color:C.plum},photoRow:{flexDirection:"row",gap:8},
  secondary:{flex:1,height:42,borderWidth:1,borderColor:C.line,borderRadius:999,alignItems:"center",justifyContent:"center"},secondaryText:{fontSize:10,fontWeight:"700",color:C.plum},
  removePhoto:{height:38,alignItems:"center",justifyContent:"center"},removePhotoText:{fontSize:9.5,fontWeight:"700",color:C.danger},
  field:{minHeight:50,borderWidth:1,borderColor:C.line,borderRadius:16,paddingHorizontal:12},area:{minHeight:120,textAlignVertical:"top",paddingTop:12},
  row:{flexDirection:"row",gap:6,flexWrap:"wrap"},chip:{borderWidth:1,borderColor:C.line,borderRadius:999,paddingHorizontal:11,paddingVertical:8},chipOn:{backgroundColor:C.plum,borderColor:C.plum},
  chipText:{fontSize:9,fontWeight:"700",color:C.muted},chipTextOn:{color:"#fff"},
  primary:{height:52,borderRadius:999,backgroundColor:C.coral,alignItems:"center",justifyContent:"center",marginTop:6},primaryText:{color:"#fff",fontWeight:"800"}
});
