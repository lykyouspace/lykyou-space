-- LYKYOU Space activity notifications
-- Notifications are created server-side by database triggers. No email or paid service is used.

create or replace function public.notify_post_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author uuid;
begin
  select author_id into post_author
  from public.posts
  where id = new.post_id and status = 'published';

  if post_author is not null
     and post_author <> new.author_id
     and not public.is_blocked_between(post_author, new.author_id) then
    insert into public.notifications (user_id, notification_type, title, body, target_url)
    values (
      post_author,
      'post_comment',
      'Someone replied to your post',
      left(coalesce((select display_name from public.profiles where id = new.author_id), 'A LYKYOU') || ' commented on your post.', 500),
      '/community'
    );
  end if;
  return new;
end;
$$;

create or replace function public.notify_post_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author uuid;
begin
  select author_id into post_author
  from public.posts
  where id = new.post_id and status = 'published';

  if post_author is not null
     and post_author <> new.user_id
     and not public.is_blocked_between(post_author, new.user_id) then
    insert into public.notifications (user_id, notification_type, title, body, target_url)
    values (
      post_author,
      'post_like',
      'Your post received a like',
      coalesce((select display_name from public.profiles where id = new.user_id), 'A LYKYOU') || ' liked your post.',
      '/community'
    );
  end if;
  return new;
end;
$$;

create or replace function public.notify_friend_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'pending' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    insert into public.notifications (user_id, notification_type, title, body, target_url)
    values (
      new.recipient_id,
      'friend_request',
      'You have a new friend request',
      coalesce((select display_name from public.profiles where id = new.sender_id), 'A LYKYOU') || ' wants to connect with you.',
      '/members'
    );
  elsif new.status = 'accepted' and old.status is distinct from new.status then
    insert into public.notifications (user_id, notification_type, title, body, target_url)
    values (
      new.sender_id,
      'friend_request_accepted',
      'Your friend request was accepted',
      coalesce((select display_name from public.profiles where id = new.recipient_id), 'A LYKYOU') || ' accepted your friend request.',
      '/members'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists comments_notify_post_author on public.comments;
create trigger comments_notify_post_author
after insert on public.comments
for each row execute function public.notify_post_comment();

drop trigger if exists post_likes_notify_post_author on public.post_likes;
create trigger post_likes_notify_post_author
after insert on public.post_likes
for each row execute function public.notify_post_like();

drop trigger if exists friend_requests_notify_recipient on public.friend_requests;
create trigger friend_requests_notify_recipient
after insert or update of status on public.friend_requests
for each row execute function public.notify_friend_request();

revoke all on function public.notify_post_comment(), public.notify_post_like(), public.notify_friend_request() from public, anon, authenticated;

-- Let signed-in members see open tasks in published projects, without exposing
-- private project work or allowing members to edit task assignments directly.
drop policy if exists project_tasks_read on public.project_tasks;
create policy project_tasks_read on public.project_tasks for select to authenticated
using (
  public.is_admin()
  or public.is_moderator()
  or assigned_user_id = auth.uid()
  or public.is_project_organiser_for(project_id)
  or (
    status = 'open'
    and exists (select 1 from public.projects p where p.id = project_id and p.status = 'published')
  )
);

create or replace function public.volunteer_for_project_task(p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  project_owner uuid;
  task_title text;
begin
  if auth.uid() is null then
    raise exception 'Sign in to volunteer for a project task' using errcode = '42501';
  end if;

  update public.project_tasks pt
  set assigned_user_id = auth.uid(), status = 'in_progress'
  from public.projects p
  where pt.id = p_task_id
    and p.id = pt.project_id
    and p.status = 'published'
    and pt.status = 'open'
    and pt.assigned_user_id is null
  returning p.owner_id, pt.title into project_owner, task_title;

  if project_owner is null then
    raise exception 'This task is no longer available' using errcode = 'P0002';
  end if;

  if project_owner <> auth.uid() then
    insert into public.notifications (user_id, notification_type, title, body, target_url)
    values (project_owner, 'project_volunteer', 'A LYKYOU volunteered for your project',
      left(coalesce((select display_name from public.profiles where id = auth.uid()), 'A LYKYOU') || ' joined: ' || task_title, 500),
      '/fandom-hub');
  end if;
end;
$$;

create or replace function public.leave_project_task(p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in to update your project tasks' using errcode = '42501';
  end if;

  update public.project_tasks
  set assigned_user_id = null, status = 'open'
  where id = p_task_id
    and assigned_user_id = auth.uid()
    and status = 'in_progress';

  if not found then
    raise exception 'You cannot leave this task' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.volunteer_for_project_task(uuid), public.leave_project_task(uuid) from public, anon;
grant execute on function public.volunteer_for_project_task(uuid), public.leave_project_task(uuid) to authenticated;

create or replace function public.create_project_task(p_project_id uuid, p_title text, p_details text default '')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  task_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in to add a project task' using errcode = '42501';
  end if;
  if not (
    public.is_admin()
    or public.is_moderator()
    or public.is_project_organiser_for(p_project_id)
    or exists (select 1 from public.projects p where p.id = p_project_id and p.owner_id = auth.uid())
  ) then
    raise exception 'You are not authorised to manage this project' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_title, ''))) < 2 or char_length(trim(p_title)) > 120 then
    raise exception 'Task title must be between 2 and 120 characters' using errcode = '22023';
  end if;
  if char_length(coalesce(p_details, '')) > 1500 then
    raise exception 'Task details are too long' using errcode = '22023';
  end if;

  insert into public.project_tasks (project_id, title, details)
  select p_project_id, trim(p_title), coalesce(trim(p_details), '')
  from public.projects p
  where p.id = p_project_id and p.status = 'published'
  returning id into task_id;

  if task_id is null then
    raise exception 'Published project not found' using errcode = 'P0002';
  end if;
  return task_id;
end;
$$;

revoke all on function public.create_project_task(uuid, text, text) from public, anon;
grant execute on function public.create_project_task(uuid, text, text) to authenticated;

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_key text not null check (game_key in ('this_or_that')),
  score integer not null default 0 check (score >= 0),
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.game_sessions enable row level security;
drop policy if exists game_sessions_read_self on public.game_sessions;
create policy game_sessions_read_self on public.game_sessions for select to authenticated using (user_id = auth.uid());
drop policy if exists game_sessions_insert_self on public.game_sessions;
create policy game_sessions_insert_self on public.game_sessions for insert to authenticated with check (user_id = auth.uid());
grant select, insert on public.game_sessions to authenticated;

-- Keep signup resilient if a requested username is already taken. The fallback
-- uses the auth UUID, so signup never fails because two people chose one handle.
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

  if requested_username !~ '^[a-z0-9_]{3,24}$'
     or exists (select 1 from public.profiles where lower(username) = requested_username) then
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

-- Account deletion requests are handled by authorised staff; the browser never
-- receives privileged Auth Admin access or attempts to delete auth.users itself.
create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null default '' check (char_length(reason) <= 1000),
  status text not null default 'pending' check (status in ('pending','reviewing','completed','declined')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);
create unique index if not exists account_deletion_one_pending_per_user
  on public.account_deletion_requests(user_id) where status in ('pending','reviewing');
alter table public.account_deletion_requests enable row level security;
drop policy if exists account_deletion_read_self_or_staff on public.account_deletion_requests;
create policy account_deletion_read_self_or_staff on public.account_deletion_requests for select to authenticated
using (user_id = auth.uid() or public.is_admin());
drop policy if exists account_deletion_insert_self on public.account_deletion_requests;
create policy account_deletion_insert_self on public.account_deletion_requests for insert to authenticated
with check (user_id = auth.uid() and status = 'pending');
drop policy if exists account_deletion_update_admin on public.account_deletion_requests;
create policy account_deletion_update_admin on public.account_deletion_requests for update to authenticated
using (public.is_admin()) with check (public.is_admin());
grant select, insert on public.account_deletion_requests to authenticated;
grant update on public.account_deletion_requests to authenticated;

-- Source-linked LYKN schedule entries. Graphic OCR/revision comparison remains
-- an assisted admin workflow; no third-party paid monitoring service is used.
create table if not exists public.lykn_schedule_entries (
  id uuid primary key default gen_random_uuid(),
  member_name text not null default 'LYKN' check (member_name in ('LYKN','WILLIAM','LEGO','NUT','HONG','TUI')),
  title text not null check (char_length(title) between 3 and 180),
  starts_at timestamptz not null,
  timezone text not null default 'Asia/Kolkata',
  location_text text,
  source_url text,
  source_label text not null default 'Official source',
  status text not null default 'draft' check (status in ('draft','published','cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lykn_schedule_upcoming_idx on public.lykn_schedule_entries(starts_at) where status = 'published';
drop trigger if exists lykn_schedule_entries_set_updated_at on public.lykn_schedule_entries;
create trigger lykn_schedule_entries_set_updated_at before update on public.lykn_schedule_entries
for each row execute procedure public.set_updated_at();
alter table public.lykn_schedule_entries enable row level security;
drop policy if exists lykn_schedule_read_published on public.lykn_schedule_entries;
create policy lykn_schedule_read_published on public.lykn_schedule_entries for select
using (status = 'published' or public.is_admin());
drop policy if exists lykn_schedule_manage_admin on public.lykn_schedule_entries;
create policy lykn_schedule_manage_admin on public.lykn_schedule_entries for all to authenticated
using (public.is_admin()) with check (public.is_admin());
grant select on public.lykn_schedule_entries to anon, authenticated;
grant insert, update, delete on public.lykn_schedule_entries to authenticated;

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 140),
  description text not null default '' check (char_length(description) <= 3000),
  category text not null default 'other' check (category in ('streaming','voting','birthday','comeback','other')),
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'draft' check (status in ('draft','published','completed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at >= starts_at)
);
create index if not exists campaigns_active_idx on public.campaigns(starts_at) where status = 'published';
drop trigger if exists campaigns_set_updated_at on public.campaigns;
create trigger campaigns_set_updated_at before update on public.campaigns
for each row execute procedure public.set_updated_at();
create table if not exists public.campaign_members (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (campaign_id,user_id)
);
alter table public.campaigns enable row level security;
alter table public.campaign_members enable row level security;
drop policy if exists campaigns_read_published on public.campaigns;
create policy campaigns_read_published on public.campaigns for select
using (status = 'published' or public.is_admin() or public.is_moderator());
drop policy if exists campaigns_manage_staff on public.campaigns;
create policy campaigns_manage_staff on public.campaigns for all to authenticated
using (public.is_admin() or public.is_moderator())
with check (public.is_admin() or public.is_moderator());
drop policy if exists campaign_members_read_self_or_staff on public.campaign_members;
create policy campaign_members_read_self_or_staff on public.campaign_members for select to authenticated
using (user_id = auth.uid() or public.is_admin() or public.is_moderator());
drop policy if exists campaign_members_join_self on public.campaign_members;
create policy campaign_members_join_self on public.campaign_members for insert to authenticated
with check (user_id = auth.uid() and exists (select 1 from public.campaigns c where c.id = campaign_id and c.status = 'published'));
drop policy if exists campaign_members_leave_self on public.campaign_members;
create policy campaign_members_leave_self on public.campaign_members for delete to authenticated
using (user_id = auth.uid() or public.is_moderator());
grant select on public.campaigns to anon, authenticated;
grant insert, update, delete on public.campaigns to authenticated;
grant select, insert, delete on public.campaign_members to authenticated;
