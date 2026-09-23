import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { supabase } from "./supabase";
import { reportClientError } from "./monitoring";

const ONE_MINUTE_NOTIFICATION_ID = "koirela-one-minute-warning";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

export async function registerPushToken() {
  if (!Device.isDevice) return null;

  try{
    const current = await Notifications.getPermissionsAsync();
    let status = current.status;

    if (status !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== "granted") return null;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "KoiRela",
        importance: Notifications.AndroidImportance.DEFAULT
      });
    }

    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      await supabase.from("notification_preferences").upsert({
        user_id: auth.user.id,
        enabled: true,
        one_minute_warning: true,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId || projectId === "REPLACE_WITH_EAS_PROJECT_ID") return null;

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    if (!auth.user) return token;

    await supabase.from("device_tokens").upsert(
      {
        user_id: auth.user.id,
        platform: Platform.OS === "ios" ? "ios" : "android",
        token,
        updated_at: new Date().toISOString()
      },
      { onConflict: "token" }
    );

    return token;
  }catch(error){
    await reportClientError(error,{area:"push_registration"},"warning");
    return null;
  }
}

export async function scheduleOneMinuteWarning(endsAt: string | null | undefined) {
  await Notifications.cancelScheduledNotificationAsync(ONE_MINUTE_NOTIFICATION_ID).catch(() => {});
  if (!endsAt) return;

  const { data: auth } = await supabase.auth.getUser();
  if(!auth.user)return;

  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("enabled,one_minute_warning")
    .eq("user_id",auth.user.id)
    .maybeSingle();

  if(!prefs?.enabled||!prefs?.one_minute_warning)return;

  const triggerAt = new Date(new Date(endsAt).getTime() - 60_000);
  if (triggerAt.getTime() <= Date.now()) return;

  await Notifications.scheduleNotificationAsync({
    identifier: ONE_MINUTE_NOTIFICATION_ID,
    content: {
      title: "相談終了まであと1分",
      body: "続けたい場合は、終了時に15分延長できます。",
      data: { type: "one_minute_warning" }
    },
    trigger: triggerAt
  });
}

export async function clearConsultationNotifications() {
  await Notifications.cancelScheduledNotificationAsync(ONE_MINUTE_NOTIFICATION_ID).catch(() => {});
}

export function subscribeNotificationResponses(onResponse:(data:Record<string,unknown>)=>void){
  const sub=Notifications.addNotificationResponseReceivedListener(response=>{
    onResponse((response.notification.request.content.data||{}) as Record<string,unknown>);
  });
  return ()=>sub.remove();
}
