-- Migration v3: multi-sport expansion + coaches
do $$ begin
  alter type entity_type add value if not exists 'coach';
exception when others then null;
end $$;

create or replace function resolve_or_create_person(
  p_sport_slug text,
  p_name text,
  p_entity_type entity_type default 'player',
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
  if v_user is null then raise exception 'Must be signed in to add a person'; end if;
  if p_entity_type not in ('player', 'coach') then raise exception 'Can only add players or coaches'; end if;
  v_trimmed := trim(p_name);
  if char_length(v_trimmed) < 2 then raise exception 'Name is too short'; end if;
  select id into v_sport_id from sports where slug = p_sport_slug;
  if v_sport_id is null then raise exception 'Unknown sport'; end if;
  v_slug := slugify_entity_name(v_trimmed);
  v_norm := normalize_entity_name(v_trimmed);
  select * into v_entity from entities e where e.sport_id = v_sport_id and e.type = p_entity_type and e.slug = v_slug limit 1;
  if v_entity.id is null then
    select * into v_entity from entities e where e.sport_id = v_sport_id and e.type = p_entity_type and normalize_entity_name(e.name) = v_norm limit 1;
  end if;
  if v_entity.id is null then
    select e.* into v_entity from entity_aliases a join entities e on e.id = a.entity_id
    where e.sport_id = v_sport_id and e.type = p_entity_type and a.normalized_alias = v_norm limit 1;
  end if;
  if v_entity.id is null and char_length(v_norm) >= 4 then
    select * into v_entity from entities e where e.sport_id = v_sport_id and e.type = p_entity_type
      and (normalize_entity_name(e.name) like '%' || v_norm || '%' or v_norm like '%' || normalize_entity_name(e.name) || '%')
    order by char_length(e.name) limit 1;
  end if;
  if v_entity.id is not null then
    if normalize_entity_name(v_entity.name) <> v_norm then
      insert into entity_aliases (entity_id, alias, normalized_alias, created_by)
      values (v_entity.id, v_trimmed, v_norm, v_user) on conflict (entity_id, normalized_alias) do nothing;
    end if;
    return query select v_entity.id, true, v_entity.slug, v_entity.name;
    return;
  end if;
  insert into entities (sport_id, name, slug, type, status, primary_color, secondary_color, created_by)
  values (v_sport_id, v_trimmed, v_slug, p_entity_type, 'user',
    coalesce(nullif(trim(p_primary_color), ''), '#177a3d'),
    coalesce(nullif(trim(p_secondary_color), ''), '#1a1e1c'), v_user)
  returning * into v_entity;
  return query select v_entity.id, false, v_entity.slug, v_entity.name;
end $$;

create or replace function resolve_or_create_player(
  p_sport_slug text, p_name text,
  p_primary_color text default '#177a3d', p_secondary_color text default '#1a1e1c'
) returns table (entity_id uuid, matched_existing boolean, entity_slug text, entity_name text)
language sql security definer set search_path = public as $$
  select * from resolve_or_create_person(p_sport_slug, p_name, 'player', p_primary_color, p_secondary_color);
$$;

drop index if exists entities_player_name_idx;
create index if not exists entities_person_name_idx on entities (sport_id, lower(name)) where type in ('player', 'coach');

-- new sports
insert into sports (name, slug) values
  ('NFL', 'nfl'), ('NHL', 'nhl'), ('Cricket', 'cricket'),
  ('Formula 1', 'f1'), ('Tennis', 'tennis'), ('Golf', 'golf'), ('MLB', 'mlb')
on conflict (slug) do nothing;
