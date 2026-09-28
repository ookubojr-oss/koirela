import { corsHeaders } from "../_shared/cors.ts";
import { authenticatedUser, serviceClient } from "../_shared/clients.ts";

function classify(input: string) {
  const normalized = input.normalize("NFKC").toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g, "");
  const compact = normalized.replace(/[\s._\-ー−・*☆★♡♥]/g, "");

  const rules = [
    ["URL", /(https?:\/\/|www\.|line\.me|instagram\.com|discord\.gg|discord\.com|t\.me|telegram\.me|x\.com|twitter\.com|threads\.net)/i, normalized],
    ["email", /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i, normalized],
    ["phone", /(?:\+?81[-\s]?)?0?\d{1,4}[-ー−\s]?\d{1,4}[-ー−\s]?\d{3,4}|\b0\d{9,10}\b/, normalized],
    ["LINE", /(line|l1ne|ライン|らいん).{0,14}(id|交換|追加|連絡|友だち|友達|教え|送る|dm)|(?:id|交換|追加|連絡|dm).{0,14}(line|l1ne|ライン|らいん)/i, compact],
    ["Instagram", /(instagram|insta|インスタ|いんすた).{0,14}(id|交換|dm|フォロー|連絡|教え)|(?:id|交換|dm|フォロー|連絡).{0,14}(instagram|insta|インスタ|いんすた)/i, compact],
    ["Discord", /(discord|ディスコード).{0,14}(id|交換|追加|連絡|教え)|(?:id|交換|追加|連絡).{0,14}(discord|ディスコード)/i, compact],
    ["Telegram", /(telegram|テレグラム).{0,14}(id|交換|追加|連絡|教え)|(?:id|交換|追加|連絡).{0,14}(telegram|テレグラム)/i, compact]
  ] as const;

  for (const [category, regex, target] of rules) {
    if (regex.test(target)) return { blocked: true, category };
  }
  return { blocked: false, category: null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const user = await authenticatedUser(req);
    const payload = await req.json();
    const consultationId = payload.consultationId;
    const body = payload.body;
    const context = Array.isArray(payload.context) ? payload.context : [];

    if (!consultationId || typeof body !== "string") {
      return Response.json({ error: "consultationId and body are required" }, { status: 400, headers: corsHeaders });
    }

    const supabase = serviceClient();
    const { data: consultation, error: consultationError } = await supabase
      .from("consultations")
      .select("id,user_id,counselor_id,status,ends_at")
      .eq("id", consultationId)
      .single();

    if (consultationError || !consultation) throw new Error("Consultation not found");

    const isParticipant = consultation.user_id === user.id || consultation.counselor_id === user.id;
    if (!isParticipant) {
      return Response.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });
    }

    if (consultation.counselor_id !== user.id) {
      return Response.json({ allowed: true }, { headers: corsHeaders });
    }

    const match = classify(body);
    if (!match.blocked) return Response.json({ allowed: true }, { headers: corsHeaders });

    const { data, error } = await supabase.rpc("record_counselor_violation", {
      p_counselor_id: user.id,
      p_consultation_id: consultationId,
      p_category: match.category,
      p_attempted_message: body,
      p_context: context,
      p_detector: "server-rule-v1"
    });
    if (error) throw error;

    const result = Array.isArray(data) ? data[0] : data;
    return Response.json({
      allowed: false,
      category: match.category,
      strikeCount: result?.strike_count ?? 1,
      suspended: Boolean(result?.suspended)
    }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400, headers: corsHeaders });
  }
});
