import React,{useEffect,useState} from "react";
import {ActivityIndicator,Alert,Pressable,SafeAreaView,ScrollView,StyleSheet,Text,View} from "react-native";
import {listFavoriteCounselors,setFavoriteCounselor,type Counselor} from "../lib/api";

const C={plum:"#574E66",coral:"#F2837B",bg:"#FCF9FA",text:"#37313F",muted:"#8A8292",line:"#EEE8EF",pink:"#FBEAE8"};

export default function FavoritesScreen({onBack,onChoose}:{onBack:()=>void;onChoose:(c:Counselor)=>void}) {
  const [items,setItems]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{void load()},[]);
  async function load(){try{setItems(await listFavoriteCounselors())}catch(e:any){Alert.alert("取得できませんでした",e?.message||"もう一度お試しください")}finally{setLoading(false)}}
  async function remove(id:string){try{await setFavoriteCounselor(id,false);setItems(v=>v.filter(x=>x.counselor_id!==id))}catch(e:any){Alert.alert("解除できませんでした",e?.message||"もう一度お試しください")}}
  return <SafeAreaView style={styles.root}><ScrollView contentContainerStyle={styles.content}>
    <Pressable onPress={onBack}><Text style={styles.back}>‹ マイページ</Text></Pressable>
    <Text style={styles.title}>お気に入り</Text>
    {loading?<ActivityIndicator color={C.coral}/>:null}
    {!loading&&!items.length?<View style={styles.empty}><Text style={styles.heart}>♡</Text><Text style={styles.name}>お気に入りはまだありません</Text></View>:null}
    {items.map(row=>{
      const c=Array.isArray(row.counselor)?row.counselor[0]:row.counselor;
      if(!c)return null;
      const availability=Array.isArray(c.counselor_availability)?c.counselor_availability[0]:c.counselor_availability;
      const accepting=Boolean(availability?.is_accepting);
      return <View key={row.counselor_id} style={styles.card}>
        <View style={styles.top}><View style={styles.avatar}><Text style={styles.avatarText}>{c.display_name.slice(0,1)}</Text></View><View style={{flex:1}}><Text style={styles.name}>{c.display_name}</Text><Text style={styles.meta}>{c.counselor_type==="qualified"?"資格者":"経験者"} ・ {c.specialty||"恋愛相談"}</Text><Text style={[styles.availability,accepting?styles.online:styles.offline]}>{accepting?"● 今すぐ相談できます":"○ 現在受付停止中"}</Text></View><Pressable onPress={()=>void remove(row.counselor_id)}><Text style={styles.remove}>♥</Text></Pressable></View>
        <Text style={styles.bio}>{c.bio||"相談内容を一緒に整理します。"}</Text>
        <Pressable style={[styles.primary,!accepting&&styles.primaryDisabled]} onPress={()=>accepting&&onChoose(c)} disabled={!accepting}><Text style={styles.primaryText}>{accepting?"この人に相談する":"受付開始を待つ"}</Text></Pressable>
      </View>
    })}
  </ScrollView></SafeAreaView>
}
const styles=StyleSheet.create({
 root:{flex:1,backgroundColor:C.bg},content:{padding:20,paddingBottom:40,gap:10},back:{fontSize:12,fontWeight:"700",color:C.plum},title:{fontSize:23,fontWeight:"800",color:C.plum,marginBottom:4},
 card:{backgroundColor:"#fff",borderRadius:22,padding:16,gap:11},top:{flexDirection:"row",alignItems:"center",gap:10},avatar:{width:46,height:46,borderRadius:23,backgroundColor:C.pink,alignItems:"center",justifyContent:"center},avatarText:{fontWeight:"800",color:C.plum},name:{fontSize:13,fontWeight:"800",color:C.text},meta:{fontSize:9,color:C.muted,marginTop:2},availability:{fontSize:9,fontWeight:"800",marginTop:4},online:{color:"#5F9B78"},offline:{color:C.muted},remove:{fontSize:20,color:C.coral},bio:{fontSize:11,lineHeight:18,color:C.muted},primary:{height:46,borderRadius:999,backgroundColor:C.coral,alignItems:"center",justifyContent:"center"},primaryDisabled:{backgroundColor:"#CFC8D2"},primaryText:{fontSize:11,fontWeight:"800",color:"#fff"},empty:{backgroundColor:"#fff",borderRadius:22,padding:32,alignItems:"center"},heart:{fontSize:32,color:C.coral,marginBottom:8}
});
