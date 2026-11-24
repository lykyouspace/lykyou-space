-- Aggregate weekly votes without exposing individual member voting records.
create table if not exists public.music_weekly_vote_totals (
  week_start date not null,
  track_uri text not null references public.music_tracks(track_uri) on delete cascade,
  vote_count integer not null default 0 check (vote_count >= 0),
  primary key (week_start, track_uri)
);
alter table public.music_weekly_vote_totals enable row level security;
create policy "Members can read aggregate weekly music votes" on public.music_weekly_vote_totals for select to authenticated using (true);

create or replace function private.increment_music_weekly_vote_totals()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  insert into public.music_weekly_vote_totals(week_start, track_uri, vote_count)
  values (new.week_start, new.track_uri, 1)
  on conflict (week_start, track_uri)
  do update set vote_count = public.music_weekly_vote_totals.vote_count + 1;
  return new;
end;
$$;
revoke all on function private.increment_music_weekly_vote_totals() from public, anon, authenticated;
create trigger music_weekly_vote_aggregate after insert on public.music_weekly_votes
for each row execute function private.increment_music_weekly_vote_totals();

create or replace function public.get_weekly_music_results(p_week_start date default null)
returns table(track_uri text, title text, artist text, artwork_url text, vote_count bigint, rank_no bigint)
language sql stable security invoker set search_path = public, pg_temp
as $$
  select t.track_uri, t.title, t.artist, t.artwork_url, s.vote_count::bigint,
         row_number() over(order by s.vote_count desc, t.title asc)
  from public.music_weekly_vote_totals s join public.music_tracks t on t.track_uri = s.track_uri
  where s.week_start = coalesce(p_week_start, date_trunc('week', (now() at time zone 'Asia/Kolkata')::date)::date)
  order by s.vote_count desc, t.title asc limit 100;
$$;
revoke all on function public.get_weekly_music_results(date) from public, anon;
grant execute on function public.get_weekly_music_results(date) to authenticated;
grant select on public.music_weekly_vote_totals to authenticated;
