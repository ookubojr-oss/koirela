create or replace function public.external_contact_category(body text)
returns text
language plpgsql
immutable
as $$
declare
  t text := lower(coalesce(body,''));
  compact text := regexp_replace(lower(coalesce(body,'')), '[[:space:]_.\\-ー−・*☆★♡♥]', '', 'g');
begin
  if t ~* '(https?://|www\\.|line\\.me|instagram\\.com|discord\\.gg|discord\\.com|t\\.me|telegram\\.me|x\\.com|twitter\\.com|threads\\.net)' then
    return 'URL';
  end if;

  if t ~* '[a-z0-9._%+\\-]+@[a-z0-9.\\-]+\\.[a-z]{2,}' then
    return 'メールアドレス';
  end if;

  if t ~ '(^|[^0-9])0[0-9]{1,4}[- ]?[0-9]{1,4}[- ]?[0-9]{3,4}([^0-9]|$)' then
    return '電話番号';
  end if;

  if compact ~* '(line|l1ne|ライン|らいん).{0,14}(id|交換|追加|連絡|友だち|友達|教え|送る|dm)|(id|交換|追加|連絡|dm).{0,14}(line|l1ne|ライン|らいん)' then
    return 'LINE';
  end if;

  if compact ~* '(instagram|insta|インスタ|いんすた).{0,14}(id|交換|dm|フォロー|連絡|教え)|(id|交換|dm|フォロー|連絡).{0,14}(instagram|insta|インスタ|いんすた)' then
    return 'Instagram';
  end if;

  if compact ~* '(discord|ディスコード).{0,14}(id|交換|追加|連絡|教え)|(id|交換|追加|連絡).{0,14}(discord|ディスコード)' then
    return 'Discord';
  end if;

  if compact ~* '(telegram|テレグラム).{0,14}(id|交換|追加|連絡|教え)|(id|交換|追加|連絡).{0,14}(telegram|テレグラム)' then
    return 'Telegram';
  end if;

  if compact ~* '(twitter|ツイッター).{0,14}(id|交換|dm|フォロー|連絡|教え)|(id|交換|dm|フォロー|連絡).{0,14}(twitter|ツイッター)' then
    return 'X / Twitter';
  end if;

  return null;
end;
$$;

create or replace function public.block_counselor_external_contact()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  counselor_id_value uuid;
  category_value text;
  current_strikes integer;
  next_strikes integer;
  context_value jsonb;
  suspended boolean;
begin
  select c.counselor_id into counselor_id_value
  from public.consultations c
  where c.id=new.consultation_id;

  if counselor_id_value is null or counselor_id_value <> new.sender_id then
    return new;
  end if;

  category_value := public.external_contact_category(new.body);
  if category_value is null then
    return new;
  end if;

  select cp.violation_count into current_strikes
  from public.counselor_profiles cp
  where cp.user_id=counselor_id_value
  for update;

  next_strikes := least(2, coalesce(current_strikes,0)+1);
  suspended := next_strikes >= 2;

  select coalesce(jsonb_agg(x order by x.created_at), '[]'::jsonb)
  into context_value
  from (
    select jsonb_build_object(
      'sender_id', m.sender_id,
      'body', m.body,
      'created_at', m.created_at
    ) as x,
    m.created_at
    from public.messages m
    where m.consultation_id=new.consultation_id
    order by m.created_at desc
    limit 3
  ) q;

  insert into public.moderation_events(
    counselor_id,
    consultation_id,
    source,
    category,
    attempted_content,
    context,
    strike,
    action
  ) values (
    counselor_id_value,
    new.consultation_id,
    'chat',
    category_value,
    new.body,
    context_value,
    next_strikes,
    case when suspended then 'suspended'::public.moderation_action else 'warning'::public.moderation_action end
  );

  update public.counselor_profiles
  set
    violation_count=next_strikes,
    suspended_at=case when suspended then now() else suspended_at end,
    payout_hold=case when suspended then true else payout_hold end,
    is_accepting=case when suspended then false else is_accepting end,
    is_discoverable=case when suspended then false else is_discoverable end,
    updated_at=now()
  where user_id=counselor_id_value;

  -- Returning NULL from a BEFORE INSERT trigger skips only the unsafe message.
  -- The moderation event and strike update remain part of the successful statement.
  return null;
end;
$$;

drop trigger if exists messages_external_contact_guard on public.messages;
create trigger messages_external_contact_guard
before insert on public.messages
for each row execute function public.block_counselor_external_contact();
