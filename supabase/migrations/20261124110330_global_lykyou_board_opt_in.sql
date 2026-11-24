-- Optional country-level participation in the Global LYKYOU Board.
alter table public.profile_private add column if not exists global_board_opt_in boolean not null default false;

create table if not exists public.global_board_country_counts (
  country text primary key,
  member_count integer not null default 0 check (member_count >= 0),
  updated_at timestamptz not null default now()
);
alter table public.global_board_country_counts enable row level security;
create policy "Members can read aggregated global board counts" on public.global_board_country_counts
for select to authenticated using (member_count >= 3);
create policy "Public can read aggregated global board counts" on public.global_board_country_counts
for select to anon using (member_count >= 3);
grant select on public.global_board_country_counts to authenticated, anon;

create or replace function private.sync_global_board_country_counts()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if tg_op <> 'INSERT' and old.global_board_opt_in and nullif(trim(old.country),'') is not null then
    update public.global_board_country_counts set member_count=greatest(0,member_count-1),updated_at=now() where country=trim(old.country);
    delete from public.global_board_country_counts where country=trim(old.country) and member_count=0;
  end if;
  if tg_op <> 'DELETE' and new.global_board_opt_in and nullif(trim(new.country),'') is not null then
    insert into public.global_board_country_counts(country,member_count) values(trim(new.country),1)
    on conflict(country) do update set member_count=public.global_board_country_counts.member_count+1,updated_at=now();
  end if;
  if tg_op='DELETE' then return old; else return new; end if;
end;
$$;
revoke all on function private.sync_global_board_country_counts() from public, anon, authenticated;
create trigger profile_private_global_board_sync after insert or update of country,global_board_opt_in or delete
on public.profile_private for each row execute function private.sync_global_board_country_counts();

truncate table public.global_board_country_counts;
insert into public.global_board_country_counts(country,member_count)
select trim(country),count(*)::integer from public.profile_private
where global_board_opt_in=true and nullif(trim(country),'') is not null group by trim(country);
