import { File } from "expo-file-system";
import { supabase } from "./supabase";

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "file";
}

export async function uploadLocalFile(options: {
  bucket: "avatars" | "counselor-verification";
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
  folder: string;
}) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("ログインが必要です");

  const file = new File(options.uri);
  const bytes = await file.arrayBuffer();
  const originalName = options.fileName || file.name || "file";
  const path =
    auth.user.id + "/" +
    options.folder.replace(/[^a-zA-Z0-9_-]/g, "") + "/" +
    Date.now() + "-" + safeName(originalName);

  const { error } = await supabase.storage
    .from(options.bucket)
    .upload(path, bytes, {
      contentType: options.mimeType || file.type || "application/octet-stream",
      upsert: false
    });

  if (error) throw error;
  return path;
}

export function publicAvatarUrl(path: string | null | undefined) {
  if (!path) return null;
  return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}

export async function deleteAvatar(path: string | null | undefined) {
  if (!path) return;
  const { error } = await supabase.storage.from("avatars").remove([path]);
  if (error) throw error;
}
