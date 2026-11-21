create table public.profile_comments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.profile_comments(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index profile_comments_profile_created_idx on public.profile_comments (profile_id, created_at desc);
create index profile_comments_parent_idx on public.profile_comments (parent_id) where parent_id is not null;
alter table public.profile_comments enable row level security;
grant select on public.profile_comments to anon, authenticated;
grant insert, delete on public.profile_comments to authenticated;

create policy "Visible profile comments can be read" on public.profile_comments for select to anon, authenticated
  using (exists (select 1 from public.profiles p where p.id = profile_id));
create policy "Signed-in members can leave profile comments" on public.profile_comments for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = profile_id)
    and (parent_id is null or exists (
      select 1 from public.profile_comments parent where parent.id = parent_id and parent.profile_id = profile_id
    ))
  );
create policy "Authors profile owners and staff can delete comments" on public.profile_comments for delete to authenticated
  using (author_id = (select auth.uid()) or profile_id = (select auth.uid()) or public.is_staff());

create table public.profile_comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.profile_comments(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null default 'Inappropriate content' check (char_length(reason) <= 120),
  details text not null default '' check (char_length(details) <= 500),
  created_at timestamptz not null default now(),
  status text not null default 'open' check (status in ('open','reviewed','dismissed')),
  unique (comment_id, reporter_id)
);
alter table public.profile_comment_reports enable row level security;
grant insert, select on public.profile_comment_reports to authenticated;
create policy "Members can report visible profile comments" on public.profile_comment_reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and exists (
    select 1 from public.profile_comments c where c.id = comment_id
  ));
create policy "Staff can review profile comment reports" on public.profile_comment_reports for select to authenticated
  using (public.is_staff());
