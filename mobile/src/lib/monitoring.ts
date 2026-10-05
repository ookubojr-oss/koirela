import Constants from "expo-constants";
import { supabase } from "./supabase";

export async function reportClientError(
  error: unknown,
  context: Record<string,unknown> = {},
  severity: "info"|"warning"|"error"|"fatal" = "error"
){
  const err=error instanceof Error?error:new Error(String(error));
  try{
    await supabase.functions.invoke("report-error",{
      body:{
        source:"mobile",
        severity,
        name:err.name,
        message:err.message,
        stack:err.stack||null,
        context,
        appVersion:Constants.expoConfig?.version||null
      }
    });
  }catch{
    // Monitoring must never interrupt the user flow.
  }
}
