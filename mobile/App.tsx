import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as Linking from "expo-linking";
import { StripeProvider, useStripe } from "@stripe/stripe-react-native";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./src/lib/supabase";
import { consumeAuthUrl, requestPasswordReset, signInWithEmail, signInWithLine, signInWithOAuth, signOut, signUpWithEmail, updatePassword } from "./src/lib/auth";
import {
  acceptConsultation,
  cancelConsultation,
  createExtensionPaymentIntent,
  createPaymentIntent,
  endConsultation,
  getResumableConsultation,
  listCounselors,
  listFavoriteIds,
  loadMaintenanceSetting,
  sendMessage,
  setFavoriteCounselor,
  setCounselorAvailability,
  subscribeToConsultation,
  subscribeToMessages,
  type Counselor
} from "./src/lib/api";
import { clearConsultationNotifications, registerPushToken, scheduleOneMinuteWarning, subscribeNotificationResponses } from "./src/lib/notifications";
import { publicAvatarUrl } from "./src/lib/uploads";
import CounselorApplicationScreen from "./src/screens/CounselorApplicationScreen";
import ProfileEditScreen from "./src/screens/ProfileEditScreen";
import HistoryScreen from "./src/screens/HistoryScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import PostConsultationScreen from "./src/screens/PostConsultationScreen";
import FavoritesScreen from "./src/screens/FavoritesScreen";
import CounselorEarningsScreen from "./src/screens/CounselorEarningsScreen";
import SupportScreen from "./src/screens/SupportScreen";
import MaintenanceScreen from "./src/screens/MaintenanceScreen";
import CounselorProfileEditScreen from "./src/screens/CounselorProfileEditScreen";
import PaymentHistoryScreen from "./src/screens/PaymentHistoryScreen";
import SuspendedAccountScreen from "./src/screens/SuspendedAccountScreen";
import AppErrorBoundary from "./src/components/AppErrorBoundary";

const COLORS = {
  plum: "#574E66",
  coral: "#F2837B",
  pink: "#FBEAE8",
  bg: "#FCF9FA",
  text: "#37313F",
  muted: "#8A8292",
  line: "#EEE8EF",
  white: "#FFFFFF",
  danger: "#C85858"
};

type Tab = "home" | "find" | "mypage";

type ConsultationState = {
  id: string;
  status: string;
  counselor_id?: string;
  user_id?: string;
  started_at?: string | null;
  ends_at?: string | null;
};

function AuthScreen() {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    try {
      setBusy(true);

      if (mode === "forgot") {
        if (!email.trim()) return Alert.alert("メールアドレスを入力してください");
        await requestPasswordReset(email.trim());
        Alert.alert("再設定メールを送りました", "メール内のリンクから新しいパスワードを設定してください。");
        setMode("login");
        return;
      }

      if (mode === "signup") {
        if (!nickname.trim()) return Alert.alert("ニックネームを入力してください");
        if (password.length < 8) return Alert.alert("パスワードは8文字以上にしてください");
        const result = await signUpWithEmail(email.trim(), password, nickname.trim());
        if (!result.session) {
          Alert.alert("確認メールを送りました", "メール内のリンクを開くと登録が完了します。");
          setMode("login");
        }
        return;
      }

      await signInWithEmail(email.trim(), password);
    } catch (error: any) {
      Alert.alert(
        mode === "signup" ? "登録できませんでした" : mode === "forgot" ? "送信できませんでした" : "ログインできませんでした",
        error?.message ?? "入力内容を確認してください"
      );
    } finally {
      setBusy(false);
    }
  }

  async function oauth(provider: "apple" | "google") {
    try {
      setBusy(true);
      await signInWithOAuth(provider);
    } catch (error: any) {
      Alert.alert("ログインできませんでした", error?.message ?? "もう一度お試しください");
    } finally {
      setBusy(false);
    }
  }

  async function lineLogin() {
    try {
      setBusy(true);
      await signInWithLine();
    } catch (error: any) {
      Alert.alert("LINEでログインできませんでした", error?.message ?? "LINEログイン設定を確認してください");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.authRoot}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.authScroll} keyboardShouldPersistTaps="handled">
        <View style={styles.authCard}>
          <View style={styles.logoBubble}><Text style={styles.logoHeart}>♥</Text></View>
          <Text style={styles.authTitle}>KoiRela</Text>
          <Text style={styles.authLead}>
            {mode === "signup" ? "はじめてのKoiRela" : mode === "forgot" ? "パスワードを再設定" : "恋の悩みを、15分だけ誰かに話す。"}
          </Text>

          {mode !== "forgot" ? <>
            <Pressable style={[styles.socialButton, styles.appleButton]} onPress={() => oauth("apple")} disabled={busy}>
              <Text style={styles.appleText}>Appleで続ける</Text>
            </Pressable>
            <Pressable style={styles.socialButton} onPress={() => oauth("google")} disabled={busy}>
              <Text style={styles.socialText}>Googleで続ける</Text>
            </Pressable>
            <Pressable style={styles.socialButton} onPress={() => void lineLogin()} disabled={busy}>
              <Text style={styles.socialText}>LINEで続ける</Text>
            </Pressable>
            <View style={styles.orRow}><View style={styles.orLine}/><Text style={styles.orText}>or</Text><View style={styles.orLine}/></View>
          </> : null}

          {mode === "signup" ? (
            <TextInput
              value={nickname}
              onChangeText={setNickname}
              style={styles.field}
              placeholder="ニックネーム"
              maxLength={40}
            />
          ) : null}

          <TextInput
            value={email}
            onChangeText={setEmail}
            style={styles.field}
            placeholder="メールアドレス"
            autoCapitalize="none"
            keyboardType="email-address"
          />

          {mode !== "forgot" ? (
            <TextInput
              value={password}
              onChangeText={setPassword}
              style={styles.field}
              placeholder={mode === "signup" ? "パスワード（8文字以上）" : "パスワード"}
              secureTextEntry
            />
          ) : null}

          <Pressable style={styles.primaryButton} onPress={submit} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.primaryButtonText}>
                {mode === "signup" ? "新規登録" : mode === "forgot" ? "再設定メールを送る" : "ログイン"}
              </Text>
            )}
          </Pressable>

          {mode === "login" ? (
            <>
              <Pressable style={styles.authLinkButton} onPress={() => setMode("forgot")}>
                <Text style={styles.authLink}>パスワードを忘れた方</Text>
              </Pressable>
              <Pressable style={styles.authLinkButton} onPress={() => setMode("signup")}>
                <Text style={styles.authLink}>アカウントを作成</Text>
              </Pressable>
            </>
          ) : (
            <Pressable style={styles.authLinkButton} onPress={() => setMode("login")}>
              <Text style={styles.authLink}>ログインに戻る</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PasswordResetScreen({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (password.length < 8) return Alert.alert("パスワードは8文字以上にしてください");
    if (password !== confirm) return Alert.alert("確認用パスワードが一致しません");

    try {
      setBusy(true);
      await updatePassword(password);
      Alert.alert("パスワードを変更しました", "新しいパスワードでログインできます。", [{ text: "OK", onPress: onDone }]);
    } catch (error: any) {
      Alert.alert("変更できませんでした", error?.message ?? "もう一度お試しください");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.authRoot}>
      <View style={styles.authCard}>
        <View style={styles.logoBubble}><Text style={styles.logoHeart}>♥</Text></View>
        <Text style={styles.authTitle}>新しいパスワード</Text>
        <Text style={styles.authLead}>8文字以上で設定してください。</Text>
        <TextInput style={styles.field} value={password} onChangeText={setPassword} placeholder="新しいパスワード" secureTextEntry />
        <TextInput style={styles.field} value={confirm} onChangeText={setConfirm} placeholder="もう一度入力" secureTextEntry />
        <Pressable style={styles.primaryButton} onPress={save} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>パスワードを変更</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function HomeScreen({ onFind }: { onFind: () => void }) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>KoiRela</Text>
        <Text style={styles.heroTitle}>今の気持ち、{"\n"}15分だけ話してみる？</Text>
        <Text style={styles.heroCopy}>匿名・1対1のリアルタイムチャット相談</Text>
        <Pressable style={styles.heroButton} onPress={onFind}><Text style={styles.heroButtonText}>相談相手をさがす</Text></Pressable>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>15分相談</Text>
        <Text style={styles.bigPrice}>100円</Text>
        <Text style={styles.muted}>時間が終わると自動で終了。延長はその時に選べます。</Text>
      </View>
    </ScrollView>
  );
}

function FindScreen({ onChoose }: { onChoose: (c: Counselor) => void }) {
  const [items, setItems] = useState<Counselor[]>([]);
  const [query, setQuery] = useState("");
  const [track, setTrack] = useState<"all" | "exp" | "pro">("all");
  const [gender, setGender] = useState<"all" | "female" | "male" | "other">("all");
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    void listFavoriteIds().then(setFavoriteIds).catch(() => {});
  }, []);

  async function toggleFavorite(counselorId: string) {
    const next = !favoriteIds.includes(counselorId);
    try {
      await setFavoriteCounselor(counselorId, next);
      setFavoriteIds(current => next ? [...current, counselorId] : current.filter(id => id !== counselorId));
    } catch (error: any) {
      Alert.alert("お気に入りを変更できませんでした", error?.message ?? "もう一度お試しください");
    }
  }

  useEffect(() => {
    let alive = true;
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const data = await listCounselors({ track, gender, query });
        if (alive) setItems(data);
      } catch (error: any) {
        if (alive) Alert.alert("取得できませんでした", error?.message ?? "通信状態を確認してください");
      } finally {
        if (alive) setLoading(false);
      }
    }, 180);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [query, track, gender]);

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.pageTitle}>相談相手をさがす</Text>
        <TextInput style={styles.searchField} placeholder="名前・相談内容で検索" value={query} onChangeText={setQuery} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {[
            ["all","すべて"],["exp","経験者"],["pro","資格者"]
          ].map(([value,label]) => (
            <Pressable key={value} style={[styles.chip, track === value && styles.chipOn]} onPress={() => setTrack(value as any)}>
              <Text style={[styles.chipText, track === value && styles.chipTextOn]}>{label}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {[
            ["all","性別指定なし"],["female","女性"],["male","男性"],["other","その他"]
          ].map(([value,label]) => (
            <Pressable key={value} style={[styles.chip, gender === value && styles.chipOn]} onPress={() => setGender(value as any)}>
              <Text style={[styles.chipText, gender === value && styles.chipTextOn]}>{label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {loading ? <ActivityIndicator style={{ marginTop: 30 }} color={COLORS.coral} /> : null}
        {!loading && items.length === 0 ? (
          <View style={styles.emptyCard}><Text style={styles.emptyHeart}>♡</Text><Text style={styles.cardTitle}>条件に合う相談員がいません</Text></View>
        ) : null}

        {items.map(item => (
          <View key={item.user_id} style={styles.listenerCard}>
            <View style={styles.listenerTop}>
              {item.avatar_path
                ? <Image source={{uri: publicAvatarUrl(item.avatar_path) ?? undefined}} style={styles.avatarImage}/>
                : <View style={styles.avatar}><Text style={styles.avatarText}>{item.display_name.slice(0,1)}</Text></View>}
              <View style={{ flex: 1 }}>
                <Text style={styles.listenerName}>{item.display_name}</Text>
                <Text style={styles.roleText}>{item.counselor_type === "qualified" ? "資格者" : "経験者"}{item.rating_count ? " ・ ★ "+item.average_rating+" ("+item.rating_count+")" : ""}</Text>
              </View>
              <Pressable onPress={() => void toggleFavorite(item.user_id)} accessibilityLabel="お気に入り">
                <Text style={{fontSize:20,color:favoriteIds.includes(item.user_id)?COLORS.coral:"#D8D1DB"}}>{favoriteIds.includes(item.user_id) ? "♥" : "♡"}</Text>
              </Pressable>
            </View>
            <Text style={styles.listenerBio}>{item.bio || item.specialty || "相談内容を一緒に整理します。"}</Text>
            <View style={styles.listenerFoot}>
              <Text style={styles.priceLabel}>15分 <Text style={styles.priceStrong}>100円</Text></Text>
              <Pressable style={styles.smallPrimary} onPress={() => onChoose(item)}><Text style={styles.smallPrimaryText}>相談する</Text></Pressable>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function WaitingScreen({ consultationId, counselor, onState, onCancel }: {
  consultationId: string;
  counselor: Counselor;
  onState: (state: ConsultationState) => void;
  onCancel: () => void;
}) {
  useEffect(() => subscribeToConsultation(consultationId, onState), [consultationId, onState]);

  return (
    <SafeAreaView style={styles.fullState}>
      <View style={styles.waitingOrb}><Text style={styles.waitingHeart}>♥</Text></View>
      <Text style={styles.stateTitle}>相談員を呼び出しています</Text>
      <Text style={styles.stateCopy}>{counselor.display_name}さんの応答を待っています。{"\n"}開始前ならキャンセルできます。</Text>
      <Pressable style={styles.outlineButton} onPress={onCancel}><Text style={styles.outlineText}>キャンセル</Text></Pressable>
    </SafeAreaView>
  );
}

function ChatScreen({ consultation, peerName, onDone }: {
  consultation: ConsultationState;
  peerName: string;
  onDone: () => void;
}) {
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [remaining, setRemaining] = useState(0);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  useEffect(() => {
    void supabase.auth.getUser().then(({data}) => setCurrentUserId(data.user?.id ?? null));

    void supabase
      .from("messages")
      .select("id,sender_id,body,kind,created_at")
      .eq("consultation_id", consultation.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => setMessages(data ?? []));

    return subscribeToMessages(consultation.id, message => {
      setMessages(current => current.some(x => x.id === message.id) ? current : [...current, message]);
    });
  }, [consultation.id]);

  useEffect(() => {
    void scheduleOneMinuteWarning(consultation.ends_at);
    return () => { void clearConsultationNotifications(); };
  }, [consultation.ends_at]);

  useEffect(() => {
    const render = () => {
      if (!consultation.ends_at) return setRemaining(0);
      const seconds = Math.max(0, Math.ceil((new Date(consultation.ends_at).getTime() - Date.now()) / 1000));
      setRemaining(seconds);
    };
    render();
    const id = setInterval(render, 1000);
    return () => clearInterval(id);
  }, [consultation.ends_at]);

  useEffect(() => {
    if (!consultation.ends_at) return;
    const delay = Math.max(0, new Date(consultation.ends_at).getTime() - Date.now()) + 300;
    const id = setTimeout(() => {
      void endConsultation(consultation.id)
        .then(() => clearConsultationNotifications())
        .then(onDone)
        .catch(() => {});
    }, delay);
    return () => clearTimeout(id);
  }, [consultation.id, consultation.ends_at, onDone]);

  const clock = useMemo(() => {
    const m = Math.floor(remaining / 60);
    const s = String(remaining % 60).padStart(2, "0");
    return m + ":" + s;
  }, [remaining]);

  async function submit() {
    const body = text.trim();
    if (!body || sending) return;
    try {
      setSending(true);
      const context = messages.slice(-3).map(x => String(x.body ?? ""));
      await sendMessage(consultation.id, body, context);
      setText("");
    } catch (error: any) {
      const message = error?.message === "OFF_PLATFORM_BLOCKED"
        ? "外部サービスへの誘導は送信できません。"
        : (error?.message ?? "送信できませんでした");
      Alert.alert("送信できませんでした", message);
    } finally {
      setSending(false);
    }
  }

  async function extend() {
    try {
      const created = await createExtensionPaymentIntent(consultation.id);
      const initialized = await initPaymentSheet({
        merchantDisplayName: "KoiRela",
        paymentIntentClientSecret: created.paymentIntentClientSecret,
        applePay: { merchantCountryCode: "JP" },
        googlePay: { merchantCountryCode: "JP", testEnv: true }
      });
      if (initialized.error) throw initialized.error;
      const presented = await presentPaymentSheet();
      if (presented.error) throw presented.error;
      Alert.alert("延長手続き完了", "決済確認後、終了時刻が15分延長されます。");
    } catch (error: any) {
      Alert.alert("延長できませんでした", error?.message ?? "もう一度お試しください");
    }
  }

  async function finish() {
    try {
      await endConsultation(consultation.id);
      await clearConsultationNotifications();
      onDone();
    } catch (error: any) {
      Alert.alert("終了できませんでした", error?.message ?? "もう一度お試しください");
    }
  }

  return (
    <SafeAreaView style={styles.chatRoot}>
      <View style={styles.chatHead}>
        <View style={styles.avatarSmall}><Text style={styles.avatarText}>{peerName.slice(0,1)}</Text></View>
        <View style={{ flex: 1 }}><Text style={styles.chatName}>{peerName}</Text><Text style={styles.chatStatus}>オンライン</Text></View>
        <View style={[styles.timer, remaining <= 60 && { backgroundColor: COLORS.coral }]}><Text style={styles.timerText}>{clock}</Text></View>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <FlatList
          data={messages}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.messages}
          renderItem={({ item }) => {
            const own = item.kind !== "system" && item.sender_id === currentUserId;
            return (
              <View style={[
                styles.message,
                item.kind === "system" ? styles.systemMessage : (own ? styles.rightMessage : styles.leftMessage)
              ]}>
                <Text style={item.kind === "system" ? styles.systemText : [styles.messageText, own && styles.ownMessageText]}>
                  {item.body}
                </Text>
              </View>
            );
          }}
        />
        <View style={styles.chatActions}>
          {currentUserId === consultation.user_id
            ? <Pressable onPress={extend} disabled={remaining <= 0}><Text style={styles.chatLink}>＋15分延長 100円</Text></Pressable>
            : <View />}
          <Pressable onPress={finish}><Text style={[styles.chatLink, { color: COLORS.danger }]}>相談を終了</Text></Pressable>
        </View>
        <View style={styles.composer}>
          <TextInput style={styles.composerInput} value={text} onChangeText={setText} placeholder="メッセージを書く…" multiline editable={remaining > 0} />
          <Pressable style={styles.sendButton} onPress={submit} disabled={sending || remaining <= 0}><Text style={styles.sendText}>→</Text></Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MyPageScreen({
  role,
  onCounselorMode,
  onProfile,
  onApply,
  onHistory,
  onFavorites,
  onPayments,
  onSettings,
  onSupport
}: {
  role: string;
  onCounselorMode: () => void;
  onProfile: () => void;
  onApply: () => void;
  onHistory: () => void;
  onFavorites: () => void;
  onPayments: () => void;
  onSettings: () => void;
  onSupport: () => void;
}) {
  const [profile,setProfile]=useState<{nickname:string;avatar_path:string|null}>({nickname:"ユーザー",avatar_path:null});

  useEffect(()=>{
    void supabase.auth.getUser().then(async ({data:auth})=>{
      if(!auth.user)return;
      const {data}=await supabase
        .from("profiles")
        .select("nickname,avatar_path")
        .eq("id",auth.user.id)
        .single();
      if(data)setProfile({nickname:data.nickname||"ユーザー",avatar_path:data.avatar_path||null});
    });
  },[]);

  const avatarUrl=publicAvatarUrl(profile.avatar_path);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>マイページ</Text>
      <Pressable style={styles.card} onPress={onProfile}>
        <View style={styles.profileRow}>
          {avatarUrl
            ? <Image source={{uri:avatarUrl}} style={styles.avatarImage}/>
            : <View style={styles.avatar}><Text style={styles.avatarText}>{profile.nickname.slice(0,1)}</Text></View>}
          <View style={{flex:1}}>
            <Text style={styles.listenerName}>{profile.nickname}</Text>
            <Text style={styles.muted}>{role === "counselor" ? "相談員アカウント" : "相談ユーザー"}</Text>
          </View>
          <Text>›</Text>
        </View>
      </Pressable>

      <Pressable style={styles.menuButton} onPress={onFavorites}>
        <Text style={styles.menuText}>お気に入り相談員</Text><Text>›</Text>
      </Pressable>
      <Pressable style={styles.menuButton} onPress={onHistory}>
        <Text style={styles.menuText}>相談履歴・もう一度相談</Text><Text>›</Text>
      </Pressable>
      <Pressable style={styles.menuButton} onPress={onPayments}>
        <Text style={styles.menuText}>決済履歴・領収情報</Text><Text>›</Text>
      </Pressable>

      {role === "counselor" ? (
        <Pressable style={styles.menuButton} onPress={onCounselorMode}>
          <Text style={styles.menuText}>相談員モード</Text><Text>›</Text>
        </Pressable>
      ) : (
        <Pressable style={styles.menuButton} onPress={onApply}>
          <Text style={styles.menuText}>相談員として活動する</Text><Text>›</Text>
        </Pressable>
      )}

      <Pressable style={styles.menuButton} onPress={onSupport}>
        <Text style={styles.menuText}>お問い合わせ</Text><Text>›</Text>
      </Pressable>
      <Pressable style={styles.menuButton} onPress={onSettings}>
        <Text style={styles.menuText}>設定・安全</Text><Text>›</Text>
      </Pressable>
    </ScrollView>
  );
}

function CounselorMode({ onBack, onAccept, onEarnings, onProfile }: { onBack: () => void; onAccept: (row: ConsultationState) => void; onEarnings: () => void; onProfile: () => void }) {
  const [requests, setRequests] = useState<ConsultationState[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [busyAvailability, setBusyAvailability] = useState(false);

  async function load() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    const [requestRes, availabilityRes] = await Promise.all([
      supabase
        .from("consultations")
        .select("id,status,user_id,counselor_id,created_at")
        .eq("counselor_id", auth.user.id)
        .eq("status", "waiting")
        .order("created_at", { ascending: true }),
      supabase
        .from("counselor_availability")
        .select("is_accepting")
        .eq("counselor_id", auth.user.id)
        .maybeSingle()
    ]);

    if (requestRes.error) Alert.alert("取得できませんでした", requestRes.error.message);
    setRequests((requestRes.data ?? []) as any);
    setAccepting(Boolean(availabilityRes.data?.is_accepting));
    setLoading(false);
  }

  useEffect(() => {
    void load();
    const channel = supabase.channel("counselor-waiting").on(
      "postgres_changes",
      { event: "*", schema: "public", table: "consultations" },
      () => void load()
    ).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, []);

  async function toggleAvailability() {
    try {
      setBusyAvailability(true);
      const next = !accepting;
      const result = await setCounselorAvailability(next);
      setAccepting(result.is_accepting);
    } catch (error: any) {
      Alert.alert("受付状態を変更できませんでした", error?.message ?? "もう一度お試しください");
    } finally {
      setBusyAvailability(false);
    }
  }

  async function accept(row: ConsultationState) {
    try {
      const state = await acceptConsultation(row.id);
      setAccepting(false);
      onAccept(state);
    } catch (error: any) {
      Alert.alert("開始できませんでした", error?.message ?? "もう一度お試しください");
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Pressable onPress={onBack}><Text style={styles.backText}>‹ マイページ</Text></Pressable>
        <Text style={styles.pageTitle}>相談員モード</Text>
        <Pressable style={styles.menuButton} onPress={onProfile}>
          <Text style={styles.menuText}>相談員プロフィールを編集</Text><Text>›</Text>
        </Pressable>
        <Pressable style={styles.menuButton} onPress={onEarnings}>
          <Text style={styles.menuText}>売上・報酬を見る</Text><Text>›</Text>
        </Pressable>

        <View style={styles.card}>
          <View style={styles.listenerFoot}>
            <View>
              <Text style={styles.cardTitle}>受付ステータス</Text>
              <Text style={styles.muted}>{accepting ? "新しい相談を受付中" : "受付を停止しています"}</Text>
            </View>
            <Pressable
              style={[styles.smallPrimary, !accepting && { backgroundColor: COLORS.plum }]}
              onPress={toggleAvailability}
              disabled={busyAvailability}
            >
              <Text style={styles.smallPrimaryText}>{busyAvailability ? "…" : (accepting ? "ON" : "OFF")}</Text>
            </Pressable>
          </View>
        </View>

        {loading ? <ActivityIndicator color={COLORS.coral} /> : null}
        {requests.length === 0 && !loading ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyHeart}>♡</Text>
            <Text style={styles.cardTitle}>待機中の相談はありません</Text>
          </View>
        ) : null}

        {requests.map(row => (
          <View key={row.id} style={styles.listenerCard}>
            <Text style={styles.cardTitle}>匿名ユーザーからの相談</Text>
            <Text style={styles.muted}>15分相談・決済確認済み</Text>
            <Pressable style={styles.primaryButton} onPress={() => accept(row)}>
              <Text style={styles.primaryButtonText}>相談を受ける</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

function MainApp({ session }: { session: Session }) {
  const [tab, setTab] = useState<Tab>("home");
  const [role, setRole] = useState("user");
  const [accountSuspended, setAccountSuspended] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState<string | null>(null);
  const [selected, setSelected] = useState<Counselor | null>(null);
  const [consultation, setConsultation] = useState<ConsultationState | null>(null);
  const [mode, setMode] = useState<"main" | "waiting" | "chat" | "post" | "counselor" | "profile" | "counselor-profile" | "counselor-application" | "history" | "favorites" | "payments" | "earnings" | "support" | "settings">("main");
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  useEffect(() => {
    let alive=true;

    async function restoreSessionFlow() {
      const [profileResult,resumable] = await Promise.all([
        supabase
          .from("profiles")
          .select("role,is_suspended,suspension_reason")
          .eq("id", session.user.id)
          .single(),
        getResumableConsultation().catch(() => null)
      ]);

      if(!alive)return;

      const profile=profileResult.data;
      if(profile?.role)setRole(profile.role);
      setAccountSuspended(Boolean(profile?.is_suspended));
      setSuspensionReason(profile?.suspension_reason||null);

      if(profile?.is_suspended)return;
      if(!resumable)return;

      const next:ConsultationState={
        id:resumable.id,
        status:resumable.status,
        user_id:resumable.user_id,
        counselor_id:resumable.counselor_id,
        started_at:resumable.started_at,
        ends_at:resumable.ends_at
      };
      setConsultation(next);

      if(resumable.user_id===session.user.id){
        const counselor=Array.isArray(resumable.counselor)?resumable.counselor[0]:resumable.counselor;
        if(counselor)setSelected(counselor as Counselor);
        setMode(resumable.status==="active"?"chat":"waiting");
      }else if(resumable.counselor_id===session.user.id){
        setSelected(null);
        setMode(resumable.status==="active"?"chat":"counselor");
      }
    }

    void restoreSessionFlow();
    void registerPushToken();

    const unsubscribeNotification=subscribeNotificationResponses(() => {
      void restoreSessionFlow();
    });

    return () => {
      alive=false;
      unsubscribeNotification();
    };
  }, [session.user.id]);

  useEffect(() => {
    if (!consultation?.id) return;
    return subscribeToConsultation(consultation.id, state => {
      setConsultation(state);
      if (state.status === "active") setMode("chat");
      if (state.status === "ended") {
        if (state.user_id === session.user.id) setMode("post");
        else {
          setMode("counselor");
          setConsultation(null);
        }
      }
      if (["canceled","refunded"].includes(state.status)) {
        setMode("main");
        setConsultation(null);
      }
    });
  }, [consultation?.id]);

  async function purchase(counselor: Counselor) {
    try {
      setSelected(counselor);
      const created = await createPaymentIntent(counselor.user_id);
      const init = await initPaymentSheet({
        merchantDisplayName: "KoiRela",
        paymentIntentClientSecret: created.paymentIntentClientSecret,
        applePay: { merchantCountryCode: "JP" },
        googlePay: { merchantCountryCode: "JP", testEnv: true }
      });
      if (init.error) throw init.error;
      const result = await presentPaymentSheet();
      if (result.error) throw result.error;

      const state: ConsultationState = { id: created.consultationId, status: "waiting", counselor_id: counselor.user_id };
      setConsultation(state);
      setMode("waiting");
    } catch (error: any) {
      Alert.alert("支払いを完了できませんでした", error?.message ?? "もう一度お試しください");
    }
  }

  async function cancelWaiting() {
    if (!consultation) return;
    try {
      await cancelConsultation(consultation.id);
      setConsultation(null);
      setMode("main");
    } catch (error: any) {
      Alert.alert("キャンセルできませんでした", error?.message ?? "お問い合わせください");
    }
  }

  if (accountSuspended && mode !== "support") {
    return <SuspendedAccountScreen reason={suspensionReason} onSupport={() => setMode("support")} />;
  }

  if (mode === "waiting" && consultation && selected) {
    return <WaitingScreen consultationId={consultation.id} counselor={selected} onState={setConsultation} onCancel={cancelWaiting} />;
  }

  if (mode === "chat" && consultation) {
    return <ChatScreen consultation={consultation} peerName={selected?.display_name ?? (role === "counselor" ? "相談者" : "相談相手")} onDone={() => role === "counselor" ? setMode("counselor") : setMode("post")} />;
  }

  if (mode === "post" && consultation?.counselor_id) {
    return (
      <PostConsultationScreen
        consultationId={consultation.id}
        counselorId={consultation.counselor_id}
        onDone={() => { setConsultation(null); setSelected(null); setMode("main"); setTab("home"); }}
      />
    );
  }

  if (mode === "counselor") {
    return <CounselorMode onBack={() => setMode("main")} onProfile={() => setMode("counselor-profile")} onEarnings={() => setMode("earnings")} onAccept={state => { setConsultation(state); setSelected(null); setMode("chat"); }} />;
  }

  if (mode === "profile") {
    return <ProfileEditScreen onBack={() => setMode("main")} />;
  }

  if (mode === "counselor-application") {
    return <CounselorApplicationScreen onBack={() => setMode("main")} onDone={() => setMode("main")} />;
  }

  if (mode === "history") {
    return <HistoryScreen onBack={() => setMode("main")} onReconsult={counselor => void purchase(counselor)} />;
  }

  if (mode === "favorites") {
    return <FavoritesScreen onBack={() => setMode("main")} onChoose={counselor => void purchase(counselor)} />;
  }

  if (mode === "payments") {
    return <PaymentHistoryScreen onBack={() => setMode("main")} />;
  }

  if (mode === "earnings") {
    return <CounselorEarningsScreen onBack={() => setMode("counselor")} />;
  }

  if (mode === "counselor-profile") {
    return <CounselorProfileEditScreen onBack={() => setMode("counselor")} />;
  }

  if (mode === "support") {
    return <SupportScreen onBack={() => setMode("main")} />;
  }

  if (mode === "settings") {
    return <SettingsScreen onBack={() => setMode("main")} />;
  }

  return (
    <SafeAreaView style={styles.appRoot}>
      <StatusBar style="dark" />
      <View style={{ flex: 1 }}>
        {tab === "home" ? <HomeScreen onFind={() => setTab("find")} /> : null}
        {tab === "find" ? <FindScreen onChoose={purchase} /> : null}
        {tab === "mypage" ? (
          <MyPageScreen
            role={role}
            onCounselorMode={() => setMode("counselor")}
            onProfile={() => setMode("profile")}
            onApply={() => setMode("counselor-application")}
            onHistory={() => setMode("history")}
            onFavorites={() => setMode("favorites")}
            onPayments={() => setMode("payments")}
            onSupport={() => setMode("support")}
            onSettings={() => setMode("settings")}
          />
        ) : null}
      </View>
      <View style={styles.tabbar}>
        {[
          ["home","ホーム"],["find","さがす"],["mypage","マイページ"]
        ].map(([value,label]) => (
          <Pressable key={value} style={styles.tabItem} onPress={() => setTab(value as Tab)}>
            <View style={[styles.tabDot, tab === value && styles.tabDotOn]} />
            <Text style={[styles.tabText, tab === value && styles.tabTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

function Root() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [maintenance, setMaintenance] = useState<{enabled?:boolean;title?:string;message?:string}>({enabled:false});

  useEffect(() => {
    async function handleUrl(url: string | null) {
      if (!url) return;
      try {
        await consumeAuthUrl(url);
        if (url.includes("/auth/reset")) setPasswordRecovery(true);
      } catch (error: any) {
        Alert.alert("認証リンクを開けませんでした", error?.message ?? "リンクをもう一度お試しください");
      }
    }

    void Promise.all([
      supabase.auth.getSession(),
      loadMaintenanceSetting().catch(() => ({enabled:false})),
      Linking.getInitialURL()
    ]).then(([authResult,maintenanceValue,initialUrl]) => {
      setSession(authResult.data.session);
      setMaintenance(maintenanceValue);
      setReady(true);
      void handleUrl(initialUrl);
    });

    const linkSub = Linking.addEventListener("url", event => { void handleUrl(event.url); });
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
    });

    return () => {
      linkSub.remove();
      data.subscription.unsubscribe();
    };
  }, []);

  if (!ready) {
    return <SafeAreaView style={styles.center}><ActivityIndicator color={COLORS.coral} /></SafeAreaView>;
  }

  if (maintenance.enabled) {
    return <MaintenanceScreen title={maintenance.title} message={maintenance.message} />;
  }

  if (passwordRecovery) {
    return <PasswordResetScreen onDone={() => setPasswordRecovery(false)} />;
  }

  return session ? <MainApp session={session} /> : <AuthScreen />;
}

export default function App() {
  const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "pk_test_missing";
  return (
    <StripeProvider publishableKey={publishableKey} merchantIdentifier="merchant.jp.koirela.app">
      <AppErrorBoundary>
        <Root />
      </AppErrorBoundary>
    </StripeProvider>
  );
}

const styles = StyleSheet.create({
  appRoot:{flex:1,backgroundColor:COLORS.bg},
  screen:{flex:1,backgroundColor:COLORS.bg},
  center:{flex:1,alignItems:"center",justifyContent:"center",backgroundColor:COLORS.bg},
  content:{padding:20,paddingBottom:32,gap:14},
  pageTitle:{fontSize:22,fontWeight:"800",color:COLORS.plum,marginBottom:4},
  hero:{backgroundColor:COLORS.plum,borderRadius:34,padding:24,minHeight:250,justifyContent:"center",overflow:"hidden"},
  heroEyebrow:{fontSize:12,fontWeight:"800",color:COLORS.coral,marginBottom:10},
  heroTitle:{fontSize:28,lineHeight:38,fontWeight:"800",color:"#fff"},
  heroCopy:{fontSize:12,color:"rgba(255,255,255,.66)",marginTop:10,marginBottom:22},
  heroButton:{height:52,borderRadius:28,backgroundColor:COLORS.coral,alignItems:"center",justifyContent:"center"},
  heroButtonText:{color:"#fff",fontWeight:"800"},
  card:{backgroundColor:"#fff",borderRadius:24,padding:18},
  cardTitle:{fontSize:15,fontWeight:"800",color:COLORS.text},
  bigPrice:{fontSize:28,fontWeight:"800",color:COLORS.coral,marginVertical:6},
  muted:{fontSize:11,color:COLORS.muted,lineHeight:18},
  searchField:{height:50,borderRadius:18,backgroundColor:"#fff",paddingHorizontal:16,fontSize:14,borderWidth:1,borderColor:COLORS.line},
  chips:{gap:7,paddingRight:20},
  chip:{paddingHorizontal:14,paddingVertical:9,borderRadius:999,backgroundColor:"#fff",borderWidth:1,borderColor:COLORS.line},
  chipOn:{backgroundColor:COLORS.plum,borderColor:COLORS.plum},
  chipText:{fontSize:11,fontWeight:"700",color:COLORS.muted},
  chipTextOn:{color:"#fff"},
  listenerCard:{backgroundColor:"#fff",borderRadius:24,padding:17,gap:12},
  listenerTop:{flexDirection:"row",alignItems:"center",gap:12},
  avatar:{width:50,height:50,borderRadius:25,backgroundColor:COLORS.pink,alignItems:"center",justifyContent:"center"},
  avatarImage:{width:50,height:50,borderRadius:25,backgroundColor:COLORS.pink},
  avatarSmall:{width:42,height:42,borderRadius:21,backgroundColor:COLORS.pink,alignItems:"center",justifyContent:"center"},
  avatarText:{fontWeight:"800",color:COLORS.plum,fontSize:16},
  listenerName:{fontSize:15,fontWeight:"800",color:COLORS.text},
  roleText:{fontSize:10,color:COLORS.muted,marginTop:3},
  listenerBio:{fontSize:12,lineHeight:20,color:"#6D6575"},
  listenerFoot:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
  priceLabel:{fontSize:11,color:COLORS.muted},
  priceStrong:{fontSize:15,color:COLORS.coral,fontWeight:"800"},
  smallPrimary:{backgroundColor:COLORS.coral,borderRadius:999,paddingHorizontal:16,paddingVertical:10},
  smallPrimaryText:{color:"#fff",fontWeight:"800",fontSize:11},
  emptyCard:{backgroundColor:"#fff",borderRadius:24,padding:30,alignItems:"center",gap:7},
  emptyHeart:{fontSize:32,color:COLORS.coral},
  tabbar:{height:74,backgroundColor:"#fff",borderTopWidth:1,borderTopColor:COLORS.line,flexDirection:"row",paddingBottom:6},
  tabItem:{flex:1,alignItems:"center",justifyContent:"center",gap:6},
  tabDot:{width:22,height:5,borderRadius:8,backgroundColor:"transparent"},
  tabDotOn:{backgroundColor:COLORS.coral},
  tabText:{fontSize:10,fontWeight:"700",color:"#ABA4AF"},
  tabTextOn:{color:COLORS.plum},
  authRoot:{flex:1,backgroundColor:COLORS.bg},
  authScroll:{flexGrow:1,justifyContent:"center",padding:22},
  authCard:{backgroundColor:"#fff",borderRadius:30,padding:24,gap:11},
  logoBubble:{width:58,height:58,borderRadius:22,backgroundColor:COLORS.plum,alignItems:"center",justifyContent:"center",alignSelf:"center"},
  logoHeart:{color:COLORS.coral,fontSize:28},
  authTitle:{fontSize:25,fontWeight:"800",color:COLORS.plum,textAlign:"center"},
  authLead:{fontSize:12,color:COLORS.muted,textAlign:"center",marginBottom:10},
  socialButton:{height:52,borderRadius:999,borderWidth:1,borderColor:COLORS.line,alignItems:"center",justifyContent:"center"},
  appleButton:{backgroundColor:"#111",borderColor:"#111"},
  appleText:{color:"#fff",fontWeight:"800"},
  socialText:{color:COLORS.text,fontWeight:"800"},
  orRow:{flexDirection:"row",alignItems:"center",gap:10,marginVertical:4},
  orLine:{flex:1,height:1,backgroundColor:COLORS.line},
  orText:{fontSize:10,color:COLORS.muted},
  field:{height:52,borderRadius:17,borderWidth:1,borderColor:COLORS.line,paddingHorizontal:14,backgroundColor:"#fff"},
  primaryButton:{height:52,borderRadius:999,backgroundColor:COLORS.coral,alignItems:"center",justifyContent:"center",marginTop:5},
  primaryButtonText:{color:"#fff",fontWeight:"800"},
  authLinkButton:{alignItems:"center",justifyContent:"center",paddingVertical:5},
  authLink:{fontSize:10,fontWeight:"700",color:COLORS.plum},
  fullState:{flex:1,backgroundColor:COLORS.bg,alignItems:"center",justifyContent:"center",padding:30},
  waitingOrb:{width:120,height:120,borderRadius:60,borderWidth:1,borderStyle:"dashed",borderColor:COLORS.coral,alignItems:"center",justifyContent:"center"},
  waitingHeart:{width:66,height:66,borderRadius:24,backgroundColor:COLORS.plum,color:COLORS.coral,textAlign:"center",textAlignVertical:"center",fontSize:28,paddingTop:14,overflow:"hidden"},
  stateTitle:{fontSize:20,fontWeight:"800",color:COLORS.plum,marginTop:24},
  stateCopy:{fontSize:12,lineHeight:20,textAlign:"center",color:COLORS.muted,marginTop:8},
  outlineButton:{height:50,borderRadius:999,borderWidth:1,borderColor:COLORS.line,alignItems:"center",justifyContent:"center",width:"100%",marginTop:24},
  outlineText:{fontWeight:"800",color:COLORS.plum},
  chatRoot:{flex:1,backgroundColor:"#fff"},
  chatHead:{height:74,backgroundColor:COLORS.plum,flexDirection:"row",alignItems:"center",gap:10,paddingHorizontal:14},
  chatName:{color:"#fff",fontWeight:"800"},
  chatStatus:{color:"rgba(255,255,255,.6)",fontSize:9,marginTop:2},
  timer:{paddingHorizontal:12,paddingVertical:7,borderRadius:999,backgroundColor:"rgba(255,255,255,.14)"},
  timerText:{color:"#fff",fontWeight:"800"},
  messages:{padding:16,gap:8},
  message:{maxWidth:"82%",padding:11,borderRadius:17},
  leftMessage:{alignSelf:"flex-start",backgroundColor:"#F5F1F6"},
  rightMessage:{alignSelf:"flex-end",backgroundColor:COLORS.plum},
  systemMessage:{alignSelf:"center",backgroundColor:"transparent"},
  messageText:{fontSize:13,lineHeight:19,color:COLORS.text},
  ownMessageText:{color:"#fff"},
  systemText:{fontSize:10,color:COLORS.muted},
  composer:{flexDirection:"row",gap:8,padding:10,borderTopWidth:1,borderTopColor:COLORS.line},
  composerInput:{flex:1,minHeight:44,maxHeight:100,borderRadius:22,backgroundColor:"#F7F4F7",paddingHorizontal:15,paddingVertical:11},
  sendButton:{width:44,height:44,borderRadius:22,backgroundColor:COLORS.coral,alignItems:"center",justifyContent:"center"},
  sendText:{fontSize:20,color:"#fff",fontWeight:"800"},
  chatActions:{flexDirection:"row",justifyContent:"space-between",paddingHorizontal:14,paddingVertical:8},
  chatLink:{fontSize:10,fontWeight:"700",color:COLORS.plum},
  profileRow:{flexDirection:"row",alignItems:"center",gap:12},
  menuButton:{backgroundColor:"#fff",borderRadius:18,padding:16,flexDirection:"row",justifyContent:"space-between",alignItems:"center"},
  menuText:{fontSize:13,fontWeight:"700",color:COLORS.text},
  backText:{fontSize:12,fontWeight:"700",color:COLORS.plum,marginBottom:8}
});
