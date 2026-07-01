-- Migration: players database + user submission + dedup (v1 → v2)
-- Run after schema.sql on fresh installs, or standalone on existing v1 databases.

do $$ begin
  create type entity_status as enum ('seed', 'user');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type player_era as enum ('active', 'historic');
exception when duplicate_object then null;
end $$;

alter table entities add column if not exists status entity_status not null default 'seed';
alter table entities add column if not exists era player_era;
alter table entities add column if not exists created_by uuid references auth.users(id);
alter table entities add column if not exists created_at timestamptz not null default now();

-- sport-scoped slugs (drop global unique if present)
alter table entities drop constraint if exists entities_slug_key;
alter table entities drop constraint if exists entities_sport_id_slug_key;
alter table entities add constraint entities_sport_id_slug_key unique (sport_id, slug);

create table if not exists entity_aliases (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references entities(id) on delete cascade,
  alias text not null,
  normalized_alias text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (entity_id, normalized_alias)
);

create index if not exists entity_aliases_norm_idx on entity_aliases (normalized_alias);
create index if not exists entities_player_name_idx on entities (sport_id, lower(name)) where type = 'player';

alter table entity_aliases enable row level security;
drop policy if exists "read aliases" on entity_aliases;
create policy "read aliases" on entity_aliases for select using (true);

-- functions (idempotent via create or replace)
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
language plpgsql security definer set search_path = public as $$
declare
  v_sport_id uuid;
  v_slug text;
  v_norm text;
  v_trimmed text;
  v_entity entities%rowtype;
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Must be signed in to add a player';
  end if;

  v_trimmed := trim(p_name);
  if char_length(v_trimmed) < 2 then
    raise exception 'Player name is too short';
  end if;

  select id into v_sport_id from sports where slug = p_sport_slug;
  if v_sport_id is null then
    raise exception 'Unknown sport';
  end if;

  v_slug := slugify_entity_name(v_trimmed);
  v_norm := normalize_entity_name(v_trimmed);

  select * into v_entity
  from entities e
  where e.sport_id = v_sport_id and e.type = 'player' and e.slug = v_slug
  limit 1;

  if v_entity.id is null then
    select * into v_entity
    from entities e
    where e.sport_id = v_sport_id and e.type = 'player'
      and normalize_entity_name(e.name) = v_norm
    limit 1;
  end if;

  if v_entity.id is null then
    select e.* into v_entity
    from entity_aliases a
    join entities e on e.id = a.entity_id
    where e.sport_id = v_sport_id and e.type = 'player'
      and a.normalized_alias = v_norm
    limit 1;
  end if;

  if v_entity.id is null and char_length(v_norm) >= 4 then
    select * into v_entity
    from entities e
    where e.sport_id = v_sport_id and e.type = 'player'
      and (
        normalize_entity_name(e.name) like '%' || v_norm || '%'
        or v_norm like '%' || normalize_entity_name(e.name) || '%'
      )
    order by char_length(e.name)
    limit 1;
  end if;

  if v_entity.id is not null then
    if normalize_entity_name(v_entity.name) <> v_norm then
      insert into entity_aliases (entity_id, alias, normalized_alias, created_by)
      values (v_entity.id, v_trimmed, v_norm, v_user)
      on conflict (entity_id, normalized_alias) do nothing;
    end if;

    return query
    select v_entity.id, true, v_entity.slug, v_entity.name;
    return;
  end if;

  insert into entities (
    sport_id, name, slug, type, status, primary_color, secondary_color, created_by
  ) values (
    v_sport_id, v_trimmed, v_slug, 'player', 'user',
    coalesce(nullif(trim(p_primary_color), ''), '#177a3d'),
    coalesce(nullif(trim(p_secondary_color), ''), '#1a1e1c'),
    v_user
  )
  returning * into v_entity;

  return query
  select v_entity.id, false, v_entity.slug, v_entity.name;
end $$;
