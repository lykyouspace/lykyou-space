-- Restrict listening-count writes to the validated, authenticated RPC.
drop policy if exists "Members can register played tracks" on public.music_tracks;
drop policy if exists "Members can record their own daily music plays" on public.music_daily_plays;
revoke insert on public.music_tracks from authenticated;
revoke insert on public.music_daily_plays from authenticated;

create or replace function public.record_music_listen(
  p_track_uri text, p_title text, p_artist text default 'LYKN', p_artwork_url text default null
)
returns boolean language plpgsql security definer set search_path = public, pg_temp
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
  insert into public.music_tracks(track_uri,title,artist,artwork_url,spotify_url)
  values(p_track_uri,trim(p_title),trim(p_artist),p_artwork_url,'https://open.spotify.com/track/'||split_part(p_track_uri,':',3))
  on conflict(track_uri) do nothing;
  insert into public.music_daily_plays(user_id,track_uri,played_on)
  values(v_uid,p_track_uri,v_day)
  on conflict(user_id,track_uri,played_on) do nothing;
  get diagnostics v_rows = row_count;
  return v_rows=1;
end;
$$;
revoke all on function public.record_music_listen(text,text,text,text) from public,anon;
grant execute on function public.record_music_listen(text,text,text,text) to authenticated;
