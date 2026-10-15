import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function classify(text: string) {
  const normalized = text.normalize('NFKC').toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g,'');
  const compact = normalized.replace(/[\s._\-ー−・*☆★♡♥]/g,'');

  const checks = [
    ['URL', /(https?:\/\/|www\.|line\.me|instagram\.com|discord\.gg|discord\.com|t\.me|telegram\.me|x\.com|twitter\.com|threads\.net)/i, normalized],
    ['メールアドレス', /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i, normalized],
    ['電話番号', /(?:\+?81[-\s]?)?0?\d{1,4}[-ー−\s]?\d{1,4}[-ー−\s]?\d{3,4}|\b0\d{9,10}\b/, normalized],
    ['LINE', /(line|l1ne|ライン|らいん).{0,14}(id|交換|追加|連絡|友だち|友達|教え|送る|dm)|(?:id|交換|追加|連絡|dm).{0,14}(line|l1ne|ライン|らいん)/i, compact],
    ['Instagram', /(instagram|insta|インスタ|いんすた).{0,14}(id|交換|dm|フォロー|連絡|教え)|(?:id|交換|dm|フォロー|連絡).{0,14}(instagram|insta|インスタ|いんすた)/i, compact],
    ['Discord', /(discord|ディスコード).{0,14}(id|交換|追加|連絡|教え)|(?:id|交換|追加|連絡).{0,14}(discord|ディスコード)/i, compact],
    ['Telegram', /(telegram|テレグラム).{0,14}(id|交換|追加|連絡|教え)|(?:id|交換|追加|連絡).{0,14}(telegram|テレグラム)/i, compact],
    ['X / Twitter', /(twitter|ツイッター|x).{0,10}(id|交換|dm|フォロー|連絡|教え)|(?:id|交換|dm|フォロー|連絡).{0,10}(twitter|ツイッター|x)/i, compact]
  ] as const;

  for (const [category, re, target] of checks) {
    if (re.test(target)) return category;
  }
  return null;
}

Deno.serve(async req => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(supabaseUrl, serviceKey);

  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i,'');
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) return Response.json({ error: 'unauthorized' }, { status: 401 });

  const { content, source='chat', consultationId=null, context=[] } = await req.json();
  const { data: counselor } = await admin
    .from('counselor_profiles')
    .select('user_id,violation_count,suspended_at')
    .eq('user_id', userData.user.id)
    .single();

  if (!counselor) return Response.json({ allowed: true, reason: 'not_counselor' });
  if (counselor.suspended_at) return Response.json({ allowed: false, suspended: true, strike: 2 });

  const category = classify(String(content || ''));
  if (!category) return Response.json({ allowed: true });

  const nextStrike = Math.min(2, Number(counselor.violation_count || 0) + 1);
  const suspended = nextStrike >= 2;
  const now = new Date().toISOString();

  await admin.from('moderation_events').insert({
    counselor_id: counselor.user_id,
    consultation_id: consultationId,
    source,
    category,
    attempted_content: String(content || ''),
    context,
    strike: nextStrike,
    action: suspended ? 'suspended' : 'warning'
  });

  await admin.from('counselor_profiles').update({
    violation_count: nextStrike,
    suspended_at: suspended ? now : null,
    payout_hold: suspended,
    is_accepting: suspended ? false : undefined,
    is_discoverable: suspended ? false : undefined
  }).eq('user_id', counselor.user_id);

  return Response.json({
    allowed: false,
    category,
    strike: nextStrike,
    suspended
  });
});
