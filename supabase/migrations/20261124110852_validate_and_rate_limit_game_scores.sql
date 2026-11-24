-- Validate compact game results and rate-limit spam submissions.
create index if not exists game_sessions_user_created_idx on public.game_sessions(user_id,created_at desc);
alter table public.game_sessions drop constraint if exists game_sessions_score_cap_and_result_size;
alter table public.game_sessions add constraint game_sessions_score_cap_and_result_size check (
  score <= case game_key
    when 'this_or_that' then 5
    when 'lykn_match' then 5
    when 'quiz_arena' then 12
    when 'emoji_decoder' then 5
    when 'word_games' then 3
    when 'daily_challenge' then 1
    when 'fandom_bingo' then 9
    when 'memory_match' then 6
    else 0
  end and pg_column_size(result) <= 4096
);
create or replace function private.guard_game_session_submissions()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_recent_count integer;
begin
  select count(*) into v_recent_count from public.game_sessions
  where user_id=new.user_id and created_at>now()-interval '1 hour';
  if v_recent_count>=60 then raise exception 'Game submission limit reached. Please try again later.'; end if;
  new.created_at:=now();
  return new;
end;
$$;
revoke all on function private.guard_game_session_submissions() from public,anon,authenticated;
create trigger guard_game_session_submissions before insert on public.game_sessions
for each row execute function private.guard_game_session_submissions();
