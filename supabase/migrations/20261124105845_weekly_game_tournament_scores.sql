-- Compact weekly best-score aggregates for asynchronous Fun Zone tournaments.
create table if not exists public.game_weekly_scores (
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_key text not null,
  week_start date not null,
  best_score integer not null default 0 check (best_score >= 0),
  attempts integer not null default 0 check (attempts >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, game_key, week_start)
);
create index if not exists game_weekly_scores_rank_idx on public.game_weekly_scores(week_start, game_key, best_score desc);
alter table public.game_weekly_scores enable row level security;
create policy "Public members can read weekly game scores" on public.game_weekly_scores for select to authenticated
using (exists(select 1 from public.profiles p where p.id = user_id and p.profile_visibility = 'public'));

create or replace function private.aggregate_game_weekly_score()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_week date := date_trunc('week', (new.created_at at time zone 'Asia/Kolkata'))::date;
begin
  insert into public.game_weekly_scores(user_id, game_key, week_start, best_score, attempts)
  values(new.user_id, new.game_key, v_week, new.score, 1)
  on conflict(user_id, game_key, week_start)
  do update set best_score = greatest(public.game_weekly_scores.best_score, excluded.best_score),
                attempts = public.game_weekly_scores.attempts + 1, updated_at = now();
  delete from public.game_weekly_scores
  where week_start < date_trunc('week', (now() at time zone 'Asia/Kolkata')::date)::date - 364;
  return new;
end;
$$;
revoke all on function private.aggregate_game_weekly_score() from public, anon, authenticated;
create trigger game_session_weekly_score after insert on public.game_sessions
for each row execute function private.aggregate_game_weekly_score();

create or replace view public.game_weekly_leaderboard with (security_invoker = true) as
select s.week_start, s.game_key, p.username, p.display_name, s.best_score, s.attempts
from public.game_weekly_scores s join public.profiles p on p.id = s.user_id
where p.profile_visibility = 'public';
grant select on public.game_weekly_scores, public.game_weekly_leaderboard to authenticated;
