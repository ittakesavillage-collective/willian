-- Willian: complete Supabase schema (one file, safe to re-run). Own project, independent of Hurley.
-- Security model: every phone gets an anonymous sign-in (one identity per phone). Row Level Security
-- decides what each identity can see/do. Only users listed in public.admins can approve or edit.
-- Applied 2026-10-08 via the Supabase connector (project avmfvctonokvlliwcpxf).
-- After running: sign in once on /willian/admin.html (email + password), then insert your user id into
-- public.admins:  insert into public.admins select id from auth.users where email = '<admin email>';

create extension if not exists pg_net with schema extensions;

-- ---------- Admins ----------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admins enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

drop policy if exists "admins see admins" on public.admins;
create policy "admins see admins" on public.admins for select using (user_id = auth.uid() or public.is_admin());

-- ---------- "Your App, your way" requests ----------
-- status: pending (waiting for approval, hidden) > suggested > planned > building > done; rejected = hidden
create table if not exists public.requests (
  id          bigint generated always as identity primary key,
  village     text not null default 'willian' check (village = 'willian'),
  title       text not null check (char_length(title) between 3 and 120),
  body        text check (char_length(body) <= 1000),
  status      text not null default 'pending' check (status in ('pending','suggested','planned','building','done','rejected')),
  reply       text check (char_length(reply) <= 1000),
  name        text check (char_length(name) <= 40),
  role        text check (char_length(role) <= 40),
  alerted_at  timestamptz,
  created_by  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint requests_need_profile check (char_length(btrim(name)) >= 1 and char_length(btrim(role)) >= 1)
);
alter table public.requests enable row level security;

drop policy if exists "read approved, own, or admin" on public.requests;
create policy "read approved, own, or admin" on public.requests for select
  using (status in ('suggested','planned','building','done') or created_by = auth.uid() or public.is_admin());
drop policy if exists "anyone signed in can suggest" on public.requests;
create policy "anyone signed in can suggest" on public.requests for insert
  with check (created_by = auth.uid() and (status = 'pending' or public.is_admin()));
drop policy if exists "admin edits" on public.requests;
create policy "admin edits" on public.requests for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin deletes" on public.requests;
create policy "admin deletes" on public.requests for delete using (public.is_admin());

-- ---------- Votes (one per phone per request; +1 thumbs up, -1 thumbs down) ----------
create table if not exists public.votes (
  request_id  bigint not null references public.requests(id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  value       smallint not null check (value in (-1, 1)),
  created_at  timestamptz not null default now(),
  primary key (request_id, user_id)
);
alter table public.votes enable row level security;

drop policy if exists "votes are public" on public.votes;
create policy "votes are public" on public.votes for select using (true);
drop policy if exists "vote as yourself" on public.votes;
create policy "vote as yourself" on public.votes for insert with check (user_id = auth.uid());
drop policy if exists "change your vote" on public.votes;
create policy "change your vote" on public.votes for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "remove your vote" on public.votes;
create policy "remove your vote" on public.votes for delete using (user_id = auth.uid());

-- Requests with vote counts (respects the policies above)
drop view if exists public.request_list;
create view public.request_list with (security_invoker = true) as
  select r.*,
         coalesce(sum(case when v.value = 1 then 1 end), 0)::int  as ups,
         coalesce(sum(case when v.value = -1 then 1 end), 0)::int as downs
  from public.requests r left join public.votes v on v.request_id = r.id
  group by r.id;

-- ---------- Message board ----------
-- status: pending (waiting for approval, hidden) > live; removed = hidden
create table if not exists public.posts (
  id          bigint generated always as identity primary key,
  village     text not null default 'willian' check (village = 'willian'),
  name        text not null check (char_length(name) between 1 and 40),
  role        text check (char_length(role) <= 40),
  title       text not null check (char_length(title) between 3 and 120),
  body        text not null check (char_length(body) between 1 and 1000),
  status      text not null default 'pending' check (status in ('pending','live','removed')),
  alerted_at  timestamptz,
  created_by  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint posts_need_profile check (char_length(btrim(name)) >= 1 and char_length(btrim(role)) >= 1)
);
alter table public.posts enable row level security;

drop policy if exists "read live, own, or admin" on public.posts;
create policy "read live, own, or admin" on public.posts for select
  using (status = 'live' or created_by = auth.uid() or public.is_admin());
drop policy if exists "anyone signed in can post" on public.posts;
create policy "anyone signed in can post" on public.posts for insert
  with check (created_by = auth.uid() and (status = 'pending' or public.is_admin()));
drop policy if exists "admin edits posts" on public.posts;
create policy "admin edits posts" on public.posts for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin deletes posts" on public.posts;
create policy "admin deletes posts" on public.posts for delete using (public.is_admin());

-- ---------- Notes to Claude: Michael's private change requests (admin-only) ----------
create table if not exists public.dev_notes (
  id          bigint generated always as identity primary key,
  village     text not null default 'willian' check (village = 'willian'),
  body        text not null check (char_length(body) between 1 and 4000),
  status      text not null default 'new' check (status in ('new','doing','done','parked')),
  reply       text check (char_length(reply) <= 4000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.dev_notes enable row level security;
drop policy if exists "admin only" on public.dev_notes;
create policy "admin only" on public.dev_notes for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Profiles (copy of the on-phone name + role, so new users can be alerted) ----------
create table if not exists public.profiles (
  user_id     uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  village     text not null default 'willian' check (village = 'willian'),
  name        text not null check (char_length(name) between 1 and 40),
  role        text not null check (char_length(role) between 1 and 40),
  alerted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "own profile or admin" on public.profiles;
create policy "own profile or admin" on public.profiles for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "create own profile" on public.profiles;
create policy "create own profile" on public.profiles for insert with check (user_id = auth.uid());
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Web push subscriptions ----------
create table if not exists public.push_subs (
  endpoint    text primary key,
  village     text not null default 'willian',
  p256dh      text not null,
  auth        text not null,
  role        text,
  user_id     uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.push_subs enable row level security;
drop policy if exists "admin reads subs" on public.push_subs;
create policy "admin reads subs" on public.push_subs for select using (public.is_admin());

create or replace function public.save_push(p_village text, p_endpoint text, p_p256dh text, p_auth text, p_role text)
returns void language sql security definer set search_path = public as $$
  insert into public.push_subs (endpoint, village, p256dh, auth, role, user_id)
  values (p_endpoint, p_village, p_p256dh, p_auth, p_role, auth.uid())
  on conflict (endpoint) do update set village = excluded.village, p256dh = excluded.p256dh, auth = excluded.auth,
    role = excluded.role, user_id = excluded.user_id, updated_at = now();
$$;
create or replace function public.remove_push(p_endpoint text)
returns void language sql security definer set search_path = public as $$
  delete from public.push_subs where endpoint = p_endpoint;
$$;

-- ---------- Trusted Tradesmen ----------
-- trades: pending > live (admin approves); removed = hidden. trade_recs: one recommendation per person per trade.
create table if not exists public.trades (
  id          bigint generated always as identity primary key,
  village     text not null default 'willian' check (village = 'willian'),
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  trade       text not null check (char_length(btrim(trade)) between 1 and 60),
  phone       text check (char_length(phone) <= 30),
  web         text check (char_length(web) <= 200),
  status      text not null default 'pending' check (status in ('pending','live','removed')),
  alerted_at  timestamptz,
  created_by  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);
alter table public.trades enable row level security;
drop policy if exists "read live, own, or admin" on public.trades;
create policy "read live, own, or admin" on public.trades for select
  using (status = 'live' or created_by = auth.uid() or public.is_admin());
drop policy if exists "suggest a tradesperson" on public.trades;
create policy "suggest a tradesperson" on public.trades for insert
  with check (created_by = auth.uid() and (status = 'pending' or public.is_admin()));
drop policy if exists "admin edits trades" on public.trades;
create policy "admin edits trades" on public.trades for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin deletes trades" on public.trades;
create policy "admin deletes trades" on public.trades for delete using (public.is_admin());

-- Only residents and owners of other accommodation can recommend (keeps the list first-hand).
create table if not exists public.trade_recs (
  trade_id    bigint not null references public.trades(id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 40),
  role        text not null check (role in ('Resident','Accommodation Owner')),
  comment     text check (char_length(comment) <= 500),
  used_when   text check (char_length(used_when) <= 30),
  created_at  timestamptz not null default now(),
  primary key (trade_id, user_id)
);
alter table public.trade_recs enable row level security;
drop policy if exists "read recs of visible trades" on public.trade_recs;
create policy "read recs of visible trades" on public.trade_recs for select using (
  exists (select 1 from public.trades t where t.id = trade_recs.trade_id and (t.status = 'live' or t.created_by = auth.uid()))
  or public.is_admin());
drop policy if exists "recommend as yourself" on public.trade_recs;
create policy "recommend as yourself" on public.trade_recs for insert with check (
  user_id = auth.uid()
  and exists (select 1 from public.trades t where t.id = trade_recs.trade_id and (t.status = 'live' or t.created_by = auth.uid())));
drop policy if exists "edit own rec" on public.trade_recs;
create policy "edit own rec" on public.trade_recs for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "remove own rec or admin" on public.trade_recs;
create policy "remove own rec or admin" on public.trade_recs for delete using (user_id = auth.uid() or public.is_admin());

-- ---------- Anti-spam: max 5 items waiting for approval per phone ----------
create or replace function public.limit_pending() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  if (select count(*) from public.requests where created_by = auth.uid() and status = 'pending')
   + (select count(*) from public.posts    where created_by = auth.uid() and status = 'pending')
   + (select count(*) from public.trades   where created_by = auth.uid() and status = 'pending') >= 5 then
    raise exception 'Too many items waiting for approval. Please wait for them to be checked.';
  end if;
  return new;
end $$;
drop trigger if exists requests_limit on public.requests;
create trigger requests_limit before insert on public.requests for each row execute function public.limit_pending();
drop trigger if exists posts_limit on public.posts;
create trigger posts_limit before insert on public.posts for each row execute function public.limit_pending();
drop trigger if exists trades_limit on public.trades;
create trigger trades_limit before insert on public.trades for each row execute function public.limit_pending();

-- ---------- Admin alerts: new message / idea / user / tradesperson -> push to admin phones only ----------
-- Async via pg_net so a slow push can never block a villager. The send-push function claims each row once.
-- Admin's own inserts never alert. Test with a real insert on EVERY table the trigger is on.
create or replace function public.alert_admins() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  k text := coalesce(to_jsonb(new)->>'id', to_jsonb(new)->>'user_id');
begin
  if public.is_admin() then return new; end if;
  perform net.http_post(
    url := 'https://avmfvctonokvlliwcpxf.supabase.co/functions/v1/send-push',
    body := jsonb_build_object('alert', tg_table_name, 'key', k),
    headers := '{"Content-Type":"application/json"}'::jsonb
  );
  return new;
end $$;
drop trigger if exists alert_new_post on public.posts;
create trigger alert_new_post after insert on public.posts for each row execute function public.alert_admins();
drop trigger if exists alert_new_idea on public.requests;
create trigger alert_new_idea after insert on public.requests for each row execute function public.alert_admins();
drop trigger if exists alert_new_profile on public.profiles;
create trigger alert_new_profile after insert on public.profiles for each row execute function public.alert_admins();
drop trigger if exists alert_new_trade on public.trades;
create trigger alert_new_trade after insert on public.trades for each row execute function public.alert_admins();

-- ---------- API access (RLS above still applies to every row) ----------
grant usage on schema public to anon, authenticated;
revoke all on all tables in schema public from anon;
grant select on public.admins to authenticated;
grant select, insert, update, delete on public.requests, public.votes, public.posts, public.dev_notes,
  public.profiles, public.trades, public.trade_recs to authenticated;
grant select on public.request_list, public.push_subs to authenticated;
revoke execute on function public.limit_pending() from public, anon, authenticated;
revoke execute on function public.alert_admins() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
revoke execute on function public.save_push(text, text, text, text, text) from public, anon;
revoke execute on function public.remove_push(text) from public, anon;
grant execute on function public.save_push(text, text, text, text, text) to authenticated;
grant execute on function public.remove_push(text) to authenticated;

-- ---------- Diary (v0.4.0): bin days + events, with optional 7pm-the-evening-before alerts ----------
-- Entries repeat every N days from starts_on (7 = weekly, 14 = fortnightly, null = once). alert_eve = push
-- notification to everyone at 7pm London the evening before. pg_cron runs 18:00 + 19:00 UTC; the send-push
-- function does nothing unless it is 7pm in London, and diary_sent stops a double send.
create table if not exists public.diary (
  id          bigint generated always as identity primary key,
  village     text not null default 'willian' check (village = 'willian'),
  title       text not null check (char_length(btrim(title)) between 1 and 80),
  details     text check (char_length(details) <= 300),
  starts_on   date not null,
  every_days  int check (every_days between 1 and 366),
  ends_on     date,
  alert_eve   boolean not null default false,
  created_at  timestamptz not null default now()
);
alter table public.diary enable row level security;
drop policy if exists "everyone reads diary" on public.diary;
create policy "everyone reads diary" on public.diary for select to authenticated using (true);
drop policy if exists "admin writes diary" on public.diary;
create policy "admin writes diary" on public.diary for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.diary to authenticated;
create table if not exists public.diary_sent (day date primary key, sent_at timestamptz not null default now());
alter table public.diary_sent enable row level security;
revoke all on public.diary_sent from anon, authenticated;
create extension if not exists pg_cron;
select cron.unschedule('diary-eve-alert') where exists (select 1 from cron.job where jobname = 'diary-eve-alert');
select cron.schedule('diary-eve-alert', '0 18,19 * * *', $$
  select net.http_post(
    url := 'https://avmfvctonokvlliwcpxf.supabase.co/functions/v1/send-push',
    body := '{"diary":true}'::jsonb,
    headers := '{"Content-Type":"application/json"}'::jsonb)
$$);

-- ---------- Weekly digests (v0.6.0): AI drafts a list, Michael approves it, villagers see only 'live' ----------
-- Applied 2026-10-13 via the Supabase connector (migration weekly_digests). Tables: digests (kind properties/news;
-- status draft/live/rejected/archived), digest_config (kind -> websites the job may search), digest_runs (one run
-- per Friday). pg_cron job 'weekly-digest-friday' (Fridays 18:00 + 19:00 UTC) -> edge function weekly-digest
-- {"cron":true}, which acts only at Friday 7pm London. RLS: everyone signed in reads LIVE digests; admin does the rest.
