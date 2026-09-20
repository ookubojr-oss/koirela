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
    options: {
      data: { nickname },
      emailRedirectTo: Linking.createURL("auth/callback")
    }
  });
  if (error) throw error;
  return data;
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: Linking.createURL("auth/reset")
  });
  if (error) throw error;
}

export async function updatePassword(password: string) {
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
  return data;
}

export async function consumeAuthUrl(url: string) {
  const parsed = Linking.parse(url);
  const code = parsed.queryParams?.code;

  if (typeof code === "string") {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return data;
  }

  const tokenHash = parsed.queryParams?.token_hash;
  const otpType = parsed.queryParams?.type;
  if (typeof tokenHash === "string" && typeof otpType === "string") {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType as "magiclink" | "recovery" | "email"
    });
    if (error) throw error;
    return data;
  }

  const accessToken = parsed.queryParams?.access_token;
  const refreshToken = parsed.queryParams?.refresh_token;

  if (typeof accessToken === "string" && typeof refreshToken === "string") {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });
    if (error) throw error;
    return data;
  }

  return null;
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

  return consumeAuthUrl(result.url);
}

export async function signInWithLine() {
  const redirectTo = Linking.createURL("auth/line");
  const { data, error } = await supabase.functions.invoke("line-auth-start", {
    body: { appRedirect: redirectTo }
  });
  if (error) throw error;
  if (!data?.authorizeUrl) throw new Error("LINE login is not configured");

  const result = await WebBrowser.openAuthSessionAsync(data.authorizeUrl, redirectTo);
  if (result.type !== "success" || !result.url) return null;

  return consumeAuthUrl(result.url);
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
