import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "./supabase";

WebBrowser.maybeCompleteAuthSession();

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email: string, password: string, nickname: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nickname } }
  });
  if (error) throw error;
  return data;
}

export async function signInWithOAuth(provider: "apple" | "google") {
  const redirectTo = Linking.createURL("auth/callback");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true
    }
  });

  if (error) throw error;
  if (!data.url) throw new Error("OAuth URL was not returned");

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success" || !result.url) return null;

  const parsed = Linking.parse(result.url);
  const code = parsed.queryParams?.code;

  if (typeof code === "string") {
    const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
    if (sessionError) throw sessionError;
    return sessionData;
  }

  const accessToken = parsed.queryParams?.access_token;
  const refreshToken = parsed.queryParams?.refresh_token;

  if (typeof accessToken === "string" && typeof refreshToken === "string") {
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });
    if (sessionError) throw sessionError;
    return sessionData;
  }

  throw new Error("OAuth callback did not contain an authorization code");
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
