-- LYKYOU Space Phase 1 foundation
-- Apply in Supabase SQL Editor only after reviewing the schema.
-- This migration intentionally creates NO Storage buckets and stores no media files.

create extension if not exists pgcrypto;

do $$ begin
  create type public.staff_role as enum ('owner', 'admin', 'moderator', 'project_organiser');
exception when duplicate_object then null;
end $$;

create table if not exists public.staff_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.staff_role not null,
  active boolean not null default true,
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

-- Carry forward any trusted roles from the original user_roles table.
-- The legacy table remains intact; the new table becomes the canonical source.
do $$
begin
  if to_regclass('public.user_roles') is not null then
    insert into public.staff_roles (user_id, role, active)
    select user_id, role::public.staff_role, true
    from public.user_roles
    where role in ('owner','admin','moderator')
    on conflict (user_id, role) do nothing;
  end if;
end $$;

create or replace function public.is_staff()
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff_roles
    where user_id = auth.uid() and active = true
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff_roles
    where user_id = auth.uid()
      and active = true
      and role in ('owner', 'admin')
  );
$$;

create or replace function public.is_moderator()
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff_roles
    where user_id = auth.uid() and active = true
      and role in ('owner', 'admin', 'moderator')
  );
$$;

create or replace function public.is_owner()
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff_roles
    where user_id = auth.uid() and active = true and role = 'owner'
  );
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar_url text,
  bio text not null default '' check (char_length(bio) <= 280),
  bias text[] not null default '{}',
  bias_wrecker text[] not null default '{}',
  favourite_song text,
  favourite_era text,
  profile_visibility text not null default 'public'
    check (profile_visibility in ('public', 'members', 'private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_bias_valid check (bias <@ array['WILLIAM','LEGO','NUT','HONG','TUI']::text[]),
  constraint profiles_bias_wrecker_valid check (bias_wrecker <@ array['WILLIAM','LEGO','NUT','HONG','TUI']::text[])
);

create unique index if not exists profiles_username_lower_unique on public.profiles (lower(username));

-- Sensitive/optional profile details are kept separate from public profile data.
create table if not exists public.profile_private (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  city text,
  state text,
  country text,
  timezone text,
  fan_journey text not null default '' check (char_length(fan_journey) <= 2000),
  interests text[] not null default '{}',
  social_links jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Move optional details from the original public profile row into the
-- private-details table without deleting the legacy source columns.
insert into public.profile_private
  (user_id, city, state, country, timezone, fan_journey, interests, social_links)
select id, city, state, country, timezone, coalesce(fan_journey, ''),
       coalesce(interests, '{}'::text[]), coalesce(social_links, '{}'::jsonb)
from public.profiles
on conflict (user_id) do nothing;

-- Remove legacy sensitive fields from the publicly-readable profile table
-- only after their values have been copied into profile_private.
alter table public.profiles
  drop column if exists city,
  drop column if exists state,
  drop column if exists country,
  drop column if exists timezone,
  drop column if exists fan_journey,
  drop column if exists interests,
  drop column if exists social_links;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_username text;
  requested_display_name text;
begin
  requested_username := lower(coalesce(new.raw_user_meta_data ->> 'username', ''));
  requested_display_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');

  if requested_username !~ '^[a-z0-9_]{3,24}$' then
    requested_username := 'fan_' || substr(replace(new.id::text, '-', ''), 1, 16);
  end if;

  if requested_display_name is null then
    requested_display_name := 'LYKYOU';
  end if;

  insert into public.profiles (id, username, display_name)
  values (new.id, requested_username, left(requested_display_name, 40))
  on conflict (id) do nothing;

  return new;
end;
$$;
drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists profile_private_set_updated_at on public.profile_private;
create trigger profile_private_set_updated_at before update on public.profile_private
for each row execute procedure public.set_updated_at();

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  post_type text not null default 'text' check (post_type in ('text', 'question', 'poll', 'link')),
  visibility text not null default 'public' check (visibility in ('public', 'members')),
  status text not null default 'published' check (status in ('draft', 'published', 'removed')),
  link_url text,
  link_title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Retain the original schema's extra supported values while enforcing the
-- Phase 1 status/visibility contract.
alter table public.posts drop constraint if exists posts_status_check;
alter table public.posts drop constraint if exists posts_visibility_check;
alter table public.posts drop constraint if exists posts_post_type_check;
alter table public.posts add constraint posts_status_check
  check (status in ('draft','published','pending','hidden','removed'));
alter table public.posts add constraint posts_visibility_check
  check (visibility in ('public','members','friends','private'));
alter table public.posts add constraint posts_post_type_check
  check (post_type in ('text','photo','poll','question','link'));

create index if not exists posts_feed_idx on public.posts (created_at desc) where status = 'published';
create index if not exists posts_author_idx on public.posts (author_id, created_at desc);

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at before update on public.posts
for each row execute procedure public.set_updated_at();

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_comment_id uuid references public.comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  status text not null default 'published' check (status in ('published','hidden','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists comments_post_idx on public.comments (post_id, created_at);
create index if not exists comments_author_idx on public.comments (author_id, created_at desc);
create index if not exists comments_parent_idx on public.comments (parent_comment_id) where parent_comment_id is not null;

drop trigger if exists comments_set_updated_at on public.comments;
create trigger comments_set_updated_at before update on public.comments
for each row execute procedure public.set_updated_at();

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists post_likes_user_idx on public.post_likes (user_id, created_at desc);

create table if not exists public.bookmarks (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_user_id),
  check (blocker_id <> blocked_user_id)
);

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sender_id, recipient_id),
  check (sender_id <> recipient_id)
);

create index if not exists friend_requests_sender_idx on public.friend_requests (sender_id, created_at desc);
create index if not exists friend_requests_recipient_idx on public.friend_requests (recipient_id, status, created_at desc);

create table if not exists public.friendships (
  user_low uuid not null references public.profiles(id) on delete cascade,
  user_high uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_low, user_high),
  check (user_low < user_high)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment', 'profile', 'group', 'project')),
  target_id uuid not null,
  reason text not null check (char_length(reason) between 3 and 80),
  details text not null default '' check (char_length(details) <= 1500),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 60),
  slug text not null unique,
  description text not null default '' check (char_length(description) <= 1000),
  group_type text not null default 'general'
    check (group_type in ('general', 'bias', 'location', 'project', 'campaign')),
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'member' check (member_role in ('member', 'organiser')),
  status text not null default 'pending' check (status in ('pending', 'active', 'rejected')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 120),
  description text not null default '' check (char_length(description) <= 4000),
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null default 'Asia/Kolkata',
  location_text text,
  event_url text,
  event_type text not null default 'online' check (event_type in ('online', 'offline', 'hybrid')),
  status text not null default 'draft' check (status in ('draft', 'published', 'cancelled')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.event_rsvps (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  response text not null default 'going' check (response in ('going', 'interested', 'not_going')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table if not exists public.event_staff (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 120),
  summary text not null default '' check (char_length(summary) <= 3000),
  status text not null default 'pending' check (status in ('pending', 'published', 'paused', 'completed', 'rejected')),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 120),
  details text not null default '' check (char_length(details) <= 1500),
  assigned_user_id uuid references public.profiles(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'done')),
  created_at timestamptz not null default now()
);

create table if not exists public.project_staff (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  notification_type text not null,
  title text not null check (char_length(title) between 1 and 120),
  body text not null default '' check (char_length(body) <= 500),
  target_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.lykn_updates (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('news', 'music', 'schedule', 'media', 'notice')),
  title text not null check (char_length(title) between 3 and 180),
  summary text not null default '' check (char_length(summary) <= 3000),
  source_url text,
  source_label text,
  source_published_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Only the current owner can appoint staff. Role changes are written to the audit log.
create or replace function public.assign_staff_role(p_user_id uuid, p_role public.staff_role, p_active boolean default true)
returns void language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_owner() then
    raise exception 'Only the platform owner can change staff roles' using errcode = '42501';
  end if;
  if p_role = 'owner' then
    raise exception 'Use transfer_ownership to change the owner account' using errcode = '22023';
  end if;

  insert into public.staff_roles (user_id, role, active, assigned_by)
  values (p_user_id, p_role, p_active, auth.uid())
  on conflict (user_id, role)
  do update set active = excluded.active, assigned_by = auth.uid();

  if p_role = 'project_organiser' and not p_active then
    delete from public.project_staff where user_id = p_user_id;
    delete from public.event_staff where user_id = p_user_id;
  end if;

  insert into public.admin_audit_logs (actor_id, action, target_type, target_id, details)
  values (auth.uid(), case when p_active then 'staff_role_granted' else 'staff_role_revoked' end,
          'staff_role', p_user_id, jsonb_build_object('role', p_role));
end;
$$;

create or replace function public.transfer_ownership(p_new_owner_id uuid)
returns void language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_owner() then
    raise exception 'Only the current owner can transfer ownership' using errcode = '42501';
  end if;
  if p_new_owner_id is null then
    raise exception 'A new owner account is required' using errcode = '22023';
  end if;
  if p_new_owner_id = auth.uid() then
    return;
  end if;

  update public.staff_roles
  set active = false, assigned_by = auth.uid()
  where role = 'owner' and active = true;

  insert into public.staff_roles (user_id, role, active, assigned_by)
  values (p_new_owner_id, 'owner', true, auth.uid())
  on conflict (user_id, role)
  do update set active = true, assigned_by = auth.uid();

  insert into public.admin_audit_logs (actor_id, action, target_type, target_id, details)
  values (auth.uid(), 'ownership_transferred', 'staff_role', p_new_owner_id, '{}'::jsonb);
end;
$$;

revoke all on function public.assign_staff_role(uuid, public.staff_role, boolean) from public, anon;
revoke all on function public.transfer_ownership(uuid) from public, anon;
grant execute on function public.assign_staff_role(uuid, public.staff_role, boolean) to authenticated;
grant execute on function public.transfer_ownership(uuid) to authenticated;

-- RLS helper: content is hidden when either participant has blocked the other.
create or replace function public.is_blocked_between(user_a uuid, user_b uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select auth.uid() is not null
     and auth.uid() in (user_a, user_b)
     and exists (
       select 1 from public.blocks
       where (blocker_id = user_a and blocked_user_id = user_b)
          or (blocker_id = user_b and blocked_user_id = user_a)
     );
$$;

create or replace function public.is_project_organiser_for(p_project_id uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_staff ps
    join public.staff_roles sr on sr.user_id = ps.user_id
    where ps.project_id = p_project_id and ps.user_id = auth.uid()
      and sr.role = 'project_organiser' and sr.active = true
  );
$$;

create or replace function public.is_event_organiser_for(p_event_id uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.event_staff es
    join public.staff_roles sr on sr.user_id = es.user_id
    where es.event_id = p_event_id and es.user_id = auth.uid()
      and sr.role = 'project_organiser' and sr.active = true
  );
$$;

create or replace function public.send_friend_request(p_recipient_id uuid)
returns uuid language plpgsql security definer
set search_path = public
as $$
declare
  request_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in to send a friend request' using errcode = '42501';
  end if;
  if p_recipient_id is null or p_recipient_id = auth.uid() then
    raise exception 'Choose another member' using errcode = '22023';
  end if;
  if public.is_blocked_between(auth.uid(), p_recipient_id) then
    raise exception 'Friend requests are unavailable for this member' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = p_recipient_id and profile_visibility in ('public', 'members')
  ) then
    raise exception 'Member not found' using errcode = 'P0002';
  end if;
  if exists (
    select 1 from public.friendships
    where user_low = least(auth.uid(), p_recipient_id)
      and user_high = greatest(auth.uid(), p_recipient_id)
  ) then
    raise exception 'You are already friends' using errcode = '23505';
  end if;

  insert into public.friend_requests (sender_id, recipient_id, status)
  values (auth.uid(), p_recipient_id, 'pending')
  on conflict (sender_id, recipient_id)
  do update set status = 'pending', updated_at = now()
  where public.friend_requests.status in ('declined', 'cancelled')
  returning id into request_id;

  if request_id is null then
    raise exception 'A request is already pending or has already been handled' using errcode = '23505';
  end if;
  return request_id;
end;
$$;

create or replace function public.respond_friend_request(p_request_id uuid, p_accept boolean)
returns void language plpgsql security definer
set search_path = public
as $$
declare
  request_row public.friend_requests%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Sign in to respond to friend requests' using errcode = '42501';
  end if;
  select * into request_row
  from public.friend_requests
  where id = p_request_id
  for update;

  if not found or request_row.recipient_id <> auth.uid() or request_row.status <> 'pending' then
    raise exception 'Friend request is not available' using errcode = '42501';
  end if;
  if public.is_blocked_between(request_row.sender_id, request_row.recipient_id) then
    update public.friend_requests set status = 'declined', updated_at = now() where id = p_request_id;
    return;
  end if;

  update public.friend_requests
  set status = case when p_accept then 'accepted' else 'declined' end, updated_at = now()
  where id = p_request_id;

  if p_accept then
    insert into public.friendships (user_low, user_high)
    values (least(request_row.sender_id, request_row.recipient_id), greatest(request_row.sender_id, request_row.recipient_id))
    on conflict do nothing;
  end if;
end;
$$;

alter table public.staff_roles enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.post_likes enable row level security;
alter table public.bookmarks enable row level security;
alter table public.blocks enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.reports enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.events enable row level security;
alter table public.event_rsvps enable row level security;
alter table public.event_staff enable row level security;
alter table public.projects enable row level security;
alter table public.project_tasks enable row level security;
alter table public.project_staff enable row level security;
alter table public.notifications enable row level security;
alter table public.lykn_updates enable row level security;
alter table public.admin_audit_logs enable row level security;

-- Staff role assignment is intentionally unavailable to normal client sessions.
drop policy if exists staff_roles_read_staff on public.staff_roles;
create policy staff_roles_read_staff on public.staff_roles for select to authenticated using (public.is_staff());

drop policy if exists profiles_read_visible on public.profiles;
create policy profiles_read_visible on public.profiles for select
using (
  id = auth.uid()
  or public.is_admin()
  or (not public.is_blocked_between(auth.uid(), id) and profile_visibility = 'public')
  or (not public.is_blocked_between(auth.uid(), id) and profile_visibility = 'members' and auth.uid() is not null)
);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles for insert to authenticated
with check (id = auth.uid());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists profile_private_read_self on public.profile_private;
create policy profile_private_read_self on public.profile_private for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists profile_private_insert_self on public.profile_private;
create policy profile_private_insert_self on public.profile_private for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists profile_private_update_self on public.profile_private;
create policy profile_private_update_self on public.profile_private for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists profile_private_delete_self on public.profile_private;
create policy profile_private_delete_self on public.profile_private for delete to authenticated
using (user_id = auth.uid());

drop policy if exists posts_read_visible on public.posts;
create policy posts_read_visible on public.posts for select
using (
  (status = 'published'
    and (visibility = 'public' or (visibility = 'members' and auth.uid() is not null))
    and not public.is_blocked_between(auth.uid(), author_id))
  or author_id = auth.uid()
  or public.is_staff()
);

drop policy if exists posts_insert_self on public.posts;
create policy posts_insert_self on public.posts for insert to authenticated
with check (author_id = auth.uid() and status in ('draft', 'published') and visibility in ('public','members'));

drop policy if exists posts_update_self on public.posts;
create policy posts_update_self on public.posts for update to authenticated
using (author_id = auth.uid() and status <> 'removed')
with check (author_id = auth.uid() and status <> 'removed');

drop policy if exists posts_delete_self_or_staff on public.posts;
create policy posts_delete_self_or_staff on public.posts for delete to authenticated
using (author_id = auth.uid() or public.is_moderator());

drop policy if exists comments_read_visible on public.comments;
create policy comments_read_visible on public.comments for select
using (
  status = 'published'
  and (exists (
    select 1 from public.posts p
    where p.id = post_id
      and p.status = 'published'
      and (p.visibility = 'public' or (p.visibility = 'members' and auth.uid() is not null))
      and not public.is_blocked_between(auth.uid(), p.author_id)
      and not public.is_blocked_between(auth.uid(), author_id)
  ))
  or author_id = auth.uid()
  or public.is_staff()
);

drop policy if exists comments_insert_self on public.comments;
create policy comments_insert_self on public.comments for insert to authenticated
with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.posts p
    where p.id = post_id and p.status = 'published'
      and (p.visibility = 'public' or (p.visibility = 'members' and auth.uid() is not null))
      and not public.is_blocked_between(auth.uid(), p.author_id)
  )
);

drop policy if exists comments_update_self on public.comments;
create policy comments_update_self on public.comments for update to authenticated
using (author_id = auth.uid())
with check (author_id = auth.uid());

drop policy if exists comments_delete_self_or_staff on public.comments;
create policy comments_delete_self_or_staff on public.comments for delete to authenticated
using (author_id = auth.uid() or public.is_moderator());

drop policy if exists post_likes_read_visible on public.post_likes;
create policy post_likes_read_visible on public.post_likes for select
using (exists (select 1 from public.posts p where p.id = post_id and p.status = 'published' and (p.visibility = 'public' or (p.visibility = 'members' and auth.uid() is not null)) and not public.is_blocked_between(auth.uid(), p.author_id)));

drop policy if exists post_likes_insert_self on public.post_likes;
create policy post_likes_insert_self on public.post_likes for insert to authenticated
with check (user_id = auth.uid() and exists (select 1 from public.posts p where p.id = post_id and p.status = 'published' and (p.visibility = 'public' or (p.visibility = 'members' and auth.uid() is not null)) and not public.is_blocked_between(auth.uid(), p.author_id)));

drop policy if exists post_likes_delete_self on public.post_likes;
create policy post_likes_delete_self on public.post_likes for delete to authenticated
using (user_id = auth.uid());

drop policy if exists bookmarks_read_self on public.bookmarks;
create policy bookmarks_read_self on public.bookmarks for select to authenticated using (user_id = auth.uid());

drop policy if exists bookmarks_insert_self on public.bookmarks;
create policy bookmarks_insert_self on public.bookmarks for insert to authenticated with check (user_id = auth.uid());

drop policy if exists bookmarks_delete_self on public.bookmarks;
create policy bookmarks_delete_self on public.bookmarks for delete to authenticated using (user_id = auth.uid());

drop policy if exists blocks_read_self on public.blocks;
create policy blocks_read_self on public.blocks for select to authenticated using (blocker_id = auth.uid());

drop policy if exists blocks_insert_self on public.blocks;
create policy blocks_insert_self on public.blocks for insert to authenticated with check (blocker_id = auth.uid());

drop policy if exists blocks_delete_self on public.blocks;
create policy blocks_delete_self on public.blocks for delete to authenticated using (blocker_id = auth.uid());

drop policy if exists friend_requests_read_participants on public.friend_requests;
create policy friend_requests_read_participants on public.friend_requests for select to authenticated
using (sender_id = auth.uid() or recipient_id = auth.uid());

drop policy if exists friendships_read_self on public.friendships;
create policy friendships_read_self on public.friendships for select to authenticated
using (user_low = auth.uid() or user_high = auth.uid());

drop policy if exists friendships_delete_self on public.friendships;
create policy friendships_delete_self on public.friendships for delete to authenticated
using (user_low = auth.uid() or user_high = auth.uid());

drop policy if exists reports_insert_self on public.reports;
create policy reports_insert_self on public.reports for insert to authenticated with check (reporter_id = auth.uid());

drop policy if exists reports_read_staff on public.reports;
create policy reports_read_staff on public.reports for select to authenticated using (public.is_moderator());

drop policy if exists reports_update_staff on public.reports;
create policy reports_update_staff on public.reports for update to authenticated using (public.is_moderator()) with check (public.is_moderator());

drop policy if exists groups_read_public_or_member on public.groups;
create policy groups_read_public_or_member on public.groups for select
using (
  visibility = 'public'
  or public.is_moderator()
  or exists (select 1 from public.group_members gm where gm.group_id = id and gm.user_id = auth.uid() and gm.status = 'active')
);

drop policy if exists groups_manage_staff on public.groups;
create policy groups_manage_staff on public.groups for all to authenticated
using (public.is_moderator()) with check (public.is_moderator());

drop policy if exists group_members_read_self_or_staff on public.group_members;
create policy group_members_read_self_or_staff on public.group_members for select to authenticated
using (user_id = auth.uid() or public.is_moderator());

drop policy if exists group_members_request_self on public.group_members;
create policy group_members_request_self on public.group_members for insert to authenticated
with check (user_id = auth.uid() and status = 'pending' and member_role = 'member');

drop policy if exists group_members_manage_staff on public.group_members;
create policy group_members_manage_staff on public.group_members for update to authenticated
using (public.is_moderator()) with check (public.is_moderator());

drop policy if exists group_members_leave_self on public.group_members;
create policy group_members_leave_self on public.group_members for delete to authenticated
using (user_id = auth.uid() or public.is_moderator());

drop policy if exists event_staff_read_scope on public.event_staff;
create policy event_staff_read_scope on public.event_staff for select to authenticated
using (user_id = auth.uid() or public.is_admin() or public.is_moderator());

drop policy if exists event_staff_manage_admin on public.event_staff;
create policy event_staff_manage_owner on public.event_staff for all to authenticated
using (public.is_owner()) with check (public.is_owner());

drop policy if exists project_staff_read_scope on public.project_staff;
create policy project_staff_read_scope on public.project_staff for select to authenticated
using (user_id = auth.uid() or public.is_admin() or public.is_moderator());

drop policy if exists project_staff_manage_admin on public.project_staff;
create policy project_staff_manage_owner on public.project_staff for all to authenticated
using (public.is_owner()) with check (public.is_owner());

drop policy if exists events_read_published on public.events;
create policy events_read_published on public.events for select
using (status = 'published' or public.is_admin() or public.is_moderator() or public.is_event_organiser_for(id));

drop policy if exists events_manage_staff on public.events;
create policy events_manage_staff on public.events for all to authenticated
using (public.is_admin() or public.is_moderator() or public.is_event_organiser_for(id))
with check (public.is_admin() or public.is_moderator() or public.is_event_organiser_for(id));

drop policy if exists event_rsvps_read_self_or_staff on public.event_rsvps;
create policy event_rsvps_read_self_or_staff on public.event_rsvps for select to authenticated
using (user_id = auth.uid() or public.is_admin() or public.is_moderator() or public.is_event_organiser_for(event_id));

drop policy if exists event_rsvps_insert_self on public.event_rsvps;
create policy event_rsvps_insert_self on public.event_rsvps for insert to authenticated
with check (user_id = auth.uid() and exists (select 1 from public.events e where e.id = event_id and e.status = 'published'));

drop policy if exists event_rsvps_update_self on public.event_rsvps;
create policy event_rsvps_update_self on public.event_rsvps for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists event_rsvps_delete_self on public.event_rsvps;
create policy event_rsvps_delete_self on public.event_rsvps for delete to authenticated using (user_id = auth.uid());

drop policy if exists projects_read_published_or_owner on public.projects;
create policy projects_read_published_or_owner on public.projects for select
using (status = 'published' or owner_id = auth.uid() or public.is_admin() or public.is_moderator() or public.is_project_organiser_for(id));

drop policy if exists projects_submit_self on public.projects;
create policy projects_submit_self on public.projects for insert to authenticated
with check (owner_id = auth.uid() and status = 'pending');

drop policy if exists projects_update_owner_pending on public.projects;
create policy projects_update_owner_pending on public.projects for update to authenticated
using (owner_id = auth.uid() and status = 'pending')
with check (owner_id = auth.uid() and status = 'pending');

drop policy if exists projects_manage_staff on public.projects;
create policy projects_manage_staff on public.projects for all to authenticated
using (public.is_admin() or public.is_moderator() or public.is_project_organiser_for(id))
with check (public.is_admin() or public.is_moderator() or public.is_project_organiser_for(id));

drop policy if exists project_tasks_read on public.project_tasks;
create policy project_tasks_read on public.project_tasks for select to authenticated
using (public.is_admin() or public.is_moderator() or assigned_user_id = auth.uid() or public.is_project_organiser_for(project_id));

drop policy if exists project_tasks_manage_staff on public.project_tasks;
create policy project_tasks_manage_staff on public.project_tasks for all to authenticated
using (public.is_admin() or public.is_moderator() or public.is_project_organiser_for(project_id))
with check (public.is_admin() or public.is_moderator() or public.is_project_organiser_for(project_id));

drop policy if exists notifications_read_self on public.notifications;
create policy notifications_read_self on public.notifications for select to authenticated using (user_id = auth.uid());

drop policy if exists notifications_update_self on public.notifications;
create policy notifications_update_self on public.notifications for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists notifications_delete_self on public.notifications;
create policy notifications_delete_self on public.notifications for delete to authenticated using (user_id = auth.uid());

drop policy if exists notifications_insert_staff on public.notifications;
create policy notifications_insert_staff on public.notifications for insert to authenticated with check (public.is_admin() or public.is_moderator());

drop policy if exists lykn_updates_read_published on public.lykn_updates;
create policy lykn_updates_read_published on public.lykn_updates for select
using (status = 'published' or public.is_admin());

drop policy if exists lykn_updates_manage_admin on public.lykn_updates;
create policy lykn_updates_manage_admin on public.lykn_updates for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists audit_read_staff on public.admin_audit_logs;
create policy audit_read_staff on public.admin_audit_logs for select to authenticated using (public.is_admin() or public.is_moderator());

-- Audit log writes are server-side only; browser clients cannot forge entries.
grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.posts, public.comments, public.post_likes, public.groups, public.events, public.projects, public.lykn_updates to anon, authenticated;
grant select on public.friend_requests to authenticated;
grant select, delete on public.friendships to authenticated;
grant select on public.group_members to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.profile_private, public.posts, public.comments, public.post_likes, public.bookmarks, public.blocks, public.reports, public.group_members, public.event_rsvps, public.event_staff, public.projects, public.project_tasks, public.project_staff, public.notifications, public.lykn_updates to authenticated;
grant select on public.staff_roles to authenticated;
grant insert, update, delete on public.groups, public.events to authenticated;
grant select on public.admin_audit_logs to authenticated;
grant execute on function public.is_staff(), public.is_admin(), public.is_moderator(), public.is_owner(), public.is_blocked_between(uuid, uuid), public.is_project_organiser_for(uuid), public.is_event_organiser_for(uuid) to anon, authenticated;
revoke all on function public.send_friend_request(uuid), public.respond_friend_request(uuid, boolean) from public, anon;
grant execute on function public.send_friend_request(uuid), public.respond_friend_request(uuid, boolean) to authenticated;

-- Owner bootstrap is a deliberate manual step after the first account is registered.
-- Run from the Supabase SQL Editor, replacing the UUID with the trusted owner's auth.users.id:
-- insert into public.staff_roles (user_id, role, assigned_by)
-- values ('REPLACE_WITH_OWNER_AUTH_USER_UUID'::uuid, 'owner', 'REPLACE_WITH_OWNER_AUTH_USER_UUID'::uuid);
