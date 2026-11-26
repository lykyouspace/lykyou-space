-- Keep internal moderation notes separate from tester-readable feedback rows.
alter table public.beta_feedback drop column if exists internal_notes;
alter table public.beta_tester_access drop column if exists admin_notes;
create table if not exists public.beta_feedback_admin_notes (
 feedback_id uuid primary key references public.beta_feedback(id) on delete cascade,
 internal_notes text not null default '',
 updated_by uuid references auth.users(id) on delete set null,
 updated_at timestamptz not null default now()
);
alter table public.beta_feedback_admin_notes enable row level security;
grant select,insert,update,delete on public.beta_feedback_admin_notes to authenticated;
create policy beta_feedback_admin_notes_admin_only on public.beta_feedback_admin_notes
for all to authenticated using((select public.is_admin())) with check((select public.is_admin()));
