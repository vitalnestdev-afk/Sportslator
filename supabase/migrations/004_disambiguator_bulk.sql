-- Migration v4: disambiguator + bulk roster support + my takes view fix

alter table entities add column if not exists disambiguator text;

create or replace view leaderboard as
select
  c.id, c.slug, c.verdict_text, c.status, c.created_at, c.created_by,
  c.entity_a_id, c.entity_b_id,
  count(v.id) filter (where v.value = 'agree')::int as agrees,
  count(v.id) filter (where v.value = 'disagree')::int as disagrees,
  (count(v.id) filter (where v.value = 'agree')
   - count(v.id) filter (where v.value = 'disagree'))::int as net
from comparisons c
left join votes v on v.comparison_id = c.id
where c.status <> 'hidden'
group by c.id;

-- replace resolve_or_create_person with disambiguator support
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
  if v_user is null then raise exception 'Must be signed in to add a person'; end if;
  if p_entity_type not in ('player', 'coach') then raise exception 'Can only add players or coaches'; end if;
  v_trimmed := trim(p_name);
  if char_length(v_trimmed) < 2 then raise exception 'Name is too short'; end if;
  v_disambig := nullif(trim(p_disambiguator), '');
  select id into v_sport_id from sports where slug = p_sport_slug;
  if v_sport_id is null then raise exception 'Unknown sport'; end if;
  v_norm := normalize_entity_name(v_trimmed);
  v_slug := slugify_entity_name(v_trimmed);
  if v_disambig is not null then v_slug := v_slug || '-' || slugify_entity_name(v_disambig); end if;

  select * into v_entity from entities e where e.sport_id = v_sport_id and e.type = p_entity_type and e.slug = v_slug limit 1;

  if v_entity.id is null and v_disambig is not null then
    select * into v_entity from entities e where e.sport_id = v_sport_id and e.type = p_entity_type
      and normalize_entity_name(e.name) = v_norm and lower(trim(coalesce(e.disambiguator, ''))) = lower(v_disambig) limit 1;
  end if;

  if v_entity.id is null then
    select count(*) into v_name_count from entities e where e.sport_id = v_sport_id and e.type = p_entity_type and normalize_entity_name(e.name) = v_norm;
    if v_name_count = 1 then
      select * into v_entity from entities e where e.sport_id = v_sport_id and e.type = p_entity_type and normalize_entity_name(e.name) = v_norm limit 1;
    end if;
  end if;

  if v_entity.id is null then
    select e.* into v_entity from entity_aliases a join entities e on e.id = a.entity_id
    where e.sport_id = v_sport_id and e.type = p_entity_type and a.normalized_alias = v_norm limit 1;
  end if;

  if v_entity.id is null and char_length(v_norm) >= 4 then
    select count(*) into v_name_count from entities e where e.sport_id = v_sport_id and e.type = p_entity_type
      and (normalize_entity_name(e.name) like '%' || v_norm || '%' or v_norm like '%' || normalize_entity_name(e.name) || '%');
    if v_name_count = 1 then
      select * into v_entity from entities e where e.sport_id = v_sport_id and e.type = p_entity_type
        and (normalize_entity_name(e.name) like '%' || v_norm || '%' or v_norm like '%' || normalize_entity_name(e.name) || '%')
      order by char_length(e.name) limit 1;
    end if;
  end if;

  if v_entity.id is not null then
    if normalize_entity_name(v_entity.name) <> v_norm then
      insert into entity_aliases (entity_id, alias, normalized_alias, created_by)
      values (v_entity.id, v_trimmed, v_norm, v_user) on conflict (entity_id, normalized_alias) do nothing;
    end if;
    return query select v_entity.id, true, v_entity.slug, v_entity.name, v_entity.disambiguator;
    return;
  end if;

  if exists (select 1 from entities e where e.sport_id = v_sport_id and e.slug = v_slug) then
    v_slug := v_slug || '-' || substr(gen_random_uuid()::text, 1, 6);
  end if;

  insert into entities (sport_id, name, slug, type, status, disambiguator, primary_color, secondary_color, created_by)
  values (v_sport_id, v_trimmed, v_slug, p_entity_type, 'user', v_disambig,
    coalesce(nullif(trim(p_primary_color), ''), '#177a3d'),
    coalesce(nullif(trim(p_secondary_color), ''), '#1a1e1c'), v_user)
  returning * into v_entity;

  return query select v_entity.id, false, v_entity.slug, v_entity.name, v_entity.disambiguator;
end $$;

insert into sports (name, slug) values
  ('Rugby', 'rugby'), ('MMA', 'mma'), ('Boxing', 'boxing')
on conflict (slug) do nothing;

create index if not exists entities_name_search_idx on entities using gin (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(disambiguator, '')));
