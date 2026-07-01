-- Migration v5: daily roster sync lock (Vercel single cron / 24h limit)

create table if not exists roster_sync_state (
  id int primary key default 1 check (id = 1),
  last_run_at timestamptz,
  last_run_status text,
  last_run_summary jsonb
);

insert into roster_sync_state (id) values (1) on conflict (id) do nothing;

-- service role only (no public policies)
alter table roster_sync_state enable row level security;

comment on table roster_sync_state is
  'Singleton lock for daily roster sync — max one successful run per 24 hours.';

-- Atomic lock: only one caller wins if cron + manual fire at once
create or replace function try_acquire_roster_sync_lock(p_force boolean default false)
returns table(acquired boolean, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cutoff timestamptz := now() - interval '24 hours';
  v_updated roster_sync_state%rowtype;
  v_current roster_sync_state%rowtype;
begin
  insert into roster_sync_state (id) values (1) on conflict (id) do nothing;

  if p_force then
    update roster_sync_state
    set
      last_run_at = now(),
      last_run_status = 'running',
      last_run_summary = jsonb_build_object('started', now())
    where id = 1
    returning * into v_updated;

    return query select true, null::text;
    return;
  end if;

  update roster_sync_state
  set
    last_run_at = now(),
    last_run_status = 'running',
    last_run_summary = jsonb_build_object('started', now())
  where id = 1
    and (last_run_at is null or last_run_at <= v_cutoff)
  returning * into v_updated;

  if found then
    return query select true, null::text;
    return;
  end if;

  select * into v_current from roster_sync_state where id = 1;
  return query select
    false,
    format('Last sync at %s; next eligible after 24h', v_current.last_run_at);
end;
$$;
