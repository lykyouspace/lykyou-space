-- Post-beta exit survey. Responses are visible only to the tester and admins.
create table if not exists public.beta_exit_surveys (
 tester_id uuid primary key references auth.users(id) on delete cascade,
 overall_rating smallint not null check(overall_rating between 1 and 5),
 ease_rating smallint not null check(ease_rating between 1 and 5),
 would_recommend boolean not null,
 what_worked text not null default '' check(char_length(what_worked)<=2000),
 what_didnt_work text not null default '' check(char_length(what_didnt_work)<=2000),
 improvements text not null default '' check(char_length(improvements)<=2000),
 final_note text not null default '' check(char_length(final_note)<=2000),
 public_quote_consent boolean not null default false,
 submitted_at timestamptz not null default now()
);
alter table public.beta_exit_surveys enable row level security;
grant select,insert,update on public.beta_exit_surveys to authenticated;
create policy beta_exit_surveys_read_own_admin on public.beta_exit_surveys for select to authenticated using(tester_id=(select auth.uid()) or (select public.is_admin()));
create policy beta_exit_surveys_submit_own on public.beta_exit_surveys for insert to authenticated with check(tester_id=(select auth.uid()) and exists(select 1 from public.beta_tester_access a where a.user_id=(select auth.uid()) and a.access_status in ('active','completed')));
create policy beta_exit_surveys_update_own on public.beta_exit_surveys for update to authenticated using(tester_id=(select auth.uid()) and exists(select 1 from public.beta_tester_access a where a.user_id=(select auth.uid()) and a.access_status in ('active','completed'))) with check(tester_id=(select auth.uid()) and exists(select 1 from public.beta_tester_access a where a.user_id=(select auth.uid()) and a.access_status in ('active','completed')));
