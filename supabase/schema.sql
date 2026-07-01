-- Sportslator schema (v4 — disambiguator + bulk rosters)
create type entity_type as enum ('club', 'player', 'coach');
create type entity_status as enum ('seed', 'user');
create type player_era as enum ('active', 'historic');
create type comparison_status as enum ('seed', 'user', 'hidden');
create type dimension_kind as enum ('pedigree', 'trajectory', 'fanbase', 'city', 'aura', 'style');
create type vote_value as enum ('agree', 'disagree');

create table sports (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique
);

create table entities (
  id uuid primary key default gen_random_uuid(),
  sport_id uuid not null references sports(id),
  name text not null,
  slug text not null,
  type entity_type not null default 'club',
  status entity_status not null default 'seed',
  era player_era,
  disambiguator text,
  primary_color text not null,
  secondary_color text not null,
  crest_url text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (sport_id, slug)
);

-- alternate spellings / nicknames → canonical player entity
create table entity_aliases (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references entities(id) on delete cascade,
  alias text not null,
  normalized_alias text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (entity_id, normalized_alias)
);

create index entity_aliases_norm_idx on entity_aliases (normalized_alias);
create index entities_person_name_idx on entities (sport_id, lower(name)) where type in ('player', 'coach');

create table seasons (
  id uuid primary key default gen_random_uuid(),
  sport_id uuid not null references sports(id) on delete cascade,
  label text not null,
  slug text not null,
  year_start int,
  year_end int,
  unique (sport_id, slug)
);

create table competitions (
  id uuid primary key default gen_random_uuid(),
  sport_id uuid not null references sports(id) on delete cascade,
  name text not null,
  slug text not null,
  scope text not null default 'domestic',
  unique (sport_id, slug)
);

create table comparisons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  entity_a_id uuid not null references entities(id),
  entity_b_id uuid not null references entities(id),
  verdict_text text not null,
  status comparison_status not null default 'user',
  season_id uuid references seasons(id) on delete set null,
  competition_id uuid references competitions(id) on delete set null,
  context_note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  constraint distinct_entities check (entity_a_id <> entity_b_id)
);

create table comparison_members (
  id uuid primary key default gen_random_uuid(),
  comparison_id uuid not null references comparisons(id) on delete cascade,
  entity_id uuid not null references entities(id) on delete cascade,
  position smallint not null check (position >= 0),
  unique (comparison_id, entity_id),
  unique (comparison_id, position)
);

create index comparison_members_comp_idx on comparison_members (comparison_id, position);

create table comparison_dimensions (
  id uuid primary key default gen_random_uuid(),
  comparison_id uuid not null references comparisons(id) on delete cascade,
  dimension dimension_kind not null,
  rationale_text text not null,
  unique (comparison_id, dimension)
);

create table votes (
  id uuid primary key default gen_random_uuid(),
  comparison_id uuid not null references comparisons(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  value vote_value not null,
  created_at timestamptz not null default now(),
  unique (comparison_id, user_id)
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  comparison_id uuid not null references comparisons(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  body text not null check (char_length(body) between 1 and 2000),
  parent_id uuid references comments(id),
  reported_count int not null default 0,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id),
  display_name text not null,
  avatar_url text
);

-- auto-create profile on signup
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  ) on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- RLS
alter table sports enable row level security;
alter table entities enable row level security;
alter table entity_aliases enable row level security;
alter table comparisons enable row level security;
alter table comparison_dimensions enable row level security;
alter table comparison_members enable row level security;
alter table seasons enable row level security;
alter table competitions enable row level security;
alter table votes enable row level security;
alter table comments enable row level security;
alter table profiles enable row level security;

create policy "read sports" on sports for select using (true);
create policy "read entities" on entities for select using (true);
create policy "read aliases" on entity_aliases for select using (true);
create policy "read comparisons" on comparisons for select using (status <> 'hidden');
create policy "read dimensions" on comparison_dimensions for select using (true);
create policy "read seasons" on seasons for select using (true);
create policy "read competitions" on competitions for select using (true);
create policy "read comparison members" on comparison_members for select using (true);
create policy "read votes" on votes for select using (true);
create policy "read comments" on comments for select using (not hidden);
create policy "read profiles" on profiles for select using (true);

create policy "insert own comparison" on comparisons for insert
  with check (auth.uid() = created_by and status = 'user');
create policy "insert own dimensions" on comparison_dimensions for insert
  with check (exists (
    select 1 from comparisons c
    where c.id = comparison_id and c.created_by = auth.uid()
  ));
create policy "insert own comparison members" on comparison_members for insert
  with check (exists (
    select 1 from comparisons c
    where c.id = comparison_id and c.created_by = auth.uid()
  ));
create policy "insert own vote" on votes for insert with check (auth.uid() = user_id);
create policy "update own vote" on votes for update using (auth.uid() = user_id);
create policy "delete own vote" on votes for delete using (auth.uid() = user_id);
create policy "insert own comment" on comments for insert with check (auth.uid() = user_id);
create policy "update own profile" on profiles for update using (auth.uid() = id);

-- slug + name normalization for player dedup
create or replace function slugify_entity_name(input text) returns text
language sql immutable as $$
  select trim(both '-' from regexp_replace(
    lower(trim(coalesce(input, ''))),
    '[^a-z0-9]+', '-', 'g'
  ));
$$;

create or replace function normalize_entity_name(input text) returns text
language sql immutable as $$
  select regexp_replace(
    lower(trim(coalesce(input, ''))),
    '[^a-z0-9 ]', '', 'g'
  );
$$;

-- Find or create a player or coach; links duplicate suggestions to the canonical row.
create or replace function resolve_or_create_person(
  p_sport_slug text,
  p_name text,
  p_entity_type entity_type default 'player',
  p_disambiguator text default null,
  p_primary_color text default '#177a3d',
  p_secondary_color text default '#1a1e1c'
) returns table (
  entity_id uuid,
  matched_existing boolean,
  entity_slug text,
  entity_name text,
  entity_disambiguator text
)
language plpgsql security definer set search_path = public as $$
declare
  v_sport_id uuid;
  v_slug text;
  v_norm text;
  v_trimmed text;
  v_disambig text;
  v_entity entities%rowtype;
  v_user uuid := auth.uid();
  v_name_count int;
begin
  if v_user is null then
    raise exception 'Must be signed in to add a person';
  end if;

  if p_entity_type not in ('player', 'coach') then
    raise exception 'Can only add players or coaches';
  end if;

  v_trimmed := trim(p_name);
  if char_length(v_trimmed) < 2 then
    raise exception 'Name is too short';
  end if;

  v_disambig := nullif(trim(p_disambiguator), '');

  select id into v_sport_id from sports where slug = p_sport_slug;
  if v_sport_id is null then
    raise exception 'Unknown sport';
  end if;

  v_norm := normalize_entity_name(v_trimmed);
  v_slug := slugify_entity_name(v_trimmed);
  if v_disambig is not null then
    v_slug := v_slug || '-' || slugify_entity_name(v_disambig);
  end if;

  -- 1. exact slug within sport
  select * into v_entity
  from entities e
  where e.sport_id = v_sport_id and e.type = p_entity_type and e.slug = v_slug
  limit 1;

  -- 2. exact name + disambiguator
  if v_entity.id is null and v_disambig is not null then
    select * into v_entity
    from entities e
    where e.sport_id = v_sport_id and e.type = p_entity_type
      and normalize_entity_name(e.name) = v_norm
      and lower(trim(coalesce(e.disambiguator, ''))) = lower(v_disambig)
    limit 1;
  end if;

  -- 3. exact normalized name (only when unambiguous)
  if v_entity.id is null then
    select count(*) into v_name_count
    from entities e
    where e.sport_id = v_sport_id and e.type = p_entity_type
      and normalize_entity_name(e.name) = v_norm;

    if v_name_count = 1 then
      select * into v_entity
      from entities e
      where e.sport_id = v_sport_id and e.type = p_entity_type
        and normalize_entity_name(e.name) = v_norm
      limit 1;
    end if;
  end if;

  -- 4. alias match
  if v_entity.id is null then
    select e.* into v_entity
    from entity_aliases a
    join entities e on e.id = a.entity_id
    where e.sport_id = v_sport_id and e.type = p_entity_type
      and a.normalized_alias = v_norm
    limit 1;
  end if;

  -- 5. partial name (only when unambiguous among partial matches)
  if v_entity.id is null and char_length(v_norm) >= 4 then
    select count(*) into v_name_count
    from entities e
    where e.sport_id = v_sport_id and e.type = p_entity_type
      and (
        normalize_entity_name(e.name) like '%' || v_norm || '%'
        or v_norm like '%' || normalize_entity_name(e.name) || '%'
      );

    if v_name_count = 1 then
      select * into v_entity
      from entities e
      where e.sport_id = v_sport_id and e.type = p_entity_type
        and (
          normalize_entity_name(e.name) like '%' || v_norm || '%'
          or v_norm like '%' || normalize_entity_name(e.name) || '%'
        )
      order by char_length(e.name)
      limit 1;
    end if;
  end if;

  if v_entity.id is not null then
    if normalize_entity_name(v_entity.name) <> v_norm then
      insert into entity_aliases (entity_id, alias, normalized_alias, created_by)
      values (v_entity.id, v_trimmed, v_norm, v_user)
      on conflict (entity_id, normalized_alias) do nothing;
    end if;

    return query
    select v_entity.id, true, v_entity.slug, v_entity.name, v_entity.disambiguator;
    return;
  end if;

  -- ensure slug unique even without disambiguator hint
  if exists (
    select 1 from entities e
    where e.sport_id = v_sport_id and e.slug = v_slug
  ) then
    v_slug := v_slug || '-' || substr(gen_random_uuid()::text, 1, 6);
  end if;

  insert into entities (
    sport_id, name, slug, type, status, disambiguator,
    primary_color, secondary_color, created_by
  ) values (
    v_sport_id, v_trimmed, v_slug, p_entity_type, 'user', v_disambig,
    coalesce(nullif(trim(p_primary_color), ''), '#177a3d'),
    coalesce(nullif(trim(p_secondary_color), ''), '#1a1e1c'),
    v_user
  )
  returning * into v_entity;

  return query
  select v_entity.id, false, v_entity.slug, v_entity.name, v_entity.disambiguator;
end $$;

-- backward-compatible alias
create or replace function resolve_or_create_player(
  p_sport_slug text,
  p_name text,
  p_primary_color text default '#177a3d',
  p_secondary_color text default '#1a1e1c'
) returns table (
  entity_id uuid,
  matched_existing boolean,
  entity_slug text,
  entity_name text
)
language sql security definer set search_path = public as $$
  select entity_id, matched_existing, entity_slug, entity_name
  from resolve_or_create_person(
    p_sport_slug, p_name, 'player', null, p_primary_color, p_secondary_color
  );
$$;

-- legacy function body replaced above — kept as wrapper only

-- report a comment without owning it (security definer RPC)
create or replace function report_comment(comment_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update comments
  set reported_count = reported_count + 1,
      hidden = (reported_count + 1) >= 3  -- soft-hide threshold
  where id = comment_id;
end $$;

-- leaderboard view: net agreement
create or replace view leaderboard as
select
  c.id, c.slug, c.verdict_text, c.status, c.created_at, c.created_by,
  c.entity_a_id, c.entity_b_id,
  c.season_id, c.competition_id, c.context_note,
  count(v.id) filter (where v.value = 'agree')::int as agrees,
  count(v.id) filter (where v.value = 'disagree')::int as disagrees,
  (count(v.id) filter (where v.value = 'agree')
   - count(v.id) filter (where v.value = 'disagree'))::int as net
from comparisons c
left join votes v on v.comparison_id = c.id
where c.status <> 'hidden'
group by c.id;

-- singleton lock for daily roster cron (max 1 run / 24h)
create table roster_sync_state (
  id int primary key default 1 check (id = 1),
  last_run_at timestamptz,
  last_run_status text,
  last_run_summary jsonb
);

insert into roster_sync_state (id) values (1) on conflict (id) do nothing;
alter table roster_sync_state enable row level security;

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
