import React from "react";
import {Pressable,SafeAreaView,StyleSheet,Text,View} from "react-native";
import {signOut} from "../lib/auth";

const C={plum:"#574E66",coral:"#F2837B",pink:"#FBEAE8",bg:"#FCF9FA",muted:"#8A8292",danger:"#C85858"};

export default function SuspendedAccountScreen({
  reason,
  onSupport
}:{reason?:string|null;onSupport:()=>void}){
  return <SafeAreaView style={styles.root}><View style={styles.card}>
    <View style={styles.icon}><Text style={styles.mark}>!</Text></View>
    <Text style={styles.title}>アカウント利用停止中</Text>
    <Text style={styles.body}>現在このアカウントでは相談・決済などの機能を利用できません。</Text>
    {reason?<View style={styles.reason}><Text style={styles.reasonLabel}>理由</Text><Text style={styles.reasonText}>{reason}</Text></View>:null}
    <Pressable style={styles.primary} onPress={onSupport}><Text style={styles.primaryText}>お問い合わせ</Text></Pressable>
    <Pressable style={styles.secondary} onPress={()=>void signOut()}><Text style={styles.secondaryText}>ログアウト</Text></Pressable>
  </View></SafeAreaView>
}
const styles=StyleSheet.create({
 root:{flex:1,backgroundColor:C.bg,justifyContent:"center",padding:22},card:{backgroundColor:"#fff",borderRadius:30,padding:26,alignItems:"center"},
 icon:{width:64,height:64,borderRadius:24,backgroundColor:C.pink,alignItems:"center",justifyContent:"center"},mark:{fontSize:28,fontWeight:"900",color:C.danger},
 title:{fontSize:21,fontWeight:"800",color:C.plum,marginTop:18},body:{fontSize:11,lineHeight:19,textAlign:"center",color:C.muted,marginTop:8},
 reason:{alignSelf:"stretch",backgroundColor:"#FFF7F7",borderRadius:16,padding:12,marginTop:16},reasonLabel:{fontSize:9,fontWeight:"800",color:C.danger},reasonText:{fontSize:10,lineHeight:17,color:C.muted,marginTop:4},
 primary:{alignSelf:"stretch",height:50,borderRadius:999,backgroundColor:C.coral,alignItems:"center",justifyContent:"center",marginTop:20},primaryText:{color:"#fff",fontWeight:"800"},
 secondary:{padding:14},secondaryText:{fontSize:10,fontWeight:"700",color:C.plum}
});
