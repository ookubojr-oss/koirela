import React from "react";
import {Pressable,SafeAreaView,StyleSheet,Text,View} from "react-native";
import {reportClientError} from "../lib/monitoring";

const C={plum:"#574E66",coral:"#F2837B",pink:"#FBEAE8",bg:"#FCF9FA",muted:"#8A8292"};

export default class AppErrorBoundary extends React.Component<
  {children:React.ReactNode},
  {hasError:boolean}
>{
  state={hasError:false};

  static getDerivedStateFromError(){
    return {hasError:true};
  }

  componentDidCatch(error:Error,info:React.ErrorInfo){
    void reportClientError(error,{componentStack:info.componentStack},"fatal");
  }

  render(){
    if(!this.state.hasError)return this.props.children;
    return <SafeAreaView style={styles.root}><View style={styles.card}>
      <View style={styles.icon}><Text style={styles.heart}>♡</Text></View>
      <Text style={styles.title}>画面を表示できませんでした</Text>
      <Text style={styles.body}>エラー情報を運営へ送信しました。もう一度アプリを開き直してください。</Text>
      <Pressable style={styles.button} onPress={()=>this.setState({hasError:false})}><Text style={styles.buttonText}>もう一度表示</Text></Pressable>
    </View></SafeAreaView>;
  }
}

const styles=StyleSheet.create({
 root:{flex:1,backgroundColor:C.bg,alignItems:"center",justifyContent:"center",padding:24},
 card:{backgroundColor:"#fff",borderRadius:30,padding:28,alignItems:"center",maxWidth:420},
 icon:{width:66,height:66,borderRadius:25,backgroundColor:C.pink,alignItems:"center",justifyContent:"center},
 heart:{fontSize:30,color:C.coral},title:{fontSize:20,fontWeight:"800",color:C.plum,marginTop:16},
 body:{fontSize:11,lineHeight:19,textAlign:"center",color:C.muted,marginTop:8},
 button:{height:48,alignSelf:"stretch",borderRadius:999,backgroundColor:C.coral,alignItems:"center",justifyContent:"center",marginTop:20},
 buttonText:{color:"#fff",fontWeight:"800"}
});
