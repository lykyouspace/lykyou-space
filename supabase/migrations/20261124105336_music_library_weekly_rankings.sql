-- LYKYOU Space Music Library listening and weekly voting.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.music_tracks (
  track_uri text primary key check (track_uri ~ '^spotify:track:[A-Za-z0-9]{22}$'),
  title text not null default 'LYKN track' check (char_length(title) between 1 and 180),
  artist text not null default 'LYKN' check (char_length(artist) between 1 and 120),
  artwork_url text,
  spotify_url text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.music_daily_plays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  track_uri text not null references public.music_tracks(track_uri) on delete cascade,
  played_on date not null,
  created_at timestamptz not null default now(),
  constraint music_daily_plays_once_per_track_per_member_day unique(user_id, track_uri, played_on)
);
create index if not exists music_daily_plays_date_idx on public.music_daily_plays(played_on, track_uri);
create table if not exists public.music_track_weekly_stats (
  week_start date not null,
  track_uri text not null references public.music_tracks(track_uri) on delete cascade,
  play_count integer not null default 0 check (play_count >= 0),
  primary key (week_start, track_uri)
);
create table if not exists public.music_weekly_votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null,
  vote_date date not null,
  track_uri text not null references public.music_tracks(track_uri) on delete cascade,
  created_at timestamptz not null default now(),
  constraint music_weekly_votes_one_per_member_day unique(user_id, vote_date)
);
create index if not exists music_weekly_votes_week_idx on public.music_weekly_votes(week_start, track_uri);

alter table public.music_tracks enable row level security;
alter table public.music_daily_plays enable row level security;
alter table public.music_track_weekly_stats enable row level security;
alter table public.music_weekly_votes enable row level security;

create policy "Members can read music tracks" on public.music_tracks for select to authenticated using (true);
create policy "Members can register played tracks" on public.music_tracks for insert to authenticated with check (
  track_uri ~ '^spotify:track:[A-Za-z0-9]{22}$'
  and char_length(title) between 1 and 180 and char_length(artist) between 1 and 120
  and spotify_url like 'https://open.spotify.com/track/%'
  and (artwork_url is null or artwork_url like 'https://%')
);
create policy "Members can read their own daily music plays" on public.music_daily_plays for select to authenticated using ((select auth.uid()) = user_id);
create policy "Members can record their own daily music plays" on public.music_daily_plays for insert to authenticated with check (
  (select auth.uid()) = user_id and played_on = (now() at time zone 'Asia/Kolkata')::date
);
create policy "Members can read weekly music aggregates" on public.music_track_weekly_stats for select to authenticated using (true);
create policy "Members can read their own music votes" on public.music_weekly_votes for select to authenticated using ((select auth.uid()) = user_id);
create policy "Members can cast one final daily music vote" on public.music_weekly_votes for insert to authenticated with check (
  (select auth.uid()) = user_id
  and vote_date = (now() at time zone 'Asia/Kolkata')::date
  and week_start = date_trunc('week', (now() at time zone 'Asia/Kolkata')::date)::date
  and track_uri in (
    select s.track_uri from public.music_track_weekly_stats s
    where s.week_start = date_trunc('week', ((now() at time zone 'Asia/Kolkata')::date - 7))::date
    order by s.play_count desc, s.track_uri limit 5
  )
);

create or replace function private.increment_music_weekly_stats()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  insert into public.music_track_weekly_stats(week_start, track_uri, play_count)
  values (date_trunc('week', new.played_on::timestamp)::date, new.track_uri, 1)
  on conflict (week_start, track_uri)
  do update set play_count = public.music_track_weekly_stats.play_count + 1;
  return new;
end;
$$;
revoke all on function private.increment_music_weekly_stats() from public, anon, authenticated;
create trigger music_daily_play_aggregate after insert on public.music_daily_plays
for each row execute function private.increment_music_weekly_stats();

create or replace function public.record_music_listen(p_track_uri text, p_title text, p_artist text default 'LYKN', p_artwork_url text default null)
returns boolean language plpgsql security invoker set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_day date := (now() at time zone 'Asia/Kolkata')::date;
  v_rows integer := 0;
begin
  if v_uid is null then raise exception 'Sign in to record listening activity'; end if;
  if p_track_uri is null or p_track_uri !~ '^spotify:track:[A-Za-z0-9]{22}$' then raise exception 'Unsupported Spotify track identifier'; end if;
  if p_title is null or char_length(trim(p_title)) not between 1 and 180 then raise exception 'Invalid track title'; end if;
  if p_artist is null or char_length(trim(p_artist)) not between 1 and 120 then raise exception 'Invalid artist name'; end if;
  if p_artwork_url is not null and p_artwork_url not like 'https://%' then raise exception 'Artwork must use HTTPS'; end if;
  insert into public.music_tracks(track_uri, title, artist, artwork_url, spotify_url)
  values (p_track_uri, trim(p_title), trim(p_artist), p_artwork_url, 'https://open.spotify.com/track/' || split_part(p_track_uri, ':', 3))
  on conflict (track_uri) do nothing;
  insert into public.music_daily_plays(user_id, track_uri, played_on)
  values (v_uid, p_track_uri, v_day)
  on conflict (user_id, track_uri, played_on) do nothing;
  get diagnostics v_rows = row_count;
  delete from public.music_daily_plays where played_on < v_day - 14;
  return v_rows = 1;
end;
$$;
revoke all on function public.record_music_listen(text, text, text, text) from public, anon;
grant execute on function public.record_music_listen(text, text, text, text) to authenticated;

create or replace function public.get_weekly_music_pool()
returns table(track_uri text, title text, artist text, artwork_url text, play_count integer, rank_no bigint)
language sql stable security invoker set search_path = public, pg_temp
as $$
  select t.track_uri, t.title, t.artist, t.artwork_url, s.play_count,
         row_number() over(order by s.play_count desc, t.title asc)
  from public.music_track_weekly_stats s join public.music_tracks t on t.track_uri = s.track_uri
  where s.week_start = date_trunc('week', ((now() at time zone 'Asia/Kolkata')::date - 7))::date
  order by s.play_count desc, t.title asc limit 5;
$$;
revoke all on function public.get_weekly_music_pool() from public, anon;
grant execute on function public.get_weekly_music_pool() to authenticated;

grant select, insert on public.music_tracks to authenticated;
grant select, insert on public.music_daily_plays to authenticated;
grant select on public.music_track_weekly_stats to authenticated;
grant select, insert on public.music_weekly_votes to authenticated;
