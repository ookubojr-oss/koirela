import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { submitCounselorApplication } from "../lib/api";
import { uploadLocalFile } from "../lib/uploads";

const C = {
  plum:"#574E66",coral:"#F2837B",pink:"#FBEAE8",bg:"#FCF9FA",text:"#37313F",
  muted:"#8A8292",line:"#EEE8EF",white:"#FFFFFF",danger:"#C85858"
};

type Picked = { uri:string; name:string; mimeType?:string | null };

export default function CounselorApplicationScreen({ onBack, onDone }: {
  onBack: () => void;
  onDone: () => void;
}) {
  const [displayName,setDisplayName]=useState("");
  const [type,setType]=useState<"experience"|"qualified">("experience");
  const [gender,setGender]=useState<"female"|"male"|"other"|null>(null);
  const [specialty,setSpecialty]=useState("");
  const [bio,setBio]=useState("");
  const [qualificationLabel,setQualificationLabel]=useState("");
  const [avatar,setAvatar]=useState<Picked|null>(null);
  const [identity,setIdentity]=useState<Picked|null>(null);
  const [qualification,setQualification]=useState<Picked|null>(null);
  const [busy,setBusy]=useState(false);

  async function chooseAvatar(fromCamera=false) {
    try {
      if (fromCamera) {
        const permission=await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) return Alert.alert("カメラを許可してください");
      }
      const result=fromCamera
        ? await ImagePicker.launchCameraAsync({mediaTypes:["images"],allowsEditing:true,aspect:[1,1],quality:.85})
        : await ImagePicker.launchImageLibraryAsync({mediaTypes:["images"],allowsEditing:true,aspect:[1,1],quality:.85});
      if (result.canceled) return;
      const a=result.assets[0];
      setAvatar({uri:a.uri,name:a.fileName||"avatar.jpg",mimeType:a.mimeType||"image/jpeg"});
    } catch (e:any) {
      Alert.alert("画像を選べませんでした",e?.message||"もう一度お試しください");
    }
  }

  async function chooseDocument(kind:"identity"|"qualification") {
    try {
      const result=await DocumentPicker.getDocumentAsync({
        type:["image/*","application/pdf"],
        copyToCacheDirectory:true,
        multiple:false
      });
      if (result.canceled) return;
      const a=result.assets[0];
      const picked={uri:a.uri,name:a.name,mimeType:a.mimeType};
      if (kind==="identity") setIdentity(picked); else setQualification(picked);
    } catch (e:any) {
      Alert.alert("書類を選べませんでした",e?.message||"もう一度お試しください");
    }
  }

  async function submit() {
    if (!displayName.trim()) return Alert.alert("表示名を入力してください");
    if (!identity) return Alert.alert("本人確認書類を選択してください");
    if (type==="qualified" && (!qualificationLabel.trim() || !qualification)) {
      return Alert.alert("資格名と資格証明を登録してください");
    }

    try {
      setBusy(true);
      const avatarPath=avatar ? await uploadLocalFile({
        bucket:"avatars",uri:avatar.uri,mimeType:avatar.mimeType,fileName:avatar.name,folder:"profile"
      }) : null;

      const documentPath=await uploadLocalFile({
        bucket:"counselor-verification",uri:identity.uri,mimeType:identity.mimeType,fileName:identity.name,folder:"identity"
      });

      const qualificationDocumentPath=qualification ? await uploadLocalFile({
        bucket:"counselor-verification",uri:qualification.uri,mimeType:qualification.mimeType,fileName:qualification.name,folder:"qualification"
      }) : null;

      await submitCounselorApplication({
        displayName:displayName.trim(),
        counselorType:type,
        gender,
        specialty:specialty.trim(),
        bio:bio.trim(),
        qualificationLabel:type==="qualified"?qualificationLabel.trim():null,
        documentPath,
        qualificationDocumentPath,
        avatarPath
      });

      Alert.alert("申請を受け付けました","運営確認後に相談員として受付できるようになります。",[{text:"OK",onPress:onDone}]);
    } catch (e:any) {
      Alert.alert("申請できませんでした",e?.message||"もう一度お試しください");
    } finally {
      setBusy(false);
    }
  }

  const option=(selected:boolean)=>[styles.option,selected&&styles.optionOn];

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={onBack}><Text style={styles.back}>‹ マイページ</Text></Pressable>
        <Text style={styles.title}>相談員登録</Text>
        <Text style={styles.lead}>本人確認後に活動を開始できます。公開プロフィールと審査書類は分けて管理します。</Text>

        <View style={styles.card}>
          <Text style={styles.label}>プロフィール画像（公開・任意）</Text>
          {avatar ? <Image source={{uri:avatar.uri}} style={styles.avatar}/> : <View style={styles.avatarPlaceholder}><Text style={styles.avatarHeart}>♡</Text></View>}
          <View style={styles.row}>
            <Pressable style={styles.secondary} onPress={()=>chooseAvatar(false)}><Text style={styles.secondaryText}>写真を選ぶ</Text></Pressable>
            <Pressable style={styles.secondary} onPress={()=>chooseAvatar(true)}><Text style={styles.secondaryText}>写真を撮る</Text></Pressable>
          </View>

          <Text style={styles.label}>活動タイプ</Text>
          <View style={styles.row}>
            <Pressable style={option(type==="experience")} onPress={()=>setType("experience")}><Text style={type==="experience"?styles.optionTextOn:styles.optionText}>経験者</Text></Pressable>
            <Pressable style={option(type==="qualified")} onPress={()=>setType("qualified")}><Text style={type==="qualified"?styles.optionTextOn:styles.optionText}>資格者</Text></Pressable>
          </View>

          <Text style={styles.label}>表示名</Text>
          <TextInput style={styles.field} value={displayName} onChangeText={setDisplayName} maxLength={40} placeholder="例：あいり"/>

          <Text style={styles.label}>性別（任意）</Text>
          <View style={styles.wrapRow}>
            {[
              [null,"回答しない"],["female","女性"],["male","男性"],["other","その他"]
            ].map(([value,label])=>(
              <Pressable key={String(value)} style={option(gender===value)} onPress={()=>setGender(value as any)}>
                <Text style={gender===value?styles.optionTextOn:styles.optionText}>{label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>得意な相談</Text>
          <TextInput style={styles.field} value={specialty} onChangeText={setSpecialty} maxLength={120} placeholder="復縁・片思い など"/>

          <Text style={styles.label}>自己紹介</Text>
          <TextInput style={[styles.field,styles.textarea]} value={bio} onChangeText={setBio} maxLength={1000} multiline placeholder="相談する方に向けた自己紹介"/>

          <Text style={styles.label}>本人確認書類（非公開・必須）</Text>
          <Pressable style={styles.upload} onPress={()=>chooseDocument("identity")}>
            <Text style={styles.uploadText}>{identity ? "✓ "+identity.name : "＋ 書類を選択"}</Text>
          </Pressable>

          {type==="qualified" ? <>
            <Text style={styles.label}>資格名</Text>
            <TextInput style={styles.field} value={qualificationLabel} onChangeText={setQualificationLabel} maxLength={120} placeholder="正式な資格名"/>
            <Text style={styles.label}>資格証明（非公開・必須）</Text>
            <Pressable style={styles.upload} onPress={()=>chooseDocument("qualification")}>
              <Text style={styles.uploadText}>{qualification ? "✓ "+qualification.name : "＋ 資格証を選択"}</Text>
            </Pressable>
          </> : null}

          <View style={styles.policy}>
            <Text style={styles.policyText}>外部SNS・電話番号・メール・URLを公開プロフィールに掲載することはできません。相談員の外部誘導は1回目警告、2回目でアカウント停止となります。</Text>
          </View>

          <Pressable style={styles.primary} onPress={submit} disabled={busy}>
            {busy?<ActivityIndicator color="#fff"/>:<Text style={styles.primaryText}>審査を申請する</Text>}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:C.bg},content:{padding:20,paddingBottom:50},back:{fontSize:12,fontWeight:"700",color:C.plum,marginBottom:14},
  title:{fontSize:23,fontWeight:"800",color:C.plum},lead:{fontSize:11,lineHeight:19,color:C.muted,marginTop:7,marginBottom:16},
  card:{backgroundColor:"#fff",borderRadius:26,padding:18,gap:10},label:{fontSize:10,fontWeight:"800",color:C.muted,marginTop:5},
  field:{minHeight:50,borderWidth:1,borderColor:C.line,borderRadius:16,paddingHorizontal:13,color:C.text},textarea:{minHeight:110,paddingTop:12,textAlignVertical:"top"},
  row:{flexDirection:"row",gap:8},wrapRow:{flexDirection:"row",gap:7,flexWrap:"wrap"},option:{borderWidth:1,borderColor:C.line,borderRadius:999,paddingHorizontal:13,paddingVertical:9},
  optionOn:{backgroundColor:C.plum,borderColor:C.plum},optionText:{fontSize:10,fontWeight:"700",color:C.muted},optionTextOn:{fontSize:10,fontWeight:"700",color:"#fff"},
  avatar:{width:84,height:84,borderRadius:42,alignSelf:"center"},avatarPlaceholder:{width:84,height:84,borderRadius:42,alignSelf:"center",backgroundColor:C.pink,alignItems:"center",justifyContent:"center"},
  avatarHeart:{fontSize:28,color:C.coral},secondary:{flex:1,height:42,borderWidth:1,borderColor:C.line,borderRadius:999,alignItems:"center",justifyContent:"center"},secondaryText:{fontSize:10,fontWeight:"700",color:C.plum},
  upload:{minHeight:50,borderWidth:1,borderStyle:"dashed",borderColor:"#D9D1DE",borderRadius:16,alignItems:"center",justifyContent:"center",padding:10},uploadText:{fontSize:10,fontWeight:"700",color:C.plum,textAlign:"center"},
  policy:{backgroundColor:"#FFF8F7",borderRadius:15,padding:11},policyText:{fontSize:9.5,lineHeight:16,color:"#7A6670"},
  primary:{height:52,borderRadius:999,backgroundColor:C.coral,alignItems:"center",justifyContent:"center",marginTop:6},primaryText:{color:"#fff",fontWeight:"800"}
});
