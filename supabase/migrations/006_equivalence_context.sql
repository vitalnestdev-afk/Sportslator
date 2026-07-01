-- Migration v6: N-way equivalence takes + season/competition context

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
  scope text not null default 'domestic', -- domestic, continental, international, knockout
  unique (sport_id, slug)
);

alter table comparisons
  add column season_id uuid references seasons(id) on delete set null,
  add column competition_id uuid references competitions(id) on delete set null,
  add column context_note text;

create table comparison_members (
  id uuid primary key default gen_random_uuid(),
  comparison_id uuid not null references comparisons(id) on delete cascade,
  entity_id uuid not null references entities(id) on delete cascade,
  position smallint not null check (position >= 0),
  unique (comparison_id, entity_id),
  unique (comparison_id, position)
);

create index comparison_members_comp_idx on comparison_members (comparison_id, position);

-- Backfill existing binary takes
insert into comparison_members (comparison_id, entity_id, position)
select id, entity_a_id, 0 from comparisons
on conflict (comparison_id, entity_id) do nothing;

insert into comparison_members (comparison_id, entity_id, position)
select id, entity_b_id, 1 from comparisons
on conflict (comparison_id, entity_id) do nothing;

alter table seasons enable row level security;
alter table competitions enable row level security;
alter table comparison_members enable row level security;

create policy "read seasons" on seasons for select using (true);
create policy "read competitions" on competitions for select using (true);
create policy "read comparison members" on comparison_members for select using (true);

create policy "insert own comparison members" on comparison_members for insert
  with check (exists (
    select 1 from comparisons c
    where c.id = comparison_id and c.created_by = auth.uid()
  ));

comment on table comparison_members is
  'Ordered slots in an equivalence take: A ≈ B ≈ C …';
comment on table seasons is
  'Season/year scope for a take (e.g. 2024–25 Premier League).';
comment on table competitions is
  'Competition/cup scope for a take (e.g. Champions League, Stanley Cup).';

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
