-- Beta Testing Hub, private feedback workflow and beta-to-member lifecycle.
-- No media bucket is created; screenshot references are external URLs only.

create table if not exists public.beta_tester_access (
 user_id uuid primary key references auth.users(id) on delete cascade,
 application_id uuid not null unique references public.beta_applications(id) on delete restrict,
 access_status text not null default 'active' check(access_status in ('active','completed','revoked')),
 granted_by uuid references auth.users(id) on delete set null,
 granted_at timestamptz not null default now(), ended_at timestamptz,
 recognition_badge boolean not null default true, admin_notes text not null default ''
);
create index if not exists beta_tester_access_status_idx on public.beta_tester_access(access_status);

create table if not exists public.beta_feedback (
 id uuid primary key default gen_random_uuid(), tester_id uuid not null references auth.users(id) on delete cascade,
 category text not null check(category in ('bug','ui_ux','feature','suggestion','performance','security_privacy','general')),
 title text not null check(char_length(title) between 4 and 140),
 description text not null check(char_length(description) between 10 and 4000),
 page_url text not null default '', steps_to_reproduce text not null default '',
 expected_result text not null default '', actual_result text not null default '',
 device text not null default '', browser text not null default '',
 severity text not null default 'medium' check(severity in ('low','medium','high','critical')),
 attachment_url text not null default '',
 status text not null default 'new' check(status in ('new','reviewing','planned','fixed','duplicate','wont_fix')),
 admin_response text not null default '', internal_notes text not null default '',
 assigned_to uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists beta_feedback_tester_created_idx on public.beta_feedback(tester_id,created_at desc);
create index if not exists beta_feedback_status_created_idx on public.beta_feedback(status,created_at desc);

create table if not exists public.beta_test_tasks (
 id uuid primary key default gen_random_uuid(), title text not null check(char_length(title) between 3 and 140),
 description text not null check(char_length(description) between 10 and 3000),
 target_area text not null default 'General', due_at timestamptz,
 is_published boolean not null default false, created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.beta_task_completions (
 id uuid primary key default gen_random_uuid(), task_id uuid not null references public.beta_test_tasks(id) on delete cascade,
 tester_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'started' check(status in ('started','completed')),
 tester_note text not null default '', completed_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(task_id,tester_id)
);
create table if not exists public.beta_known_issues (
 id uuid primary key default gen_random_uuid(), title text not null check(char_length(title) between 4 and 180),
 description text not null default '', severity text not null default 'medium' check(severity in ('low','medium','high','critical')),
 status text not null default 'investigating' check(status in ('investigating','fix_in_progress','fixed','wont_fix')),
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.beta_release_notes (
 id uuid primary key default gen_random_uuid(), title text not null check(char_length(title) between 3 and 160),
 body text not null check(char_length(body) between 5 and 4000), version_label text not null default '',
 is_published boolean not null default false, published_at timestamptz,
 created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);

create or replace function public.grant_beta_tester_access(p_application_id uuid)
returns uuid language plpgsql security definer set search_path=''
as $$
declare v_user_id uuid; v_email text;
begin
 if not public.is_admin() then raise exception 'Only admins can grant beta access' using errcode='42501'; end if;
 select lower(a.email) into v_email from public.beta_applications a where a.id=p_application_id and a.status='selected';
 if v_email is null then raise exception 'Select this application before granting access' using errcode='22023'; end if;
 select u.id into v_user_id from auth.users u where lower(u.email)=v_email order by u.created_at desc limit 1;
 if v_user_id is null then raise exception 'No LYKYOU Space account exists for this application email yet. Ask the selected tester to create their account with the same email, then try again.' using errcode='P0002'; end if;
 if not exists(select 1 from public.profiles p where p.id=v_user_id) then raise exception 'The matching account profile is not ready yet. Try again shortly.' using errcode='P0002'; end if;
 insert into public.beta_tester_access(user_id,application_id,access_status,granted_by,granted_at,ended_at)
 values(v_user_id,p_application_id,'active',auth.uid(),now(),null)
 on conflict(user_id) do update set application_id=excluded.application_id,access_status='active',granted_by=excluded.granted_by,granted_at=now(),ended_at=null;
 insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
 values(auth.uid(),'beta_access_granted','beta_application',p_application_id,jsonb_build_object('user_id',v_user_id));
 return v_user_id;
end $$;
revoke all on function public.grant_beta_tester_access(uuid) from public,anon;
grant execute on function public.grant_beta_tester_access(uuid) to authenticated;

create or replace function public.end_beta_tester_access(p_user_id uuid)
returns void language plpgsql security definer set search_path=''
as $$
begin
 if not public.is_admin() then raise exception 'Only admins can end beta access' using errcode='42501'; end if;
 update public.beta_tester_access set access_status='completed',ended_at=now()
 where user_id=p_user_id and access_status='active';
 if not found then raise exception 'No active beta access found for this tester' using errcode='P0002'; end if;
 insert into public.admin_audit_logs(actor_id,action,target_type,target_id,details)
 values(auth.uid(),'beta_access_completed','user',p_user_id,'{}'::jsonb);
end $$;
revoke all on function public.end_beta_tester_access(uuid) from public,anon;
grant execute on function public.end_beta_tester_access(uuid) to authenticated;

alter table public.beta_tester_access enable row level security;
alter table public.beta_feedback enable row level security;
alter table public.beta_test_tasks enable row level security;
alter table public.beta_task_completions enable row level security;
alter table public.beta_known_issues enable row level security;
alter table public.beta_release_notes enable row level security;

grant select on public.beta_tester_access to authenticated;
grant select,insert,update on public.beta_feedback to authenticated;
revoke insert on public.beta_feedback from authenticated;
grant insert(tester_id,category,title,description,page_url,steps_to_reproduce,expected_result,actual_result,device,browser,severity,attachment_url) on public.beta_feedback to authenticated;
grant select,insert,update,delete on public.beta_test_tasks to authenticated;
grant select,insert,update on public.beta_task_completions to authenticated;
grant select,insert,update,delete on public.beta_known_issues to authenticated;
grant select,insert,update,delete on public.beta_release_notes to authenticated;

create policy beta_access_self_or_admin on public.beta_tester_access for select to authenticated using(user_id=(select auth.uid()) or (select public.is_admin()));
create policy beta_feedback_read_own_or_admin on public.beta_feedback for select to authenticated using(tester_id=(select auth.uid()) or (select public.is_admin()));
create policy beta_feedback_submit_active_tester on public.beta_feedback for insert to authenticated with check(tester_id=(select auth.uid()) and exists(select 1 from public.beta_tester_access a where a.user_id=(select auth.uid()) and a.access_status='active'));
create policy beta_feedback_admin_update on public.beta_feedback for update to authenticated using((select public.is_admin())) with check((select public.is_admin()));

create policy beta_tasks_read_testers_admin on public.beta_test_tasks for select to authenticated using((is_published and exists(select 1 from public.beta_tester_access a where a.user_id=(select auth.uid()) and a.access_status='active')) or (select public.is_admin()));
create policy beta_tasks_admin_manage on public.beta_test_tasks for all to authenticated using((select public.is_admin())) with check((select public.is_admin()));
create policy beta_task_completions_read_own_admin on public.beta_task_completions for select to authenticated using(tester_id=(select auth.uid()) or (select public.is_admin()));
create policy beta_task_completions_write_own on public.beta_task_completions for insert to authenticated with check(tester_id=(select auth.uid()) and exists(select 1 from public.beta_tester_access a where a.user_id=(select auth.uid()) and a.access_status='active') and exists(select 1 from public.beta_test_tasks t where t.id=task_id and t.is_published));
create policy beta_task_completions_update_own on public.beta_task_completions for update to authenticated using(tester_id=(select auth.uid()) and exists(select 1 from public.beta_tester_access a where a.user_id=(select auth.uid()) and a.access_status='active')) with check(tester_id=(select auth.uid()) and exists(select 1 from public.beta_tester_access a where a.user_id=(select auth.uid()) and a.access_status='active'));

create policy beta_known_issues_read_testers_admin on public.beta_known_issues for select to authenticated using(exists(select 1 from public.beta_tester_access a where a.user_id=(select auth.uid()) and a.access_status='active') or (select public.is_admin()));
create policy beta_known_issues_admin_manage on public.beta_known_issues for all to authenticated using((select public.is_admin())) with check((select public.is_admin()));
create policy beta_release_notes_read_testers_admin on public.beta_release_notes for select to authenticated using((is_published and exists(select 1 from public.beta_tester_access a where a.user_id=(select auth.uid()) and a.access_status='active')) or (select public.is_admin()));
create policy beta_release_notes_admin_manage on public.beta_release_notes for all to authenticated using((select public.is_admin())) with check((select public.is_admin()));

create or replace function public.set_beta_updated_at()
returns trigger language plpgsql set search_path=public as $$ begin new.updated_at=now(); return new; end $$;
create trigger beta_feedback_updated_at before update on public.beta_feedback for each row execute procedure public.set_beta_updated_at();
create trigger beta_tasks_updated_at before update on public.beta_test_tasks for each row execute procedure public.set_beta_updated_at();
create trigger beta_task_completions_updated_at before update on public.beta_task_completions for each row execute procedure public.set_beta_updated_at();
create trigger beta_known_issues_updated_at before update on public.beta_known_issues for each row execute procedure public.set_beta_updated_at();
