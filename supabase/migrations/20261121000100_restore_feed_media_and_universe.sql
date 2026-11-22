-- Restore the fields and content table used by the live Community feed and LYKN Universe editor.
alter table public.posts
  add column if not exists media_url text;

create table if not exists public.lykn_universe_content (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('member','music_video','performance','release','timeline','achievement','gallery')),
  member_name text,
  title text not null,
  description text not null default '',
  image_url text,
  source_url text,
  event_date date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists lykn_universe_one_member_entry
  on public.lykn_universe_content (member_name)
  where content_type = 'member' and member_name is not null;

create index if not exists lykn_universe_content_type_date_idx
  on public.lykn_universe_content (content_type, event_date desc, created_at desc);

alter table public.lykn_universe_content enable row level security;

drop policy if exists lykn_universe_public_read on public.lykn_universe_content;
create policy lykn_universe_public_read
  on public.lykn_universe_content for select to public using (true);

drop policy if exists lykn_universe_staff_insert on public.lykn_universe_content;
create policy lykn_universe_staff_insert
  on public.lykn_universe_content for insert to authenticated
  with check (is_staff() and (created_by is null or created_by = auth.uid()));

drop policy if exists lykn_universe_staff_update on public.lykn_universe_content;
create policy lykn_universe_staff_update
  on public.lykn_universe_content for update to authenticated
  using (is_staff())
  with check (is_staff() and (created_by is null or created_by = auth.uid()));

drop policy if exists lykn_universe_staff_delete on public.lykn_universe_content;
create policy lykn_universe_staff_delete
  on public.lykn_universe_content for delete to authenticated
  using (is_staff());

grant select on public.lykn_universe_content to anon, authenticated;
grant insert, update, delete on public.lykn_universe_content to authenticated;
