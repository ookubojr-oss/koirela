import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { supabase } from "./supabase";

export async function registerPushToken() {
  if (!Device.isDevice) return null;

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

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId || projectId === "REPLACE_WITH_EAS_PROJECT_ID") return null;

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const { data: auth } = await supabase.auth.getUser();
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
}
