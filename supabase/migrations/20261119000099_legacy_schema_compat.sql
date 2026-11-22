-- Compatibility bridge for the original LYKYOU Space starter schema.
-- Preserves existing records; normalizes legacy column names for Phase 1.
-- This must run immediately before 20261119000100_phase1_foundation.sql.

begin;

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='favourite_members')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='bias') then
    alter table public.profiles rename column favourite_members to bias;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='posts' and column_name='content')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='posts' and column_name='body') then
    alter table public.posts rename column content to body;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='comments' and column_name='content')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='comments' and column_name='body') then
    alter table public.comments rename column content to body;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='friendships' and column_name='user_one')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='friendships' and column_name='user_low') then
    alter table public.friendships rename column user_one to user_low;
    alter table public.friendships rename column user_two to user_high;
  end if;
end $$;

alter table public.profiles
  add column if not exists bias_wrecker text[] not null default '{}',
  add column if not exists favourite_song text,
  add column if not exists favourite_era text,
  add column if not exists profile_visibility text not null default 'public',
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists country text,
  add column if not exists timezone text,
  add column if not exists interests text[] not null default '{}';

update public.profiles
set username = 'fan_' || substr(replace(id::text, '-', ''), 1, 16)
where username is null or username !~ '^[a-z0-9_]{3,24}$';

alter table public.profiles alter column username set not null;
alter table public.profiles alter column bio set default '';
update public.profiles set bio = '' where bio is null;
alter table public.profiles alter column bio set not null;

alter table public.posts
  add column if not exists link_url text,
  add column if not exists link_title text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.comments
  add column if not exists updated_at timestamptz not null default now();

-- Remove legacy duplicate/narrow indexes that the foundation migration replaces.
drop index if exists public.posts_feed_idx;
drop index if exists public.posts_author_created_idx;
drop index if exists public.comments_post_created_idx;
drop index if exists public.likes_post_idx;

-- The legacy friendship table used an id primary key. Add pair uniqueness
-- without removing the old key or any records.
create unique index if not exists friendships_pair_unique
  on public.friendships (least(user_low, user_high), greatest(user_low, user_high));

-- The old policies are broader than the reviewed Phase 1 policies. Remove
-- them before the new policy set is installed, so permissive policies cannot
-- accidentally widen access. The foundation migration recreates scoped rules.
do $$
declare p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname='public'
      and tablename in ('profiles','user_roles','posts','comments','post_likes','friend_requests','friendships')
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

-- Remove any legacy auth trigger that calls the old profile bootstrap function.
-- The foundation migration installs one canonical trigger after replacing it.
do $$
declare t record;
begin
  for t in
    select tgname
    from pg_trigger
    where tgrelid = 'auth.users'::regclass
      and not tgisinternal
      and tgfoid = 'public.handle_new_user()'::regprocedure
  loop
    execute format('drop trigger if exists %I on auth.users', t.tgname);
  end loop;
end $$;

-- Keep the existing unique (post_id, user_id) constraint on post_likes;
-- the foundation migration adds the separate user lookup index.

-- These SECURITY DEFINER functions are trigger/internal helpers, not public RPCs.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.has_staff_role() from public, anon, authenticated;
revoke all on function public.is_owner() from public, anon, authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

commit;
